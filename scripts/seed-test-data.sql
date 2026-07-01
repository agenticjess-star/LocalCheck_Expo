-- LocalCheck — test/seed data for exercising the social features
-- (pickleball courts, local-court assignments, active check-ins, a logged game).
--
-- Safe to re-run: every statement is guarded so it won't duplicate rows.
-- Applied to Supabase project jzclwnzcektqhgkkdeje. See docs/PROJECT_STATE.md.
--
-- Existing seed profile ids (= auth.users ids):
--   7d9c399c-9672-4277-9aa3-5acebab78e4e  generative.jesse
--   90fc4aa8-6af5-4fc9-b478-4b2db8b65258  TESTONE
--   bce777b0-4e39-4ba8-a6f8-5479c872cb06  generativejesse   (owner of Kash Courts)
--   bb6c58eb-c63c-469b-a996-87a8dceee068  TEST2
--   65c41c51-cf30-450f-8c43-9f3be9baad61  JessTest2
--   4afd1b06-d74c-4817-9ee1-ce3ed256ac3d  Jess
-- Real courts used below:
--   b4ff9ba0-bbbc-4bdc-9990-6141b96039a5  Kash Courts (Conroe, TX)
--   7eff306b-47be-4518-a82b-9c3ebf122a36  San Juan Court #72364568 (San Juan, PR)

-- ── 1. Pickleball courts (all 5,734 existing courts are basketball) ────────────
insert into public.courts (name, address, latitude, longitude, sport_type, added_by, location, state)
select v.name, v.address, v.lat, v.lng, 'pickleball'::sport_type,
       'bce777b0-4e39-4ba8-a6f8-5479c872cb06', v.location, v.state
from (values
  ('Conroe Pickleball Center', 'Conroe, TX', 30.3119, -95.4560, 'Conroe', 'TX'),
  ('The Woodlands Pickle Park', 'The Woodlands, TX', 30.1658, -95.4613, 'The Woodlands', 'TX'),
  ('Grand Central Pickleball', 'Conroe, TX', 30.3005, -95.4900, 'Conroe', 'TX'),
  ('San Juan Pickleball Club', 'San Juan, PR', 18.4102, -66.0620, 'San Juan', 'PR'),
  ('Condado Pickle Courts', 'San Juan, PR', 18.4570, -66.0770, 'San Juan', 'PR'),
  ('Old San Juan Pickleball', 'San Juan, PR', 18.4655, -66.1057, 'San Juan', 'PR')
) as v(name, address, lat, lng, location, state)
where not exists (select 1 from public.courts c where c.name = v.name);

-- ── 2. Assign local courts to the test profiles ───────────────────────────────
update public.profiles set local_court_id = 'b4ff9ba0-bbbc-4bdc-9990-6141b96039a5'
  where id = '7d9c399c-9672-4277-9aa3-5acebab78e4e' and local_court_id is null;
update public.profiles set local_court_id = '7eff306b-47be-4518-a82b-9c3ebf122a36'
  where id = '90fc4aa8-6af5-4fc9-b478-4b2db8b65258' and local_court_id is null;

-- Give the test users varied ELO / records so leaderboards are non-trivial.
update public.profiles set elo_rating = 1340, wins = 12, losses = 5  where id = 'bce777b0-4e39-4ba8-a6f8-5479c872cb06';
update public.profiles set elo_rating = 1275, wins = 8,  losses = 6  where id = '4afd1b06-d74c-4817-9ee1-ce3ed256ac3d';
update public.profiles set elo_rating = 1190, wins = 4,  losses = 7  where id = '7d9c399c-9672-4277-9aa3-5acebab78e4e';
update public.profiles set elo_rating = 1235, wins = 6,  losses = 4  where id = '90fc4aa8-6af5-4fc9-b478-4b2db8b65258';

-- ── 3. Active check-ins at Kash Courts (so "who's here" has data) ──────────────
insert into public.check_ins (user_id, court_id, checked_in_at, visibility)
select u.id::uuid, 'b4ff9ba0-bbbc-4bdc-9990-6141b96039a5', now() - (u.mins || ' minutes')::interval, 'public'
from (values
  ('bce777b0-4e39-4ba8-a6f8-5479c872cb06', 15),
  ('4afd1b06-d74c-4817-9ee1-ce3ed256ac3d', 40),
  ('bb6c58eb-c63c-469b-a996-87a8dceee068', 5)
) as u(id, mins)
where not exists (
  -- DB enforces one active check-in per user (any court), so guard per user.
  select 1 from public.check_ins ci
  where ci.user_id = u.id::uuid and ci.checked_out_at is null
);

-- ── 4. One completed game at Kash Courts (2v2) to exercise history/ELO ─────────
with g as (
  insert into public.games (court_id, created_by, played_at, score_a, score_b, winner_side)
  select 'b4ff9ba0-bbbc-4bdc-9990-6141b96039a5', 'bce777b0-4e39-4ba8-a6f8-5479c872cb06',
         now() - interval '2 hours', 21, 17, 'a'::game_side
  where not exists (
    select 1 from public.games
    where court_id = 'b4ff9ba0-bbbc-4bdc-9990-6141b96039a5' and score_a = 21 and score_b = 17
  )
  returning id
)
insert into public.game_participants (game_id, user_id, team_side, display_order)
select g.id, p.user_id::uuid, p.side::game_side, p.ord
from g cross join (values
  ('bce777b0-4e39-4ba8-a6f8-5479c872cb06', 'a', 1),
  ('4afd1b06-d74c-4817-9ee1-ce3ed256ac3d', 'a', 2),
  ('7d9c399c-9672-4277-9aa3-5acebab78e4e', 'b', 1),
  ('90fc4aa8-6af5-4fc9-b478-4b2db8b65258', 'b', 2)
) as p(user_id, side, ord);
