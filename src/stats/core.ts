import type { Match, Player } from '../types'
import { resolveName } from '../identity/aliases'

export type Outcome = 'W' | 'L' | 'T'

/** Outcome of a match from each team's point of view. */
export function outcomes(scoreA: number, scoreB: number): { a: Outcome; b: Outcome } {
  if (scoreA > scoreB) return { a: 'W', b: 'L' }
  if (scoreA < scoreB) return { a: 'L', b: 'W' }
  return { a: 'T', b: 'T' }
}

/** One row per player per match they appeared in (4 rows per match). */
export interface PlayerMatch {
  player: Player
  partner: Player
  opponents: [Player, Player]
  pf: number
  pa: number
  result: Outcome
  round: number
  court?: number
  matchIndex: number
  scoreA: number
  scoreB: number
}

/** Stable canonical key for an unordered pair of players. */
export function pairKey(a: Player, b: Player): string {
  return [a, b].sort((x, y) => x.localeCompare(y)).join(' ∥ ')
}

/** Split each match into the four player-centric rows, with names resolved. */
export function toPlayerMatches(
  matches: Match[],
  aliases: Record<Player, Player> = {},
): PlayerMatch[] {
  const rows: PlayerMatch[] = []
  matches.forEach((mt, matchIndex) => {
    const a0 = resolveName(mt.teamA[0], aliases)
    const a1 = resolveName(mt.teamA[1], aliases)
    const b0 = resolveName(mt.teamB[0], aliases)
    const b1 = resolveName(mt.teamB[1], aliases)
    const { a, b } = outcomes(mt.scoreA, mt.scoreB)
    const base = {
      round: mt.round,
      court: mt.court,
      matchIndex,
      scoreA: mt.scoreA,
      scoreB: mt.scoreB,
    }
    rows.push(
      { player: a0, partner: a1, opponents: [b0, b1], pf: mt.scoreA, pa: mt.scoreB, result: a, ...base },
      { player: a1, partner: a0, opponents: [b0, b1], pf: mt.scoreA, pa: mt.scoreB, result: a, ...base },
      { player: b0, partner: b1, opponents: [a0, a1], pf: mt.scoreB, pa: mt.scoreA, result: b, ...base },
      { player: b1, partner: b0, opponents: [a0, a1], pf: mt.scoreB, pa: mt.scoreA, result: b, ...base },
    )
  })
  return rows
}
