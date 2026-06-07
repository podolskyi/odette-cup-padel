import { describe, it, expect } from 'vitest'
import { odetteCup } from '../../data/fixtureOdette'
import { computeStandings } from '../standings'
import { computeAwards } from '../awards'
import { computePartnerships, perfectPairs } from '../partnerships'

// Spec §10 acceptance criteria for the Odette Cup fixture.

const EXPECTED_STANDINGS = [
  { rank: 1, player: 'Oleksii', wins: 9, losses: 3, ties: 0, diff: 44, points: 118 },
  { rank: 2, player: 'Roman', wins: 8, losses: 3, ties: 1, diff: 24, points: 108 },
  { rank: 3, player: 'Alex', wins: 8, losses: 3, ties: 1, diff: 14, points: 103 },
  { rank: 4, player: 'Vova', wins: 7, losses: 5, ties: 0, diff: 14, points: 103 },
  { rank: 5, player: 'Irina', wins: 5, losses: 4, ties: 3, diff: 10, points: 101 },
  { rank: 6, player: 'Denis R', wins: 7, losses: 5, ties: 0, diff: 2, points: 97 },
  { rank: 7, player: 'Sergey', wins: 5, losses: 6, ties: 1, diff: 2, points: 97 },
  { rank: 8, player: 'Elan', wins: 5, losses: 7, ties: 0, diff: 0, points: 96 },
  { rank: 9, player: 'Veronika', wins: 4, losses: 4, ties: 4, diff: 0, points: 96 },
  { rank: 10, player: 'Miroslav', wins: 4, losses: 5, ties: 3, diff: 0, points: 96 },
  { rank: 11, player: 'Denny', wins: 5, losses: 4, ties: 3, diff: -8, points: 92 },
  { rank: 12, player: 'Illya', wins: 4, losses: 6, ties: 2, diff: -12, points: 90 },
  { rank: 13, player: 'Denis', wins: 5, losses: 6, ties: 1, diff: -16, points: 88 },
  { rank: 14, player: 'Alexander', wins: 3, losses: 7, ties: 2, diff: -18, points: 87 },
  { rank: 15, player: 'Sabrina', wins: 1, losses: 7, ties: 4, diff: -22, points: 85 },
  { rank: 16, player: 'sofia', wins: 2, losses: 7, ties: 3, diff: -34, points: 79 },
]

describe('§10A — standings reproduce exactly', () => {
  const standings = computeStandings(odetteCup)

  it('has 16 players', () => {
    expect(standings).toHaveLength(16)
  })

  it('matches the published table row-for-row', () => {
    const actual = standings.map((s) => ({
      rank: s.rank,
      player: s.player,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      diff: s.diff,
      points: s.points,
    }))
    expect(actual).toEqual(EXPECTED_STANDINGS)
  })

  it('resolves the three-way 96/0 tie as Elan > Veronika > Miroslav', () => {
    const order = standings.filter((s) => s.points === 96).map((s) => s.player)
    expect(order).toEqual(['Elan', 'Veronika', 'Miroslav'])
  })

  it('every player played 12 games', () => {
    for (const s of standings) expect(s.games).toBe(12)
  })
})

describe('§10B — awards on the fixture', () => {
  const standings = computeStandings(odetteCup)
  const awards = computeAwards(odetteCup, {}, standings)

  it('Demolition → Irina & Alexander, 14-2 (Round 9), margin 12', () => {
    expect(awards.demolition).toBeDefined()
    expect([...awards.demolition!.winners].sort()).toEqual(['Alexander', 'Irina'])
    expect(awards.demolition!.scoreFor).toBe(14)
    expect(awards.demolition!.scoreAgainst).toBe(2)
    expect(awards.demolition!.margin).toBe(12)
    expect(awards.demolition!.round).toBe(9)
  })

  it('The Diplomat → Veronika (4 ties)', () => {
    expect(awards.diplomat).toEqual({ player: 'Veronika', ties: 4 })
  })

  it('The Wall → Oleksii (~6.17 PA/game)', () => {
    expect(awards.wall?.player).toBe('Oleksii')
    expect(awards.wall?.paPerGame).toBeCloseTo(74 / 12, 2)
  })

  it('Cardio → Oleksii (118 PF)', () => {
    expect(awards.cardio).toEqual({ player: 'Oleksii', pf: 118 })
  })

  it('Wooden Spoon → sofia', () => {
    expect(awards.woodenSpoon?.player).toBe('sofia')
  })
})

describe('§10B — perfect pairs', () => {
  const pairs = perfectPairs(computePartnerships(odetteCup.matches))

  const find = (a: string, b: string) =>
    pairs.find((p) => p.key === [a, b].sort((x, y) => x.localeCompare(y)).join(' ∥ '))

  it('includes Alex & Oleksii (3-0)', () => {
    const p = find('Alex', 'Oleksii')
    expect(p).toBeDefined()
    expect([p!.wins, p!.losses]).toEqual([3, 0])
  })

  it('includes Denny & Vova (2-0)', () => {
    const p = find('Denny', 'Vova')
    expect(p).toBeDefined()
    expect([p!.wins, p!.losses]).toEqual([2, 0])
  })

  it('includes Denis R & Sergey (2-0)', () => {
    const p = find('Denis R', 'Sergey')
    expect(p).toBeDefined()
    expect([p!.wins, p!.losses]).toEqual([2, 0])
  })
})
