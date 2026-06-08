const fs = require('fs')
const path = require('path')
const { buildEntry } = require('./lib.cjs')

const RAW = path.join(__dirname, '..', 'raw')

const FILES = [
  { file: 'padelpuffin-mex-019e585d.html', format: 'Mexicano', url: 'https://padelpuffin.com/mexicano/019e585d-0666-46a5-be23-22166bc3a8b4' },
  { file: 'padelpuffin-mex-0198c016.html', format: 'Mexicano', url: 'https://padelpuffin.com/mexicano/0198c016-1860-49ce-b39a-b679ee8b0975' },
  { file: 'padelpuffin-ame-01958abc.html', format: 'Americano', url: 'https://padelpuffin.com/americano/01958abc-d2a8-4de2-b418-fb59276b705f' },
  { file: 'padelpuffin-ame-01953cbb.html', format: 'Americano', url: 'https://padelpuffin.com/americano/01953cbb-c59f-48e7-82d4-b7515404bf2a' },
]

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function decodeRsc(html) {
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g
  let m, out = ''
  while ((m = re.exec(html))) {
    try { out += JSON.parse('"' + m[1] + '"') } catch { /* skip */ }
  }
  return out
}

// Extract the balanced JSON object that follows `"key":`.
function extractObject(str, key) {
  const at = str.indexOf('"' + key + '"')
  if (at < 0) return null
  let i = str.indexOf('{', at)
  if (i < 0) return null
  let depth = 0, inStr = false, esc = false
  for (let j = i; j < str.length; j++) {
    const c = str[j]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return JSON.parse(str.slice(i, j + 1)) }
  }
  return null
}

function parseDate(s) {
  if (!s) return { date: '', rawDate: s || null }
  const m = String(s).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) return { date: '', rawDate: s }
  const mi = MONTHS.indexOf(m[2].toLowerCase())
  if (mi < 0) return { date: '', rawDate: s }
  const d = `${m[3]}-${String(mi + 1).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`
  return { date: d, rawDate: s }
}

function run() {
  return FILES.map(({ file, format, url }) => {
    const html = fs.readFileSync(path.join(RAW, file), 'utf8')
    const t = extractObject(decodeRsc(html), 'pageTournament')
    if (!t) throw new Error('pageTournament not found in ' + file)
    const { date, rawDate } = parseDate(t.createdAt)
    const rawMatches = []
    ;(t.rounds || []).forEach((rnd) => {
      ;(rnd.matches || []).forEach((mt, mi) => {
        rawMatches.push({
          round: rnd.roundNumber ?? mi + 1,
          court: Number(String(mt.courtName).replace(/\D/g, '')) || mi + 1,
          scoreA: mt.scoreTeam1,
          scoreB: mt.scoreTeam2,
          teamA: [mt.team1Player1Name, mt.team1Player2Name],
          teamB: [mt.team2Player1Name, mt.team2Player2Name],
        })
      })
    })
    return buildEntry(
      { id: `puffin-${t.id.slice(0, 8)}`, service: 'padelpuffin', sourceUrl: url, originalName: t.name, date, rawDate, format, points: t.maxPoints || 0 },
      rawMatches,
    )
  })
}

module.exports = { run }
