# LocalCheck Backend Status

> ⚠️ **Superseded.** This Stage-1 doc described intended behavior; several schema
> claims below were inaccurate against the **live** Supabase DB and were corrected
> in Stage 2. The verified source of truth is now
> [`PROJECT_STATE.md`](./PROJECT_STATE.md). Sections corrected inline below.

## Auth
- **Email/Password Sign-Up**: ✅ Implemented via `supabase.auth.signUp`
- **Email/Password Sign-In**: ✅ Implemented via `supabase.auth.signInWithPassword`
- **Apple Sign-In**: ✅ Implemented (iOS only) — ⚠️ **does not run in Expo Go**; needs a development build.
- **Persisted session**: ✅ Uses `expo-secure-store` adapter — survives app restarts
- **Profile creation**: ⚠️ Was broken (inserted `elo`/`tier`/`check_ins`, omitted required `username`). **Fixed in Stage 2** — now inserts `username` + `elo_rating`.

## Courts Backend
- **Primary source**: `courts_with_stats` view (a security-definer view — readable anonymously, so the map works logged-out)
- **Fallback**: `courts` table (RLS-restricted to authenticated users)
- **Row limit**: 6000 rows (live table holds ~5,734)
- **Local fallback**: Sample courts from `constants/data.ts` are used if Supabase is unavailable or returns 0 rows
- **App never goes blank**: ✅ Fallback guaranteed

## Mapbox
- Token: `EXPO_PUBLIC_MAPBOX_TOKEN`
- Map still renders on web via Mapbox GL JS
- Not refactored — same behavior as before

## Supabase Tables Required

### `profiles` (ACTUAL live schema — the block below is corrected)
```sql
-- Real columns: id, email, display_name, username (NOT NULL UNIQUE,
-- ^[A-Za-z0-9_]{3,32}$), avatar_url, elo_rating (default 1200), wins, losses,
-- total_court_time_minutes, local_court_id, created_at, updated_at.
-- NOTE: there is NO `elo`, `tier`, or `check_ins` column. See profiles in
-- attached_assets/localcheck-supabase-schema.ts for the canonical definition.
create table profiles (
  id uuid primary key references auth.users(id),
  email citext,
  display_name text not null,
  username citext not null unique,
  avatar_url text,
  elo_rating integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  total_court_time_minutes integer not null default 0,
  local_court_id uuid references courts(id),
  created_at timestamptz not null default now()
);
-- RLS
alter table profiles enable row level security;
create policy "Users can read their own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can upsert their own profile"
  on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);
```

### `courts` (ACTUAL live schema — ~5,734 rows)
```sql
-- Real columns read by courtService.ts:
-- id (uuid), name, address, latitude, longitude, sport_type (enum),
-- added_by (uuid NOT NULL), image_url, verification_threshold, is_archived,
-- location (city), state, created_at, updated_at.
-- The earlier list (sport, neighborhood, city, active_count, rating, surface,
-- status, local_count, ...) did NOT match the DB and was the cause of the
-- map showing mismapped/sample data. Fixed in Stage 2.
```

### `courts_with_stats` (optional enriched view)
```sql
create view courts_with_stats as select * from courts;
-- Extend with joins to check-ins, active player counts, etc.
```

## Environment Secrets (in Replit)
- `EXPO_PUBLIC_SUPABASE_URL` ✅
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ✅
- `EXPO_PUBLIC_MAPBOX_TOKEN` ✅

## Packages Added
```
@supabase/supabase-js
react-native-url-polyfill
expo-secure-store
expo-apple-authentication
expo-crypto
```

## What Remains for TestFlight / App Store

1. **Apple Sign-In capability**: Must be enabled in Apple Developer portal → Identifiers → com.realjess.localcheck → Sign In with Apple ✓
2. **Bundle ID**: Set to `com.realjess.localcheck` in `app.json`
3. **EAS build**: Run `npx eas-cli build -p ios --profile production`
4. **Supabase Apple OAuth**: Enable Apple provider in Supabase dashboard → Auth → Providers → Apple
5. **Email confirmation**: Configure or disable email confirmation in Supabase Auth settings for smoother dev experience
6. **RLS policies**: Add RLS to `courts` table appropriate to your access model
7. **Push notifications**: Not yet implemented
8. **Full match/ELO persistence**: Currently local AsyncStorage; needs server-side tables
