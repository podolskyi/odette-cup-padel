import { describe, it, expect } from 'vitest'
import {
  parseAmericanoPadelText,
  parseAmericanoPadelTournament,
  seriesNameFromTitle,
} from '../americanoPadel'

// A representative slice of an americano-padel.com round page's rendered text,
// covering the tricky bits: zero-padded scores, spaced names ("Denis R"),
// the toplist, and multiple courts/rounds.
const SAMPLE = `Odette Cup 7th June
Hide toplist
W-L-T Diff P
1. Oleksii 9-3-0 +44 118
2. Roman 8-3-1 +24 108
16. sofia 2-7-3 -34 79
Round #1
Court 1
08 08
Alex
Miroslav
Sabrina
Alexander
Court 2
11 05
Roman
Elan
Denis R
Veronika
Round #2
Court 1
10 06
Sergey
Elan
Roman
Oleksii`

describe('americano-padel parser', () => {
  const result = parseAmericanoPadelText(SAMPLE)

  it('reads the title and toplist', () => {
    expect(result.title).toBe('Odette Cup 7th June')
    expect(result.standings).toHaveLength(3)
    expect(result.standings[0]).toMatchObject({ rank: 1, player: 'Oleksii', points: 118, diff: 44 })
  })

  it('parses every match with correct teams and zero-padded scores', () => {
    expect(result.matches).toHaveLength(3)
    expect(result.matches[0]).toEqual({
      round: 1,
      court: 1,
      scoreA: 8,
      scoreB: 8,
      teamA: ['Alex', 'Miroslav'],
      teamB: ['Sabrina', 'Alexander'],
    })
    // spaced surname survives ("Denis R")
    expect(result.matches[1].teamB).toEqual(['Denis R', 'Veronika'])
    expect(result.matches[1]).toMatchObject({ round: 1, court: 2, scoreA: 11, scoreB: 5 })
    // round advances
    expect(result.matches[2]).toMatchObject({ round: 2, court: 1, scoreA: 10, scoreB: 6 })
  })

  it('derives series name and pointsPerMatch', () => {
    expect(seriesNameFromTitle('Odette Cup 7th June')).toBe('Odette Cup')
    const t = parseAmericanoPadelTournament(SAMPLE, { id: 'x', date: '2026-06-07' })
    expect(t.name).toBe('Odette Cup')
    expect(t.pointsPerMatch).toBe(16)
    expect(t.format).toBe('Americano')
  })
})
