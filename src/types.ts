// Core domain model (spec §2).
// Players are identified by their canonical name string (case-sensitive, trimmed).
// IMPORTANT: "Denis" and "Denis R" are two different people — never auto-merge.

export type Player = string

export type TournamentFormat = 'Americano' | 'Mexicano' | 'Other'

export interface Match {
  round: number // 1-based
  court?: number // 1-based, display only
  teamA: [Player, Player]
  teamB: [Player, Player]
  scoreA: number
  scoreB: number
}

export interface Tournament {
  id: string // uuid-ish
  name: string // the series name, e.g. "Odette Cup"
  nickname?: string // a fun per-event name, e.g. "Sunset Smash"
  date: string // ISO yyyy-mm-dd
  format: TournamentFormat
  pointsPerMatch: number // sum of the two scores in any match (e.g. 16)
  matches: Match[]
}

/**
 * The whole persisted dataset — the single source of truth.
 * All statistics are DERIVED from this, never stored precomputed (spec §11).
 */
export interface Dataset {
  version: number
  tournaments: Tournament[]
  /**
   * Alias map for cross-tournament identity (spec §8): alias name -> canonical name.
   * Applied retroactively when computing stats. Never auto-populated.
   */
  aliases: Record<Player, Player>
}
