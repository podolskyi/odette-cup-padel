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
export * from './fun'

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

export type AwardKind =
  | 'demolition'
  | 'bestDuo'
  | 'cardio'
  | 'wall'
  | 'diplomat'
  | 'heartbreaker'
  | 'giantSlayer'
  | 'mostCarried'
  | 'woodenSpoon'
  | 'perfectPair'

export interface EarnedAward {
  kind: AwardKind
  tournamentId: string
  tournamentName: string
  nickname?: string
  date: string
  partner?: Player // for duo / pair awards
  detail?: string
}

/** Pull out the awards a single player earned in one tournament. */
function earnedAwardsFor(player: Player, t: Tournament, a: TournamentAwards): EarnedAward[] {
  const base = { tournamentId: t.id, tournamentName: t.name, nickname: t.nickname, date: t.date }
  const out: EarnedAward[] = []
  const other = (duo: [Player, Player]) => (duo[0] === player ? duo[1] : duo[0])

  if (a.demolition && a.demolition.winners.includes(player))
    out.push({ ...base, kind: 'demolition', partner: other(a.demolition.winners), detail: `${a.demolition.scoreFor}–${a.demolition.scoreAgainst}` })
  if (a.bestDuo && a.bestDuo.players.includes(player))
    out.push({ ...base, kind: 'bestDuo', partner: other(a.bestDuo.players), detail: `${Math.round(a.bestDuo.winRate * 100)}% win` })
  if (a.cardio && a.cardio.player === player)
    out.push({ ...base, kind: 'cardio', detail: `${a.cardio.pf} pts` })
  if (a.wall && a.wall.player === player)
    out.push({ ...base, kind: 'wall', detail: `${Math.round(a.wall.paPerGame * 10) / 10} PA/game` })
  if (a.diplomat && a.diplomat.player === player)
    out.push({ ...base, kind: 'diplomat', detail: `${a.diplomat.ties} ties` })
  if (a.heartbreaker && a.heartbreaker.player === player)
    out.push({ ...base, kind: 'heartbreaker', detail: `${a.heartbreaker.closeLosses}× by ≤2` })
  if (a.giantSlayer && a.giantSlayer.winners.includes(player))
    out.push({ ...base, kind: 'giantSlayer', partner: other(a.giantSlayer.winners) })
  if (a.mostCarried && a.mostCarried.player === player)
    out.push({ ...base, kind: 'mostCarried' })
  if (a.woodenSpoon && a.woodenSpoon.player === player)
    out.push({ ...base, kind: 'woodenSpoon', detail: `${a.woodenSpoon.points} pts` })
  for (const p of a.perfectPairs) {
    if (p.players.includes(player))
      out.push({ ...base, kind: 'perfectPair', partner: other(p.players), detail: `${p.wins}-0` })
  }
  return out
}

export interface PlayerProfileData {
  player: Player
  season?: SeasonRow
  rating?: PlayerRating
  finishes: PlayerFinish[]
  awards: EarnedAward[]
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
  const awards: EarnedAward[] = []
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
    awards.push(...earnedAwardsFor(player, t, computeAwards(t, aliases, standings)))
  }
  awards.sort((a, b) => b.date.localeCompare(a.date))

  const partnerships = computePartnerships(allMatches, aliases).filter(
    (p) => p.players[0] === player || p.players[1] === player,
  )
  // Best/Toughest partner only make sense when there are 2+ distinct partners
  // with enough games — otherwise they'd collapse onto the same lone partner.
  const byWin = partnerships
    .filter((p) => p.games >= MIN_PAIR_GAMES)
    .sort((a, b) => b.winRate - a.winRate || b.pointsPerGame - a.pointsPerGame)
  const bestPartner = byWin.length >= 2 ? byWin[0] : undefined
  const worstPartner = byWin.length >= 2 ? byWin[byWin.length - 1] : undefined
  const mostFrequentPartner = [...partnerships].sort((a, b) => b.games - a.games)[0]

  const rivalries = computeRivalries(allMatches, aliases)
  const ratings = computeRatings(tournaments, aliases)
  const season = computeSeason(tournaments, aliases).find((s) => s.player === player)

  return {
    player,
    season,
    rating: ratings.get(player),
    finishes,
    awards,
    bestPartner,
    worstPartner,
    mostFrequentPartner,
    nemesis: nemesisOf(player, rivalries),
    partnerships,
  }
}
