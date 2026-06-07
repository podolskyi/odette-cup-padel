# Padel Tournament Stats App — Build Specification

> A spec for a coding agent. It describes a small web application that ingests padel
> tournament results (pasted as text), stores them, and produces statistics and shareable
> recaps — for a single tournament and aggregated across all tournaments.

---

## 1. Context & Goal

A recreational padel group (the Ubud Ukrainian community) plays a weekly tournament,
usually in **Americano** format, occasionally **Mexicano**. Players rotate partners every
round, so over a night each person plays alongside and against many others. Skill levels
vary widely, and that mix is the point — the app should celebrate everyone, not just the winners.

**Goal:** Build a simple web app where a user can paste one tournament's results, save it,
and immediately see rich stats + fun awards. As more tournaments are added, the app builds an
all-time picture: top players, best partnerships, rivalries, and a season leaderboard. Output
should be fun and shareable to a group chat.

**Primary user:** one organizer entering data on a phone or laptop, then sharing results.
Mobile-first, but must work on desktop.

---

## 2. Core Domain Model

### Format primer (so the logic is correct)
- A **tournament** is one event (one night), consisting of multiple **rounds**.
- Each round has multiple **courts**. On each court, **2 players vs 2 players** play one **match**.
- Every match is played to a fixed total of points (here **16**: a `8-8` match means both teams
  reached 8; an `11-5` means 11 vs 5; the two scores always sum to the match total).
- A player's tournament **points = the sum of points their team scored** in every match they played.
- Partners **rotate** each round, so partnerships and opponents change constantly.
- **Americano vs Mexicano:** the only difference relevant to this app is *how pairings are chosen*
  (fixed schedule vs. ranking-based). The data we store is identical for both. Treat `format` as a
  label only. Match total points (16, 21, 24, 32…) is a per-tournament setting, not hardcoded.

### Entities

```
Tournament
  id            string (uuid)
  name          string            e.g. "Odette Cup"
  date          string (ISO yyyy-mm-dd)
  format        "Americano" | "Mexicano" | "Other"
  pointsPerMatch number            e.g. 16   (sum of the two scores in any match)
  matches       Match[]

Match
  round         number            1-based
  court         number            1-based (optional; for display only)
  teamA         [Player, Player]  player names
  teamB         [Player, Player]
  scoreA        number
  scoreB        number

Player                            identified by canonical name (string)
```

> **Players are identified by name string.** Names are case-sensitive and trimmed.
> IMPORTANT: in the sample data, **"Denis" and "Denis R" are two different people** — do not
> merge similar names automatically. (See §8 on the alias/merge tool for cross-tournament typos.)

---

## 3. Input: Paste Format & Parsing

The app must accept a **pasted text block** describing one tournament. Define a clean canonical
format (below). The "Add Tournament" screen pastes text → parses → shows a **preview table** of
parsed matches → user confirms → saves.

### Canonical paste format

Header lines start with `#` (key: value). Then `Round N` markers, then one line per match:
`teamA players | teamB players | scoreA-scoreB`, where players within a team are comma-separated.

```
# name: Odette Cup
# date: 2026-06-07
# format: Americano
# points: 16

Round 1
Alex, Miroslav | Sabrina, Alexander | 8-8
Roman, Elan | Denis R, Veronika | 11-5
Denny, sofia | Sergey, Oleksii | 3-13
Denis, Vova | Illya, Irina | 7-9

Round 2
Sergey, Elan | Roman, Oleksii | 10-6
...
```

Parsing rules:
- Lines beginning with `#` set tournament metadata. Missing `points` → infer from the first match
  (scoreA + scoreB). Missing `name`/`date` → prompt the user in the UI before saving.
- `Round N` (case-insensitive) starts a new round. `court` is optional; if a `Court N` token
  appears it may be captured, otherwise auto-number courts within a round.
- Player names may contain spaces ("Denis R"). Split team members on commas, the three match
  fields on `|`, and the score on `-` or whitespace (`11-5`, `11 5`, `11:5` all valid).
- Be lenient with extra whitespace and blank lines. Reject (with a clear error pointing at the
  line) any match that doesn't have exactly 2 + 2 players and 2 numeric scores.

### Stretch goal — raw americano-padel.com paste
Optionally support the messier copy/paste straight from americano-padel.com, where player names,
`vs`, and `Court N` appear on separate lines and all scores for a round arrive in a trailing block
(e.g. `08 08 11 05` = Court1 `8-8`, Court2 `11-5`). This is a nice-to-have; the canonical format
above is the contract. If implemented, run it through the same preview-and-confirm flow.

