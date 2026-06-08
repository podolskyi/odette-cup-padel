const fs = require('fs')
const path = require('path')
const { buildEntry } = require('./lib.cjs')

const RAW = path.join(__dirname, '..', 'raw')

const FILES = [
  { file: 'padelution-9e752512.html', url: 'https://www.padelution.com/americano/9e752512-8073-4f73-bb3f-fc5ca46d1aaf' },
  { file: 'padelution-9e5364a5.html', url: 'https://www.padelution.com/americano/9e5364a5-d783-43ac-a8fc-9104d0b43f1f' },
]

function tokenize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

const isNum = (s) => /^\d{1,3}$/.test(s)

function parseMatches(tokens) {
  const start = tokens.findIndex((t, i) => t === 'Round' && isNum(tokens[i + 1]))
  if (start < 0) return []
  const matches = []
  let round = 0
  let courtInRound = 0
  for (let i = start; i < tokens.length; i++) {
    if (tokens[i] === 'Round' && isNum(tokens[i + 1])) {
      round = Number(tokens[i + 1])
      courtInRound = 0
      i++
      continue
    }
    if (tokens[i] !== 'vs') continue
    const scoreA = tokens[i - 1]
    const scoreB = tokens[i + 1]
    if (!isNum(scoreA) || !isNum(scoreB)) continue
    const a1 = tokens[i - 3], a2 = tokens[i - 2], b1 = tokens[i + 2], b2 = tokens[i + 3]
    if (!a1 || !a2 || !b1 || !b2) continue
    courtInRound++
    matches.push({ round, court: courtInRound, scoreA: Number(scoreA), scoreB: Number(scoreB), teamA: [a1, a2], teamB: [b1, b2] })
  }
  return matches
}

function findDate(html) {
  const m = html.match(/\b([0-3]?\d)\.([01]?\d)\.(20\d\d)\b/)
  if (m) return { date: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, rawDate: m[0] }
  const iso = html.match(/\b20\d\d-\d\d-\d\d\b/)
  return iso ? { date: iso[0], rawDate: iso[0] } : { date: '', rawDate: null }
}

function findName(html) {
  // padelution renders the title as e.g. ">Odette Tuesday Americano (18.03.2025)".
  const m = html.match(/>([^<>]{3,80}?)\s*\((?:[0-3]?\d)\.(?:[01]?\d)\.20\d\d\)/)
  if (m && m[1].trim()) return m[1].trim()
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return title ? title[1].replace(/\s*[|\-–]\s*Padelution.*$/i, '').trim() : 'Padelution Americano'
}

function run() {
  return FILES.map(({ file, url }) => {
    const html = fs.readFileSync(path.join(RAW, file), 'utf8')
    const { date, rawDate } = findDate(html)
    return buildEntry(
      { id: `padelution-${file.match(/9e[0-9a-f]+/)[0]}`, service: 'padelution', sourceUrl: url, originalName: findName(html), date, rawDate, format: 'Americano' },
      parseMatches(tokenize(html)),
    )
  })
}

module.exports = { run }
