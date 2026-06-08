const fs = require('fs')
const path = require('path')
const { hasCyrillic } = require('./lib.cjs')

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

// Build a name index: cleaned name -> { count, originals (Cyrillic), tournaments }.
const idx = new Map()
for (const e of entries) {
  const label = e.nickname || e._source.originalName || e.id
  for (const o of e._origins || []) {
    let r = idx.get(o.clean)
    if (!r) { r = { count: 0, originals: new Set(), tours: new Map() }; idx.set(o.clean, r) }
    r.count++
    if (hasCyrillic(o.orig)) r.originals.add(o.orig)
    r.tours.set(e.id, { id: e.id, label, date: e.date })
  }
}
for (const e of entries) delete e._origins // keep the tournament file lean

entries.sort((a, b) => (b.date || '0').localeCompare(a.date || '0') || a.id.localeCompare(b.id))

const outDir = path.join(__dirname, '..', 'out')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'draft.json'), JSON.stringify(entries, null, 2))

const names = [...idx.entries()]
  .map(([name, r]) => ({
    name,
    count: r.count,
    originals: [...r.originals],
    tournaments: [...r.tours.values()],
  }))
  .sort((a, b) => a.name.localeCompare(b.name))
fs.writeFileSync(path.join(outDir, 'draftNames.json'), JSON.stringify(names, null, 2))

// Summary
console.log(`\n${entries.length} tournaments, ${names.length} distinct names`)
const cyr = names.filter((n) => n.originals.length)
console.log(`${cyr.length} names have a Cyrillic original, e.g.:`)
console.log(cyr.slice(0, 12).map((n) => `${n.name} (${n.originals.join('/')})`).join(', '))
