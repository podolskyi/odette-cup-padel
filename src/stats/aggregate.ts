import type { Dataset, Player } from '../types'
import { t } from '../lib/i18n'
import { allPlayers, resolveName } from '../identity/aliases'
import { toPlayerMatches, pairKey, type Outcome } from './core'
import { computeStandings } from './standings'
import { computeSeason } from './season'
import { computeRatings } from './ratings'
import { computePartnerships } from './partnerships'

export const HOURS_PER_TOURNAMENT = 2 // a night out is ~2h on court (adjust if needed)
export const COST_PER_ENTRY_USD = 14 // ~225k IDR avg (200k→250k) at ~16.2k IDR/$ (adjust if needed)

export interface Highlight {
  emoji: string
  value: string
  label: string
  caption?: string
  accent: string
}

export interface AggregateStats {
  tournaments: number
  matches: number
  hours: number
  players: number
  cards: Highlight[]
  money: Highlight[]
  buys: Highlight[]
}

const r1 = (n: number) => (Math.round(n * 10) / 10).toString()

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number)
  const [by, bm] = b.split('-').map(Number)
  return Math.max(1, (by - ay) * 12 + (bm - am) + 1)
}

export function aggregateStats(
  dataset: Pick<Dataset, 'tournaments' | 'aliases'>,
  hoursPerTournament = HOURS_PER_TOURNAMENT,
  costPerEntryUsd = COST_PER_ENTRY_USD,
): AggregateStats {
  const { tournaments, aliases } = dataset
  const allMatches = tournaments.flatMap((t) => t.matches)
  const matches = allMatches.length
  const hours = tournaments.length * hoursPerTournament
  const totalPoints = allMatches.reduce((n, m) => n + m.scoreA + m.scoreB, 0)
  const players = allPlayers(tournaments, aliases)
  const season = computeSeason(tournaments, aliases)
  const ratings = [...computeRatings(tournaments, aliases).values()]
  const partnerships = computePartnerships(allMatches, aliases)

  // Dates / span
  const dates = tournaments.map((t) => t.date).filter(Boolean).sort()
  const span = dates.length ? monthsBetween(dates[0], dates[dates.length - 1]) : 0

  // Per-player leaders
  const mostEvents = [...season].sort((a, b) => b.tournaments - a.tournaments)[0]
  const mostGames = [...season].sort((a, b) => b.games - a.games)[0]
  const mostTitles = [...season].sort((a, b) => b.tournamentWins - a.tournamentWins)[0]
  const topPeak = [...ratings].sort((a, b) => b.peak - a.peak)[0]
  const topDuo = [...partnerships].sort((a, b) => b.games - a.games)[0]

  // Distinct rivalries (unordered opponent pairs) + ties / nail-biters / bagels
  const rivalPairs = new Set<string>()
  const rows = toPlayerMatches(allMatches, aliases)
  for (const row of rows) for (const opp of row.opponents) rivalPairs.add(pairKey(row.player, opp))
  let ties = 0, close = 0, bagels = 0
  for (const m of allMatches) {
    const d = Math.abs(m.scoreA - m.scoreB)
    if (d === 0) ties++
    else if (d <= 2) close++
    if (Math.min(m.scoreA, m.scoreB) <= 1) bagels++
  }

  // Biggest blowout
  let blow: { winners: [Player, Player]; sf: number; sa: number; margin: number; nick: string } | null = null
  for (const t of tournaments) {
    for (const m of t.matches) {
      const margin = Math.abs(m.scoreA - m.scoreB)
      if (!blow || margin > blow.margin) {
        const aWin = m.scoreA >= m.scoreB
        blow = {
          winners: (aWin ? m.teamA : m.teamB).map((n) => resolveName(n, aliases)) as [Player, Player],
          sf: Math.max(m.scoreA, m.scoreB),
          sa: Math.min(m.scoreA, m.scoreB),
          margin,
          nick: t.nickname || t.name,
        }
      }
    }
  }

  // Longest win streak (chronological across all events)
  const ordered = [...tournaments]
    .sort((a, b) => (a.date || '0').localeCompare(b.date || '0'))
    .flatMap((t) =>
      t.matches
        .map((m, i) => ({ m, i }))
        .sort((x, y) => x.m.round - y.m.round || (x.m.court ?? 0) - (y.m.court ?? 0) || x.i - y.i)
        .map((x) => x.m),
    )
  const seq = new Map<Player, Outcome[]>()
  for (const row of toPlayerMatches(ordered, aliases)) {
    const a = seq.get(row.player) ?? []
    a.push(row.result)
    seq.set(row.player, a)
  }
  let streak = { p: '', n: 0 }
  for (const [p, arr] of seq) {
    let c = 0, mx = 0
    for (const o of arr) { if (o === 'W') { c++; mx = Math.max(mx, c) } else c = 0 }
    if (mx > streak.n) streak = { p, n: mx }
  }

  // Distinct champions
  const champs = new Set<Player>()
  for (const t of tournaments) {
    const st = computeStandings(t, aliases)
    if (st[0]) champs.add(st[0].player)
  }

  const eventHours = (n: number) => n * hoursPerTournament
  const cards: Highlight[] = [
    { emoji: '🔢', value: totalPoints.toLocaleString(), label: t('Points rallied', 'Розіграних балів'), caption: t('every single one fought for', 'за кожен боролися'), accent: 'sun' },
    { emoji: '📅', value: `${span}`, label: t('Months of rivalry', 'Місяців суперництва'), caption: dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : '', accent: 'sky' },
    mostEvents && { emoji: '🏃', value: t(`${eventHours(mostEvents.tournaments)}h`, `${eventHours(mostEvents.tournaments)} год`), label: t('Most court time', 'Найбільше на корті'), caption: t(`${mostEvents.player} · ${mostEvents.tournaments} events`, `${mostEvents.player} · ${mostEvents.tournaments} турнірів`), accent: 'tang' },
    mostGames && { emoji: '🎮', value: `${mostGames.games}`, label: t('Most matches', 'Найбільше матчів'), caption: t(`${mostGames.player} — a true regular`, `${mostGames.player} — справжній завсідник`), accent: 'sky' },
    mostTitles && mostTitles.tournamentWins > 0 && { emoji: '👑', value: `${mostTitles.tournamentWins}`, label: t('Most titles', 'Найбільше титулів'), caption: t(`${mostTitles.player}, serial champion`, `${mostTitles.player}, серійний чемпіон`), accent: 'gold' },
    topPeak && { emoji: '⚡', value: `${Math.round(topPeak.peak)}`, label: t('Highest Elo peak', 'Найвищий пік Elo'), caption: t(`${topPeak.player} at their best`, `${topPeak.player} на піку форми`), accent: 'grape' },
    streak.n > 0 && { emoji: '🔥', value: `${streak.n}`, label: t('Longest win streak', 'Найдовша серія перемог'), caption: t(`${streak.p} — unstoppable`, `${streak.p} — нестримний`), accent: 'punch' },
    topDuo && { emoji: '🤝', value: `${topDuo.games}`, label: t('Most-played duo', 'Найграніший дует'), caption: `${topDuo.players.join(' & ')}`, accent: 'mint' },
    blow && { emoji: '💥', value: `${blow.sf}–${blow.sa}`, label: t('Biggest blowout', 'Найбільший розгром'), caption: `${blow.winners.join(' & ')} · ${blow.nick}`, accent: 'punch' },
    { emoji: '🤜', value: `${partnerships.length}`, label: t('Partnerships formed', 'Створених пар'), caption: t('unique duos tried', 'унікальних дуетів'), accent: 'mint' },
    { emoji: '⚔️', value: `${rivalPairs.size}`, label: t('Rivalries', 'Суперництва'), caption: t('head-to-head match-ups', 'очні протистояння'), accent: 'sky' },
    { emoji: '🥇', value: `${champs.size}`, label: t('Different champions', 'Різних чемпіонів'), caption: t(`out of ${tournaments.length} events`, `з ${tournaments.length} турнірів`), accent: 'gold' },
    { emoji: '😬', value: `${close}`, label: t('Nail-biters', 'Трилери'), caption: t('matches decided by ≤ 2', 'матчів з різницею ≤ 2'), accent: 'sun' },
    { emoji: '🕊️', value: `${ties}`, label: t('Perfect ties', 'Чисті нічиї'), caption: t('nobody blinked', 'ніхто не здригнувся'), accent: 'grape' },
    { emoji: '🍞', value: `${bagels}`, label: t('Demolitions', 'Розгроми'), caption: t('a team left with ≤ 1', 'команда пішла з ≤ 1'), accent: 'tang' },
    { emoji: '⚖️', value: r1(matches ? totalPoints / matches : 0), label: t('Points per match', 'Балів за матч'), caption: t('on average', 'у середньому'), accent: 'lime' },
  ].filter(Boolean) as Highlight[]

  // 💸 The damage (entry fees). Each (player, tournament) = one paid entry.
  const totalEntries = season.reduce((n, s) => n + s.tournaments, 0)
  const totalSpend = Math.round(totalEntries * costPerEntryUsd)
  const biggest = mostEvents
    ? { player: mostEvents.player, spend: Math.round(mostEvents.tournaments * costPerEntryUsd), events: mostEvents.tournaments }
    : null
  const money: Highlight[] = [
    { emoji: '💸', value: `$${totalSpend.toLocaleString()}`, label: t('Spent on padel, total', 'Витрачено на падел разом'), caption: t(`${totalEntries} entries · ~$${costPerEntryUsd}/event`, `${totalEntries} внесків · ~$${costPerEntryUsd}/турнір`), accent: 'mint' },
    biggest && { emoji: '🤑', value: `$${biggest.spend.toLocaleString()}`, label: t('Biggest spender', 'Найбільший витратник'), caption: t(`${biggest.player} · ${biggest.events} events in`, `${biggest.player} · ${biggest.events} турнірів`), accent: 'sun' },
    { emoji: '🎟️', value: `${totalEntries.toLocaleString()}`, label: t('Entries paid', 'Сплачених внесків'), caption: t('one player, one event', 'один гравець, один турнір'), accent: 'grape' },
  ].filter(Boolean) as Highlight[]

  // 🛒 What that pile of rupiah could have bought instead (Bali prices, very rough).
  const buy = (price: number) => Math.floor(totalSpend / price).toLocaleString()
  const buys: Highlight[] = [
    { emoji: '🍛', value: buy(2.5), label: t('Plates of nasi goreng', 'Тарілок насі-горенг'), caption: t('~$2.5 a plate in Ubud', '~$2.5 за тарілку в Убуді'), accent: 'tang' },
    { emoji: '🍺', value: buy(3), label: t('Cold Bintangs', 'Холодних Bintang'), caption: t('~$3 a bottle, post-match', '~$3 за пляшку після матчу'), accent: 'sun' },
    { emoji: '🥥', value: buy(1.5), label: t('Fresh coconuts', 'Свіжих кокосів'), caption: t('~$1.5 on the beach', '~$1.5 на пляжі'), accent: 'lime' },
    { emoji: '☕', value: buy(2.5), label: t('Flat whites', 'Флет-вайтів'), caption: t('~$2.5 a cup, Canggu cafés', '~$2.5 чашка, кафе Чангу'), accent: 'mint' },
    { emoji: '🛵', value: buy(5), label: t('Days of scooter rental', 'Днів оренди скутера'), caption: t('~$5 a day', '~$5 на день'), accent: 'sky' },
    { emoji: '💆', value: buy(7), label: t('Balinese massages', 'Балійських масажів'), caption: t('~$7 an hour', '~$7 за годину'), accent: 'grape' },
    { emoji: '🎾', value: buy(120), label: t('Brand-new padel rackets', 'Нових падел-ракеток'), caption: t('~$120 a mid-range racket', '~$120 ракетка середнього класу'), accent: 'punch' },
    { emoji: '✈️', value: buy(55), label: t('Flights to Jakarta', 'Перельотів до Джакарти'), caption: t('~$55 one-way', '~$55 в один бік'), accent: 'gold' },
  ]

  return { tournaments: tournaments.length, matches, hours, players: players.length, cards, money, buys }
}
