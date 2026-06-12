export const pct = (n: number): string => `${Math.round(n * 100)}%`

export const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`)

export const round1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1)

export function ordinal(n: number): string {
  // Ukrainian place ordinal, e.g. "1-е", "2-е", "3-є".
  return `${n}-${n % 10 === 3 && n % 100 !== 13 ? 'є' : 'е'}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function formatDate(iso: string): string {
  // iso = yyyy-mm-dd; render as "7 чер 2026" without timezone surprises.
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
  if (!y || !m || !d) return iso
  return `${d} ${months[m - 1]} ${y}`
}

export const record = (w: number, l: number, t: number): string => `${w}-${l}-${t}`
