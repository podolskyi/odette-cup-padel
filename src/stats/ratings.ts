import type { Player, Tournament } from '../types'
import { resolveName } from '../identity/aliases'
import { outcomes } from './core'

export const START_RATING = 1000
export const DEFAULT_K = 24

export interface RatingPoint {
  date: string
  tournamentId: string
  tournamentName: string
  round: number
  rating: number
}

export interface PlayerRating {
  player: Player
  rating: number
  games: number
  peak: number
  low: number
  history: RatingPoint[]
}

export interface RatingOptions {
  k?: number
  /** Scale K by score margin so blowouts move ratings more (spec §5, default on). */
  marginMultiplier?: boolean
}

/**
 * Team-Elo ratings across all tournaments, processed chronologically (spec §5).
 *
 * Note: the W/L/T outcome (not the raw point score) drives the base update;
 * margin only scales K. The data model intentionally stays simple so this can
 * later be swapped for Glicko-2 (adds rating reliability) without schema changes.
 */
export function computeRatings(
  tournaments: Tournament[],
  aliases: Record<Player, Player> = {},
  opts: RatingOptions = {},
): Map<Player, PlayerRating> {
  const k = opts.k ?? DEFAULT_K
  const useMargin = opts.marginMultiplier ?? true

  const ratings = new Map<Player, PlayerRating>()
  const get = (p: Player): PlayerRating => {
    let r = ratings.get(p)
    if (!r) {
      r = { player: p, rating: START_RATING, games: 0, peak: START_RATING, low: START_RATING, history: [] }
      ratings.set(p, r)
    }
    return r
  }

  const ordered = [...tournaments].sort((a, b) => a.date.localeCompare(b.date))

  for (const t of ordered) {
    const matches = t.matches
      .map((m, i) => ({ m, i }))
      .sort((x, y) => x.m.round - y.m.round || (x.m.court ?? 0) - (y.m.court ?? 0) || x.i - y.i)

    for (const { m } of matches) {
      const a0 = get(resolveName(m.teamA[0], aliases))
      const a1 = get(resolveName(m.teamA[1], aliases))
      const b0 = get(resolveName(m.teamB[0], aliases))
      const b1 = get(resolveName(m.teamB[1], aliases))

      // Seed a baseline history point the first time we see a player.
      for (const r of [a0, a1, b0, b1]) {
        if (r.history.length === 0) {
          r.history.push({
            date: t.date,
            tournamentId: t.id,
            tournamentName: t.name,
            round: 0,
            rating: r.rating,
          })
        }
      }

      const ra = (a0.rating + a1.rating) / 2
      const rb = (b0.rating + b1.rating) / 2
      const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400))
      const eb = 1 - ea
      const { a, b } = outcomes(m.scoreA, m.scoreB)
      const sa = a === 'W' ? 1 : a === 'T' ? 0.5 : 0
      const sb = b === 'W' ? 1 : b === 'T' ? 0.5 : 0

      const kEff = useMargin
        ? k * (1 + Math.abs(m.scoreA - m.scoreB) / t.pointsPerMatch)
        : k
      const deltaA = kEff * (sa - ea)
      const deltaB = kEff * (sb - eb)

      apply(a0, deltaA, t, m.round)
      apply(a1, deltaA, t, m.round)
      apply(b0, deltaB, t, m.round)
      apply(b1, deltaB, t, m.round)
    }
  }

  return ratings
}

function apply(r: PlayerRating, delta: number, t: Tournament, round: number): void {
  r.rating += delta
  r.games += 1
  r.peak = Math.max(r.peak, r.rating)
  r.low = Math.min(r.low, r.rating)
  r.history.push({
    date: t.date,
    tournamentId: t.id,
    tournamentName: t.name,
    round,
    rating: r.rating,
  })
}

/** Rating leaderboard, highest first. */
export function ratingLeaderboard(ratings: Map<Player, PlayerRating>): PlayerRating[] {
  return [...ratings.values()].sort(
    (a, b) => b.rating - a.rating || a.player.localeCompare(b.player),
  )
}
