const fs = require('fs')
const path = require('path')
const { buildEntry } = require('./lib.cjs')

const RAW = path.join(__dirname, '..', 'raw')

// id -> public source URL (for the review tool)
const SOURCES = {
  '8oJo': 'https://brackets.app/~/8oJo/',
  '5WmY': 'https://brackets.app/~/5WmY/',
  BBR8x: 'https://brackets.app/t/BBR8x/',
  nnwR: 'https://brackets.app/t/nnwR/',
  PPxA: 'https://brackets.app/t/PPxA/',
  '9k4Y': 'https://bracketmaker.app/~/9k4Y/',
}

function fmt(variation = '') {
  return /mexicano/i.test(variation) ? 'Mexicano' : 'Americano'
}

function isoDate(t) {
  const raw = t.starts_at || t.ends_at || t.created_at || null
  return { date: raw ? raw.slice(0, 10) : '', rawDate: raw }
}

function run() {
  return Object.keys(SOURCES).map((id) => {
    const t = JSON.parse(fs.readFileSync(path.join(RAW, `brackets-${id}.json`), 'utf8')).data
    const { date, rawDate } = isoDate(t)
    const rawMatches = []
    ;(t.rounds || []).forEach((rnd, ri) => {
      const roundNo = rnd.round ?? rnd.number ?? ri + 1
      ;(rnd.games || []).forEach((g, gi) => {
        if (g.team1_score == null || g.team2_score == null) return // unplayed
        const a = (g.team1?.players || []).map((p) => p.name)
        const b = (g.team2?.players || []).map((p) => p.name)
        if (a.length < 2 || b.length < 2) return // skip non-doubles / byes
        rawMatches.push({
          round: roundNo,
          court: Number(g.court?.name) || gi + 1,
          scoreA: g.team1_score,
          scoreB: g.team2_score,
          teamA: [a[0], a[1]],
          teamB: [b[0], b[1]],
        })
      })
    })
    return buildEntry(
      {
        id: `brackets-${id}`,
        service: 'brackets',
        sourceUrl: SOURCES[id],
        originalName: t.name,
        date,
        rawDate,
        format: fmt(t.variation),
      },
      rawMatches,
    )
  })
}

module.exports = { run }
