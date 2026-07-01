import { supabase } from "@/lib/supabase";

/**
 * Supabase-backed "social loop" service: check-ins, local-court assignment,
 * game logging, and per-court leaderboards. These map 1:1 to the live schema
 * (see docs/PROJECT_STATE.md §4) and are the backend for Stage 3.
 *
 * RLS (verified): check_ins / games / game_participants are readable by any
 * authenticated user and writable only by the owner (auth.uid() = user_id /
 * created_by). profiles.local_court_id is updatable by the owner. So every
 * write below must run while signed in, keyed on the current user's id.
 */

export type GameSide = "a" | "b";

export interface ActiveCheckin {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  eloRating: number;
  checkedInAt: string;
}

export interface LoggedGameParticipant {
  userId: string;
  side: GameSide;
  order: number;
}

export interface LoggedGame {
  id: string;
  courtId: string;
  courtName: string;
  playedAt: string;
  scoreA: number;
  scoreB: number;
  winnerSide: GameSide | null;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  eloRating: number;
  wins: number;
  losses: number;
}

// ── Raw row shapes returned by the queries below (nested selects) ─────────────

interface CheckinWithProfileRow {
  id: string;
  user_id: string;
  checked_in_at: string;
  profiles: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    elo_rating: number;
  } | null;
}

interface GameWithCourtRow {
  id: string;
  court_id: string;
  played_at: string;
  score_a: number;
  score_b: number;
  winner_side: GameSide | null;
  courts: { name: string } | null;
}

interface ProfileLeaderboardRow {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
}

function logError(scope: string, message: string | undefined) {
  if (__DEV__ && message) {
    console.warn(`[social] ${scope}: ${message}`);
  }
}

/**
 * Everyone currently checked in at a court (checked_out_at IS NULL), most
 * recent first. This is the "who's here right now" list.
 */
export async function getActiveCheckins(courtId: string): Promise<ActiveCheckin[]> {
  const { data, error } = await supabase
    .from("check_ins")
    .select(
      "id, user_id, checked_in_at, profiles!inner(display_name, username, avatar_url, elo_rating)"
    )
    .eq("court_id", courtId)
    .is("checked_out_at", null)
    .order("checked_in_at", { ascending: false })
    .returns<CheckinWithProfileRow[]>();

  if (error || !data) {
    logError("getActiveCheckins", error?.message);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.profiles?.display_name ?? "Player",
    username: row.profiles?.username ?? "",
    avatarUrl: row.profiles?.avatar_url ?? null,
    eloRating: row.profiles?.elo_rating ?? 1200,
    checkedInAt: row.checked_in_at,
  }));
}

/**
 * The current user's active check-in, if any. The DB enforces one active
 * check-in per user (partial unique index), so this returns at most one row.
 */
export async function getMyActiveCheckin(
  userId: string
): Promise<{ id: string; courtId: string; checkedInAt: string } | null> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("id, court_id, checked_in_at")
    .eq("user_id", userId)
    .is("checked_out_at", null)
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    logError("getMyActiveCheckin", error?.message);
    return null;
  }
  return { id: data.id, courtId: data.court_id, checkedInAt: data.checked_in_at };
}

/**
 * Check the user in at a court. Closes any existing active check-in first so the
 * one-active-per-user constraint is never violated. Returns the new check-in id.
 */
export async function checkIn(
  userId: string,
  courtId: string,
  visibility: "public" | "friends" | "private" = "public"
): Promise<{ id: string } | null> {
  await checkOut(userId);

  const { data, error } = await supabase
    .from("check_ins")
    .insert({ user_id: userId, court_id: courtId, visibility })
    .select("id")
    .single();

  if (error || !data) {
    logError("checkIn", error?.message);
    return null;
  }
  return { id: data.id };
}

/** Close the user's active check-in(s). No-op if none are open. */
export async function checkOut(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("check_ins")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("checked_out_at", null);

  if (error) {
    logError("checkOut", error.message);
    return false;
  }
  return true;
}

/** Set (or change) the user's home court. */
export async function setLocalCourt(userId: string, courtId: string): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ local_court_id: courtId })
    .eq("id", userId);

  if (error) {
    logError("setLocalCourt", error.message);
    return false;
  }
  return true;
}

/**
 * Log a completed game: inserts the game row, then its participants. The caller
 * must be the game creator (RLS: games.created_by = auth.uid()). Returns the new
 * game id, or null on failure.
 *
 * NOTE: ELO is not recomputed here — that will be a DB function / edge function
 * so the math is authoritative and can't be spoofed from the client.
 */
export async function logGame(params: {
  courtId: string;
  createdBy: string;
  scoreA: number;
  scoreB: number;
  winnerSide: GameSide;
  participants: LoggedGameParticipant[];
  playedAt?: string;
}): Promise<{ id: string } | null> {
  const { data: game, error: gameErr } = await supabase
    .from("games")
    .insert({
      court_id: params.courtId,
      created_by: params.createdBy,
      score_a: params.scoreA,
      score_b: params.scoreB,
      winner_side: params.winnerSide,
      played_at: params.playedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (gameErr || !game) {
    logError("logGame", gameErr?.message);
    return null;
  }

  const rows = params.participants.map((p) => ({
    game_id: game.id,
    user_id: p.userId,
    team_side: p.side,
    display_order: p.order,
  }));

  const { error: partErr } = await supabase.from("game_participants").insert(rows);
  if (partErr) {
    logError("logGame:participants", partErr.message);
    // Roll back the orphaned game so we don't leave a participant-less record.
    await supabase.from("games").delete().eq("id", game.id);
    return null;
  }

  return { id: game.id };
}

/** Games the user played in, most recent first. */
export async function getMyGames(userId: string, limit = 50): Promise<LoggedGame[]> {
  const { data: parts, error: partErr } = await supabase
    .from("game_participants")
    .select("game_id")
    .eq("user_id", userId);

  if (partErr || !parts || parts.length === 0) {
    logError("getMyGames", partErr?.message);
    return [];
  }

  const gameIds = parts.map((p) => p.game_id);
  const { data, error } = await supabase
    .from("games")
    .select("id, court_id, played_at, score_a, score_b, winner_side, courts(name)")
    .in("id", gameIds)
    .order("played_at", { ascending: false })
    .limit(limit)
    .returns<GameWithCourtRow[]>();

  if (error || !data) {
    logError("getMyGames:games", error?.message);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    courtId: row.court_id,
    courtName: row.courts?.name ?? "Unknown Court",
    playedAt: row.played_at,
    scoreA: row.score_a,
    scoreB: row.score_b,
    winnerSide: row.winner_side,
  }));
}

/**
 * Leaderboard for a court: the locals (profiles whose home court is this court),
 * ranked by ELO. Callers gate visibility (free users see their own rank only,
 * LocalPlus sees the full board) per the product model.
 */
export async function getCourtLeaderboard(
  courtId: string,
  limit = 100
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, elo_rating, wins, losses")
    .eq("local_court_id", courtId)
    .order("elo_rating", { ascending: false })
    .limit(limit)
    .returns<ProfileLeaderboardRow[]>();

  if (error || !data) {
    logError("getCourtLeaderboard", error?.message);
    return [];
  }

  return data.map((row) => ({
    userId: row.id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    eloRating: row.elo_rating,
    wins: row.wins,
    losses: row.losses,
  }));
}
