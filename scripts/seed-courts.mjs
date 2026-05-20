/**
 * Seed courts from CSV into PostgreSQL
 * Run: node scripts/seed-courts.mjs
 */

import fs from "node:fs";
import readline from "node:readline";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Major city popularity boosts
const CITY_POPULARITY = {
  "New York": 95, "Los Angeles": 93, "Chicago": 91, "Houston": 89,
  "Phoenix": 87, "Philadelphia": 87, "San Antonio": 85, "San Diego": 85,
  "Dallas": 85, "San Jose": 83, "Austin": 83, "Jacksonville": 81,
  "Fort Worth": 81, "Columbus": 79, "Charlotte": 79, "Indianapolis": 79,
  "San Francisco": 88, "Seattle": 85, "Denver": 83, "Nashville": 81,
  "Oklahoma City": 77, "El Paso": 75, "Washington": 88, "Las Vegas": 84,
  "Louisville": 77, "Memphis": 79, "Portland": 82, "Baltimore": 79,
  "Milwaukee": 77, "Albuquerque": 73, "Tucson": 72, "Fresno": 70,
  "Sacramento": 78, "Kansas City": 79, "Mesa": 72, "Atlanta": 86,
  "Omaha": 71, "Colorado Springs": 74, "Raleigh": 78, "Minneapolis": 81,
  "Miami": 87, "Oakland": 80, "Tulsa": 72, "Cleveland": 77,
  "Wichita": 68, "Arlington": 74, "New Orleans": 82, "Bakersfield": 65,
  "Tampa": 81, "Honolulu": 78, "Aurora": 71, "Anaheim": 73,
  "Santa Ana": 70, "Corpus Christi": 67, "Riverside": 69, "St. Louis": 79,
  "Lexington": 71, "Pittsburgh": 78, "Stockton": 65, "Anchorage": 60,
  "Cincinnati": 76, "St. Paul": 74, "Greensboro": 70, "Toledo": 69,
  "Newark": 75, "Orlando": 80, "Irvine": 73, "Jersey City": 76,
  "San Juan": 72, "Bayamon": 65, "Carolina": 63, "Ponce": 60,
};

function colorToSport(hex) {
  if (!hex || hex.length < 7) return "BASKETBALL";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);

  // Orange/red dominant → basketball
  if (r > 150 && r > g * 1.4 && r > b * 1.4) return "BASKETBALL";
  // Blue dominant → basketball (blue courts)
  if (b > 140 && b > r * 1.3 && b > g * 0.9) return "BASKETBALL";
  // Green dominant → tennis or pickleball
  if (g > r && g > b && g > 80) {
    const rand = (parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(5, 7), 16)) % 3;
    if (rand === 0) return "TENNIS";
    if (rand === 1) return "PICKLEBALL";
    return "BASKETBALL";
  }
  // Red/clay-ish (tennis)
  if (r > 130 && r > g * 1.1 && b < 100) return "TENNIS";
  return "BASKETBALL";
}

function parseLine(line) {
  const cols = [];
  let col = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
    } else if (c === "," && !inQuote) {
      cols.push(col);
      col = "";
    } else {
      col += c;
    }
  }
  cols.push(col);
  return cols;
}

function cityPopularity(city, state) {
  if (CITY_POPULARITY[city]) {
    return CITY_POPULARITY[city] + Math.floor(Math.random() * 10) - 5;
  }
  // State-level baseline
  const stateBase = {
    CA: 65, NY: 65, TX: 62, FL: 62, IL: 60, PA: 58, OH: 56,
    GA: 58, NC: 56, MI: 55, NJ: 57, WA: 58, AZ: 55, TN: 55,
    CO: 57, MA: 59, IN: 52, MO: 52, WI: 51, MN: 53, MD: 56,
    PR: 48, default: 45,
  };
  const base = stateBase[state] ?? stateBase.default;
  return Math.max(5, Math.min(95, base + Math.floor(Math.random() * 20) - 10));
}

function localCount(popularity) {
  if (popularity >= 85) return Math.floor(Math.random() * 15) + 8;
  if (popularity >= 70) return Math.floor(Math.random() * 8) + 3;
  if (popularity >= 50) return Math.floor(Math.random() * 4) + 1;
  return Math.floor(Math.random() * 2);
}

function activeCount(popularity) {
  if (Math.random() > 0.3) return 0; // 70% of courts inactive at any moment
  if (popularity >= 85) return Math.floor(Math.random() * 15) + 5;
  if (popularity >= 70) return Math.floor(Math.random() * 8) + 1;
  return Math.floor(Math.random() * 3) + 1;
}

function courtStatus(lc) {
  if (lc >= 5) return "community";
  return "confirmed";
}

function surfaceFromSport(sport) {
  if (sport === "TENNIS") return Math.random() > 0.5 ? "HARDCOURT" : "CLAY";
  if (sport === "PICKLEBALL") return "HARDCOURT";
  return Math.random() > 0.3 ? "ASPHALT" : "CONCRETE";
}

