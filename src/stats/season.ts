import type { Player, Tournament } from '../types'
import { computeStandings } from './standings'

export interface SeasonRow {
  rank: number
  player: Player
  tournaments: number
  totalPoints: number
  avgPoints: number
  pf: number
  pa: number
  diff: number
  wins: number
  losses: number
  ties: number
  games: number
  winRate: number
  tournamentWins: number // 1st-place finishes
  podiums: number // top-3 finishes
  avgFinish: number
  /** Average finishing percentile, 0-100 (1st = 100, last = 0). Participation-independent. */
  performance: number
  bestFinish: number
  worstFinish: number
  finishes: number[]
}

/** All-time aggregate per player across every tournament (spec §4.4). */
export function computeSeason(
  tournaments: Tournament[],
  aliases: Record<Player, Player> = {},
): SeasonRow[] {
  const acc = new Map<Player, SeasonRow>()
  const ensure = (p: Player): SeasonRow => {
    let r = acc.get(p)
    if (!r) {
      r = {
        rank: 0,
        player: p,
        tournaments: 0,
        totalPoints: 0,
        avgPoints: 0,
        pf: 0,
        pa: 0,
        diff: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        games: 0,
        winRate: 0,
        tournamentWins: 0,
        podiums: 0,
        avgFinish: 0,
        performance: 0,
        bestFinish: Infinity,
        worstFinish: 0,
        finishes: [],
      }
      acc.set(p, r)
    }
    return r
  }

  for (const t of tournaments) {
    const standings = computeStandings(t, aliases)
    for (const s of standings) {
      const r = ensure(s.player)
      r.tournaments += 1
      r.totalPoints += s.points
      r.pf += s.pf
      r.pa += s.pa
      r.wins += s.wins
      r.losses += s.losses
      r.ties += s.ties
      r.games += s.games
      r.finishes.push(s.rank)
      // Finishing percentile for this event (field-size normalized).
      const n = standings.length
      r.performance += n > 1 ? ((n - s.rank) / (n - 1)) * 100 : 100
      if (s.rank === 1) r.tournamentWins += 1
      if (s.rank <= 3) r.podiums += 1
      r.bestFinish = Math.min(r.bestFinish, s.rank)
      r.worstFinish = Math.max(r.worstFinish, s.rank)
    }
  }

  const rows = [...acc.values()]
  for (const r of rows) {
    r.diff = r.pf - r.pa
    r.avgPoints = r.tournaments ? r.totalPoints / r.tournaments : 0
    r.winRate = r.games ? r.wins / r.games : 0
    r.avgFinish = r.finishes.length
      ? r.finishes.reduce((a, b) => a + b, 0) / r.finishes.length
      : 0
    r.performance = r.tournaments ? r.performance / r.tournaments : 0
    if (!isFinite(r.bestFinish)) r.bestFinish = 0
  }

  rows.sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.diff - a.diff ||
      b.wins - a.wins ||
      a.player.localeCompare(b.player),
  )
  rows.forEach((r, i) => (r.rank = i + 1))
  return rows
}
