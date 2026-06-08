// One-time snapshot: dump production seed (4) + imported draft (17) + the LIVE
// merge state from Supabase to local backup files, so nothing can be lost.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { odetteCup } from '../../src/data/fixtureOdette'
import { odette21Mar, odette17May, odette31May } from '../../src/data/realFixtures'
import { SEED_ALIASES } from '../../src/data/aliases'

const root = process.cwd()
const draft = JSON.parse(readFileSync(join(root, 'src/data/draft/draftTournaments.json'), 'utf8'))
const names = JSON.parse(readFileSync(join(root, 'src/data/draft/draftNames.json'), 'utf8'))

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const dir = join(root, 'data-import', 'backup', stamp)
mkdirSync(dir, { recursive: true })

const seed = [odette21Mar, odette17May, odette31May, odetteCup]
writeFileSync(join(dir, 'seed-tournaments.json'), JSON.stringify(seed, null, 2))
writeFileSync(join(dir, 'seed-aliases.json'), JSON.stringify(SEED_ALIASES, null, 2))
writeFileSync(join(dir, 'draft-tournaments.json'), JSON.stringify(draft, null, 2))
writeFileSync(join(dir, 'draft-names.json'), JSON.stringify(names, null, 2))

// Live organizer work from Supabase (aliases + dates + the stored raw).
const SB = 'https://cyzbflzkbsggwidrqxax.supabase.co/rest/v1/merge_review?id=eq.draft&select=*'
const KEY = 'sb_publishable_QpkfawuTUuZnYvXugv51uQ_TSDT_H4L'
let row: any = null
try {
  const res = await fetch(SB, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  row = (await res.json())[0] ?? null
  writeFileSync(join(dir, 'merge-review-live.json'), JSON.stringify(row, null, 2))
} catch (e) {
  console.error('WARN: could not fetch live merge state:', (e as Error).message)
}

console.log('✅ backup written to', dir)
console.log('   seed tournaments :', seed.length)
console.log('   draft tournaments:', draft.length)
console.log('   draft names      :', names.length)
console.log('   live merges      :', Object.keys(row?.aliases ?? {}).length)
console.log('   live dates       :', Object.keys(row?.dates ?? {}).length)
