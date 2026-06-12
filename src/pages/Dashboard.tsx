import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { seasonInsights, recentPlayers, lastSeenDates, RECENT_EVENTS, type SeasonRow } from '../stats'
import { Avatar } from '../components/ui/Avatar'
import { Stat, SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { RatingChart, toSeries } from '../components/RatingChart'
import { nicknameOf } from '../lib/tournament'
import { formatDate, pct, signed, round1 } from '../lib/format'
import { cx } from '../lib/cx'

export function Dashboard() {
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)

  const { season, ratings, ratingsByPlayer } = useMemo(
    () => seasonInsights({ tournaments, aliases }),
    [tournaments, aliases],
  )

  const [board, setBoard] = useState<'total' | 'performance'>('total')

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
        <Chip tone="bg-sun">ПАНЕЛЬ СЕЗОНУ</Chip>
        <h1 className="mt-3 text-4xl font-extrabold leading-[0.95] sm:text-5xl">
          Odette Cup
          <span className="mt-1 block text-2xl font-bold text-grape sm:text-3xl">by Vova 🐐</span>
        </h1>
        <p className="mt-2 max-w-md text-ink-soft">
          Українська падел-ліга Убуду — кожен матч, дует і суперництво перетворені на статистику,
          нагороди та підсумки, якими хочеться поділитися.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Турніри" value={tournaments.length} tone="bg-sky-soft" />
          <Stat label="Матчі" value={totalMatches} tone="bg-mint-soft" />
          <Stat label="Гравці" value={season.length} tone="bg-punch-soft" />
          <Stat
            label="Топ Elo"
            value={topRated[0] ? Math.round(topRated[0].rating) : '—'}
            sub={topRated[0]?.player}
            tone="bg-grape-soft"
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="btn cursor-not-allowed opacity-60" title="Імпорт через вставку — скоро">
            ➕ Додати турнір <em className="not-italic text-ink-faint">(скоро)</em>
          </span>
        </div>
      </section>

      {/* Season leaderboard (Total ↔ Performance) */}
      <section>
        <SectionTitle
          emoji="📊"
          title="Таблиця сезону"
          hint={
            board === 'total'
              ? 'Усі бали за весь час по всіх турнірах'
              : 'Середній перцентиль фінішу — чесно, скільки б турнірів ти не зіграв'
          }
          action={
            <div className="flex overflow-hidden rounded-xl border-2 border-ink shadow-hard-sm">
              <button
                onClick={() => setBoard('total')}
                className={cx('px-3 py-1.5 text-sm font-bold', board === 'total' ? 'bg-ink text-paper-100' : 'bg-paper-100')}
              >
                Total
              </button>
              <button
                onClick={() => setBoard('performance')}
                className={cx(
                  'border-l-2 border-ink px-3 py-1.5 text-sm font-bold',
                  board === 'performance' ? 'bg-ink text-paper-100' : 'bg-paper-100',
                )}
              >
                Performance
              </button>
            </div>
          }
        />

        {/* Legend: explains the selected board */}
        <div className={cx('sticker mb-4 p-4', board === 'total' ? 'bg-sky-soft' : 'bg-lime-soft')}>
          {board === 'total' ? (
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
          <Empty>Поки що немає турнірів.</Empty>
        ) : board === 'total' ? (
          <div className="sticker overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-paper-100">
                  <th className="w-10 py-2 pl-3 text-center text-[11px] font-bold uppercase">#</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wider">Гравець</th>
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
        ) : (
          <div className="sticker overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-paper-100">
                  <th className="w-10 py-2 pl-3 text-center text-[11px] font-bold uppercase">#</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wider">Гравець</th>
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
                      Попередньо · треба 2+ турніри
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
        )}

        {board === 'total' && leader && (
          <p className="mt-2 text-sm text-ink-soft">
            👑 <span className="font-bold">{leader.player}</span> очолює сезон —{' '}
            {leader.totalPoints} балів за {leader.tournaments}{' '}
            {leader.tournaments === 1 ? 'турнір' : 'турнірів'}.
          </p>
        )}
        {board === 'performance' && perfRanked[0] && (
          <p className="mt-2 text-sm text-ink-soft">
            🚀 <span className="font-bold">{perfRanked[0].player}</span> лідирує за перформансом —{' '}
            {round1(perfRanked[0].performance)}% середній фініш за {perfRanked[0].tournaments} турнірів —
            обсяг тут не рахується.
          </p>
        )}
      </section>

      {/* Ratings */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle emoji="📈" title="Рейтинг Elo" hint={`Командний Elo · усі ${ratings.length} гравців`} />
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
          <SectionTitle emoji="🏁" title="Гонка рейтингу" hint="Топ-5 гравців, гра за грою" />
          {topRated.length ? (
            <RatingChart series={toSeries(topRated)} />
          ) : (
            <Empty emoji="📈">Поки що замало ігор.</Empty>
          )}
        </div>
      </section>

      {/* Tournaments */}
      <section>
        <SectionTitle emoji="🗓️" title="Турніри" hint="Натисни картку — повна таблиця, нагороди й підсумки" />
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
                    🎉 {nicknameOf(t)} · {t.matches.length} матчів
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
  return (
    <span
      className="cursor-default"
      title={
        date
          ? `Неактивний — не грав останні ${RECENT_EVENTS} турнірів (востаннє ${formatDate(date)})`
          : `Неактивний — не грав останні ${RECENT_EVENTS} турнірів`
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
              новий
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
