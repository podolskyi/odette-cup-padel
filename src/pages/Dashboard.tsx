import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { seasonInsights, recentPlayers, lastSeenDates, RECENT_EVENTS, type SeasonRow } from '../stats'
import { Avatar } from '../components/ui/Avatar'
import { Stat, SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { RatingChart, toSeries } from '../components/RatingChart'
import { nicknameOf } from '../lib/tournament'
import { formatDate, pct, signed, round1 } from '../lib/format'
import { useT, t as tr } from '../lib/i18n'
import { cx } from '../lib/cx'

export function Dashboard() {
  const { t, lang } = useT()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)

  const { season, ratings, ratingsByPlayer } = useMemo(
    () => seasonInsights({ tournaments, aliases }),
    [tournaments, aliases],
  )

  const [board, setBoard] = useState<'total' | 'performance' | 'champions'>('total')

  // Performance view: avg finishing percentile, fair regardless of events played.
  // Only players with 2+ events are ranked; newcomers show as "provisional".
  const perfRanked = useMemo(
    () =>
      season
        .filter((r) => r.tournaments >= 2)
        .sort((a, b) => b.performance - a.performance || b.totalPoints - a.totalPoints),
    [season],
  )
  const perfProvisional = useMemo(
    () =>
      season
        .filter((r) => r.tournaments < 2)
        .sort((a, b) => b.performance - a.performance || b.totalPoints - a.totalPoints),
    [season],
  )

  // Champions view: an Olympic-style medal table. Golds/silvers/bronzes come
  // straight from each player's finishing ranks, so they stay in lock-step with
  // tournamentWins (🥇) and podiums (🥇+🥈+🥉). Only players who've reached a
  // podium appear; ranked golds → silvers → bronzes, then by performance.
  const medalRanked = useMemo(
    () =>
      season
        .map((r) => ({
          row: r,
          gold: r.finishes.filter((x) => x === 1).length,
          silver: r.finishes.filter((x) => x === 2).length,
          bronze: r.finishes.filter((x) => x === 3).length,
        }))
        .filter((m) => m.gold + m.silver + m.bronze > 0)
        .sort(
          (a, b) =>
            b.gold - a.gold ||
            b.silver - a.silver ||
            b.bronze - a.bronze ||
            b.row.performance - a.row.performance ||
            a.row.player.localeCompare(b.row.player),
        ),
    [season],
  )

  // Activity: a player is "idle" (👻) if they missed the last few events.
  const active = useMemo(() => recentPlayers(tournaments, aliases), [tournaments, aliases])
  const lastSeen = useMemo(() => lastSeenDates(tournaments, aliases), [tournaments, aliases])
  const isIdle = (player: string) => !active.has(player)

  const totalMatches = tournaments.reduce((n, t) => n + t.matches.length, 0)
  const leader = season[0]
  const topRated = ratings.slice(0, 5)
  const eloOf = (player: string) => Math.round(ratingsByPlayer.get(player)?.rating ?? 1000)

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="sticker-lg relative overflow-hidden bg-paper-100 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-6 -top-8 text-[8rem] opacity-10">🏆</div>
        <Chip tone="bg-sun">{t('SEASON DASHBOARD', 'ПАНЕЛЬ СЕЗОНУ')}</Chip>
        <h1 className="mt-3 text-4xl font-extrabold leading-[0.95] sm:text-5xl">
          Odette Cup
          <span className="mt-1 block text-2xl font-bold text-grape sm:text-3xl">by Vova 🐐</span>
        </h1>
        <p className="mt-2 max-w-md text-ink-soft">
          {t(
            'The Ubud Ukrainian padel league — every match, duo and rivalry turned into stats, awards and shareable recaps.',
            'Українська падел-ліга Убуду — кожен матч, дует і суперництво перетворені на статистику, нагороди та підсумки, якими хочеться поділитися.',
          )}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t('Tournaments', 'Турніри')} value={tournaments.length} tone="bg-sky-soft" />
          <Stat label={t('Matches', 'Матчі')} value={totalMatches} tone="bg-mint-soft" />
          <Stat label={t('Players', 'Гравці')} value={season.length} tone="bg-punch-soft" />
          <Stat
            label={t('Top Rated', 'Топ Elo')}
            value={topRated[0] ? Math.round(topRated[0].rating) : '—'}
            sub={topRated[0]?.player}
            tone="bg-grape-soft"
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/add" className="btn-dark">
            {t('➕ Add tournament', '➕ Додати турнір')}
          </Link>
        </div>
      </section>

      {/* Season leaderboard (Total ↔ Performance) */}
      <section>
        <SectionTitle
          emoji="📊"
          title={t('Season Leaderboard', 'Таблиця сезону')}
          hint={
            board === 'total'
              ? t('All-time points across every tournament', 'Усі бали за весь час по всіх турнірах')
              : board === 'performance'
                ? t('Avg finishing percentile — fair no matter how many events you played', 'Середній перцентиль фінішу — чесно, скільки б турнірів ти не зіграв')
                : t('Medal table — who actually wins tournaments', 'Медальна таблиця — хто справді виграє турніри')
          }
          action={
            <div className="flex w-full overflow-hidden rounded-xl border-2 border-ink shadow-hard-sm sm:w-auto">
              <button
                onClick={() => setBoard('total')}
                className={cx('flex-1 px-3 py-1.5 text-sm font-bold sm:flex-none', board === 'total' ? 'bg-ink text-paper-100' : 'bg-paper-100')}
              >
                Total
              </button>
              <button
                onClick={() => setBoard('performance')}
                className={cx(
                  'flex-1 border-l-2 border-ink px-3 py-1.5 text-sm font-bold sm:flex-none',
                  board === 'performance' ? 'bg-ink text-paper-100' : 'bg-paper-100',
                )}
              >
                Performance
              </button>
              <button
                onClick={() => setBoard('champions')}
                className={cx(
                  'flex-1 border-l-2 border-ink px-3 py-1.5 text-sm font-bold sm:flex-none',
                  board === 'champions' ? 'bg-ink text-paper-100' : 'bg-paper-100',
                )}
              >
                Champions
              </button>
            </div>
          }
        />

        {/* Legend: explains the selected board */}
        <div className={cx('sticker mb-4 p-4', board === 'total' ? 'bg-sky-soft' : board === 'performance' ? 'bg-lime-soft' : 'bg-gold-soft')}>
          {board === 'champions' ? (
            lang === 'en' ? (
              <p className="text-sm text-ink-soft">
                <span className="font-bold text-ink">🏅 Champions — rewards winning when it counts.</span>{' '}
                An Olympic-style medal table ranked golds → silvers → bronzes, so the players who
                actually take tournaments rise to the top — no matter their points total. Only players
                who've reached a podium appear.
                <span className="mt-1.5 block text-xs">
                  <b>🥇</b> 1st places · <b>🥈</b> 2nd · <b>🥉</b> 3rd · <b>Events</b> played · <b>👻</b> idle
                  (missed last {RECENT_EVENTS} events)
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-soft">
                <span className="font-bold text-ink">🏅 Champions — винагороджує перемоги, коли вони важливі.</span>{' '}
                Медальна таблиця в олімпійському стилі: ранжування золото → срібло → бронза, тож нагору
                піднімаються ті, хто справді виграє турніри — незалежно від суми балів. Показано лише
                гравців, що бували на подіумі.
                <span className="mt-1.5 block text-xs">
                  <b>🥇</b> перші місця · <b>🥈</b> другі · <b>🥉</b> треті · <b>Events</b> зіграно ·{' '}
                  <b>👻</b> неактивний (пропустив останні {RECENT_EVENTS} турнірів)
                </span>
              </p>
            )
          ) : board === 'total' ? (
            lang === 'en' ? (
              <p className="text-sm text-ink-soft">
                <span className="font-bold text-ink">📊 Total — rewards showing up.</span> The sum of
                every point your teams scored across all events, so playing (and scoring) more climbs
                you higher.
                <span className="mt-1.5 block text-xs">
                  <b>Pts</b> total points · <b>Avg</b> points per event · <b>Win%</b> games won ·{' '}
                  <b>🏆</b> 1st places · <b>🥉</b> podiums (top-3) · <b>👻</b> idle (missed last{' '}
                  {RECENT_EVENTS} events)
                </span>
              </p>
            ) : (
              <p className="text-sm text-ink-soft">
                <span className="font-bold text-ink">📊 Total — винагороджує присутність.</span> Сума
                всіх балів, які набрали твої команди в усіх турнірах, тож що більше граєш (і набираєш) —
                то вище ти піднімаєшся.
                <span className="mt-1.5 block text-xs">
                  <b>Pts</b> усі бали · <b>Avg</b> бали за турнір · <b>Win%</b> виграні ігри ·{' '}
                  <b>🏆</b> перші місця · <b>🥉</b> подіуми (топ-3) · <b>👻</b> неактивний (пропустив
                  останні {RECENT_EVENTS} турнірів)
                </span>
              </p>
            )
          ) : lang === 'en' ? (
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink">🎯 Performance — rewards how high you finish.</span>{' '}
              Your average finishing percentile: each event scores{' '}
              <code className="rounded bg-paper-100 px-1 font-mono">(N − rank) / (N − 1) × 100</code>,
              so 1st = 100% and last = 0%, then averaged. Field-size-adjusted, so a strong night counts
              the same whether the draw was 8 or 16 — and it's fair no matter how many events you've
              played.
              <span className="mt-1.5 block text-xs">
                Ranked at <b>2+ events</b>; newcomers appear below as <b>provisional</b>. · <b>Perf</b>{' '}
                avg percentile · <b>Events</b> played · <b>Elo</b> skill rating · <b>👻</b> idle (missed
                last {RECENT_EVENTS} events)
              </span>
            </p>
          ) : (
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink">🎯 Performance — винагороджує, як високо ти фінішуєш.</span>{' '}
              Твій середній перцентиль фінішу: кожен турнір рахується як{' '}
              <code className="rounded bg-paper-100 px-1 font-mono">(N − місце) / (N − 1) × 100</code>,
              тож 1-е = 100%, а останнє = 0%, далі береться середнє. З поправкою на розмір сітки, тож
              сильний вечір важить однаково — хоч у сітці було 8, хоч 16 — і це чесно, скільки б
              турнірів ти не зіграв.
              <span className="mt-1.5 block text-xs">
                Ранжуються від <b>2+ турнірів</b>; новачки нижче як <b>попередні</b>. · <b>Perf</b>{' '}
                середній перцентиль · <b>Events</b> зіграно · <b>Elo</b> рейтинг майстерності · <b>👻</b> неактивний
                (пропустив останні {RECENT_EVENTS} турнірів)
              </span>
            </p>
          )}
        </div>

        {season.length === 0 ? (
          <Empty>{t('No tournaments yet.', 'Поки що немає турнірів.')}</Empty>
        ) : board === 'total' ? (
          <div className="sticker overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-paper-100">
                  <th className="w-10 py-2 pl-3 text-center text-[11px] font-bold uppercase">#</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wider">{t('Player', 'Гравець')}</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">Pts</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">Avg</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">W-L-T</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">Win%</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">🏆</th>
                  <th className="py-2 pr-3 text-center text-[11px] font-bold uppercase">🥉</th>
                </tr>
              </thead>
              <tbody>
                {season.map((r) => (
                  <tr
                    key={r.player}
                    className={cx(
                      'border-b border-ink/10 last:border-0 hover:bg-paper-300/50',
                      r.rank === 1 && 'bg-gold-soft',
                    )}
                  >
                    <td className="py-2 pl-3 text-center font-mono text-xs font-bold">{r.rank}</td>
                    <td className="py-2">
                      <Link
                        to={`/p/${encodeURIComponent(r.player)}`}
                        className="group inline-flex items-center gap-2.5"
                      >
                        <Avatar name={r.player} size="sm" />
                        <span className="font-bold group-hover:underline">
                          {r.player}
                          {r.rank === 1 && ' 👑'}
                          {isIdle(r.player) && <GhostMark date={lastSeen.get(r.player)} />}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2 text-center font-mono text-lg font-bold tabular">{r.totalPoints}</td>
                    <td className="py-2 text-center font-mono text-sm tabular text-ink-soft">
                      {round1(r.avgPoints)}
                    </td>
                    <td className="py-2 text-center font-mono text-sm tabular text-ink-soft">
                      {r.wins}-{r.losses}-{r.ties}
                    </td>
                    <td className="py-2 text-center font-mono text-sm tabular">{pct(r.winRate)}</td>
                    <td className="py-2 text-center font-mono text-sm font-bold tabular">
                      {r.tournamentWins || '·'}
                    </td>
                    <td className="py-2 pr-3 text-center font-mono text-sm tabular">{r.podiums || '·'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : board === 'performance' ? (
          <div className="sticker overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-paper-100">
                  <th className="w-10 py-2 pl-3 text-center text-[11px] font-bold uppercase">#</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wider">{t('Player', 'Гравець')}</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">Perf</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">Events</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">Win%</th>
                  <th className="py-2 pr-3 text-center text-[11px] font-bold uppercase">Elo</th>
                </tr>
              </thead>
              <tbody>
                {perfRanked.map((r, i) => (
                  <PerfRow
                    key={r.player}
                    r={r}
                    rank={i + 1}
                    highlight={i === 0}
                    elo={eloOf(r.player)}
                    idle={isIdle(r.player)}
                    lastSeen={lastSeen.get(r.player)}
                  />
                ))}
                {perfProvisional.length > 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="bg-paper-300/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft"
                    >
                      {t('Provisional · needs 2+ events', 'Попередньо · треба 2+ турніри')}
                    </td>
                  </tr>
                )}
                {perfProvisional.map((r) => (
                  <PerfRow
                    key={r.player}
                    r={r}
                    provisional
                    elo={eloOf(r.player)}
                    idle={isIdle(r.player)}
                    lastSeen={lastSeen.get(r.player)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sticker overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-paper-100">
                  <th className="w-8 py-2 pl-3 text-center text-[11px] font-bold uppercase">#</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wider">{t('Player', 'Гравець')}</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">🥇</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">🥈</th>
                  <th className="py-2 text-center text-[11px] font-bold uppercase">🥉</th>
                  <th className="py-2 pr-3 text-center text-[11px] font-bold uppercase">Events</th>
                </tr>
              </thead>
              <tbody>
                {medalRanked.map((m, i) => (
                  <tr
                    key={m.row.player}
                    className={cx(
                      'border-b border-ink/10 last:border-0 hover:bg-paper-300/50',
                      i === 0 && 'bg-gold-soft',
                    )}
                  >
                    <td className="py-2 pl-3 text-center font-mono text-xs font-bold">{i + 1}</td>
                    <td className="py-2">
                      <Link
                        to={`/p/${encodeURIComponent(m.row.player)}`}
                        className="group inline-flex items-center gap-2.5"
                      >
                        <Avatar name={m.row.player} size="sm" />
                        <span className="font-bold group-hover:underline">
                          {m.row.player}
                          {i === 0 && ' 👑'}
                          {isIdle(m.row.player) && <GhostMark date={lastSeen.get(m.row.player)} />}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2 text-center font-mono text-lg font-bold tabular">{m.gold || '·'}</td>
                    <td className="py-2 text-center font-mono text-sm tabular text-ink-soft">{m.silver || '·'}</td>
                    <td className="py-2 text-center font-mono text-sm tabular text-ink-soft">{m.bronze || '·'}</td>
                    <td className="py-2 pr-3 text-center font-mono text-sm tabular text-ink-soft">{m.row.tournaments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {board === 'total' && leader && (
          <p className="mt-2 text-sm text-ink-soft">
            👑 <span className="font-bold">{leader.player}</span>{' '}
            {t(
              `leads the season with ${leader.totalPoints} points across ${leader.tournaments} ${leader.tournaments === 1 ? 'event' : 'events'}.`,
              `очолює сезон — ${leader.totalPoints} балів за ${leader.tournaments} ${leader.tournaments === 1 ? 'турнір' : 'турнірів'}.`,
            )}
          </p>
        )}
        {board === 'performance' && perfRanked[0] && (
          <p className="mt-2 text-sm text-ink-soft">
            🚀 <span className="font-bold">{perfRanked[0].player}</span>{' '}
            {t(
              `tops performance at ${round1(perfRanked[0].performance)}% avg finish across ${perfRanked[0].tournaments} events — volume doesn't count here.`,
              `лідирує за перформансом — ${round1(perfRanked[0].performance)}% середній фініш за ${perfRanked[0].tournaments} турнірів — обсяг тут не рахується.`,
            )}
          </p>
        )}
        {board === 'champions' && medalRanked[0] && (
          <p className="mt-2 text-sm text-ink-soft">
            🏅 <span className="font-bold">{medalRanked[0].row.player}</span>{' '}
            {t(
              `tops the medal table — ${medalRanked[0].gold}× 🥇, ${medalRanked[0].silver}× 🥈, ${medalRanked[0].bronze}× 🥉.`,
              `очолює медальну таблицю — ${medalRanked[0].gold}× 🥇, ${medalRanked[0].silver}× 🥈, ${medalRanked[0].bronze}× 🥉.`,
            )}
          </p>
        )}
      </section>

      {/* Ratings */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle emoji="📈" title={t('Elo Ratings', 'Рейтинг Elo')} hint={t(`Team-Elo · all ${ratings.length} players`, `Командний Elo · усі ${ratings.length} гравців`)} />
          <div className="sticker max-h-[32rem] divide-y divide-ink/10 overflow-y-auto">
            {ratings.map((r, i) => {
              const delta = Math.round(r.rating - 1000)
              return (
                <Link
                  to={`/p/${encodeURIComponent(r.player)}`}
                  key={r.player}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-paper-300/50"
                >
                  <span className="w-5 text-center font-mono text-xs font-bold text-ink-faint">{i + 1}</span>
                  <Avatar name={r.player} size="sm" />
                  <span className="flex-1 font-bold">
                    {r.player}
                    {isIdle(r.player) && <GhostMark date={lastSeen.get(r.player)} />}
                  </span>
                  <span className="font-mono text-lg font-bold tabular">{Math.round(r.rating)}</span>
                  <span
                    className={cx(
                      'w-12 text-right font-mono text-xs font-bold tabular',
                      delta > 0 ? 'text-mint' : delta < 0 ? 'text-punch' : 'text-ink-faint',
                    )}
                  >
                    {signed(delta)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
        <div>
          <SectionTitle emoji="🏁" title={t('Rating Race', 'Гонка рейтингу')} hint={t('Top 5 players, game by game', 'Топ-5 гравців, гра за грою')} />
          {topRated.length ? (
            <RatingChart series={toSeries(topRated)} />
          ) : (
            <Empty emoji="📈">{t('Not enough games yet.', 'Поки що замало ігор.')}</Empty>
          )}
        </div>
      </section>

      {/* Tournaments */}
      <section>
        <SectionTitle emoji="🗓️" title={t('Tournaments', 'Турніри')} hint={t('Tap a card for full standings, awards & recap', 'Натисни картку — повна таблиця, нагороди й підсумки')} />
        <div className="grid gap-4 sm:grid-cols-2">
          {[...tournaments]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((t) => (
              <Link
                key={t.id}
                to={`/t/${t.id}`}
                className="sticker group flex items-center justify-between gap-3 p-4 transition-transform hover:-translate-y-1"
              >
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {formatDate(t.date)} · {t.format}
                  </div>
                  <div className="text-2xl font-extrabold group-hover:underline">Odette Cup</div>
                  <div className="mt-1 text-sm text-ink-soft">
                    🎉 {nicknameOf(t)} · {t.matches.length} {tr('matches', 'матчів')}
                  </div>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-tang text-2xl shadow-hard-sm transition-transform group-hover:rotate-12">
                  🎾
                </span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  )
}

function GhostMark({ date }: { date?: string }) {
  const { t } = useT()
  return (
    <span
      className="cursor-default"
      title={
        date
          ? t(
              `Idle — hasn't played the last ${RECENT_EVENTS} events (last seen ${formatDate(date)})`,
              `Неактивний — не грав останні ${RECENT_EVENTS} турнірів (востаннє ${formatDate(date)})`,
            )
          : t(
              `Idle — hasn't played the last ${RECENT_EVENTS} events`,
              `Неактивний — не грав останні ${RECENT_EVENTS} турнірів`,
            )
      }
    >
      {' '}
      👻
    </span>
  )
}

function PerfRow({
  r,
  rank,
  highlight,
  provisional,
  elo,
  idle,
  lastSeen,
}: {
  r: SeasonRow
  rank?: number
  highlight?: boolean
  provisional?: boolean
  elo: number
  idle?: boolean
  lastSeen?: string
}) {
  const { t } = useT()
  return (
    <tr
      className={cx(
        'border-b border-ink/10 last:border-0 hover:bg-paper-300/50',
        highlight && 'bg-mint-soft',
        provisional && 'opacity-70',
      )}
    >
      <td className="py-2 pl-3 text-center font-mono text-xs font-bold">{rank ?? '—'}</td>
      <td className="py-2">
        <Link
          to={`/p/${encodeURIComponent(r.player)}`}
          className="group inline-flex items-center gap-2.5"
        >
          <Avatar name={r.player} size="sm" />
          <span className="font-bold group-hover:underline">
            {r.player}
            {highlight && ' 🚀'}
            {idle && <GhostMark date={lastSeen} />}
          </span>
          {provisional && (
            <span className="ml-1 rounded-full border border-ink/40 px-1.5 text-[10px] font-bold uppercase text-ink-faint">
              {t('new', 'новий')}
            </span>
          )}
        </Link>
      </td>
      <td className="py-2 text-center font-mono text-lg font-bold tabular">{round1(r.performance)}%</td>
      <td className="py-2 text-center font-mono text-sm tabular text-ink-soft">{r.tournaments}</td>
      <td className="py-2 text-center font-mono text-sm tabular">{pct(r.winRate)}</td>
      <td className="py-2 pr-3 text-center font-mono text-sm tabular text-ink-soft">{elo}</td>
    </tr>
  )
}
