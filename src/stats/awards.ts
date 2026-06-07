import type { Player, Tournament } from '../types'
import { toPlayerMatches } from './core'
import { computeStandings, type PlayerStanding } from './standings'
import {
  bestDuo as pickBestDuo,
  computePartnerships,
  perfectPairs as pickPerfectPairs,
  type Partnership,
} from './partnerships'

export const MIN_WALL_GAMES = 4

export interface TournamentAwards {
  demolition?: {
    winners: [Player, Player]
    losers: [Player, Player]
    scoreFor: number
    scoreAgainst: number
    margin: number
    round: number
  }
  diplomat?: { player: Player; ties: number }
  wall?: { player: Player; paPerGame: number; games: number }
  cardio?: { player: Player; pf: number }
  heartbreaker?: { player: Player; closeLosses: number }
  giantSlayer?: {
    winners: [Player, Player]
    losers: [Player, Player]
    round: number
    gap: number
    winnerRank: number
    loserRank: number
  }
  mostCarried?: {
    player: Player
    bestPartner: Player
    worstPartner: Player
    bestRate: number
    worstRate: number
    spread: number
  }
  woodenSpoon?: { player: Player; points: number }
  bestDuo?: Partnership
  perfectPairs: Partnership[]
}

export function computeAwards(
  t: Tournament,
  aliases: Record<Player, Player> = {},
  standings: PlayerStanding[] = computeStandings(t, aliases),
): TournamentAwards {
  const rows = toPlayerMatches(t.matches, aliases)
  const partnerships = computePartnerships(t.matches, aliases)
  const byPlayer = new Map(standings.map((s) => [s.player, s]))

  // --- Demolition: biggest blowout. Tiebreak: earliest round, then court, then duo name. ---
  let demolition: TournamentAwards['demolition']
  t.matches.forEach((mt) => {
    const margin = Math.abs(mt.scoreA - mt.scoreB)
    if (margin === 0) return
    const winnersAreA = mt.scoreA > mt.scoreB
    const winners = (winnersAreA ? mt.teamA : mt.teamB) as [Player, Player]
    const losers = (winnersAreA ? mt.teamB : mt.teamA) as [Player, Player]
    const cand = {
      winners,
      losers,
      scoreFor: Math.max(mt.scoreA, mt.scoreB),
      scoreAgainst: Math.min(mt.scoreA, mt.scoreB),
      margin,
      round: mt.round,
    }
    if (
      !demolition ||
      cand.margin > demolition.margin ||
      (cand.margin === demolition.margin && cand.round < demolition.round) ||
      (cand.margin === demolition.margin &&
        cand.round === demolition.round &&
        winnerLabel(cand.winners) < winnerLabel(demolition.winners))
    ) {
      demolition = cand
    }
  })

  // --- Diplomat: most ties. ---
  const diplomat = pickMaxPlayer(standings, (s) => s.ties, (s) => s.ties > 0)

  // --- Wall: lowest PA/game (min games). Tiebreak fewer PA, then name. ---
  const wallCandidates = standings.filter((s) => s.games >= MIN_WALL_GAMES)
  const wallRow = [...wallCandidates].sort(
    (a, b) => a.avgAgainst - b.avgAgainst || a.pa - b.pa || a.player.localeCompare(b.player),
  )[0]
  const wall = wallRow
    ? { player: wallRow.player, paPerGame: wallRow.avgAgainst, games: wallRow.games }
    : undefined

  // --- Cardio: highest PF. ---
  const cardioRow = pickMaxPlayer(standings, (s) => s.pf)
  const cardio = cardioRow ? { player: cardioRow.player, pf: cardioRow.pf } : undefined

  // --- Heartbreaker: most losses by margin <= 2. ---
  const closeLosses = new Map<Player, number>()
  for (const r of rows) {
    if (r.result === 'L' && r.pa - r.pf <= 2) {
      closeLosses.set(r.player, (closeLosses.get(r.player) ?? 0) + 1)
    }
  }
  const heartbreaker = pickMaxFromMap(closeLosses)

  // --- Giant Slayer: biggest upset (loser finished above winner). ---
  let giantSlayer: TournamentAwards['giantSlayer']
  t.matches.forEach((mt) => {
    if (mt.scoreA === mt.scoreB) return
    const winnersAreA = mt.scoreA > mt.scoreB
    const winners = (winnersAreA ? mt.teamA : mt.teamB) as [Player, Player]
    const losers = (winnersAreA ? mt.teamB : mt.teamA) as [Player, Player]
    const winnerWorst = maxBy(winners, (p) => byPlayer.get(p)?.rank ?? 0)
    const loserBest = minBy(losers, (p) => byPlayer.get(p)?.rank ?? Infinity)
    const wRank = byPlayer.get(winnerWorst)?.rank
    const lRank = byPlayer.get(loserBest)?.rank
    if (wRank == null || lRank == null || lRank >= wRank) return
    const gap = wRank - lRank
    if (!giantSlayer || gap > giantSlayer.gap || (gap === giantSlayer.gap && mt.round < giantSlayer.round)) {
      giantSlayer = { winners, losers, round: mt.round, gap, winnerRank: wRank, loserRank: lRank }
    }
  })

  // --- Most Carried: widest win-rate spread between best & worst partner (min 2 games each). ---
  let mostCarried: TournamentAwards['mostCarried']
  for (const player of byPlayer.keys()) {
    const partners = partnerships
      .filter((p) => p.games >= 2 && (p.players[0] === player || p.players[1] === player))
      .map((p) => ({ partner: p.players[0] === player ? p.players[1] : p.players[0], rate: p.winRate }))
    if (partners.length < 2) continue
    const best = partners.reduce((m, x) => (x.rate > m.rate ? x : m))
    const worst = partners.reduce((m, x) => (x.rate < m.rate ? x : m))
    const spread = best.rate - worst.rate
    if (spread <= 0) continue
    if (!mostCarried || spread > mostCarried.spread || (spread === mostCarried.spread && player < mostCarried.player)) {
      mostCarried = {
        player,
        bestPartner: best.partner,
        worstPartner: worst.partner,
        bestRate: best.rate,
        worstRate: worst.rate,
        spread,
      }
    }
  }

  // --- Wooden Spoon: last place. ---
  const last = standings[standings.length - 1]
  const woodenSpoon = last ? { player: last.player, points: last.points } : undefined

  return {
    demolition,
    diplomat: diplomat ? { player: diplomat.player, ties: diplomat.ties } : undefined,
    wall,
    cardio,
    heartbreaker,
    giantSlayer,
    mostCarried,
    woodenSpoon,
    bestDuo: pickBestDuo(partnerships),
    perfectPairs: pickPerfectPairs(partnerships),
  }
}