function rating() {
  return Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
}

function ratingCount(popularity) {
  const base = popularity * 3;
  return Math.max(1, Math.floor(base + Math.random() * base));
}

async function main() {
  const client = await pool.connect();
  try {
    // Create table if not exists (schema should be pushed separately, but as fallback)
    await client.query(`
      CREATE TABLE IF NOT EXISTS courts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sport TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        active_count INTEGER NOT NULL DEFAULT 0,
        local_count INTEGER NOT NULL DEFAULT 0,
        max_capacity INTEGER NOT NULL DEFAULT 10,
        rating REAL NOT NULL DEFAULT 0,
        rating_count INTEGER NOT NULL DEFAULT 0,
        surface TEXT NOT NULL DEFAULT 'ASPHALT',
        lights BOOLEAN NOT NULL DEFAULT false,
        covered BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'confirmed',
        popularity INTEGER NOT NULL DEFAULT 0,
        added_by TEXT,
        verification_photo TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_courts_lat_lng ON courts(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_courts_popularity ON courts(popularity);
      CREATE INDEX IF NOT EXISTS idx_courts_state ON courts(state);
    `);

    const existingCount = await client.query("SELECT COUNT(*) FROM courts");
    if (parseInt(existingCount.rows[0].count) > 1000) {
      console.log(`Courts table already has ${existingCount.rows[0].count} rows. Skipping seed.`);
      return;
    }

    console.log("Starting court data seed...");

    const csvPath = new URL("../attached_assets/courts_data_1775603057969.csv", import.meta.url).pathname;
    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath),
      crlfDelay: Infinity,
    });

    const BATCH_SIZE = 500;
    let batch = [];
    let total = 0;
    let isFirstLine = true;
    const cityCourtCount = {};

    for await (const line of rl) {
      if (isFirstLine) { isFirstLine = false; continue; }
      if (!line.trim()) continue;

      const cols = parseLine(line);
      if (cols.length < 9) continue;

      const id = cols[0]?.trim();
      const city = cols[2]?.trim() || "Unknown";
      const color = cols[3]?.trim();
      const center = cols[4]?.trim();
      const state = cols[6]?.trim();

      if (!id || !center) continue;

      const parts = center.split(",");
      if (parts.length < 2) continue;

      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) continue;

      const sport = colorToSport(color);
      const pop = cityPopularity(city, state);
      const lc = localCount(pop);
      const ac = activeCount(pop);
      const ratingVal = rating();
      const ratingCnt = ratingCount(pop);

      // Generate unique name per city
      const cityKey = `${city}-${state}`;
      cityCourtCount[cityKey] = (cityCourtCount[cityKey] || 0) + 1;
      const suffix = cityCourtCount[cityKey] > 1 ? ` #${cityCourtCount[cityKey]}` : "";
      const name = `${city} ${sport.charAt(0) + sport.slice(1).toLowerCase()} Court${suffix}`;

      batch.push({
        id,
        name,
        sport,
        city,
        state,
        address: `${city}, ${state}`,
        latitude: lat,
        longitude: lng,
        active_count: ac,
        local_count: lc,
        max_capacity: sport === "BASKETBALL" ? 10 : sport === "TENNIS" ? 4 : 8,
        rating: ratingVal,
        rating_count: ratingCnt,
        surface: surfaceFromSport(sport),
        lights: Math.random() > 0.6,
        covered: Math.random() > 0.85,
        status: courtStatus(lc),
        popularity: Math.max(0, Math.min(100, pop)),
      });

      if (batch.length >= BATCH_SIZE) {
        await insertBatch(client, batch);
        total += batch.length;
        process.stdout.write(`\r  Inserted ${total} courts...`);
        batch = [];
      }
    }

    if (batch.length > 0) {
      await insertBatch(client, batch);
      total += batch.length;
    }

    console.log(`\n✓ Seeded ${total} courts successfully!`);
  } finally {
    client.release();
    await pool.end();
  }
}

async function insertBatch(client, batch) {
  if (batch.length === 0) return;
  const cols = [
    "id", "name", "sport", "city", "state", "address",
    "latitude", "longitude", "active_count", "local_count", "max_capacity",
    "rating", "rating_count", "surface", "lights", "covered", "status", "popularity"
  ];
  const values = [];
  const placeholders = batch.map((row, i) => {
    const base = i * cols.length;
    values.push(
      row.id, row.name, row.sport, row.city, row.state, row.address,
      row.latitude, row.longitude, row.active_count, row.local_count, row.max_capacity,
      row.rating, row.rating_count, row.surface, row.lights, row.covered,
      row.status, row.popularity
    );
    return `(${cols.map((_, j) => `$${base + j + 1}`).join(", ")})`;
  });

  const sql = `
    INSERT INTO courts (${cols.join(", ")})
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id) DO NOTHING
  `;
  await client.query(sql, values);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
