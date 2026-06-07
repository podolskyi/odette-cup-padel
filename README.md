# 🎾 Odette Cup

A playful, mobile-first stats app for the Ubud Ukrainian padel group's **Odette Cup** series.
It ships seeded with **four real events** (each titled *Odette Cup, {date}* with a fun nickname
like "Spring Opener" / "Sunset Smash"), parsed from americano-padel.com, and turns every match into
standings, fun awards, Elo ratings, partnerships/rivalries, and shareable **Wrapped** recap cards.

Built from [`padel-stats-app-spec.md`](./padel-stats-app-spec.md).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # stats acceptance suite (spec §10)
npm run build      # type-check + production build
```

## What's inside

- **Dashboard** — season leaderboard, Elo ratings + rating-race chart, tournament cards.
- **Tournament** — podium, final standings, auto-generated award stickers, and a **Match Log
  with inline score editing** (every stat recomputes live).
- **Player profile** — Elo over time, best/worst/most-frequent partner, nemesis, finish history.
- **Explorer** — sortable partnerships & rivalries tables and the **"The Glue"** leaderboard.
- **Wrapped** — swipeable full-screen recap slides, each **exportable as a PNG** for the group chat.

## Architecture

- **`src/stats/`** — pure, unit-tested stat engine (single source of truth = the match list;
  everything is derived, never stored precomputed). Standings, partnerships, rivalries, awards,
  season aggregate, team-Elo ratings, and the Glue metric.
- **`src/data/`** — the seeded Odette + demo fixtures.
- **`src/store/`** — Zustand store persisted to `localStorage` (+ JSON export). Seeds on first run.
- **`src/components/`, `src/pages/`** — the playful neo-brutalist UI (Tailwind, Recharts,
  `html-to-image`).

## Verified against the spec

`npm test` reproduces spec §10 exactly: the 16-row standings (incl. the three-way 96/0 tiebreak
Elan > Veronika > Miroslav) and the awards (Demolition = Irina & Alexander 14-2 R9, Diplomat =
Veronika, Wall & Cardio = Oleksii, Wooden Spoon = sofia, perfect pairs Alex & Oleksii 3-0, etc.).

## Data & import

The seeded events were parsed from americano-padel.com round pages. Those pages are server-rendered
with all results in the HTML, laid out as `Round #N → Court N → "SA SB" → a1 / a2 / b1 / b2`. The
parser lives in **`src/parser/americanoPadel.ts`** (unit-tested) and the parsed rows are embedded as
fixtures in `src/data/realFixtures.ts`.

**Note — adding tournaments by URL is deferred.** A browser-only SPA can't fetch americano-padel.com
directly (no CORS headers → `Failed to fetch`). Two follow-ups, in order:

1. **Paste import (next, no backend):** an "Add tournament" screen where you paste the page text (or
   raw HTML) → the existing parser → an editable preview → save. Pure client-side.
2. **Live add-by-URL (later, needs the store/backend):** a small serverless proxy (Vercel/Netlify
   function or Cloudflare Worker) fetches + parses server-side; the app calls our own endpoint.

## Organizer settings (`/settings`)

A hidden, secret-word-gated page (the secret lives in `src/lib/settingsGate.ts` — currently
`padel-admin`; it's a client-side JS check, not real security). Today it hosts **player alias
linking**: merge the same person typed differently across events (e.g. `Oleksey` → `Oleksii`),
with smart duplicate suggestions. The whole app (standings, ratings, partners, profiles) recomputes
through the alias map instantly.

**No-backend workflow:** baked-in merges live in `src/data/aliases.ts` (`SEED_ALIASES`) and ship with
the deploy, so everyone sees the same merged players. To add more: open `/settings` → link names →
**Export for deploy** → paste into `src/data/aliases.ts` → bump the storage key in
`src/store/useAppStore.ts` → redeploy. (A backend store later removes the redeploy step.)

Other deferred, additive items: JSON import.
