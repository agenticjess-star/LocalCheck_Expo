# LocalCheck — App Store Readiness & Roadmap

> The working plan to take LocalCheck from "good local demo" to "live on the App
> Store (and Play Store)." Every change should move a checkbox here.
> Canonical state lives in [`PROJECT_STATE.md`](./PROJECT_STATE.md).

_Last updated: 2026-06-30_

## North star

**MVP 1:** A signed-in user opens the app, sees real nearby basketball courts on
the map (from Supabase), can check in to a court, and the session persists. Ship
that to TestFlight → App Store. Everything else (pickleball at scale, runs,
leaderboards, LocalPlus billing) is **post-MVP**.

## Current stage

**Stage 2 — Wire the data layer to the real backend.** The Supabase client,
auth context, and court service exist (Stage 1, foundation branch). This stage
makes them actually work against the live schema and gets the app reading the
5,734 real courts instead of sample data.

---

## Milestones

### ✅ Stage 1 — Foundation (done, on `replit/backend-auth-appstore-foundation`)
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
- [ ] **Decision needed:** browse-before-login vs. login-gate (see Decisions)
- [ ] Verify on a device/emulator: map renders real courts; email sign-up creates a profile

### ⬜ Stage 3 — Core loop on the backend
- [ ] Check-in / check-out writes to `check_ins` (currently AsyncStorage only)
- [ ] "My Local Court" persists to `profiles.local_court_id`
- [ ] Add-court flow inserts into `courts` (`added_by = auth.uid()`)
- [ ] Read ELO/stats from `profiles` instead of sample `currentUser`
- [ ] Graceful logged-out UX (read-only browse; prompt to sign in on write)

### ⬜ Stage 4 — App Store submission prep
- [ ] EAS project + `eas.json`; production bundle id `com.realjess.localcheck`
- [ ] **Development build** (Apple Sign-In can't be tested in Expo Go)
- [ ] App icons, splash, screenshots, privacy policy URL, support URL
- [ ] App Privacy "nutrition label" (account, location, identifiers)
- [ ] Apple Sign-In end-to-end (Supabase provider already enabled)
- [ ] TestFlight internal build → external testers
- [ ] App Store Connect listing + submit for review

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
| D2 | **Browse courts before login?** Recommended: yes — map is public (the view already allows anon reads; Apple reviewers like no-login content). Sign-in gates writes (check-in, add court, ELO). Alternative: full login gate. | ⏳ Needs confirmation |
| D3 | **MVP scale:** keep all ~5.7k courts, basketball-first. Lower counts / location-scoped fetch deferred to Stage 5. | ✅ Decided (per product owner) |
| D4 | Production RLS: keep base `courts` authenticated-only; serve public reads via `courts_with_stats`. | ✅ Decided (no change needed) |

## Open questions for the product owner

1. **D2** above — browse-before-login or login-gate for MVP 1?
2. Apple Developer account is ready; do you want me to set up **EAS** + a
   development build so Apple Sign-In can be tested on your device?
3. Confirm `com.realjess.localcheck` as the final production bundle id.
