import type { Tournament } from '../types'
import { formatDate } from './format'

// "Odette Cup" is the umbrella name for the whole series; each event is titled
// "Odette Cup, {date}" and carries a fun nickname for flavour.

export const SERIES_NAME = 'Odette Cup'

// Pool of fun event nicknames — used as a fallback / for future tournaments
// once the importer lands. Picked deterministically from the tournament id.
const FUNNY_NAMES = [
  'Sunset Smash',
  'Bali Bandits',
  'Coconut Cup',
  'Net Ninjas',
  'Golden Set Gala',
  'Padel Rumble',
  'Volley Bay',
  'Double Trouble',
  'Ace Lagoon',
  'Smash Fiesta',
  'Jungle Jam',
  'Monsoon Masters',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function funnyName(seed: string): string {
  return FUNNY_NAMES[hash(seed) % FUNNY_NAMES.length]
}

/** The fun per-event nickname (explicit, else generated from the id). */
export function nicknameOf(t: Pick<Tournament, 'id' | 'nickname'>): string {
  return t.nickname ?? funnyName(t.id)
}

/** The canonical event title, e.g. "Odette Cup, 7 Jun 2026". */
export function eventTitle(t: Pick<Tournament, 'name' | 'date'>): string {
  return `${t.name}, ${formatDate(t.date)}`
}
