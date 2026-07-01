# LocalCheck — App Store Readiness & Roadmap

> The working plan to take LocalCheck from "good local demo" to "live on the App
> Store (and Play Store)." Every change should move a checkbox here.
> Canonical state lives in [`PROJECT_STATE.md`](./PROJECT_STATE.md).

_Last updated: 2026-06-30 (Stage 3 groundwork)_

## North star

**MVP 1:** Anyone opens the app and browses real courts on the map (no login).
Court *details* (who's active, local count) are masked with a "sign up to view"
prompt. A signed-in user can set a local court, check in, see who's there, and
log a game — all free. Ship that to TestFlight → App Store. LocalPlus billing and
leaderboard reveal come right after.

## Product model — free vs. LocalPlus (the funnel)

No ads, ever (it ruins the look). Free tier is the growth engine; depth is paid.

**Free (the hooks):**
1. **Find courts** — browse the map without an account. LocalCheck aims to be the
   canonical source for "where are the basketball/pickleball courts near me."
   The robust **add-court** flow (drop pin → snap pic → AI-verify) keeps the map
   reliable; a court turns a distinct color once **10+ active locals** claim it
   (pic-verified + real community = "you'll find a game here").
2. **Check in & see who's live** — kills the group-text/logistics friction and the
   awkwardness of coordinating. Requires sign-up (the first gate).
3. **Log games & track ELO** — organic loop: "log this to LocalCheck?" → share
   link → new user downloads, sets local court, adds you, logs the game. Free.

**LocalPlus (paid):**
- Full **history depth** and rich stats (free sees only recent/shallow).
- **Leaderboard visibility** — free users see *where they rank* but the board is
   masked; being *shown* (region/nation, and while checked in) is the paid flex.

**Gating to build (Stage 3):** map = public; court detail sheet = masked preview
(counts blurred + "Sign up to see who's playing"); writes (check-in, add court,
log game) require auth; history/leaderboard reveal require LocalPlus.

## Current stage

**Stage 3 — Core loop on the backend + explore gating.** Stage 2 (merged in
PR #2) fixed the data layer so the map reads the 5,734 real courts. Now: wire
check-in / local-court / game-logging to Supabase, and build the public-map +
masked-details gating from the funnel above. Test data (pickleball courts, active
check-ins, a logged game) is seeded so these features are demoable — see
`scripts/seed-test-data.sql` and `docs/PROJECT_STATE.md`.

---

## Milestones

### ✅ Stage 1 — Foundation (merged to `main` via PR #2)
- [x] Supabase client (`lib/supabase.ts`) with SecureStore session storage
- [x] `AuthContext` (email/password + Apple Sign-In + profile fns)
- [x] `auth` screen, `AuthProvider` wired in root layout
- [x] App config: name/scheme/bundle id, `usesAppleSignIn`

### 🔄 Stage 2 — Real data layer (this PR)
- [x] Fix `courtService` to the real `courts_with_stats` schema
- [x] Fix `ensureProfile` / `UserProfile` / `auth.tsx` to the real `profiles` schema
- [x] Add `artifacts/mobile/.env.example` + document env loading
- [x] Confirm anon court reads work via the view (no RLS change needed)
- [x] Canonical docs (`PROJECT_STATE.md`, this file)
- [x] Decision D2 resolved: browse-before-login (see Decisions)
- [ ] Verify on a device/emulator: map renders real courts; email sign-up creates a profile

### ⬜ Stage 3 — Core loop on the backend
- [ ] Check-in / check-out writes to `check_ins` (currently AsyncStorage only)
- [ ] "My Local Court" persists to `profiles.local_court_id`
- [ ] Add-court flow inserts into `courts` (`added_by = auth.uid()`)
- [ ] Read ELO/stats from `profiles` instead of sample `currentUser`
- [ ] Graceful logged-out UX (read-only browse; prompt to sign in on write)

### 🔄 Stage 4 — EAS + App Store submission prep
- [x] `eas.json` (development/preview/production) + `app.json` (slug `localcheck`, owner `agenticjess-organization`, iOS `com.realjess.localcheck`, Android `com.realjess.localcheck`, Team `6HHLJVQC6W`)
- [ ] **Owner responsible one-time EAS setup** (see "EAS setup" below) — needs the user's Expo login
- [ ] **Development build** on device (Apple Sign-In + correct map can't be tested in Expo Go)
- [ ] App icons, splash, screenshots, privacy policy URL, support URL
- [ ] App Privacy "nutrition label" (account, location, identifiers)
- [ ] Account deletion flow (Apple requirement)
- [ ] Apple Sign-In end-to-end (Supabase provider already enabled)
- [ ] TestFlight internal build → external testers
- [ ] App Store Connect listing + submit for review

#### EAS setup (run once, from `artifacts/mobile/`)
The deep how-to lives in the `expo-deployment` skill. Quickstart:
```bash
npm install -g eas-cli
eas login                     # the user's Expo account
eas init                      # links/creates the Expo project, writes extra.eas.projectId into app.json
eas build --profile development --platform ios   # dev build for the phone (Apple Sign-In + real map)
# later:
eas build --profile production --platform ios
eas submit --profile production --platform ios    # to App Store Connect / TestFlight
```
If `owner`/`slug` in `app.json` don't match the account, `eas init` reconciles.
Team id `6HHLJVQC6W` is preset in `eas.json` submit config.

### ⬜ Stage 5 — Post-MVP
- [ ] Location-scoped court fetching (bbox / PostGIS) instead of full pull
- [ ] Runs, leaderboards, feed, friends on the backend
- [ ] LocalPlus via RevenueCat (`subscriptions` table already modelled)
- [ ] Play Store release

---

## Launch blockers (must be true before submit)

- [ ] App works fully signed-out OR has a clean login gate (no dead ends)
- [ ] Real courts load reliably; sample data only as offline fallback
- [ ] Apple Sign-In works on a real device build
- [ ] Account deletion works (Apple requirement for apps with accounts)
- [ ] Privacy policy + data-use disclosures published and linked
- [ ] No secrets in the client bundle beyond public keys (anon + mapbox public)
- [ ] Crash-free core loop: open → browse → sign in → check in → persists

## Decisions log

| # | Decision | Status |
|---|----------|--------|
| D1 | **Cross-platform via Expo** (not iOS-only) — Android users seen at courts. | ✅ Decided (Expo is the shipping base) |
| D2 | **Browse before login = yes.** Public map; court details masked with a "sign up to view" prompt; writes gated by auth; history/leaderboard reveal gated by LocalPlus. | ✅ Decided |
| D5 | **No ads, no free-forever depth.** Monetize via LocalPlus (history depth + leaderboard visibility). Core loop (find court, local court, check-in, log game) stays free. | ✅ Decided |
| D3 | **MVP scale:** keep all ~5.7k courts, basketball-first. Lower counts / location-scoped fetch deferred to Stage 5. | ✅ Decided (per product owner) |
| D4 | Production RLS: keep base `courts` authenticated-only; serve public reads via `courts_with_stats`. | ✅ Decided (no change needed) |

## Open questions for the product owner

1. **D2** above — browse-before-login or login-gate for MVP 1?
2. Apple Developer account is ready; do you want me to set up **EAS** + a
   development build so Apple Sign-In can be tested on your device?
3. Confirm `com.realjess.localcheck` as the final production bundle id.