### Editing
After parsing, the preview table must be **editable** (fix a score, fix a name) before saving.
Saved tournaments must also be editable and deletable later.

---

## 4. Statistics — exact definitions

All stats derive from the match list. Define them precisely; the agent should implement these
formulas and the acceptance tests in §10 must pass.

### 4.1 Per-player, per-tournament
For each player, over all matches they appear in:
- **PF (points for)** = Σ of their own team's score.
- **PA (points against)** = Σ of the opposing team's score.
- **Diff** = PF − PA.
- **W / L / T** = matches their team won / lost / drew.
- **Games** = W + L + T.
- **Win rate** = W / Games.
- **Tournament points** = PF (this is the ranking number in Americano).
- **Avg for / against per game** = PF / Games, PA / Games.

**Standings sort order** (verified against real data — must match exactly):
`points DESC, then Diff DESC, then Wins DESC, then Losses ASC`.

### 4.2 Partnerships (within and across tournaments)
For each **unordered pair** of players who were teammates:
- Games together, W-L-T together, points scored together, win rate, avg points/game.
- **Best duo** = highest win rate among pairs with `games >= MIN_PAIR_GAMES` (default 2),
  tiebreak by points/game.
- **Perfect pair award** = any duo undefeated together with `games >= 2`.

### 4.3 Rivalries / head-to-head (opponents)
For each **ordered pair (A, B)** where A and B were on opposite teams:
- A's wins / losses / ties vs B.
- **Nemesis of X** = the opponent with the best record against X (most wins, min 2 meetings),
  tiebreak by point margin.

### 4.4 Season / all-time aggregate (per player)
- Tournaments played; total points; avg points per tournament.
- Total W-L-T; overall win rate.
- **Tournament wins** = number of 1st-place finishes; **podiums** = top-3 finishes.
- **Average finish position**; best finish; worst finish.
- **Rating** (see §5).
- Most-frequent partner; best partner (by win rate, min games); nemesis.

