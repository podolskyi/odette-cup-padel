import { describe, it, expect } from 'vitest'
import html from './fixtures/americano-odette.html?raw'
import {
  parseAmericanoPadelHtml,
  dateHintFromTitle,
  americanoIdFromUrl,
  tournamentFromHtml,
} from '../americanoPadelHtml'

describe('parseAmericanoPadelHtml', () => {
  const result = parseAmericanoPadelHtml(html)

  it('reads the title (sans app prefix)', () => {
    expect(result.title).toBe('Odette Cup 7th June')
  })

  it('parses every match across all rounds', () => {
    expect(result.matches.length).toBe(48)
    expect(new Set(result.matches.map((m) => m.round)).size).toBe(12)
  })

  it('parses the first match correctly', () => {
    expect(result.matches[0]).toEqual({
      round: 1,
      court: 1,
      scoreA: 8,
      scoreB: 8,
      teamA: ['Alex', 'Miroslav'],
      teamB: ['Sabrina', 'Alexander'],
    })
  })

  it('extracts exactly the 16 players in the event', () => {
    const players = new Set(result.matches.flatMap((m) => [...m.teamA, ...m.teamB]))
    expect(players.size).toBe(16)
    expect(players.has('Denis R')).toBe(true)
    expect(players.has('Oleksii')).toBe(true)
  })

  it('derives a date hint from the title', () => {
    expect(result.dateHint).toBe(`${new Date().getFullYear()}-06-07`)
  })
})

describe('helpers', () => {
  it('parses a date hint with an explicit year', () => {
    expect(dateHintFromTitle('Odette Cup 7th June 2025')).toBe('2025-06-07')
  })

  it('extracts the uuid from a round URL', () => {
    expect(americanoIdFromUrl('https://americano-padel.com/r/881cef1d-f00f-4618-a8c2-dfdfbaec3497'))
      .toBe('881cef1d-f00f-4618-a8c2-dfdfbaec3497')
    expect(americanoIdFromUrl('https://example.com/r/abc')).toBeNull()
  })

  it('assembles a Tournament from HTML', () => {
    const t = tournamentFromHtml(html, { id: 'test-id', date: '2026-06-07' })
    expect(t.id).toBe('test-id')
    expect(t.name).toBe('Odette Cup')
    expect(t.format).toBe('Americano')
    expect(t.pointsPerMatch).toBe(16)
    expect(t.matches.length).toBe(48)
  })
})
