# LocalCheck — Canonical Project State

> Single source of truth for "where we are." Update this whenever the
> architecture, data layer, or launch status materially changes.
> Companion doc: [`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md) (the roadmap).

_Last updated: 2026-06-30 (Stage 3 groundwork)_

---

## 1. What LocalCheck is

A cross-platform (iOS + Android) street-sports app: find active courts on a map,
check in, log games, track ELO. The **Expo app is the shipping product**; the
native iOS (SwiftUI) repo `LocalCheck-IOS` is **reference only**.

## 2. Repos & branches

| Repo | Role |
|------|------|
| `agenticjess-star/LocalCheck_Expo` | **Shipping app** (this repo) |
| `agenticjess-star/LocalCheck-IOS` | Reference design only (SwiftUI) |
| `agenticjess-star/localcheck` | Old web prototype |

Branches: **single `main`**. Stage 1 (Supabase foundation) + Stage 2 (data-layer
fixes) are merged into `main` via PR #2; the old `replit/backend-auth-appstore-foundation`
and `devin/*-stage2` branches were deleted in cleanup. New work happens on
short-lived `devin/*` branches off `main`.

### External accounts & links

| Thing | Value |
|-------|-------|
| Supabase project | `jzclwnzcektqhgkkdeje` — https://supabase.com/dashboard/project/jzclwnzcektqhgkkdeje |
| Supabase URL | `https://jzclwnzcektqhgkkdeje.supabase.co` |
| Anon (publishable) key | `sb_publishable_oL6OFCLyIPWUuxv27tqZUQ_1i7WYcHS` (client-safe) |
| SQL editor (for seeds/DDL) | https://supabase.com/dashboard/project/jzclwnzcektqhgkkdeje/sql/new |
| Expo owner / app slug | `agenticjess-organization` / `localcheck` |
| iOS + Android id | `com.realjess.localcheck` · Apple Team `6HHLJVQC6W` (Individual) |
| Mapbox token | `EXPO_PUBLIC_MAPBOX_TOKEN` (public `pk.` token) |

> ⚠️ The Supabase **service-role key / Postgres connection string are NOT in this
> environment**, and the Supabase MCP is **read-only**. DB writes (seeds, DDL)
> must be run in the SQL editor above or via a connection string the owner
> provides. Never put the service-role key in mobile client code.

## 3. Tech stack

- **Mobile:** Expo (React Native 0.81, Expo SDK 54) + Expo Router (file-based).
- **State:** React Context + AsyncStorage (`AppContext`). Auth via `AuthContext`.
- **Map:** `react-native-maps` v1.18.0 with Mapbox raster tiles via `UrlTile`
  (Expo Go compatible — no native Mapbox SDK). Custom JS clustering.
- **Backend:** Supabase (Postgres 17, Auth, PostgREST). Project
  `jzclwnzcektqhgkkdeje` ("LocalCheck", us-west-2).
- **Builds:** EAS (`artifacts/mobile/eas.json`: development / preview / production).
- **Monorepo:** pnpm workspaces. Also contains an Express API server + Drizzle
  packages under `lib/` that are **scaffolding only / not used by the app yet**.

## 4. Live Supabase reality (verified 2026-06-30)

Project `jzclwnzcektqhgkkdeje`. The canonical Drizzle reference is
`attached_assets/localcheck-supabase-schema.ts`. Actual contents:

| Table | Rows | Notes |
|-------|-----:|-------|
| `courts` | 5,734 (+6 via seed) | id(uuid), name, address, latitude, longitude, **`sport_type`** (enum), **`added_by`** (uuid, NOT NULL), image_url, verification_threshold, is_archived, **`location`** (city), **`state`**. All 5,734 live rows are **basketball**; the seed adds 6 **pickleball** test courts (Conroe TX + San Juan PR). |
| `profiles` | 6 | id, email, display_name, **`username`** (NOT NULL, UNIQUE, `^[A-Za-z0-9_]{3,32}$`), avatar_url, **`elo_rating`** (default 1200), wins, losses, total_court_time_minutes, local_court_id |
| `check_ins` | 4 (+3 via seed) | user_id, court_id, note, checked_in/out_at, visibility |
| `games` / `game_participants` | 0 (+1 2v2 via seed) | court_id, created_by, played_at, score_a/b, winner_side; participants have team_side + display_order |
| `courts_with_stats` (view) | = `courts` | all `courts` columns + `local_player_count` + `is_confirmed` (`local_player_count >= verification_threshold`) |

Other tables exist for the full roadmap: `games`, `game_participants`,
`feed_posts`, `feed_post_likes`, `game_likes`, `game_comments`,
`scheduled_games`, `scheduled_game_participants`, `friendships`,
`subscriptions` (RevenueCat), `subscription_events`.

Enums: `sport_type = {basketball, pickleball, tennis, soccer, volleyball}`
(lowercase in DB; the app uses UPPERCASE internally).

### Row Level Security (the important part)

RLS is ON for all public tables. Court access:

- `courts` (base table): **SELECT only for `authenticated`** (`courts_select_authenticated`, `using true`). Anon/logged-out reads return `[]`.
- `courts_with_stats` (view): a **security-definer view**, so it **bypasses RLS** and is **readable by anyone**, including the anonymous publishable key. Verified: an anon REST call to `courts_with_stats` returns all 5,734 rows; the same call to `courts` returns `[]`.

➡️ **Consequence:** the app must read courts through `courts_with_stats` for the
map to work before login. `courtService` does exactly this (view first, base
table fallback). **No production RLS change is required** for public court
browsing today.

Insert/update policies on `courts`, `check_ins`, `feed_posts`, etc. are all
`authenticated` + ownership (`auth.uid() = added_by` / `user_id`).

## 5. Data flow in the app

```
AppContext (on mount)
  └─ fetchCourtsFromSupabase()           // services/courtService.ts
       ├─ select * from courts_with_stats (is_archived=false, limit 6000)
       ├─ fallback: select * from courts
       └─ null on failure  ──▶ SAMPLE_COURTS (constants/data.ts, 33 demo courts)
  setCourts(remote ?? sample) + merge any user-added courts from AsyncStorage

(tabs)/index  ──▶ HomeScreen ──▶ MapScreen  // renders AppContext.courts
(tabs)/explore ──▶ CourtsScreen             // renders AppContext.courts
```

`MapScreen` reads `EXPO_PUBLIC_MAPBOX_TOKEN` from `process.env`; tiles only
render when the token is present. It also had a viewport court fetch against an
Express API (`localhost:3001` / `EXPO_PUBLIC_DOMAIN`) that isn't wired to
Supabase; it's now **gated behind `EXPO_PUBLIC_DOMAIN`** so it doesn't fail (and
churn re-renders) on every pan/zoom. Courts come from AppContext/Supabase.

### Seed / test data

`scripts/seed-test-data.sql` (idempotent) seeds: 6 pickleball courts, local-court
assignments + varied ELO on the test profiles, 3 active check-ins at *Kash
Courts*, and one completed 2v2 game. **Applied to the live DB** (via the Supabase
Management API with the service token). Idempotent, so safe to re-run.
**Note:** the app still reads check-ins/games from AsyncStorage — seeded rows
won't surface until Stage 3 wires those reads to Supabase.

### Auth reality (verified 2026-06-30)

- **`mailer_autoconfirm` is ON** → email sign-up returns a **live session
  immediately** (no verification email). Great for onboarding the test crew;
  revisit before public launch if you want verified emails.
- **Profiles are auto-created by a DB trigger**, not the app: `auth.users` INSERT
  fires `on_auth_user_created` → `public.handle_new_user()` (SECURITY DEFINER),
  which inserts the `profiles` row with a generated username + display name and
  `apple_private_email` flag. The app's `ensureProfile()` is now a redundant
  fallback (it finds the row already there).
- **Apple Sign-In nonce flow is correct**: raw nonce hashed (SHA-256) to Apple,
  raw nonce to `supabase.auth.signInWithIdToken`. Still requires a dev/prod
  build (not Expo Go).
- ⚠️ **TODO before password-reset / OAuth deep links:** Supabase `site_url` is
  `http://localhost:3000` and `uri_allow_list` is empty. Add `localcheck://` (and
  the prod URL) to the redirect allow-list when those flows are built.

## 6. Bugs found & fixed in this branch

1. **`courtService` schema mismatch (root cause of "map shows wrong/sample data").**
   The old mapping read non-existent columns (`sport`, `city`, `neighborhood`,
   `active_count`, `rating`, `status`, `local_count`). Fixed to the real schema:
   `sport_type`, `location`/`state`, `local_player_count`, `is_confirmed`,
   `image_url`. Now filters `is_archived=false`, limit 6000, drops bad coords.
2. **Profile creation always failed (root cause of "auth not working").**
   `ensureProfile` inserted `{elo, check_ins, tier}` and omitted the required
   `username` — none of which match `profiles`. Fixed to insert
   `{id, email, display_name, username, elo_rating}` with a generated,
   regex-valid username and unique-collision retry. `UserProfile` type and
   `auth.tsx` updated to the real columns.
3. **`.env` in the wrong place.** `.env.example` only existed at the monorepo
   root, but Expo loads `.env` from the **app** dir. Added
   `artifacts/mobile/.env.example` with instructions.
4. **Map re-render churn on pan/zoom.** `MapScreen` fired a failing
   `localhost:3001` court fetch on every region change; gated behind
   `EXPO_PUBLIC_DOMAIN`.
5. **`handle_new_user` username could exceed 32 chars** (`left(base,24)` + `_` +
   8 hex = 33) → violated `profiles_username_check` and would **fail sign-up**
   for long email prefixes. Patched to `left(base,23)` (max 32) and to also read
   `display_name`/`preferred_username` from user metadata. Tracked in
   `scripts/2026-06-30-fix-handle-new-user.sql` (already applied to the DB).
6. **Sign-up showed a false "check your email to confirm" alert** even though
   autoconfirm is on (no email is sent). `auth.tsx` now routes straight into the
   app on success.

### Known open issue

- **Map tiles "break" on load/zoom in Expo Go** (Apple base map peeking through
  the Mapbox raster `UrlTile`, checkerboarding). Likely an Expo Go /
  `react-native-maps` raster-overlay limitation — **re-verify on the dev build**.
  If it persists there, move the map to native `@rnmapbox/maps` (vector).

## 7. Known environment gotchas

- **Apple Sign-In does NOT work in Expo Go.** `expo-apple-authentication` is a
  native module not bundled in Expo Go. It requires a **development build** /
  EAS build with the `com.realjess.localcheck` bundle id. Email/password auth
  works in Expo Go; use it for backend testing until a dev build exists.
- **`EXPO_PUBLIC_*` vars are inlined at bundle time.** After editing `.env`,
  restart with `expo start -c` (clean cache) or the old values stick.
- **`.env` must live at `artifacts/mobile/.env`**, not the repo root.
- Node 22 vs the documented Node 24: install/typecheck work on 22. `corepack`
  may fail to fetch pnpm (signature error) — use a directly-installed pnpm.

## 8. Build / run / verify

```bash
pnpm install                                   # from repo root
cp artifacts/mobile/.env.example artifacts/mobile/.env   # fill in real values
pnpm --filter @workspace/mobile run typecheck  # mobile only
pnpm --filter @workspace/mobile exec expo start -c       # dev server
```

**Typecheck status:** the mobile typecheck currently reports ~211 pre-existing
errors — 210 from `mockup-sandbox/` (a separate, un-installed Vite sandbox that
the foundation plan said not to touch) and 1 from `app/(tabs)/elo.tsx`
(StyleSheet typing). These predate this work; cleaning them up (excluding
`mockup-sandbox` from the app tsconfig) is a tracked roadmap item. There is **no
CI** configured in this repo yet.
