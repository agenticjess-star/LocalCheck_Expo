# LocalCheck — Street Sports App

> Find active courts. Check in. Play. Rank up.

LocalCheck brings the raw energy of street sports to your pocket. Discover who's playing at nearby courts, check in to broadcast your presence, join scheduled game runs, and track your ELO ranking in real-time.

---

## Design Direction

**Stark editorial brutalism** — inspired by Nike SNKRS and Victory Journal.

- Heavy black-and-white layouts
- Massive Oswald typography for stats and headings
- Volt green (`#DFFF00`) accents for live states and actions
- Zero border-radius — hard edges everywhere
- No drop shadows; 1px solid borders define the grid
- High-contrast monochromatic UI to let court photos pop

---

## Screens

| Screen | Route | Description |
|--------|-------|-------------|
| **Home / Map** | `/(tabs)/` | Full-screen map with brutalist court markers and live player counts |
| **The Feed** | `/(tabs)/feed` | Reverse-chronological community activity — check-ins, results, hypes |
| **Explore** | `/(tabs)/explore` | Live courts list + city ELO leaderboard |
| **My ELO** | `/(tabs)/elo` | Brutalist stat dashboard — rank, win/loss, recent matches |
| **Court Profile** | `/court/[id]` | Editorial spread: conditions, roster, upcoming runs, check-in |
| **Game Run** | `/run/[id]` | Matchmaking lobby — team A vs B, ELO balancing, RSVP |

---

## Key User Flows

### Check In to a Court
1. Open **Map** tab → tap a court marker (shows player count)
2. Bottom sheet slides up with court details, live roster
3. Tap **CHECK IN** → status updates, avatar added to roster, feed event generated
4. Haptic feedback confirms action

### Join a Game Run
1. Open **Court Profile** → scroll to **Upcoming Runs**
2. Tap a run card → **Game Run** lobby loads
3. Tap an open slot on Team A or B → slot fills with your avatar + ELO
4. When ready, record WIN / LOSS to update ELO

### Track ELO
- **My ELO** tab shows your current rank number (animated odometer-style on load)
- Win/Loss counter, win rate percentage
- Recent match history with ELO deltas (+15, -10, etc.)
- Tier system: BRONZE → SILVER → GOLD → PLATINUM (based on ELO range)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile Framework** | Expo (React Native) with Expo Router |
| **Navigation** | Expo Router file-based routing + NativeTabs (iOS 26 liquid glass) |
| **State Management** | React Context + AsyncStorage (persistent local state) |
| **Fonts** | Oswald (headings/stats) + Inter (body) via `@expo-google-fonts` |
| **Icons** | `@expo/vector-icons` (Feather) + SF Symbols (iOS) |
| **Maps** | `react-native-maps` v1.18.0 (Expo Go compatible) |
| **Haptics** | `expo-haptics` |
| **Persistence** | `@react-native-async-storage/async-storage` |
| **API Layer** | Express 5 (shared monorepo API server, ready for backend expansion) |
| **Database** | PostgreSQL + Drizzle ORM (provisioned, schema-ready for persistence) |

---

## Database Strategy (Modular by Design)

The app is built **frontend-first with AsyncStorage** for the initial build. The database layer is completely modular:

- `lib/db/` contains the Drizzle ORM setup with PostgreSQL connection
- `lib/api-spec/openapi.yaml` is the OpenAPI contract for future API endpoints
- When ready to add server-side persistence, simply:
  1. Define tables in `lib/db/src/schema/`
  2. Add API endpoints to `artifacts/api-server/src/routes/`
  3. Update `lib/api-spec/openapi.yaml` and run codegen
  4. Replace AsyncStorage calls with React Query hooks from `@workspace/api-client-react`

This approach means **zero migration pain** — the backend is a plug-in, not a dependency.

---

## Project Structure

```
artifacts/
  mobile/               # Expo mobile app
    app/
      (tabs)/
        index.tsx       # Map screen
        feed.tsx        # Community feed
        explore.tsx     # Leaderboard + live courts
        elo.tsx         # ELO dashboard
        _layout.tsx     # Tab navigation (NativeTabs + classic fallback)
      court/[id].tsx    # Court profile
      run/[id].tsx      # Game run lobby
      _layout.tsx       # Root layout + providers
    components/         # Reusable UI components
    constants/
      colors.ts         # Design tokens
      typography.ts     # Font families + sizes
      data.ts           # Types + sample data
    context/
      AppContext.tsx     # Global app state
    assets/images/      # Icons + placeholders (AI-generated)
  api-server/           # Express API (ready for backend routes)

lib/
  db/                   # Drizzle ORM + PostgreSQL
  api-spec/             # OpenAPI spec (source of truth)
  api-client-react/     # Generated React Query hooks
  api-zod/              # Generated Zod validators
```

---

## Design Tokens

```css
--color-primary:    #000000  /* Absolute black */
--color-background: #FFFFFF  /* Stark white */
--color-surface:    #F4F4F4  /* Secondary cards */
--color-text:       #000000
--color-muted:      #888888  /* Timestamps, borders */
--color-accent:     #DFFF00  /* Volt green — live, active, check-in */
--font-heading:     Oswald 700 (all caps, tight tracking)
--font-body:        Inter 400/500/600/700
--radius:           0px      /* Hard edges everywhere */
```

---

## Running the App

```bash
# Install dependencies
pnpm install

# Start the Expo dev server
pnpm --filter @workspace/mobile run dev
```

Scan the QR code in the Replit URL bar with **Expo Go** to preview on your physical device.

---

## Activity Log

See `ACTIVITY_LOG.md` for a full record of development decisions and design choices.
