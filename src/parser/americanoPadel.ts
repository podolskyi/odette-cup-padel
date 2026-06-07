import type { Match, Tournament, TournamentFormat } from '../types'

// Parser for americano-padel.com round pages (e.g. /r/<uuid>).
//
// Those pages are server-rendered with all data in the HTML, laid out as the
// page's rendered text:
//
//   Odette Cup 7th June           <- title
//   1. Oleksii 9-3-0 +44 118      <- toplist (standings) rows
//   ...
//   Round #1
//   Court 1
//   08 08                         <- "scoreA scoreB", zero-padded
//   Alex                          <- teamA player 1
//   Miroslav                      <- teamA player 2
//   Sabrina                       <- teamB player 1
//   Alexander                     <- teamB player 2
//   Court 2
//   ...
//
// We parse from the rendered TEXT (element.innerText) because it preserves the
// line order and separates each player onto its own line — far more robust than
// guessing the site's CSS class structure. From a raw HTML string, run it
// through a DOM first: `new DOMParser().parseFromString(html,'text/html').body.innerText`.

export interface ParsedStanding {
  rank: number
  player: string
  wins: number
  losses: number
  ties: number
  diff: number
  points: number
}

export interface ParseResult {
  title: string
  matches: Match[]
  /** The site's own toplist — handy for validating our derived standings. */
  standings: ParsedStanding[]
}

export interface ParseMeta {
  id: string
  date: string // ISO yyyy-mm-dd (the page only carries a human date, so pass it)
  name?: string // series name; defaults to title with any trailing date words stripped
  nickname?: string
  format?: TournamentFormat
  pointsPerMatch?: number // defaults to scoreA+scoreB of the first match
}

const STANDING_RE = /^(\d+)\.\s+(.+?)\s+(\d+)-(\d+)-(\d+)\s+([+-]?\d+)\s+(\d+)$/
const ROUND_RE = /^Round\s*#?(\d+)$/i
const COURT_RE = /^Court\s*(\d+)$/i
const SCORE_RE = /^(\d{1,3})\s+(\d{1,3})$/

/** Low-level: pull the title, toplist and every match out of the page text. */
export function parseAmericanoPadelText(text: string): ParseResult {
  const lines = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const title = lines[0] ?? ''
  const standings: ParsedStanding[] = []
  const matches: Match[] = []
  let round = 0
  let court = 0

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]

    const s = ln.match(STANDING_RE)
    if (s && round === 0) {
      standings.push({
        rank: +s[1],
        player: s[2].trim(),
        wins: +s[3],
        losses: +s[4],
        ties: +s[5],
        diff: +s[6],
        points: +s[7],
      })
      continue
    }

    const r = ln.match(ROUND_RE)
    if (r) {
      round = +r[1]
      continue
    }

    const c = ln.match(COURT_RE)
    if (c) {
      court = +c[1]
      continue
    }

    const sc = ln.match(SCORE_RE)
    if (sc && round > 0) {
      const a1 = lines[i + 1]
      const a2 = lines[i + 2]
      const b1 = lines[i + 3]
      const b2 = lines[i + 4]
      if (a1 && a2 && b1 && b2) {
        matches.push({
          round,
          court,
          scoreA: +sc[1],
          scoreB: +sc[2],
          teamA: [a1, a2],
          teamB: [b1, b2],
        })
        i += 4
      }
      continue
    }
  }

  return { title, matches, standings }
}

/** Strip a trailing human date ("Odette Cup 7th June" -> "Odette Cup"). */
export function seriesNameFromTitle(title: string): string {
  return title
    .replace(
      /\s+\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december).*$/i,
      '',
    )
    .trim()
}

/** Parse a full Tournament from page text + the metadata the page can't give us. */
export function parseAmericanoPadelTournament(text: string, meta: ParseMeta): Tournament {
  const { matches, title } = parseAmericanoPadelText(text)
  if (matches.length === 0) throw new Error('No matches found — is this an americano-padel.com round page?')
  const first = matches[0]
  return {
    id: meta.id,
    name: meta.name ?? seriesNameFromTitle(title),
    nickname: meta.nickname,
    date: meta.date,
    format: meta.format ?? 'Americano',
    pointsPerMatch: meta.pointsPerMatch ?? first.scoreA + first.scoreB,
    matches,
  }
}
