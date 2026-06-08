import type { Dataset, Player } from '../types'
import { pairKey, toPlayerMatches, type Outcome } from './core'
import { computePartnerships, perfectPairs } from './partnerships'
import { computeRivalries, type HeadToHead } from './rivalries'
import { computeStandings } from './standings'
import { computeSeason } from './season'
import { computeGlue } from './glue'
import { computeRatings, START_RATING } from './ratings'

// Season-wide "hall of fame & shame" superlatives — fun, affectionate, shareable.
// Each is data-driven with a min-sample guard and a deterministic pick.

export interface FunInsight {
  key: string
  emoji: string
  title: string
  accent: string // accent key for styling
  players: Player[] // 1 (solo) or 2 (duo) players
  value: string // headline stat
  caption: string // the joke
}

const pctStr = (x: number) => `${Math.round(x * 100)}%`
const r1 = (x: number) => (Math.round(x * 10) / 10).toString()

export function funInsights(dataset: Pick<Dataset, 'tournaments' | 'aliases'>): FunInsight[] {
  const { tournaments, aliases } = dataset
  const byDate = [...tournaments].sort((a, b) => a.date.localeCompare(b.date))

  // Chronological match list (date → round → court) for streaks & order-sensitive stats.
  const ordered = byDate.flatMap((t) =>
    t.matches
      .map((m, i) => ({ m, i }))
      .sort((x, y) => x.m.round - y.m.round || (x.m.court ?? 0) - (y.m.court ?? 0) || x.i - y.i)
      .map((x) => x.m),
  )
  const rows = toPlayerMatches(ordered, aliases)

  // Per-player aggregates.
  interface Agg {
    player: Player
    seq: Outcome[]
    ties: number
    closeLoss: number // losses by ≤2
    closeWin: number // wins by ≤2
    wins: number
    winMargin: number // Σ margin in wins
  }
  const agg = new Map<Player, Agg>()
  const A = (p: Player): Agg => {
    let a = agg.get(p)
    if (!a) {
      a = { player: p, seq: [], ties: 0, closeLoss: 0, closeWin: 0, wins: 0, winMargin: 0 }
      agg.set(p, a)
    }
    return a
  }
  for (const r of rows) {
    const a = A(r.player)
    a.seq.push(r.result)
    const margin = r.pf - r.pa
    if (r.result === 'T') a.ties++
    else if (r.result === 'L') {
      if (r.pa - r.pf <= 2) a.closeLoss++
    } else {
      a.wins++
      a.winMargin += margin
      if (margin <= 2) a.closeWin++
    }
  }

  // Per-player finishes with field size (for trends, drama, spoons).
  const finishMap = new Map<Player, { rank: number; n: number; pct: number }[]>()
  for (const t of byDate) {
    const st = computeStandings(t, aliases)
    const n = st.length
    for (const s of st) {
      const pct = n > 1 ? ((n - s.rank) / (n - 1)) * 100 : 100
      const list = finishMap.get(s.player) ?? []
      list.push({ rank: s.rank, n, pct })
      finishMap.set(s.player, list)
    }
  }

  const partnerships = computePartnerships(ordered, aliases)
  const rivalries = computeRivalries(ordered, aliases)
  const season = computeSeason(tournaments, aliases)
  const glue = computeGlue(tournaments, aliases)

  const partnerCount = new Map<Player, number>()
  for (const p of partnerships) {
    partnerCount.set(p.players[0], (partnerCount.get(p.players[0]) ?? 0) + 1)
    partnerCount.set(p.players[1], (partnerCount.get(p.players[1]) ?? 0) + 1)
  }

  const out: FunInsight[] = []

  // 🧲 The Glue
  if (glue.length) {
    const g = glue[0]
    if (g.uplift > 0)
      out.push({ key: 'glue', emoji: '🧲', title: 'The Glue', accent: 'mint', players: [g.player], value: `+${Math.round(g.uplift * 100)}%`, caption: 'Quietly makes everyone they partner with better.' })
  }

  // 🪫 The Anchor (negative uplift)
  if (glue.length) {
    const g = glue[glue.length - 1]
    if (g.uplift < 0)
      out.push({ key: 'anchor', emoji: '🪫', title: 'The Anchor', accent: 'sky', players: [g.player], value: `${Math.round(g.uplift * 100)}%`, caption: 'Partners somehow forget how to play. We still love you 💙' })
  }

  // 💍 Ride or Die (most games together)
  const ride = [...partnerships].sort((a, b) => b.games - a.games || b.winRate - a.winRate)[0]
  if (ride && ride.games >= 2)
    out.push({ key: 'rideordie', emoji: '💍', title: 'Ride or Die', accent: 'punch', players: [...ride.players], value: `${ride.games} games · ${pctStr(ride.winRate)}`, caption: 'Glued at the hip. Padel soulmates.' })

  // 💔 Toxic Duo (most-paired, worst win rate)
  const toxicPool = partnerships.filter((p) => p.games >= 3)
  const toxic = (toxicPool.length ? toxicPool : partnerships.filter((p) => p.games >= 2)).sort(
    (a, b) => a.winRate - b.winRate || b.games - a.games,
  )[0]
  if (toxic)
    out.push({ key: 'toxic', emoji: '💔', title: 'Toxic Duo', accent: 'tang', players: [...toxic.players], value: `${toxic.wins}-${toxic.losses}-${toxic.ties}`, caption: 'The schedule keeps pairing them. The schedule is cruel.' })

  // 🦋 Social Butterfly (most distinct partners)
  let butterfly: [Player, number] | undefined
  for (const [p, c] of partnerCount) if (!butterfly || c > butterfly[1]) butterfly = [p, c]
  if (butterfly)
    out.push({ key: 'butterfly', emoji: '🦋', title: 'Social Butterfly', accent: 'grape', players: [butterfly[0]], value: `${butterfly[1]} partners`, caption: 'Has teamed up with half the island.' })

  // 😤 Biggest Beef (most one-sided rivalry, 3+ meetings)
  let beef: HeadToHead | undefined
  for (const h of rivalries.values()) {
    if (h.meetings < 3) continue
    if (!beef || h.wins - h.losses > beef.wins - beef.losses || (h.wins - h.losses === beef.wins - beef.losses && h.pointMargin > beef.pointMargin)) beef = h
  }
  if (beef && beef.wins > beef.losses)
    out.push({ key: 'beef', emoji: '😤', title: 'Biggest Beef', accent: 'punch', players: [beef.player, beef.opponent], value: `${beef.wins}-${beef.losses}`, caption: `${beef.player} simply owns ${beef.opponent}.` })

  // 🪙 Coin-Flippers (most even rivalry, 3+ meetings)
  const seenPair = new Set<string>()
  let flip: HeadToHead | undefined
  for (const h of rivalries.values()) {
    if (h.meetings < 3) continue
    const k = pairKey(h.player, h.opponent)
    if (seenPair.has(k)) continue
    seenPair.add(k)
    if (!flip || Math.abs(h.wins - h.losses) < Math.abs(flip.wins - flip.losses) || (Math.abs(h.wins - h.losses) === Math.abs(flip.wins - flip.losses) && h.meetings > flip.meetings)) flip = h
  }
  if (flip)
    out.push({ key: 'coinflip', emoji: '🪙', title: 'Coin-Flippers', accent: 'sun', players: [flip.player, flip.opponent], value: `${flip.wins}-${flip.losses} in ${flip.meetings}`, caption: 'Endless rivalry. Nobody ever really wins.' })

  // 🔥 Hot Hand / 🥶 Cold Spell (longest win / loss streaks)
  let hot: { p: Player; n: number } | undefined
  let cold: { p: Player; n: number } | undefined
  for (const a of agg.values()) {
    let cw = 0, cl = 0, mw = 0, ml = 0
    for (const r of a.seq) {
      if (r === 'W') { cw++; cl = 0; mw = Math.max(mw, cw) }
      else if (r === 'L') { cl++; cw = 0; ml = Math.max(ml, cl) }
      else { cw = 0; cl = 0 }
    }
    if (!hot || mw > hot.n) hot = { p: a.player, n: mw }
    if (!cold || ml > cold.n) cold = { p: a.player, n: ml }
  }
  if (hot && hot.n >= 3)
    out.push({ key: 'hot', emoji: '🔥', title: 'Hot Hand', accent: 'tang', players: [hot.p], value: `${hot.n} in a row`, caption: 'Caught fire and torched the whole field.' })
  if (cold && cold.n >= 3)
    out.push({ key: 'cold', emoji: '🥶', title: 'Cold Spell', accent: 'sky', players: [cold.p], value: `${cold.n} straight Ls`, caption: 'A rough patch — it happens to legends too. 💙' })

  // 📈 The Glow-Up (finish percentile, first → last event)
  let glow: { p: Player; d: number } | undefined
  for (const [p, arr] of finishMap) {
    if (arr.length < 2) continue
    const d = arr[arr.length - 1].pct - arr[0].pct
    if (!glow || d > glow.d) glow = { p, d }
  }
  if (glow && glow.d > 5)
    out.push({ key: 'glowup', emoji: '📈', title: 'The Glow-Up', accent: 'lime', players: [glow.p], value: `+${Math.round(glow.d)} pts`, caption: 'Started rough, leveled all the way up.' })

  // 🎢 Drama King/Queen (biggest finish swing, 2+ events)
  const drama = season
    .filter((s) => s.tournaments >= 2)
    .sort((a, b) => b.worstFinish - b.bestFinish - (a.worstFinish - a.bestFinish))[0]
  if (drama && drama.worstFinish > drama.bestFinish)
    out.push({ key: 'drama', emoji: '🎢', title: 'Drama King/Queen', accent: 'punch', players: [drama.player], value: `#${drama.bestFinish}–#${drama.worstFinish}`, caption: 'Champion one week, chaos the next.' })

  // 💯 Mr./Ms. Consistent (smallest finish spread, 3+ events)
  const cons = season
    .filter((s) => s.tournaments >= 3)
    .sort((a, b) => a.worstFinish - a.bestFinish - (b.worstFinish - b.bestFinish) || b.tournaments - a.tournaments)[0]
  if (cons)
    out.push({ key: 'consistent', emoji: '💯', title: 'Mr. Consistent', accent: 'mint', players: [cons.player], value: `#${cons.bestFinish}–#${cons.worstFinish}`, caption: 'A metronome — you always know what you’ll get.' })

  // 🎯 Clutch (best record in nail-biters, 4+ close decided games)
  let clutch: { p: Player; w: number; l: number; rate: number } | undefined
  for (const a of agg.values()) {
    const tot = a.closeWin + a.closeLoss
    if (tot < 4) continue
    const rate = a.closeWin / tot
    if (!clutch || rate > clutch.rate || (rate === clutch.rate && tot > clutch.w + clutch.l)) clutch = { p: a.player, w: a.closeWin, l: a.closeLoss, rate }
  }
  if (clutch)
    out.push({ key: 'clutch', emoji: '🎯', title: 'Clutch', accent: 'lime', players: [clutch.p], value: `${clutch.w}-${clutch.l} in nail-biters`, caption: 'Ice in the veins when the score is tight.' })

  // 😅 Heartbreak Kid (most close losses)
  let heart: { p: Player; n: number } | undefined
  for (const a of agg.values()) if (!heart || a.closeLoss > heart.n) heart = { p: a.player, n: a.closeLoss }
  if (heart && heart.n >= 2)
    out.push({ key: 'heartbreak', emoji: '😅', title: 'Heartbreak Kid', accent: 'sun', players: [heart.p], value: `${heart.n} by ≤2`, caption: 'So close, so often. We feel it.' })

  // 🧨 Demolition Expert (biggest avg winning margin, 6+ wins)
  let demo: { p: Player; avg: number } | undefined
  for (const a of agg.values()) {
    if (a.wins < 6) continue
    const avg = a.winMargin / a.wins
    if (!demo || avg > demo.avg) demo = { p: a.player, avg }
  }
  if (demo)
    out.push({ key: 'demo', emoji: '🧨', title: 'Demolition Expert', accent: 'punch', players: [demo.p], value: `+${r1(demo.avg)} avg`, caption: 'Doesn’t just win — sends a message.' })

  // 🕊️ The Pacifist (most ties)
  let pax: { p: Player; n: number } | undefined
  for (const a of agg.values()) if (!pax || a.ties > pax.n) pax = { p: a.player, n: a.ties }
  if (pax && pax.n >= 3)
    out.push({ key: 'pacifist', emoji: '🕊️', title: 'The Pacifist', accent: 'grape', players: [pax.p], value: `${pax.n} ties`, caption: 'A lover, not a fighter. Keeps shaking hands at 8-8.' })

  // 🆕 Rookie Sensation (best 1-event newcomer)
  const rookie = season
    .filter((s) => s.tournaments < 2)
    .sort((a, b) => b.performance - a.performance || b.totalPoints - a.totalPoints)[0]
  if (rookie)
    out.push({ key: 'rookie', emoji: '🆕', title: 'Rookie Sensation', accent: 'sky', players: [rookie.player], value: `${Math.round(rookie.performance)}% · 1 event`, caption: 'Showed up once and embarrassed the regulars.' })

  // 🥄 Spoon Collector (most last-place finishes)
  let spoon: { p: Player; n: number } | undefined
  for (const [p, arr] of finishMap) {
    const lasts = arr.filter((f) => f.rank === f.n).length
    if (lasts > 0 && (!spoon || lasts > spoon.n)) spoon = { p, n: lasts }
  }
  if (spoon)
    out.push({ key: 'spoon', emoji: '🥄', title: 'Spoon Collector', accent: 'tang', players: [spoon.p], value: `${spoon.n}× last`, caption: 'Somebody’s gotta anchor the table — a hero, really. 🥄' })

  // ── Bigger pool ─────────────────────────────────────────────────────────
  // Many more affectionate superlatives. All deterministic with a min-sample
  // guard; the Fun page randomly samples ~15 and reshuffles on "Surprise me".

  const ratings = computeRatings(tournaments, aliases)
  const ratingOf = (p: Player) => ratings.get(p)?.rating ?? START_RATING
  const seasonBy = new Map(season.map((s) => [s.player, s]))

  // Standings per event (reused for champions, attendance & tenure).
  const standingsByT = byDate.map((t) => ({ t, st: computeStandings(t, aliases) }))
  const champions = standingsByT.map(({ t, st }) => ({ nick: t.nickname || t.name, winner: st[0]?.player }))

  const monthsApart = (a: string, b: string) => {
    const [ay, am] = a.split('-').map(Number)
    const [by, bm] = b.split('-').map(Number)
    return Math.max(0, (by - ay) * 12 + (bm - am))
  }

  // Finish-rank counters (reuse finishMap).
  const rankCount = (p: Player, rank: number) =>
    (finishMap.get(p) ?? []).filter((f) => f.rank === rank).length
  const topByRankCount = (rank: number): { p: Player; n: number } | undefined => {
    let best: { p: Player; n: number } | undefined
    for (const p of finishMap.keys()) {
      const n = rankCount(p, rank)
      if (n > 0 && (!best || n > best.n)) best = { p, n }
    }
    return best
  }
  const topCount = (m: Map<Player, number>, min: number): { p: Player; n: number } | undefined => {
    let best: { p: Player; n: number } | undefined
    for (const [p, n] of m) if (n >= min && (!best || n > best.n)) best = { p, n }
    return best
  }

  // Bagels served (held opponent to ≤1) and eaten (held to ≤1).
  const bagelBake = new Map<Player, number>()
  const bagelEat = new Map<Player, number>()
  for (const r of rows) {
    if (r.result === 'W' && r.pa <= 1) bagelBake.set(r.player, (bagelBake.get(r.player) ?? 0) + 1)
    if (r.result === 'L' && r.pf <= 1) bagelEat.set(r.player, (bagelEat.get(r.player) ?? 0) + 1)
  }

  // 🐐 GOAT + heir (highest Elo, min games)
  const eloRanked = [...ratings.values()].filter((r) => r.games >= 4).sort((a, b) => b.rating - a.rating)
  if (eloRanked[0])
    out.push({ key: 'elo-1', emoji: '🐐', title: 'The GOAT', accent: 'sun', players: [eloRanked[0].player], value: `${Math.round(eloRanked[0].rating)} Elo`, caption: 'The highest-rated player on the island. Bow down.' })
  if (eloRanked[1])
    out.push({ key: 'elo-2', emoji: '⛰️', title: 'The Heir Apparent', accent: 'grape', players: [eloRanked[1].player], value: `${Math.round(eloRanked[1].rating)} Elo`, caption: 'One good run away from the throne.' })

  // 🗻 Peak Performer (highest rating ever reached)
  const peak = [...ratings.values()].filter((r) => r.games >= 4).sort((a, b) => b.peak - a.peak)[0]
  if (peak)
    out.push({ key: 'peak', emoji: '🗻', title: 'Peak Performer', accent: 'punch', players: [peak.player], value: `${Math.round(peak.peak)} peak`, caption: 'Touched the highest rating anyone has ever hit.' })

  // 🚀 The Rocket / 🪂 The Free Fall (biggest Elo move from the 1000 start)
  const rocket = [...ratings.values()].filter((r) => r.games >= 6).sort((a, b) => b.rating - a.rating)[0]
  if (rocket && rocket.rating > START_RATING)
    out.push({ key: 'rocket', emoji: '🚀', title: 'The Rocket', accent: 'lime', players: [rocket.player], value: `+${Math.round(rocket.rating - START_RATING)} Elo`, caption: 'Climbed further from the start line than anyone.' })
  const fall = [...ratings.values()].filter((r) => r.games >= 6).sort((a, b) => a.rating - b.rating)[0]
  if (fall && fall.rating < START_RATING)
    out.push({ key: 'freefall', emoji: '🪂', title: 'The Free Fall', accent: 'sky', players: [fall.player], value: `${Math.round(fall.rating - START_RATING)} Elo`, caption: 'Only way left is up, right? We believe in you 💙' })

  // 🦾 Iron Man (most events) / 🐴 Workhorse (most matches)
  const iron = [...season].sort((a, b) => b.tournaments - a.tournaments || b.games - a.games)[0]
  if (iron && iron.tournaments >= 3)
    out.push({ key: 'ironman', emoji: '🦾', title: 'Iron Man', accent: 'tang', players: [iron.player], value: `${iron.tournaments} events`, caption: 'Never misses. Shows up rain or shine.' })
  const work = [...season].sort((a, b) => b.games - a.games)[0]
  if (work && work.games >= 12)
    out.push({ key: 'workhorse', emoji: '🐴', title: 'The Workhorse', accent: 'sky', players: [work.player], value: `${work.games} matches`, caption: 'Logs more court time than the net itself.' })

  // 🏆 Win Machine + runner-up (highest win rate, 10+ games)
  const wm = [...season].filter((s) => s.games >= 10).sort((a, b) => b.winRate - a.winRate || b.games - a.games)
  if (wm[0])
    out.push({ key: 'winmachine-1', emoji: '🏆', title: 'Win Machine', accent: 'lime', players: [wm[0].player], value: pctStr(wm[0].winRate), caption: 'Wins far more often than not. Relentless.' })
  if (wm[1])
    out.push({ key: 'winmachine-2', emoji: '🥈', title: 'Almost Unbeatable', accent: 'mint', players: [wm[1].player], value: pctStr(wm[1].winRate), caption: 'Second-scariest name on the schedule.' })

  // 🏹 The Sniper (points per game) / 🧱 Great Wall (fewest allowed)
  const sniper = [...season].filter((s) => s.games >= 10).sort((a, b) => b.pf / b.games - a.pf / a.games)[0]
  if (sniper)
    out.push({ key: 'sniper', emoji: '🏹', title: 'The Sniper', accent: 'punch', players: [sniper.player], value: `${r1(sniper.pf / sniper.games)} pts/game`, caption: 'Racks up points like it’s nothing.' })
  const wall = [...season].filter((s) => s.games >= 10).sort((a, b) => a.pa / a.games - b.pa / b.games)[0]
  if (wall)
    out.push({ key: 'wall', emoji: '🧱', title: 'The Great Wall', accent: 'sky', players: [wall.player], value: `${r1(wall.pa / wall.games)} allowed/game`, caption: 'Points simply do not get past them.' })

  // 🫀 Cardio King (most points per event)
  const cardio = [...season].filter((s) => s.tournaments >= 2).sort((a, b) => b.avgPoints - a.avgPoints)[0]
  if (cardio)
    out.push({ key: 'cardioking', emoji: '🫀', title: 'Cardio King', accent: 'tang', players: [cardio.player], value: `${r1(cardio.avgPoints)} pts/event`, caption: 'Leaves it all on the court, every single time.' })

  // 💰 Points Tycoon + mogul (most total points)
  const tycoon = [...season].sort((a, b) => b.totalPoints - a.totalPoints)
  if (tycoon[0])
    out.push({ key: 'tycoon-1', emoji: '💰', title: 'Points Tycoon', accent: 'sun', players: [tycoon[0].player], value: `${tycoon[0].totalPoints.toLocaleString()} pts`, caption: 'Has banked more points than anyone alive.' })
  if (tycoon[1])
    out.push({ key: 'tycoon-2', emoji: '💵', title: 'Points Mogul', accent: 'grape', players: [tycoon[1].player], value: `${tycoon[1].totalPoints.toLocaleString()} pts`, caption: 'Not the richest, but very, very comfortable.' })

  // 👑 Title Hoarder + serial contender (most 1st places)
  const titles = [...season].filter((s) => s.tournamentWins >= 1).sort((a, b) => b.tournamentWins - a.tournamentWins)
  if (titles[0])
    out.push({ key: 'title-1', emoji: '👑', title: 'Title Hoarder', accent: 'sun', players: [titles[0].player], value: `${titles[0].tournamentWins} titles`, caption: 'Collects trophies like beach souvenirs.' })
  if (titles[1])
    out.push({ key: 'title-2', emoji: '🥇', title: 'Serial Contender', accent: 'tang', players: [titles[1].player], value: `${titles[1].tournamentWins} titles`, caption: 'Always somewhere in the title hunt.' })

  // 🏅 Podium Machine (most top-3 finishes)
  const pod = [...season].filter((s) => s.podiums >= 2).sort((a, b) => b.podiums - a.podiums)[0]
  if (pod)
    out.push({ key: 'podium', emoji: '🏅', title: 'Podium Machine', accent: 'mint', players: [pod.player], value: `${pod.podiums} podiums`, caption: 'Practically lives in the top three.' })

  // 💐 Bridesmaid / 🥉 Bronze / 😬 Nearly Man (most 2nd / 3rd / 4th)
  const brides = topByRankCount(2)
  if (brides && brides.n >= 2)
    out.push({ key: 'bridesmaid', emoji: '💐', title: 'Always the Bridesmaid', accent: 'grape', players: [brides.p], value: `${brides.n}× runner-up`, caption: 'So close to the top step. So very often.' })
  const bronze = topByRankCount(3)
  if (bronze && bronze.n >= 2)
    out.push({ key: 'bronze', emoji: '🥉', title: 'Bronze Specialist', accent: 'tang', players: [bronze.p], value: `${bronze.n}× third`, caption: 'Master of the third step. Steady hands.' })
  const nearly = topByRankCount(4)
  if (nearly && nearly.n >= 2)
    out.push({ key: 'nearly', emoji: '😬', title: 'The Nearly Man', accent: 'sky', players: [nearly.p], value: `${nearly.n}× fourth`, caption: 'Just off the podium, again. Brutal.' })

  // 📊 Top of the Class (best avg finish %) / 🛡️ Safe Bet (best floor)
  const topTable = [...season].filter((s) => s.tournaments >= 3).sort((a, b) => b.performance - a.performance)[0]
  if (topTable)
    out.push({ key: 'toptable', emoji: '📊', title: 'Top of the Class', accent: 'lime', players: [topTable.player], value: `${Math.round(topTable.performance)}% avg`, caption: 'Finishes near the top no matter the field.' })
  const floor = [...season].filter((s) => s.tournaments >= 4).sort((a, b) => a.worstFinish - b.worstFinish || a.avgFinish - b.avgFinish)[0]
  if (floor)
    out.push({ key: 'safebet', emoji: '🛡️', title: 'The Safe Bet', accent: 'mint', players: [floor.player], value: `never below #${floor.worstFinish}`, caption: 'A guaranteed safe pair of hands.' })

  // ⚖️ The Human Coin Toss (win rate closest to 50%)
  const fifty = [...season].filter((s) => s.games >= 10).sort((a, b) => Math.abs(a.winRate - 0.5) - Math.abs(b.winRate - 0.5))[0]
  if (fifty)
    out.push({ key: 'fifty', emoji: '⚖️', title: 'The Human Coin Toss', accent: 'grape', players: [fifty.player], value: `${pctStr(fifty.winRate)} win`, caption: 'Wins exactly as often as they lose. Pure suspense.' })

  // ⚡ Power Couple / 🧩 Odd Couple (current Elo of duos, 2+ games)
  const duos2 = partnerships.filter((p) => p.games >= 2)
  const power = [...duos2].sort(
    (a, b) => ratingOf(b.players[0]) + ratingOf(b.players[1]) - (ratingOf(a.players[0]) + ratingOf(a.players[1])),
  )[0]
  if (power)
    out.push({ key: 'power', emoji: '⚡', title: 'Power Couple', accent: 'punch', players: [...power.players], value: `${Math.round((ratingOf(power.players[0]) + ratingOf(power.players[1])) / 2)} avg Elo`, caption: 'The scariest two names to see across the net.' })
  const odd = [...duos2]
    .filter((p) => p.winRate >= 0.5)
    .sort((a, b) => Math.abs(ratingOf(b.players[0]) - ratingOf(b.players[1])) - Math.abs(ratingOf(a.players[0]) - ratingOf(a.players[1])))[0]
  if (odd)
    out.push({ key: 'oddcouple', emoji: '🧩', title: 'The Odd Couple', accent: 'grape', players: [...odd.players], value: `${Math.round(Math.abs(ratingOf(odd.players[0]) - ratingOf(odd.players[1])))} Elo apart`, caption: 'On paper it makes no sense. It works anyway.' })

  // ✨ Dream Team / 🤜 Dynamic Duo / 💎 Flawless Together
  const dreamPool = partnerships.filter((p) => p.games >= 3)
  const dream = (dreamPool.length ? dreamPool : duos2).sort((a, b) => b.winRate - a.winRate || b.pointsPerGame - a.pointsPerGame)[0]
  if (dream && dream.winRate > 0.5)
    out.push({ key: 'dreamteam', emoji: '✨', title: 'Dream Team', accent: 'mint', players: [...dream.players], value: `${pctStr(dream.winRate)} win`, caption: 'When these two pair up, just concede early.' })
  const dynamic = [...duos2].sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)[0]
  if (dynamic && dynamic.wins >= 3)
    out.push({ key: 'dynamic', emoji: '🤜', title: 'Dynamic Duo', accent: 'tang', players: [...dynamic.players], value: `${dynamic.wins} wins together`, caption: 'More W’s as a team than most play games.' })
  const perfect = perfectPairs(partnerships).filter((p) => p.games >= 2).sort((a, b) => b.games - a.games || b.wins - a.wins)[0]
  if (perfect)
    out.push({ key: 'perfectpair', emoji: '💎', title: 'Flawless Together', accent: 'lime', players: [...perfect.players], value: `${perfect.wins}-0`, caption: 'Teamed up and never, ever lost.' })

  // 🐺 Lone Wolf (fewest distinct partners, 4+ events)
  let lone: { p: Player; n: number } | undefined
  for (const [p, c] of partnerCount) {
    const s = seasonBy.get(p)
    if (!s || s.tournaments < 4) continue
    if (!lone || c < lone.n) lone = { p, n: c }
  }
  if (lone)
    out.push({ key: 'lonewolf', emoji: '🐺', title: 'Lone Wolf', accent: 'sky', players: [lone.p], value: `${lone.n} partners`, caption: 'Loyal to a tiny circle. Trust is earned.' })

  // 😎 The Bully / 🎁 Everyone's Favourite Win / 🔁 Familiar Foes
  const oppWin = new Map<Player, number>()
  const oppLoss = new Map<Player, number>()
  let familiar: { a: Player; b: Player; n: number } | undefined
  const seenFam = new Set<string>()
  for (const h of rivalries.values()) {
    if (h.meetings >= 2) {
      if (h.wins > h.losses) oppWin.set(h.player, (oppWin.get(h.player) ?? 0) + 1)
      else if (h.losses > h.wins) oppLoss.set(h.player, (oppLoss.get(h.player) ?? 0) + 1)
    }
    const k = pairKey(h.player, h.opponent)
    if (!seenFam.has(k)) {
      seenFam.add(k)
      if (!familiar || h.meetings > familiar.n) familiar = { a: h.player, b: h.opponent, n: h.meetings }
    }
  }
  const bully = topCount(oppWin, 2)
  if (bully)
    out.push({ key: 'bully', emoji: '😎', title: 'The Bully', accent: 'punch', players: [bully.p], value: `owns ${bully.n} rivals`, caption: 'Has a winning record against half the room.' })
  const bag = topCount(oppLoss, 2)
  if (bag)
    out.push({ key: 'favewin', emoji: '🎁', title: 'Everyone’s Favourite Win', accent: 'sky', players: [bag.p], value: `${bag.n} bogey rivals`, caption: 'Keeps drawing the wrong people. We feel it 💙' })
  if (familiar && familiar.n >= 3)
    out.push({ key: 'familiar', emoji: '🔁', title: 'Familiar Foes', accent: 'sun', players: [familiar.a, familiar.b], value: `${familiar.n} meetings`, caption: 'These two simply cannot stop running into each other.' })

  // 🥂 First Blood / 🫅 Reigning Champ / 🔂 Back-to-Back
  const firstWin = champions[0]?.winner
  if (firstWin)
    out.push({ key: 'firstblood', emoji: '🥂', title: 'First Blood', accent: 'tang', players: [firstWin], value: 'Champion #1', caption: `Won the very first Odette Cup — ${champions[0].nick}.` })
  const lastWin = champions[champions.length - 1]?.winner
  if (lastWin)
    out.push({ key: 'reigning', emoji: '🫅', title: 'Reigning Champ', accent: 'sun', players: [lastWin], value: 'Current holder', caption: `Took the latest crown — ${champions[champions.length - 1].nick}. Long may they reign.` })
  let b2b: Player | undefined
  for (let i = 1; i < champions.length; i++) {
    const w = champions[i].winner
    if (w && w === champions[i - 1].winner) { b2b = w; break }
  }
  if (b2b)
    out.push({ key: 'b2b', emoji: '🔂', title: 'Back-to-Back', accent: 'punch', players: [b2b], value: '2 in a row', caption: 'Defended the crown on the next outing. Dynasty vibes.' })

  // 📌 Ever-Present (longest attendance streak) / 🎖️ The Veteran (tenure)
  const attend = standingsByT.map(({ st }) => new Set(st.map((s) => s.player)))
  const everPlayers = new Set<Player>()
  attend.forEach((s) => s.forEach((p) => everPlayers.add(p)))
  let present: { p: Player; n: number } | undefined
  for (const p of everPlayers) {
    let c = 0, mx = 0
    for (const s of attend) { if (s.has(p)) { c++; mx = Math.max(mx, c) } else c = 0 }
    if (!present || mx > present.n) present = { p, n: mx }
  }
  if (present && present.n >= 3)
    out.push({ key: 'everpresent', emoji: '📌', title: 'Ever-Present', accent: 'mint', players: [present.p], value: `${present.n} events straight`, caption: 'Hasn’t missed a beat. The heartbeat of the group.' })

  const firstLast = new Map<Player, { first: string; last: string; n: number }>()
  for (const { t, st } of standingsByT) {
    for (const s of st) {
      const e = firstLast.get(s.player)
      if (!e) firstLast.set(s.player, { first: t.date, last: t.date, n: 1 })
      else { e.last = t.date; e.n += 1 }
    }
  }
  let vet: { p: Player; m: number } | undefined
  for (const [p, e] of firstLast) {
    if (e.n < 2 || !e.first || !e.last) continue
    const m = monthsApart(e.first, e.last)
    if (m >= 1 && (!vet || m > vet.m)) vet = { p, m }
  }
  if (vet)
    out.push({ key: 'veteran', emoji: '🎖️', title: 'The Veteran', accent: 'grape', players: [vet.p], value: `${vet.m} months in`, caption: 'Here since the early days. Respect the elder.' })

  // 🥯 Bagel Baker / 🍩 Bagel Connoisseur
  const baker = topCount(bagelBake, 2)
  if (baker)
    out.push({ key: 'bagelbaker', emoji: '🥯', title: 'Bagel Baker', accent: 'punch', players: [baker.p], value: `${baker.n}× bagels served`, caption: 'Holds opponents to a single point — or none.' })
  const eater = topCount(bagelEat, 2)
  if (eater)
    out.push({ key: 'bageleater', emoji: '🍩', title: 'Bagel Connoisseur', accent: 'tang', players: [eater.p], value: `${eater.n}× held to ≤1`, caption: 'Took a few for the team. Builds character 💙' })

  return out
}
