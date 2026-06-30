import { Court, CourtSport, CourtStatus, SAMPLE_COURTS } from "@/constants/data";
import { supabase } from "@/lib/supabase";

// Supabase row shape — match your actual table columns
interface SupabaseCourtRow {
  id: string;
  name: string;
  sport: string;
  neighborhood?: string | null;
  city?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  active_count?: number | null;
  max_capacity?: number | null;
  rating?: number | null;
  rating_count?: number | null;
  surface?: string | null;
  lights?: boolean | null;
  covered?: boolean | null;
  image_uri?: string | null;
  status?: string | null;
  local_count?: number | null;
  added_by?: string | null;
  court_count?: number | null;
  hoop_count?: number | null;
  net_type?: string | null;
  rim_type?: string | null;
  water_fountain?: boolean | null;
  added_date?: string | null;
}

function normalizeSport(raw: string): CourtSport {
  const upper = (raw ?? "").toUpperCase();
  const valid: CourtSport[] = ["BASKETBALL", "PICKLEBALL", "TENNIS", "SOCCER", "VOLLEYBALL"];
  return valid.includes(upper as CourtSport) ? (upper as CourtSport) : "BASKETBALL";
}

function normalizeStatus(raw: string | null | undefined): CourtStatus {
  if (raw === "community" || raw === "pending" || raw === "confirmed") return raw;
  return "confirmed";
}

function mapRow(row: SupabaseCourtRow): Court {
  return {
    id: String(row.id),
    name: row.name ?? "Unknown Court",
    sport: normalizeSport(row.sport),
    neighborhood: row.neighborhood ?? "",
    city: row.city ?? "",
    address: row.address ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    activeCount: row.active_count ?? 0,
    maxCapacity: row.max_capacity ?? 10,
    rating: row.rating ?? 4.0,
    ratingCount: row.rating_count ?? 0,
    surface: row.surface ?? "ASPHALT",
    lights: row.lights ?? false,
    covered: row.covered ?? false,
    imageUri: row.image_uri ?? undefined,
    status: normalizeStatus(row.status),
    localCount: row.local_count ?? 0,
    addedBy: row.added_by ?? undefined,
    courtCount: row.court_count ?? undefined,
    hoopCount: row.hoop_count ?? undefined,
    netType: (row.net_type as "CHAIN" | "NYLON" | "METAL" | undefined) ?? undefined,
    rimType: (row.rim_type as "SINGLE" | "DOUBLE" | undefined) ?? undefined,
    waterFountain: row.water_fountain ?? undefined,
    addedDate: row.added_date ?? undefined,
  };
}

/**
 * Fetch courts from Supabase.
 * Tries `courts_with_stats` view first, falls back to `courts` table.
 * On any failure returns null so the caller can use local sample data.
 */
export async function fetchCourtsFromSupabase(): Promise<Court[] | null> {
  try {
    // Try the enriched view first
    let { data, error } = await supabase
      .from("courts_with_stats")
      .select("*")
      .limit(5000);

    if (error || !data || data.length === 0) {
      // Fall back to the base courts table
      const fallback = await supabase
        .from("courts")
        .select("*")
        .limit(5000);
      if (fallback.error || !fallback.data || fallback.data.length === 0) {
        return null;
      }
      data = fallback.data;
    }

    return (data as SupabaseCourtRow[]).map(mapRow);
  } catch {
    return null;
  }
}
