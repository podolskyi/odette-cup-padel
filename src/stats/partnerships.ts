import type { Match, Player } from '../types'
import { pairKey, toPlayerMatches } from './core'

export const MIN_PAIR_GAMES = 2

export interface Partnership {
  key: string
  players: [Player, Player]
  games: number
  wins: number
  losses: number
  ties: number
  points: number // total points the duo scored together
  winRate: number
  pointsPerGame: number
}

/**
 * Stats for every unordered pair of players who were teammates (spec §4.2).
 * Works for a single tournament or many (pass all matches concatenated).
 */
export function computePartnerships(
  matches: Match[],
  aliases: Record<Player, Player> = {},
): Partnership[] {
  const rows = toPlayerMatches(matches, aliases)
  const acc = new Map<string, Partnership>()

  // Each shared match produces two rows (one per teammate); count it once.
  for (const r of rows) {
    if (r.player.localeCompare(r.partner) > 0) continue // dedupe: only the "smaller" name records
    const key = pairKey(r.player, r.partner)
    let p = acc.get(key)
    if (!p) {
      const players = [r.player, r.partner].sort((a, b) => a.localeCompare(b)) as [Player, Player]
      p = { key, players, games: 0, wins: 0, losses: 0, ties: 0, points: 0, winRate: 0, pointsPerGame: 0 }
      acc.set(key, p)
    }
    p.games += 1
    p.points += r.pf
    if (r.result === 'W') p.wins += 1
    else if (r.result === 'L') p.losses += 1
    else p.ties += 1
  }

  const list = [...acc.values()]
  for (const p of list) {
    p.winRate = p.games ? p.wins / p.games : 0
    p.pointsPerGame = p.games ? p.points / p.games : 0
  }
  return list.sort(
    (a, b) => b.winRate - a.winRate || b.pointsPerGame - a.pointsPerGame || b.games - a.games,
  )
}

/** Best duo: highest win rate among pairs with games >= min, tiebreak points/game. */
export function bestDuo(
  partnerships: Partnership[],
  minGames = MIN_PAIR_GAMES,
): Partnership | undefined {
  return partnerships
    .filter((p) => p.games >= minGames)
    .sort((a, b) => b.winRate - a.winRate || b.pointsPerGame - a.pointsPerGame)[0]
}

/** Perfect pairs: undefeated together (no losses) with a winning record, games >= 2. */
export function perfectPairs(partnerships: Partnership[]): Partnership[] {
  return partnerships
    .filter((p) => p.games >= 2 && p.losses === 0 && p.wins >= 1)
    .sort((a, b) => b.wins - a.wins || b.pointsPerGame - a.pointsPerGame)
}
