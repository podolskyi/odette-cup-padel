import type { Player, Tournament } from '../types'
import { toPlayerMatches } from './core'

export interface PlayerStanding {
  rank: number // 1-based, assigned after sort
  player: Player
  pf: number // points for (= tournament points)
  pa: number // points against
  diff: number
  wins: number
  losses: number
  ties: number
  games: number
  winRate: number // W / games (0..1)
  points: number // === pf, the Americano ranking number
  avgFor: number
  avgAgainst: number
}

/**
 * Per-player standings for one tournament (spec §4.1).
 * Sort order (spec §4.1, verified against §10): points DESC, Diff DESC,
 * Wins DESC, Losses ASC. Name ASC is a final deterministic fallback.
 */
export function computeStandings(
  t: Tournament,
  aliases: Record<Player, Player> = {},
): PlayerStanding[] {
  const rows = toPlayerMatches(t.matches, aliases)
  const acc = new Map<Player, PlayerStanding>()

  for (const r of rows) {
    let s = acc.get(r.player)
    if (!s) {
      s = {
        rank: 0,
        player: r.player,
        pf: 0,
        pa: 0,
        diff: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        games: 0,
        winRate: 0,
        points: 0,
        avgFor: 0,
        avgAgainst: 0,
      }
      acc.set(r.player, s)
    }
    s.pf += r.pf
    s.pa += r.pa
    s.games += 1
    if (r.result === 'W') s.wins += 1
    else if (r.result === 'L') s.losses += 1
    else s.ties += 1
  }

  const standings = [...acc.values()]
  for (const s of standings) {
    s.diff = s.pf - s.pa
    s.points = s.pf
    s.winRate = s.games ? s.wins / s.games : 0
    s.avgFor = s.games ? s.pf / s.games : 0
    s.avgAgainst = s.games ? s.pa / s.games : 0
  }

  standings.sort(
    (a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.player.localeCompare(b.player),
  )
  standings.forEach((s, i) => (s.rank = i + 1))
  return standings
}

/** Map of player -> finishing rank for a tournament. */
export function finishingRanks(
  t: Tournament,
  aliases: Record<Player, Player> = {},
): Map<Player, number> {
  const map = new Map<Player, number>()
  for (const s of computeStandings(t, aliases)) map.set(s.player, s.rank)
  return map
}
