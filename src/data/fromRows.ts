import type { Match, Tournament, TournamentFormat } from '../types'

// Compact tournament rows captured by parsing americano-padel.com pages, kept
// terse so the embedded fixtures stay readable: [round, court, scoreA, scoreB, a1, a2, b1, b2].
export type Row = [number, number, number, number, string, string, string, string]

export interface FixtureMeta {
  id: string
  name: string
  nickname?: string
  date: string // ISO yyyy-mm-dd
  format?: TournamentFormat
}

/**
 * Build a Tournament from compact rows. Drops 0-0 matches — on americano-padel.com
 * those are scheduled-but-unplayed courts (a real Americano match always sums to the total).
 */
export function fromRows(meta: FixtureMeta, rows: Row[]): Tournament {
  const matches: Match[] = rows
    .filter((r) => !(r[2] === 0 && r[3] === 0))
    .map((r) => ({
      round: r[0],
      court: r[1],
      scoreA: r[2],
      scoreB: r[3],
      teamA: [r[4], r[5]],
      teamB: [r[6], r[7]],
    }))
  const first = matches[0]
  return {
    id: meta.id,
    name: meta.name,
    nickname: meta.nickname,
    date: meta.date,
    format: meta.format ?? 'Americano',
    pointsPerMatch: first ? first.scoreA + first.scoreB : 16,
    matches,
  }
}
