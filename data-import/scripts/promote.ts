// Promotion: merge the 4 verified events + 17 imported drafts into ONE dataset,
// with the organizer's name-merges BAKED IN (matches rewritten to canonical
// names) and the manual dates applied. Output: src/data/allTournaments.json.
import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Tournament } from '../../src/types'
import { odetteCup } from '../../src/data/fixtureOdette'
import { odette21Mar, odette17May, odette31May } from '../../src/data/realFixtures'
import { SEED_ALIASES } from '../../src/data/aliases'

const root = process.cwd()
const draft = JSON.parse(readFileSync(join(root, 'src/data/draft/draftTournaments.json'), 'utf8'))

// Latest live merge state from Supabase (fallback: newest local backup).
const SB = 'https://cyzbflzkbsggwidrqxax.supabase.co/rest/v1/merge_review?id=eq.draft&select=aliases,dates'
const KEY = 'sb_publishable_QpkfawuTUuZnYvXugv51uQ_TSDT_H4L'
let live: { aliases: Record<string, string>; dates: Record<string, string> }
try {
  const res = await fetch(SB, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  live = (await res.json())[0]
  if (!live) throw new Error('empty')
  console.log('using LIVE merge state from Supabase')
} catch {
  const dir = join(root, 'data-import', 'backup')
  const latest = readdirSync(dir).sort().pop()!
  live = JSON.parse(readFileSync(join(dir, latest, 'merge-review-live.json'), 'utf8'))
  console.log('using BACKUP merge state from', latest)
}

const aliases: Record<string, string> = { ...SEED_ALIASES, ...live.aliases }
const dates: Record<string, string> = live.dates || {}

function resolve(name: string): string {
  let c = name
  const seen = new Set<string>()
  while (aliases[c] && !seen.has(c)) { seen.add(c); c = aliases[c] }
  return c
}

const sources = [odette21Mar, odette17May, odette31May, odetteCup, ...draft]
const all: Tournament[] = sources.map((t: any) => ({
  id: t.id,
  name: 'Odette Cup',
  nickname: t.nickname || t._source?.originalName || undefined,
  date: dates[t.id] || t.date || '',
  format: t.format,
  pointsPerMatch: t.pointsPerMatch,
  matches: t.matches.map((m: any) => ({
    round: m.round,
    court: m.court,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    teamA: [resolve(m.teamA[0]), resolve(m.teamA[1])],
    teamB: [resolve(m.teamB[0]), resolve(m.teamB[1])],
  })),
}))

all.sort((a, b) => (a.date || '0').localeCompare(b.date || '0'))

writeFileSync(join(root, 'src/data/allTournaments.json'), JSON.stringify(all, null, 2))

const players = new Set<string>()
for (const t of all) for (const m of t.matches) for (const p of [...m.teamA, ...m.teamB]) players.add(p)
console.log('✅ wrote src/data/allTournaments.json')
console.log('   tournaments    :', all.length)
console.log('   matches        :', all.reduce((n, t) => n + t.matches.length, 0))
console.log('   unique players :', players.size, '(baked canonical)')
console.log('   undated        :', all.filter((t) => !t.date).length)
