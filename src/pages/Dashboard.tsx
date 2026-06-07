import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { seasonInsights } from '../stats'
import { Avatar } from '../components/ui/Avatar'
import { Stat, SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { RatingChart, toSeries } from '../components/RatingChart'
import { nicknameOf } from '../lib/tournament'
import { formatDate, pct, signed, round1 } from '../lib/format'
import { cx } from '../lib/cx'

export function Dashboard() {
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const resetToSeed = useAppStore((s) => s.resetToSeed)

  const { season, ratings } = useMemo(
    () => seasonInsights({ tournaments, aliases }),
    [tournaments, aliases],
  )

  const totalMatches = tournaments.reduce((n, t) => n + t.matches.length, 0)
  const leader = season[0]
  const topRated = ratings.slice(0, 5)

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="sticker-lg relative overflow-hidden bg-paper-100 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-6 -top-8 text-[8rem] opacity-10">🏆</div>
        <Chip tone="bg-sun">SEASON DASHBOARD</Chip>
        <h1 className="mt-3 text-4xl font-extrabold leading-[0.95] sm:text-5xl">
          Odette Cup
          <span className="mt-1 block text-2xl font-bold text-grape sm:text-3xl">by Vova 🐐</span>
        </h1>
        <p className="mt-2 max-w-md text-ink-soft">
          The Ubud Ukrainian padel league — every match, duo and rivalry turned into stats, awards
          and shareable recaps.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tournaments" value={tournaments.length} tone="bg-sky-soft" />
          <Stat label="Matches" value={totalMatches} tone="bg-mint-soft" />
          <Stat label="Players" value={season.length} tone="bg-punch-soft" />
          <Stat
            label="Top Rated"
            value={topRated[0] ? Math.round(topRated[0].rating) : '—'}
            sub={topRated[0]?.player}
            tone="bg-grape-soft"
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="btn"
            onClick={() => {
              if (confirm('Reset all data back to the seeded fixtures?')) resetToSeed()
            }}
          >
            ♻️ Reset to seed
          </button>
          <span className="btn cursor-not-allowed opacity-60" title="Paste importer coming soon">
            ➕ Add tournament <em className="not-italic text-ink-faint">(soon)</em>
          </span>
        </div>
      </section>

      {/* Season leaderboard */}
      <section>
        <SectionTitle
          emoji="📊"
          title="Season Leaderboard"
          hint="All-time points across every tournament"
        />
        {season.length === 0 ? (
          <Empty>No tournaments yet.</Empty>
        ) : (
          <div className="sticker overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-ink bg-ink text-paper-100">
                  <th className="w-10 py-2 pl-3 text-center text-[11px] font-bold uppercase">#</th>
                  <th className="py-2 text-[11px] font-bold uppercase tracking-wider">Player</th>
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
        )}
        {leader && (
          <p className="mt-2 text-sm text-ink-soft">
            👑 <span className="font-bold">{leader.player}</span> leads the season with{' '}
            {leader.totalPoints} points across {leader.tournaments}{' '}
            {leader.tournaments === 1 ? 'event' : 'events'}.
          </p>
        )}
      </section>

      {/* Ratings */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle emoji="📈" title="Elo Ratings" hint="Team-Elo, everyone starts at 1000" />
          <div className="sticker divide-y divide-ink/10">
            {ratings.slice(0, 8).map((r, i) => {
              const delta = Math.round(r.rating - 1000)
              return (
                <Link
                  to={`/p/${encodeURIComponent(r.player)}`}
                  key={r.player}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-paper-300/50"
                >
                  <span className="w-5 text-center font-mono text-xs font-bold text-ink-faint">{i + 1}</span>
                  <Avatar name={r.player} size="sm" />
                  <span className="flex-1 font-bold">{r.player}</span>
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
          <SectionTitle emoji="🏁" title="Rating Race" hint="Top 5 players, game by game" />
          {topRated.length ? (
            <RatingChart series={toSeries(topRated)} />
          ) : (
            <Empty emoji="📈">Not enough games yet.</Empty>
          )}
        </div>
      </section>

      {/* Tournaments */}
      <section>
        <SectionTitle emoji="🗓️" title="Tournaments" hint="Tap a card for full standings, awards & recap" />
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
                    🎉 {nicknameOf(t)} · {t.matches.length} matches
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