### 4.5 "The Glue" (a player who lifts their partners)
Season-level metric. For player X: for each partner P, compute P's win rate **with X** minus P's
**baseline** win rate (across all P's games). Average these deltas over all of X's partners
(weight by games together; require a minimum total sample, e.g. 6 games). Highest average uplift =
"The Glue." Show as a leaderboard; only compute once enough data exists.

### 4.6 Funny awards (auto-generated per tournament)
Each is a detection rule over one tournament's matches. Display as fun cards.
- **Demolition Award** — the single match with the largest score margin (name the winning duo & the score).
- **The Diplomat** — most ties.
- **The Wall** — lowest PA per game (min 4 games).
- **Cardio King/Queen** — highest PF total.
- **Heartbreaker** — most losses by a margin of ≤ 2 (e.g. 7-9).
- **Giant Slayer** — biggest upset: a head-to-head win where the loser finished far higher in the
  final standings (largest finishing-rank gap, loser ranked above winner).
- **Most Carried** — player with the largest spread between their best-result partner and
  worst-result partner (by win rate with each, min 2 games each). Affectionate, not an insult.
- **Wooden Spoon** — last place. Keep the copy warm/funny, never mean.

Awards should be data-driven with no ties left ambiguous (define a deterministic tiebreak, e.g.
earliest round, then alphabetical, so results are stable).

---

## 5. Rating system (cross-tournament skill rating)

Use a **team-Elo** so mixed skill levels are handled fairly and newcomers can climb.

- Every player starts at **1000**. Store rating history.
- Process matches in chronological order (by tournament date, then round).
- For a match, each side's team rating = **average of its two players' ratings**.
- Expected score for team A: `Ea = 1 / (1 + 10^((Rb - Ra) / 400))`, `Eb = 1 - Ea`.
- Actual result: win = 1, loss = 0, tie = 0.5 (use the W/L/T outcome, not the point score, for the
  base update; optionally scale K by margin — see below).
- Update each player on team A by `K * (Sa - Ea)` and each on team B by `K * (Sb - Eb)`.
- **K = 24** by default. Optional margin multiplier: `K_eff = K * (1 + |scoreA - scoreB| / pointsPerMatch)`
  so blowouts move ratings a bit more. Make the multiplier a config flag (default on).

Show a **rating leaderboard** and per-player rating-over-time. Note in code comments that this can
later be swapped for Glicko-2 (which adds rating reliability) without changing the data model.

---

## 6. Features by phase

### Phase 1 — MVP (build first)
1. **Add Tournament**: paste box → parse → editable preview → save. Seed the app's empty state with
   the June 7th fixture (§9) available as a one-click "load example" so the user can explore immediately.
2. **Tournament Detail**: final standings table (rank, name, W-L-T, Diff, points), plus an Insights
   panel (best duo, demolition, the diplomat, the wall, cardio, perfect pairs, wooden spoon).
3. **All-Time Dashboard**: season leaderboard (total points, tournaments, wins, podiums, win rate),
   list of saved tournaments (click into detail), and the rating leaderboard.
4. **Persistence**: localStorage. Plus **Export / Import JSON** of the whole dataset (so data is
   backed up and shareable between devices/people). Edit & delete tournaments.

### Phase 2 — Insights & sharing
5. **Player profiles**: per-player page — history, rating chart, best/worst partners, nemesis,
   per-tournament finishes.
6. **Partnerships & Rivalries** explorer (sortable tables; the §4.5 "Glue" leaderboard).
7. **Wrapped / shareable slides** (§7): a swipeable recap, with each card **exportable as an image**
   for the group chat.

---

## 7. Wrapped — shareable recap slides

A swipeable (left/right or scroll-snap) sequence of full-screen cards, generated per tournament,
designed to be screenshotted/exported and dropped into a group chat. Suggested sequence:
1. Title card — tournament name + date.
2. 🏆 Champion.
3. Podium — top 3.
4. 🤝 Duo of the night (best partnership).
5. 💥 The Demolition (biggest blowout).
6. 🧱 The Wall + 🏃 Cardio award.
7. 🕊️ The Diplomat + 😬 Heartbreaker.
8. 🥄 Wooden Spoon (warm).
9. Full standings table.

Each card needs an **"export as image"** action (e.g. render the card DOM to PNG via `html-to-image`
or `dom-to-image`). Also support a **season-finale Wrapped** later (all-time versions of the above).

---

## 8. Cross-tournament identity (alias/merge)

Across weeks the same person may be typed differently ("Sasha" one week, "Alexander" another).
Provide a lightweight **player manager**: list all distinct names ever seen, let the user **merge**
two names into one canonical player (applies retroactively to all stats) and **split** if a merge
was wrong. Do NOT auto-merge. Keep a stored alias map so re-imports stay consistent.

---

## 9. Test fixture — Odette Cup, 7 June 2026

Embed this as a loadable example AND as the parser/stats test (its output is known — see §10).

```
# name: Odette Cup
# date: 2026-06-07
# format: Americano
# points: 16

Round 1
Alex, Miroslav | Sabrina, Alexander | 8-8
Roman, Elan | Denis R, Veronika | 11-5
Denny, sofia | Sergey, Oleksii | 3-13
Denis, Vova | Illya, Irina | 7-9

Round 2
Sergey, Elan | Roman, Oleksii | 10-6
Irina, Miroslav | Illya, Alex | 5-11
Vova, Alexander | Denis, Sabrina | 9-7
Veronika, sofia | Denis R, Denny | 5-11

Round 3
Alex, Elan | Sergey, Illya | 10-6
Alexander, Denis R | Roman, Oleksii | 7-9
Irina, Sabrina | Vova, Denny | 4-12
Miroslav, sofia | Denis, Veronika | 11-5

Round 4
Alex, Oleksii | Sergey, Elan | 9-7
Illya, Roman | Vova, Denny | 7-9
Alexander, sofia | Miroslav, Denis R | 6-10
Denis, Veronika | Irina, Sabrina | 10-6

Round 5
Vova, Elan | Alex, Oleksii | 7-9
Roman, Denny | Sergey, Miroslav | 8-8
Denis, Illya | Alexander, Denis R | 6-10
Irina, sofia | Sabrina, Veronika | 8-8

Round 6
Vova, Oleksii | Alex, Elan | 12-4
Miroslav, Denny | Sergey, Denis R | 4-12
Denis, Alexander | Illya, Roman | 5-11
Irina, sofia | Sabrina, Veronika | 8-8

Round 7
Vova, Denis R | Sergey, Oleksii | 5-11
Alex, Elan | Illya, Roman | 11-5
Miroslav, Veronika | Alexander, Denny | 12-4
Denis, Sabrina | Irina, sofia | 8-8

Round 8
Sergey, Vova | Alex, Oleksii | 3-13
Roman, Denis R | Miroslav, Elan | 9-7
Alexander, Veronika | Illya, Denny | 8-8
Denis, Sabrina | Irina, sofia | 10-6

Round 9
Alex, Denis R | Sergey, Oleksii | 9-7
Vova, Roman | Miroslav, Elan | 11-5
Sabrina, Veronika | Illya, Denny | 6-10
Irina, Alexander | Denis, sofia | 14-2

Round 10
Alex, Roman | Denis R, Oleksii | 9-7
Vova, Elan | Sergey, Illya | 11-5
Irina, Miroslav | Alexander, Denny | 11-5
Sabrina, sofia | Denis, Veronika | 7-9

Round 11
Vova, Alex | Roman, Oleksii | 7-9
Miroslav, Elan | Sergey, Denis R | 7-9
Illya, Alexander | Irina, Veronika | 4-12
Sabrina, sofia | Denis, Denny | 6-10

Round 12
Alex, Denis R | Roman, Oleksii | 3-13
Sergey, Elan | Vova, Irina | 6-10
Illya, Miroslav | Veronika, Denny | 8-8
Denis, sofia | Sabrina, Alexander | 9-7
```

---

## 10. Acceptance criteria

The build is correct if, after loading the §9 fixture:

**A. Standings reproduce exactly** (16 players, sorted per §4.1):

| Rank | Player    | W-L-T | Diff | Points |
|-----:|-----------|-------|-----:|-------:|
| 1  | Oleksii   | 9-3-0 | +44 | 118 |
| 2  | Roman     | 8-3-1 | +24 | 108 |
| 3  | Alex      | 8-3-1 | +14 | 103 |
| 4  | Vova      | 7-5-0 | +14 | 103 |
| 5  | Irina     | 5-4-3 | +10 | 101 |
| 6  | Denis R   | 7-5-0 |  +2 |  97 |
| 7  | Sergey    | 5-6-1 |  +2 |  97 |
| 8  | Elan      | 5-7-0 |   0 |  96 |
| 9  | Veronika  | 4-4-4 |   0 |  96 |
| 10 | Miroslav  | 4-5-3 |   0 |  96 |
| 11 | Denny     | 5-4-3 |  -8 |  92 |
| 12 | Illya     | 4-6-2 | -12 |  90 |
| 13 | Denis     | 5-6-1 | -16 |  88 |
| 14 | Alexander | 3-7-2 | -18 |  87 |
| 15 | Sabrina   | 1-7-4 | -22 |  85 |
| 16 | sofia     | 2-7-3 | -34 |  79 |

> Note the three-way tie at 96 points / 0 diff (Elan, Veronika, Miroslav) resolves by wins then
> fewer losses: Elan (5W) > Veronika (4W, 4L) > Miroslav (4W, 5L). Implement the tiebreak so this order is produced.

**B. Awards on the fixture:**
- Demolition Award → **Irina & Alexander, 14-2** (Round 9), margin 12.
- The Diplomat → **Veronika** (4 ties).
- The Wall → **Oleksii** (≈6.17 PA/game).
- Cardio → **Oleksii** (118 PF).
- Wooden Spoon → **sofia**.
- A perfect pair → **Alex & Oleksii, 3-0** together (also Denny & Vova 2-0, Denis R & Sergey 2-0).

**C. Functional:** add → save → reload page → tournament persists (localStorage). Export JSON then
re-import yields identical stats. Adding a *second* tournament updates the all-time dashboard and
ratings. Editing a score recomputes everything.

---

## 11. Tech stack & non-functional

- **Frontend-only SPA** — recommend **React + TypeScript + Vite**, styling with **Tailwind CSS**.
  Deployable as static files (Vercel / Netlify / GitHub Pages). No backend required for MVP.
- **State/persistence:** in-memory app state + **localStorage**; all derived stats computed from the
  stored match list (single source of truth = the list of tournaments/matches). JSON export/import.
  Do NOT precompute and store stats — always derive, so edits stay consistent.
- **Charts:** a lightweight lib (Recharts) for the rating-over-time chart.
- **Image export:** `html-to-image` for Wrapped cards.
- **Design:** mobile-first, clean, playful, high-contrast, big readable tables; works well in both a
  phone browser and screenshotted into a chat. Light and dark mode appreciated, not required.
- **Code quality:** keep stat logic in a pure, well-tested module (`/stats`) decoupled from UI;
  include unit tests for the §10 acceptance criteria. Parser in its own module with its own tests.
- **No external API or login** for MVP. Everything runs client-side on the user's data.

---

## 12. Out of scope (for now)
Live scoring during play, automatic schedule generation, multi-user accounts/auth, and a shared
cloud database. The data model should not preclude adding a backend (e.g. Supabase) later for
shared multi-device data — keep the tournament/match JSON as the portable source of truth.