// --- helpers -------------------------------------------------------------

function winnerLabel(duo: [Player, Player]): string {
  return [...duo].sort((a, b) => a.localeCompare(b)).join(' & ')
}

// `standings` is already rank-sorted, so iterating and only replacing on a
// strictly greater value breaks ties in favour of the higher-placed player
// (e.g. the Diplomat goes to Veronika, rank 9, over Sabrina, rank 15).
function pickMaxPlayer(
  standings: PlayerStanding[],
  value: (s: PlayerStanding) => number,
  filter: (s: PlayerStanding) => boolean = () => true,
): PlayerStanding | undefined {
  let best: PlayerStanding | undefined
  let bestVal = -Infinity
  for (const s of standings) {
    if (!filter(s)) continue
    const v = value(s)
    if (v > bestVal) {
      bestVal = v
      best = s
    }
  }
  return best
}

function pickMaxFromMap(map: Map<Player, number>): { player: Player; closeLosses: number } | undefined {
  let player: Player | undefined
  let count = 0
  for (const [p, c] of map) {
    if (c > count || (c === count && player && p.localeCompare(player) < 0)) {
      count = c
      player = p
    }
  }
  return player ? { player, closeLosses: count } : undefined
}

function maxBy<T>(arr: T[], score: (x: T) => number): T {
  return arr.reduce((m, x) => (score(x) > score(m) ? x : m))
}
function minBy<T>(arr: T[], score: (x: T) => number): T {
  return arr.reduce((m, x) => (score(x) < score(m) ? x : m))
}
