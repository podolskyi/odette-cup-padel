const fs = require('fs')
const path = require('path')
const { buildEntry } = require('./lib.cjs')

const RAW = path.join(__dirname, '..', 'raw')
const BASE = 'https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f'
const SUFFIXES = ['314', '329', '365', '3211', '358']

function htmlToTokens(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

const isNum = (s) => /^\d{1,3}$/.test(s)
const isRound = (s) => /^Round\s*#?\d+$/i.test(s)
const isCourt = (s) => /^Court\s*\d+$/i.test(s)

function parseMatches(tokens) {
  const start = tokens.findIndex(isRound)
  if (start < 0) return []
  const matches = []
  let round = 0
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i]
    if (isRound(t)) { round = Number(t.replace(/\D/g, '')); continue }
    if (!isCourt(t)) continue
    const court = Number(t.replace(/\D/g, ''))
    // Seek the next two numeric tokens (skipping "+4p" etc.), without crossing a marker.
    const nums = []
    let j = i + 1
    for (; j < tokens.length && nums.length < 2; j++) {
      if (isRound(tokens[j]) || isCourt(tokens[j])) break
      if (isNum(tokens[j])) nums.push(j)
    }
    if (nums.length < 2) continue
    const scoreA = Number(tokens[nums[0]])
    const scoreB = Number(tokens[nums[1]])
    // 4 names after the second score, skipping markers/numbers.
    const names = []
    for (let k = nums[1] + 1; k < tokens.length && names.length < 4; k++) {
      if (isRound(tokens[k]) || isCourt(tokens[k])) break
      if (isNum(tokens[k])) continue
      names.push(tokens[k])
    }
    if (names.length < 4) continue
    matches.push({ round, court, scoreA, scoreB, teamA: [names[0], names[1]], teamB: [names[2], names[3]] })
    i = nums[1]
  }
  return matches
}

function findDate(_html, title) {
  // americano-padel pages carry no reliable event date (any ISO in the markup is
  // a "now"/build timestamp). Leave blank; keep the title (e.g. "19th Oct") as a
  // hint for manual entry in the review tool.
  const partial = title && /\d/.test(title) ? title : null
  return { date: '', rawDate: partial }
}

function run() {
  return SUFFIXES.map((sfx) => {
    const file = path.join(RAW, `americano-${sfx}.html`)
    const html = fs.readFileSync(file, 'utf8')
    const title = (html.match(/<h1[^>]*>([^<]+)/) || [, ''])[1].trim()
    const { date, rawDate } = findDate(html, title)
    const rawMatches = parseMatches(htmlToTokens(html))
    return buildEntry(
      { id: `americano-${sfx}`, service: 'americano-padel', sourceUrl: BASE + sfx, originalName: title, date, rawDate, format: 'Americano' },
      rawMatches,
    )
  })
}

module.exports = { run }
