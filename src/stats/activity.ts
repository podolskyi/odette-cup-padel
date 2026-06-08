import type { Player, Tournament } from '../types'
import { computeStandings } from './standings'

export const RECENT_EVENTS = 3

/**
 * Players who appeared in any of the N most recent dated events.
 * Anchored to events (not the calendar), so a quiet stretch between sessions
 * doesn't silently flip everyone to idle — "active" just means "played one of
 * the last N nights". Pure & derived; nothing is stored.
 */
export function recentPlayers(
  tournaments: Tournament[],
  aliases: Record<Player, Player> = {},
  n = RECENT_EVENTS,
): Set<Player> {
  const recent = [...tournaments]
    .filter((t) => t.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n)
  const set = new Set<Player>()
  for (const t of recent) for (const s of computeStandings(t, aliases)) set.add(s.player)
  return set
}

/** Most recent event date each player appeared in (for a "last seen" tooltip). */
export function lastSeenDates(
  tournaments: Tournament[],
  aliases: Record<Player, Player> = {},
): Map<Player, string> {
  const map = new Map<Player, string>()
  for (const t of [...tournaments].filter((t) => t.date).sort((a, b) => a.date.localeCompare(b.date)))
    for (const s of computeStandings(t, aliases)) map.set(s.player, t.date)
  return map
}
