import type { Match, Tournament } from '../types'

// Odette Cup, 7 June 2026 — the canonical test fixture (spec §9).
// Its standings + awards are known (spec §10) and asserted by the test suite.

const m = (
  round: number,
  court: number,
  a1: string,
  a2: string,
  b1: string,
  b2: string,
  scoreA: number,
  scoreB: number,
): Match => ({ round, court, teamA: [a1, a2], teamB: [b1, b2], scoreA, scoreB })

export const odetteCup: Tournament = {
  id: 'odette-2026-06-07',
  name: 'Odette Cup',
  nickname: 'Summer Smash',
  date: '2026-06-07',
  format: 'Americano',
  pointsPerMatch: 16,
  matches: [
    // Round 1
    m(1, 1, 'Alex', 'Miroslav', 'Sabrina', 'Alexander', 8, 8),
    m(1, 2, 'Roman', 'Elan', 'Denis R', 'Veronika', 11, 5),
    m(1, 3, 'Denny', 'sofia', 'Sergey', 'Oleksii', 3, 13),
    m(1, 4, 'Denis', 'Vova', 'Illya', 'Irina', 7, 9),
    // Round 2
    m(2, 1, 'Sergey', 'Elan', 'Roman', 'Oleksii', 10, 6),
    m(2, 2, 'Irina', 'Miroslav', 'Illya', 'Alex', 5, 11),
    m(2, 3, 'Vova', 'Alexander', 'Denis', 'Sabrina', 9, 7),
    m(2, 4, 'Veronika', 'sofia', 'Denis R', 'Denny', 5, 11),
    // Round 3
    m(3, 1, 'Alex', 'Elan', 'Sergey', 'Illya', 10, 6),
    m(3, 2, 'Alexander', 'Denis R', 'Roman', 'Oleksii', 7, 9),
    m(3, 3, 'Irina', 'Sabrina', 'Vova', 'Denny', 4, 12),
    m(3, 4, 'Miroslav', 'sofia', 'Denis', 'Veronika', 11, 5),
    // Round 4
    m(4, 1, 'Alex', 'Oleksii', 'Sergey', 'Elan', 9, 7),
    m(4, 2, 'Illya', 'Roman', 'Vova', 'Denny', 7, 9),
    m(4, 3, 'Alexander', 'sofia', 'Miroslav', 'Denis R', 6, 10),
    m(4, 4, 'Denis', 'Veronika', 'Irina', 'Sabrina', 10, 6),
    // Round 5
    m(5, 1, 'Vova', 'Elan', 'Alex', 'Oleksii', 7, 9),
    m(5, 2, 'Roman', 'Denny', 'Sergey', 'Miroslav', 8, 8),
    m(5, 3, 'Denis', 'Illya', 'Alexander', 'Denis R', 6, 10),
    m(5, 4, 'Irina', 'sofia', 'Sabrina', 'Veronika', 8, 8),
    // Round 6
    m(6, 1, 'Vova', 'Oleksii', 'Alex', 'Elan', 12, 4),
    m(6, 2, 'Miroslav', 'Denny', 'Sergey', 'Denis R', 4, 12),
    m(6, 3, 'Denis', 'Alexander', 'Illya', 'Roman', 5, 11),
    m(6, 4, 'Irina', 'sofia', 'Sabrina', 'Veronika', 8, 8),
    // Round 7
    m(7, 1, 'Vova', 'Denis R', 'Sergey', 'Oleksii', 5, 11),
    m(7, 2, 'Alex', 'Elan', 'Illya', 'Roman', 11, 5),
    m(7, 3, 'Miroslav', 'Veronika', 'Alexander', 'Denny', 12, 4),
    m(7, 4, 'Denis', 'Sabrina', 'Irina', 'sofia', 8, 8),
    // Round 8
    m(8, 1, 'Sergey', 'Vova', 'Alex', 'Oleksii', 3, 13),
    m(8, 2, 'Roman', 'Denis R', 'Miroslav', 'Elan', 9, 7),
    m(8, 3, 'Alexander', 'Veronika', 'Illya', 'Denny', 8, 8),
    m(8, 4, 'Denis', 'Sabrina', 'Irina', 'sofia', 10, 6),
    // Round 9
    m(9, 1, 'Alex', 'Denis R', 'Sergey', 'Oleksii', 9, 7),
    m(9, 2, 'Vova', 'Roman', 'Miroslav', 'Elan', 11, 5),
    m(9, 3, 'Sabrina', 'Veronika', 'Illya', 'Denny', 6, 10),
    m(9, 4, 'Irina', 'Alexander', 'Denis', 'sofia', 14, 2),
    // Round 10
    m(10, 1, 'Alex', 'Roman', 'Denis R', 'Oleksii', 9, 7),
    m(10, 2, 'Vova', 'Elan', 'Sergey', 'Illya', 11, 5),
    m(10, 3, 'Irina', 'Miroslav', 'Alexander', 'Denny', 11, 5),
    m(10, 4, 'Sabrina', 'sofia', 'Denis', 'Veronika', 7, 9),
    // Round 11
    m(11, 1, 'Vova', 'Alex', 'Roman', 'Oleksii', 7, 9),
    m(11, 2, 'Miroslav', 'Elan', 'Sergey', 'Denis R', 7, 9),
    m(11, 3, 'Illya', 'Alexander', 'Irina', 'Veronika', 4, 12),
    m(11, 4, 'Sabrina', 'sofia', 'Denis', 'Denny', 6, 10),
    // Round 12
    m(12, 1, 'Alex', 'Denis R', 'Roman', 'Oleksii', 3, 13),
    m(12, 2, 'Sergey', 'Elan', 'Vova', 'Irina', 6, 10),
    m(12, 3, 'Illya', 'Miroslav', 'Veronika', 'Denny', 8, 8),
    m(12, 4, 'Denis', 'sofia', 'Sabrina', 'Alexander', 9, 7),
  ],
}
