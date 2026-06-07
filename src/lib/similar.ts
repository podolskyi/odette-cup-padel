// Tiny string similarity used to suggest likely-duplicate player names
// (e.g. "Oleksii" / "Oleksey", "sofia" / "Sofia"). Suggestions only — the user
// always confirms, since look-alikes can be different people ("Denis" / "Denis R").

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

export interface NameSuggestion {
  a: string
  b: string
  distance: number
}

function commonPrefix(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

/**
 * Suggest pairs that are probably the same person: equal ignoring case, or a
 * small edit distance AND a shared ≥3-char prefix. The prefix guard avoids
 * false positives between distinct short names (Alina/Irina, Marina/Sabrina)
 * while still catching Oleksii/Oleksey, sofia/Sofia, Irina/Irina P.
 */
export function suggestDuplicates(names: string[], maxDistance = 2): NameSuggestion[] {
  const out: NameSuggestion[] = []
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]
      const b = names[j]
      const al = a.toLowerCase()
      const bl = b.toLowerCase()
      if (al === bl) {
        out.push({ a, b, distance: 0 })
        continue
      }
      const d = levenshtein(al, bl)
      if (d <= maxDistance && commonPrefix(al, bl) >= 3) out.push({ a, b, distance: d })
    }
  }
  return out.sort((x, y) => x.distance - y.distance || x.a.localeCompare(y.a))
}
