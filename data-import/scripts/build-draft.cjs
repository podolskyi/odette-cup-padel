const fs = require('fs')
const path = require('path')

const sources = [
  require('./transform-brackets.cjs'),
  require('./transform-puffin.cjs'),
  require('./transform-padelution.cjs'),
  require('./transform-americano.cjs'),
]

let entries = []
for (const s of sources) {
  try {
    entries = entries.concat(s.run())
  } catch (e) {
    console.error('TRANSFORM FAILED:', e.message)
  }
}

// Sort by date (undated last), then by id.
entries.sort((a, b) => (b.date || '0').localeCompare(a.date || '0') || a.id.localeCompare(b.id))

const outDir = path.join(__dirname, '..', 'out')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'draft.json'), JSON.stringify(entries, null, 2))

// Summary table
console.log(`\n${entries.length} tournaments parsed\n`)
const pad = (s, n) => String(s).padEnd(n)
console.log(pad('id', 22), pad('date', 12), pad('orig name', 26), pad('P', 3), pad('M', 4), pad('R', 3), pad('pts', 4), 'warnings')
console.log('-'.repeat(110))
for (const e of entries) {
  console.log(
    pad(e.id, 22),
    pad(e.date || '—', 12),
    pad((e._source.originalName || '').slice(0, 25), 26),
    pad(e._review.players, 3),
    pad(e._review.matches, 4),
    pad(e._review.rounds, 3),
    pad(e.pointsPerMatch, 4),
    e._review.warnings.join('; ') || 'ok',
  )
}

// Distinct names across the draft (for the merge tool).
const names = new Set()
for (const e of entries) for (const m of e.matches) for (const p of [...m.teamA, ...m.teamB]) names.add(p)
console.log(`\n${names.size} distinct player names across the draft:`)
console.log([...names].sort((a, b) => a.localeCompare(b)).join(', '))
