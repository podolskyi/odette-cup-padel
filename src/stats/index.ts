import type { Dataset, Player, Tournament } from '../types'
import { computeStandings, type PlayerStanding } from './standings'
import { computeAwards, type TournamentAwards } from './awards'
import {
  computePartnerships,
  MIN_PAIR_GAMES,
  type Partnership,
} from './partnerships'
import { computeRivalries, nemesisOf, type HeadToHead } from './rivalries'
import { computeSeason, type SeasonRow } from './season'
import { computeRatings, type PlayerRating, type RatingOptions } from './ratings'
import { computeGlue, type GlueRow } from './glue'

export * from './core'
export * from './standings'
export * from './partnerships'
export * from './rivalries'
export * from './awards'
export * from './season'
export * from './ratings'
export * from './glue'

// --- One tournament -------------------------------------------------------

export interface TournamentInsights {
  tournament: Tournament
  standings: PlayerStanding[]
  awards: TournamentAwards
  partnerships: Partnership[]
}

export function tournamentInsights(
  t: Tournament,
  aliases: Record<Player, Player> = {},
): TournamentInsights {
  const standings = computeStandings(t, aliases)
  return {
    tournament: t,
    standings,
    awards: computeAwards(t, aliases, standings),
    partnerships: computePartnerships(t.matches, aliases),
  }
}

// --- Whole season ---------------------------------------------------------

export interface SeasonInsights {
  season: SeasonRow[]
  ratings: PlayerRating[]
  ratingsByPlayer: Map<Player, PlayerRating>
  partnerships: Partnership[]
  rivalries: Map<string, HeadToHead>
  glue: GlueRow[]
}

export function seasonInsights(
  dataset: Pick<Dataset, 'tournaments' | 'aliases'>,
  ratingOpts?: RatingOptions,
): SeasonInsights {
  const { tournaments, aliases } = dataset
  const allMatches = tournaments.flatMap((t) => t.matches)
  const ratingsByPlayer = computeRatings(tournaments, aliases, ratingOpts)
  return {
    season: computeSeason(tournaments, aliases),
    ratings: [...ratingsByPlayer.values()].sort(
      (a, b) => b.rating - a.rating || a.player.localeCompare(b.player),
    ),
    ratingsByPlayer,
    partnerships: computePartnerships(allMatches, aliases),
    rivalries: computeRivalries(allMatches, aliases),
    glue: computeGlue(tournaments, aliases),
  }
}

// --- One player -----------------------------------------------------------

export interface PlayerFinish {
  tournamentId: string
  tournamentName: string
  nickname?: string
  date: string
  rank: number
  totalPlayers: number
  points: number
  record: string // "W-L-T"
}

export interface PlayerProfileData {
  player: Player
  season?: SeasonRow
  rating?: PlayerRating
  finishes: PlayerFinish[]
  bestPartner?: Partnership
  worstPartner?: Partnership
  mostFrequentPartner?: Partnership
  nemesis?: ReturnType<typeof nemesisOf>
  partnerships: Partnership[]
}

export function playerProfile(
  player: Player,
  dataset: Pick<Dataset, 'tournaments' | 'aliases'>,
): PlayerProfileData {
  const { tournaments, aliases } = dataset
  const allMatches = tournaments.flatMap((t) => t.matches)

  const finishes: PlayerFinish[] = []
  for (const t of [...tournaments].sort((a, b) => a.date.localeCompare(b.date))) {
    const standings = computeStandings(t, aliases)
    const row = standings.find((s) => s.player === player)
    if (!row) continue
    finishes.push({
      tournamentId: t.id,
      tournamentName: t.name,
      nickname: t.nickname,
      date: t.date,
      rank: row.rank,
      totalPlayers: standings.length,
      points: row.points,
      record: `${row.wins}-${row.losses}-${row.ties}`,
    })
  }

  const partnerships = computePartnerships(allMatches, aliases).filter(
    (p) => p.players[0] === player || p.players[1] === player,
  )
  const qualified = partnerships.filter((p) => p.games >= MIN_PAIR_GAMES)
  const bestPartner = [...qualified].sort(
    (a, b) => b.winRate - a.winRate || b.pointsPerGame - a.pointsPerGame,
  )[0]
  const worstPartner = [...qualified].sort(
    (a, b) => a.winRate - b.winRate || a.pointsPerGame - b.pointsPerGame,
  )[0]
  const mostFrequentPartner = [...partnerships].sort((a, b) => b.games - a.games)[0]

  const rivalries = computeRivalries(allMatches, aliases)
  const ratings = computeRatings(tournaments, aliases)
  const season = computeSeason(tournaments, aliases).find((s) => s.player === player)

  return {
    player,
    season,
    rating: ratings.get(player),
    finishes,
    bestPartner,
    worstPartner,
    mostFrequentPartner,
    nemesis: nemesisOf(player, rivalries),
    partnerships,
  }
}
