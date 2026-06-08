import type { Tournament } from '../types'
import raw from '../data/draft/draftTournaments.json'

// Draft entries = our Tournament shape + import review metadata (underscored,
// stripped on promotion). Produced one-time by data-import/scripts.
export interface DraftEntry extends Tournament {
  _source: { service: string; url: string; originalName: string; rawDate: string | null }
  _review: { players: number; matches: number; rounds: number; warnings: string[] }
}

export const draftTournaments = raw as unknown as DraftEntry[]
