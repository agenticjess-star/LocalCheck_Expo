# LocalCheck — Canonical Project State

> Single source of truth for "where we are." Update this whenever the
> architecture, data layer, or launch status materially changes.
> Companion doc: [`APP_STORE_READINESS.md`](./APP_STORE_READINESS.md) (the roadmap).

_Last updated: 2026-06-30_

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

Branches in this repo:

| Branch | Contents |
|--------|----------|
| `main` | Local demo: Expo app on AsyncStorage + sample data. **No Supabase wiring.** |
| `replit/backend-auth-appstore-foundation` | "Stage 1" — adds Supabase client, `AuthContext`, `courtService`, `auth` screen, app config. Unmerged. |
| `devin/*-stage2-supabase-data-layer` | **This work** — fixes the data layer to match the live DB schema + canonical docs. Branches off the foundation branch. |

## 3. Tech stack

- **Mobile:** Expo (React Native 0.81, Expo SDK 54) + Expo Router (file-based).
- **State:** React Context + AsyncStorage (`AppContext`). Auth via `AuthContext`.
- **Map:** `react-native-maps` v1.18.0 with Mapbox raster tiles via `UrlTile`
  (Expo Go compatible — no native Mapbox SDK). Custom JS clustering.
- **Backend:** Supabase (Postgres 17, Auth, PostgREST). Project
  `jzclwnzcektqhgkkdeje` ("LocalCheck", us-west-2).
- **Monorepo:** pnpm workspaces. Also contains an Express API server + Drizzle
  packages under `lib/` that are **scaffolding only / not used by the app yet**.

## 4. Live Supabase reality (verified 2026-06-30)

Project `jzclwnzcektqhgkkdeje`. The canonical Drizzle reference is
`attached_assets/localcheck-supabase-schema.ts`. Actual contents:

| Table | Rows | Notes |
|-------|-----:|-------|
| `courts` | 5,734 | id(uuid), name, address, latitude, longitude, **`sport_type`** (enum), **`added_by`** (uuid, NOT NULL), image_url, verification_threshold, is_archived, **`location`** (city), **`state`** |
| `profiles` | 6 | id, email, display_name, **`username`** (NOT NULL, UNIQUE, `^[A-Za-z0-9_]{3,32}$`), avatar_url, **`elo_rating`** (default 1200), wins, losses, total_court_time_minutes, local_court_id |
| `check_ins` | 4 | user_id, court_id, note, checked_in/out_at, visibility |
| `courts_with_stats` (view) | 5,734 | all `courts` columns + `local_player_count` + `is_confirmed` (`local_player_count >= verification_threshold`) |

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
render when the token is present.

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
