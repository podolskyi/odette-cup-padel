import type { Match, Tournament, TournamentFormat } from '../types'
import { seriesNameFromTitle, type ParseMeta } from './americanoPadel'

// Parse an americano-padel.com /r/<uuid> page straight from its raw HTML.
//
// Unlike the innerText-based parser in ./americanoPadel.ts, this works on the
// raw markup with pure string ops — no DOM/`innerText` — so it runs identically
// in the browser and in a Supabase edge function. It's the same token approach
// proven by the original bulk import (data-import/scripts/transform-americano.cjs).

/** Strip tags/scripts and split the page into trimmed, non-empty text tokens. */
export function htmlToTokens(html: string): string[] {
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

const isNum = (s: string) => /^\d{1,3}$/.test(s)
const isRound = (s: string) => /^Round\s*#?\d+$/i.test(s)
const isCourt = (s: string) => /^Court\s*\d+$/i.test(s)

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/**
 * "Odette Cup 7th June" -> "2026-06-07". Accepts abbreviated months too
 * ("19th Oct", "1 Sept"); year falls back to the current one.
 */
export function dateHintFromTitle(title: string, today = new Date()): string | undefined {
  const m = title.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?(?:\s+(\d{4}))?/)
  if (!m) return undefined
  const day = Number(m[1])
  const word = m[2].toLowerCase()
  const month = MONTHS.findIndex((name) => name.startsWith(word))
  if (month < 0 || day < 1 || day > 31) return undefined
  const year = m[3] ? Number(m[3]) : today.getFullYear()
  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return iso
}

export interface HtmlParseResult {
  title: string
  matches: Match[]
  dateHint?: string
}

/** Pull the title and every match out of a round page's raw HTML. */
export function parseAmericanoPadelHtml(html: string): HtmlParseResult {
  const tokens = htmlToTokens(html)
  const title =
    (html.match(/<h1[^>]*>([^<]+)/)?.[1] ?? html.match(/<title>([^<]+)/)?.[1] ?? '')
      .replace(/Americano Padel app\s*-\s*/i, '')
      .trim()

  const matches: Match[] = []
  const start = tokens.findIndex(isRound)
  if (start >= 0) {
    let round = 0
    for (let i = start; i < tokens.length; i++) {
      const tok = tokens[i]
      if (isRound(tok)) {
        round = Number(tok.replace(/\D/g, ''))
        continue
      }
      if (!isCourt(tok)) continue
      const court = Number(tok.replace(/\D/g, ''))

      // The two scores are the next two numeric tokens (skip "+4p" etc.),
      // never crossing into the next Round/Court marker.
      const nums: number[] = []
      for (let j = i + 1; j < tokens.length && nums.length < 2; j++) {
        if (isRound(tokens[j]) || isCourt(tokens[j])) break
        if (isNum(tokens[j])) nums.push(j)
      }
      if (nums.length < 2) continue
      const scoreA = Number(tokens[nums[0]])
      const scoreB = Number(tokens[nums[1]])

      // The four player names follow, skipping any stray numbers/markers.
      const names: string[] = []
      for (let k = nums[1] + 1; k < tokens.length && names.length < 4; k++) {
        if (isRound(tokens[k]) || isCourt(tokens[k])) break
        if (isNum(tokens[k])) continue
        names.push(tokens[k])
      }
      if (names.length < 4) continue

      matches.push({
        round,
        court,
        scoreA,
        scoreB,
        teamA: [names[0], names[1]],
        teamB: [names[2], names[3]],
      })
      i = nums[1]
    }
  }

  return { title, matches, dateHint: dateHintFromTitle(title) }
}

/** The uuid in an americano-padel.com/r/<uuid> URL, or null if it doesn't match. */
export function americanoIdFromUrl(url: string): string | null {
  const m = url.trim().match(/americano-padel\.com\/r\/([0-9a-f-]{8,})/i)
  return m ? m[1] : null
}

/** Build a full Tournament from page HTML + the bits the page can't give us. */
export function tournamentFromHtml(html: string, meta: ParseMeta): Tournament {
  const { matches, title } = parseAmericanoPadelHtml(html)
  if (matches.length === 0) {
    throw new Error('No matches found — is this an americano-padel.com round page?')
  }
  const first = matches[0]
  const format: TournamentFormat = meta.format ?? 'Americano'
  return {
    id: meta.id,
    name: meta.name ?? seriesNameFromTitle(title),
    nickname: meta.nickname,
    date: meta.date,
    format,
    pointsPerMatch: meta.pointsPerMatch ?? first.scoreA + first.scoreB,
    matches,
  }
}
