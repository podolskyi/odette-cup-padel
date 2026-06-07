import type { Match, Player, Tournament } from '../types'

// Cross-tournament identity (spec §8). The user may type the same person
// differently across weeks. We NEVER auto-merge — merges live in the alias map
// and are applied at read time so the stored matches stay untouched.

/** Resolve a raw name to its canonical form via the alias map (chains are followed). */
export function resolveName(name: Player, aliases: Record<Player, Player>): Player {
  let current = name.trim()
  const seen = new Set<Player>()
  while (aliases[current] && !seen.has(current)) {
    seen.add(current)
    current = aliases[current]
  }
  return current
}

/** Return a copy of the match with every player name resolved to canonical. */
export function resolveMatch(match: Match, aliases: Record<Player, Player>): Match {
  return {
    ...match,
    teamA: [resolveName(match.teamA[0], aliases), resolveName(match.teamA[1], aliases)],
    teamB: [resolveName(match.teamB[0], aliases), resolveName(match.teamB[1], aliases)],
  }
}

/** Return a copy of the tournament with all player names resolved to canonical. */
export function resolveTournament(t: Tournament, aliases: Record<Player, Player>): Tournament {
  return { ...t, matches: t.matches.map((m) => resolveMatch(m, aliases)) }
}

/** Every distinct (canonical) player name across all tournaments, sorted. */
export function allPlayers(tournaments: Tournament[], aliases: Record<Player, Player> = {}): Player[] {
  const set = new Set<Player>()
  for (const t of tournaments) {
    for (const match of t.matches) {
      for (const p of [...match.teamA, ...match.teamB]) {
        set.add(resolveName(p, aliases))
      }
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
