import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dataset, Match, Tournament } from '../types'
import allTournaments from '../data/allTournaments.json'

export const DATA_VERSION = 6
// Bump the key when the seeded data changes so existing browsers reseed.
const STORAGE_KEY = 'odette-cup-padel:v6'

/**
 * The unified Odette Cup history: all 21 events merged into one store with
 * player name-merges already BAKED into the match data (see
 * data-import/scripts/promote.ts), so no alias map is needed at runtime.
 */
export function seedDataset(): Dataset {
  return {
    version: DATA_VERSION,
    // Deep clone so persisted edits never mutate the imported data.
    tournaments: JSON.parse(JSON.stringify(allTournaments)) as Tournament[],
    aliases: {},
  }
}

interface AppState extends Dataset {
  /** Replace a single match (used by inline score editing). */
  updateMatch: (tournamentId: string, index: number, patch: Partial<Match>) => void
  /** Add / replace a whole tournament (used later by the importer). */
  upsertTournament: (t: Tournament) => void
  deleteTournament: (id: string) => void
  /** Merge / split player identities (alias map). */
  setAlias: (from: string, to: string) => void
  removeAlias: (from: string) => void
  clearAliases: () => void
  /** Replace the entire dataset (JSON import). */
  loadDataset: (data: Dataset) => void
  /** Restore the shipped fixtures. */
  resetToSeed: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...seedDataset(),

      updateMatch: (tournamentId, index, patch) =>
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id !== tournamentId
              ? t
              : {
                  ...t,
                  matches: t.matches.map((mt, i) => (i === index ? { ...mt, ...patch } : mt)),
                },
          ),
        })),

      upsertTournament: (t) =>
        set((state) => {
          const exists = state.tournaments.some((x) => x.id === t.id)
          return {
            tournaments: exists
              ? state.tournaments.map((x) => (x.id === t.id ? t : x))
              : [...state.tournaments, t],
          }
        }),

      deleteTournament: (id) =>
        set((state) => ({ tournaments: state.tournaments.filter((t) => t.id !== id) })),

      setAlias: (from, to) =>
        set((state) => ({ aliases: { ...state.aliases, [from.trim()]: to.trim() } })),

      removeAlias: (from) =>
        set((state) => {
          const next = { ...state.aliases }
          delete next[from]
          return { aliases: next }
        }),

      clearAliases: () => set(() => ({ aliases: {} })),

      loadDataset: (data) =>
        set(() => ({
          version: data.version ?? DATA_VERSION,
          tournaments: data.tournaments ?? [],
          aliases: data.aliases ?? {},
        })),

      resetToSeed: () => set(() => seedDataset()),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        version: state.version,
        tournaments: state.tournaments,
        aliases: state.aliases,
      }),
    },
  ),
)

/** Plain selector helpers (kept outside the hook so they're testable). */
export function exportDataset(state: Dataset): string {
  const payload: Dataset = {
    version: state.version,
    tournaments: state.tournaments,
    aliases: state.aliases,
  }
  return JSON.stringify(payload, null, 2)
}
