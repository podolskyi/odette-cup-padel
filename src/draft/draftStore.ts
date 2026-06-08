import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Review workspace state — kept in its OWN localStorage key so reviewing the
// import never touches the live app data. Promotion happens via Export.
interface DraftState {
  aliases: Record<string, string> // merge map built during review (from -> to)
  dates: Record<string, string> // tournamentId -> manual ISO date
  setAlias: (from: string, to: string) => void
  removeAlias: (from: string) => void
  clearAliases: () => void
  setDate: (id: string, date: string) => void
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set) => ({
      aliases: {},
      dates: {},
      setAlias: (from, to) =>
        set((s) => ({ aliases: { ...s.aliases, [from.trim()]: to.trim() } })),
      removeAlias: (from) =>
        set((s) => {
          const next = { ...s.aliases }
          delete next[from]
          return { aliases: next }
        }),
      clearAliases: () => set({ aliases: {} }),
      setDate: (id, date) => set((s) => ({ dates: { ...s.dates, [id]: date } })),
    }),
    { name: 'odette-cup-padel:draft-review' },
  ),
)
