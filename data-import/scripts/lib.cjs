// Shared helpers for the one-time multi-source import.
// Produces draft entries in our Tournament shape + review metadata.

// --- Cyrillic → Latin transliteration (RU + UA) -----------------------------
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'yo', є: 'ye',
  ж: 'zh', з: 'z', и: 'i', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e',
  ю: 'yu', я: 'ya',
}
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

function hasCyrillic(s) {
  return /[Ѐ-ӿ]/.test(s)
}

function transliterate(name) {
  if (!hasCyrillic(name)) return name
  let out = ''
  for (const ch of name) {
    const lower = ch.toLowerCase()
    const mapped = MAP[lower]
    if (mapped === undefined) {
      out += ch // keep spaces, punctuation, digits
    } else if (ch === lower) {
      out += mapped
    } else {
      out += cap(mapped)
    }
  }
  return out
}

/** Title-case each word so case-only variants (ANDREW vs Andrew) collapse. */
function titleCase(s) {
  return s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

/** Trim, collapse whitespace, transliterate Cyrillic→Latin, normalise to Title Case. */
function cleanName(name) {
  return titleCase(transliterate(String(name ?? '').replace(/\s+/g, ' ').trim()))
}

// --- Tournament assembly ----------------------------------------------------

/** Most common value in an array (for inferring pointsPerMatch). */
function mode(nums) {
  const c = new Map()
  let best, bestN = -1
  for (const n of nums) {
    const k = (c.get(n) ?? 0) + 1
    c.set(n, k)
    if (k > bestN) { bestN = k; best = n }
  }
  return best
}

/**
 * Build a draft entry.
 * meta: { id, service, sourceUrl, originalName, date (ISO or ''), rawDate, format, points? }
 * rawMatches: [{ round, court, scoreA, scoreB, teamA:[a,b], teamB:[c,d] }] (names already cleaned)
 */
function buildEntry(meta, rawMatches) {
  const warnings = []

  // Drop unplayed (both 0) and malformed rows.
  const kept = []
  let dropped = 0
  for (const m of rawMatches) {
    const sa = Number(m.scoreA), sb = Number(m.scoreB)
    const names = [...m.teamA, ...m.teamB].map(cleanName)
    if (names.some((n) => !n)) { dropped++; continue }
    if (!Number.isFinite(sa) || !Number.isFinite(sb)) { dropped++; continue }
    if (sa === 0 && sb === 0) { dropped++; continue }
    kept.push({
      round: m.round, court: m.court,
      scoreA: sa, scoreB: sb,
      teamA: [names[0], names[1]], teamB: [names[2], names[3]],
    })
  }
  if (dropped) warnings.push(`${dropped} unplayed/blank match(es) dropped`)
  if (kept.length === 0) warnings.push('NO valid matches parsed')

  // pointsPerMatch: explicit, else the most common score sum.
  const sums = kept.map((m) => m.scoreA + m.scoreB)
  const pts = meta.points || mode(sums) || 0
  const offSum = kept.filter((m) => m.scoreA + m.scoreB !== pts).length
  if (offSum) warnings.push(`${offSum} match(es) don't sum to ${pts} (incomplete/odd scores)`)
  if (!meta.date) warnings.push('no date found — needs manual entry')

  const players = new Set()
  for (const m of kept) for (const p of [...m.teamA, ...m.teamB]) players.add(p)

  return {
    id: meta.id,
    name: 'Odette Cup',
    nickname: meta.originalName || undefined,
    date: meta.date || '',
    format: meta.format || 'Americano',
    pointsPerMatch: pts,
    matches: kept,
    _source: {
      service: meta.service,
      url: meta.sourceUrl,
      originalName: meta.originalName,
      rawDate: meta.rawDate || null,
    },
    _review: {
      players: players.size,
      matches: kept.length,
      rounds: kept.reduce((mx, m) => Math.max(mx, m.round), 0),
      warnings,
    },
  }
}

module.exports = { transliterate, hasCyrillic, cleanName, mode, buildEntry }
