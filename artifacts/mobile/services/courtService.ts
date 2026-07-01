import { Court, CourtSport, CourtStatus } from "@/constants/data";
import { supabase } from "@/lib/supabase";

// Max courts to pull on initial load. The live table holds ~5.7k courts; this
// cap keeps the first paint bounded. Location-scoped fetching is a roadmap item.
const COURT_FETCH_LIMIT = 8000;

// PostgREST caps every response at `max-rows` (1000 on Supabase) regardless of
// the `.limit()` we ask for, so a single request silently returns only the
// first 1000 courts — which dropped the pickleball courts entirely. We page
// through with `.range()` (ordered by id for a stable window) until we've read
// everything or hit COURT_FETCH_LIMIT.
const PAGE_SIZE = 1000;

async function fetchAllPages(
  table: "courts_with_stats" | "courts",
): Promise<{ data: SupabaseCourtRow[] | null; error: unknown }> {
  const all: SupabaseCourtRow[] = [];
  for (let from = 0; from < COURT_FETCH_LIMIT; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, COURT_FETCH_LIMIT) - 1;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("is_archived", false)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) return { data: null, error };
    if (!data || data.length === 0) break;
    all.push(...(data as SupabaseCourtRow[]));
    if (data.length < PAGE_SIZE) break; // last page
  }
  return { data: all, error: null };
}

/**
 * Row shape returned by the `courts_with_stats` view (and the base `courts`
 * table). Mirrors the live Supabase schema — see docs/PROJECT_STATE.md.
 */
interface SupabaseCourtRow {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  sport_type: string;
  added_by?: string | null;
  image_url?: string | null;
  verification_threshold?: number | null;
  is_archived?: boolean | null;
  location?: string | null;
  state?: string | null;
  // courts_with_stats only
  local_player_count?: number | null;
  is_confirmed?: boolean | null;
}

function normalizeSport(raw: string | null | undefined): CourtSport {
  const upper = (raw ?? "").toUpperCase();
  const valid: CourtSport[] = [
    "BASKETBALL",
    "PICKLEBALL",
    "TENNIS",
    "SOCCER",
    "VOLLEYBALL",
  ];
  return valid.includes(upper as CourtSport) ? (upper as CourtSport) : "BASKETBALL";
}

function maxCapacityForSport(sport: CourtSport): number {
  if (sport === "BASKETBALL") return 10;
  if (sport === "TENNIS") return 4;
  return 8;
}

/**
 * Build a human-readable "neighborhood" line from the available location
 * columns, falling back to parsing the free-text address (which is typically
 * "Street, City, ST, ZIP").
 */
function deriveNeighborhood(row: SupabaseCourtRow): string {
  if (row.location && row.state) return `${row.location}, ${row.state}`;
  if (row.location) return row.location;
  if (row.state) return row.state;

  const parts = (row.address ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) return `${parts[1]}, ${parts[2]}`; // City, ST
  if (parts.length === 2) return parts[1];
  return parts[0] ?? "";
}

function statusFromStats(row: SupabaseCourtRow): CourtStatus {
  const locals = row.local_player_count ?? 0;
  const threshold = row.verification_threshold ?? 5;
  if (row.is_confirmed || locals >= threshold) return "community";
  return "confirmed";
}

function mapRow(row: SupabaseCourtRow): Court {
  const sport = normalizeSport(row.sport_type);
  return {
    id: String(row.id),
    name: row.name ?? "Unknown Court",
    sport,
    neighborhood: deriveNeighborhood(row),
    city: row.location ?? "",
    address: row.address ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    // No live presence column yet — populated client-side / future check-in join.
    activeCount: 0,
    maxCapacity: maxCapacityForSport(sport),
    // Ratings are not yet modelled in the DB; default to "no ratings".
    rating: 0,
    ratingCount: 0,
    surface: "",
    lights: false,
    covered: false,
    imageUri: row.image_url ?? undefined,
    status: statusFromStats(row),
    localCount: row.local_player_count ?? 0,
    addedBy: row.added_by ?? undefined,
  };
}

/**
 * Fetch courts from Supabase.
 * Tries the enriched `courts_with_stats` view first, falls back to the base
 * `courts` table. Returns `null` on any failure (or empty result) so the caller
 * can fall back to local sample data.
 *
 * NOTE: the base `courts` table is RLS-restricted to authenticated users, but
 * `courts_with_stats` is a security-definer view that is readable anonymously,
 * so logged-out users still see the map. See docs/PROJECT_STATE.md (§4).
 */
export async function fetchCourtsFromSupabase(): Promise<Court[] | null> {
  try {
    let { data, error } = await fetchAllPages("courts_with_stats");

    if (error || !data || data.length === 0) {
      const fallback = await fetchAllPages("courts");
      if (fallback.error || !fallback.data || fallback.data.length === 0) {
        if (__DEV__ && (error || fallback.error)) {
          console.warn(
            "[courtService] Supabase court fetch failed:",
            error ?? fallback.error,
          );
        }
        return null;
      }
      data = fallback.data;
    }

    return (data as SupabaseCourtRow[])
      .map(mapRow)
      .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
  } catch (err) {
    if (__DEV__) {
      console.warn("[courtService] Unexpected error fetching courts:", err);
    }
    return null;
  }
}
