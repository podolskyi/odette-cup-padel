import type { Dataset, Player } from '../types'
import { pairKey, toPlayerMatches, type Outcome } from './core'
import { computePartnerships } from './partnerships'
import { computeRivalries, type HeadToHead } from './rivalries'
import { computeStandings } from './standings'
import { computeSeason } from './season'
import { computeGlue } from './glue'

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

  return out
}
