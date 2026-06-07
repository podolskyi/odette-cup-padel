// Deterministic accent assignment per player. Tailwind needs static class
// strings, so we keep a fixed palette and pick by a stable name hash.

export interface Accent {
  key: string
  solid: string // background class for the solid swatch
  soft: string // pale background class
  on: string // text color that sits on the solid swatch
  text: string // accent-colored text on paper
}

export const ACCENTS: Accent[] = [
  { key: 'punch', solid: 'bg-punch', soft: 'bg-punch-soft', on: 'text-paper-100', text: 'text-punch' },
  { key: 'tang', solid: 'bg-tang', soft: 'bg-tang-soft', on: 'text-ink', text: 'text-tang' },
  { key: 'sky', solid: 'bg-sky', soft: 'bg-sky-soft', on: 'text-paper-100', text: 'text-sky' },
  { key: 'mint', solid: 'bg-mint', soft: 'bg-mint-soft', on: 'text-ink', text: 'text-mint' },
  { key: 'grape', solid: 'bg-grape', soft: 'bg-grape-soft', on: 'text-paper-100', text: 'text-grape' },
  { key: 'sun', solid: 'bg-sun', soft: 'bg-sun-soft', on: 'text-ink', text: 'text-ink' },
  { key: 'lime', solid: 'bg-lime', soft: 'bg-lime-soft', on: 'text-ink', text: 'text-lime' },
]

function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function accentForName(name: string): Accent {
  return ACCENTS[hash(name) % ACCENTS.length]
}

export function accentByKey(key: string): Accent {
  return ACCENTS.find((a) => a.key === key) ?? ACCENTS[0]
}

// Raw hex values (for SVG / Recharts strokes, which can't take Tailwind classes).
export const ACCENT_HEX: Record<string, string> = {
  punch: '#FF2E74',
  tang: '#FF7A1A',
  sky: '#2D8CFF',
  mint: '#12B5A5',
  grape: '#7C3AED',
  sun: '#F2A900',
  lime: '#7FBF1F',
}

export function hexForName(name: string): string {
  return ACCENT_HEX[accentForName(name).key] ?? '#211C18'
}
