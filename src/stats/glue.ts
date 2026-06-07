import type { Player, Tournament } from '../types'
import { toPlayerMatches } from './core'
import { computePartnerships } from './partnerships'

export const MIN_GLUE_SAMPLE = 6

export interface GlueRow {
  player: Player
  uplift: number // avg (partner win-rate WITH player − partner baseline), weighted by games together
  partners: number
  totalGames: number
}

/**
 * "The Glue" (spec §4.5): a player who lifts their partners.
 * For player X and each partner P: P's win rate WITH X minus P's baseline win
 * rate across all of P's games. Average those deltas, weighted by games
 * together. Requires a minimum total sample. Only meaningful with enough data.
 */
export function computeGlue(
  tournaments: Tournament[],
  aliases: Record<Player, Player> = {},
  minSample = MIN_GLUE_SAMPLE,
): GlueRow[] {
  const allMatches = tournaments.flatMap((t) => t.matches)
  const rows = toPlayerMatches(allMatches, aliases)

  // Baseline win rate per player across ALL their games.
  const wins = new Map<Player, number>()
  const games = new Map<Player, number>()
  for (const r of rows) {
    games.set(r.player, (games.get(r.player) ?? 0) + 1)
    if (r.result === 'W') wins.set(r.player, (wins.get(r.player) ?? 0) + 1)
  }
  const baseline = (p: Player) => (games.get(p) ? (wins.get(p) ?? 0) / games.get(p)! : 0)

  const partnerships = computePartnerships(allMatches, aliases)

  // For each player, accumulate weighted partner uplift.
  const upliftSum = new Map<Player, number>()
  const weightSum = new Map<Player, number>()
  const partnerCount = new Map<Player, number>()

  const consider = (x: Player, partner: Player, winRateWithX: number, gamesTogether: number) => {
    const delta = winRateWithX - baseline(partner)
    upliftSum.set(x, (upliftSum.get(x) ?? 0) + delta * gamesTogether)
    weightSum.set(x, (weightSum.get(x) ?? 0) + gamesTogether)
    partnerCount.set(x, (partnerCount.get(x) ?? 0) + 1)
  }

  for (const p of partnerships) {
    const [x, y] = p.players
    // p.winRate is the duo's win rate together = each partner's win rate with the other.
    consider(x, y, p.winRate, p.games)
    consider(y, x, p.winRate, p.games)
  }

  const result: GlueRow[] = []
  for (const [player, weight] of weightSum) {
    if (weight < minSample) continue
    result.push({
      player,
      uplift: (upliftSum.get(player) ?? 0) / weight,
      partners: partnerCount.get(player) ?? 0,
      totalGames: weight,
    })
  }
  return result.sort((a, b) => b.uplift - a.uplift || a.player.localeCompare(b.player))
}
