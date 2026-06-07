import { describe, it, expect } from 'vitest'
import { funInsights } from '../fun'
import { odetteCup } from '../../data/fixtureOdette'
import { odette21Mar, odette17May, odette31May } from '../../data/realFixtures'
import { SEED_ALIASES } from '../../data/aliases'

describe('funInsights', () => {
  const insights = funInsights({
    tournaments: [odette21Mar, odette17May, odette31May, odetteCup],
    aliases: SEED_ALIASES,
  })

  it('produces a full hall of fame from the seed data', () => {
    expect(insights.length).toBeGreaterThanOrEqual(12)
  })

  it('every insight has player(s), a value and a caption', () => {
    for (const i of insights) {
      expect(i.players.length).toBeGreaterThanOrEqual(1)
      expect(i.value.length).toBeGreaterThan(0)
      expect(i.caption.length).toBeGreaterThan(0)
    }
  })

  it('keys are unique', () => {
    const keys = insights.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
