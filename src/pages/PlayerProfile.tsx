import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { playerProfile } from '../stats'
import type { Partnership } from '../stats'
import { resolveName } from '../identity/aliases'
import { Avatar, PlayerTag } from '../components/ui/Avatar'
import { Stat, SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { RatingChart, toSeries } from '../components/RatingChart'
import { nicknameOf } from '../lib/tournament'
import { accentForName } from '../lib/colors'
import { formatDate, ordinal, pct, round1, signed } from '../lib/format'
import { cx } from '../lib/cx'

export function PlayerProfile() {
  const { name = '' } = useParams()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  // Resolve through the alias map so a link to a merged name (e.g. /p/Oleksey)
  // still lands on the canonical player.
  const player = resolveName(decodeURIComponent(name), aliases)

  const data = useMemo(
    () => playerProfile(player, { tournaments, aliases }),
    [player, tournaments, aliases],
  )

  if (!data.season) {
    return (
      <Empty emoji="🤷">
        No record for “{player}”. <Link to="/" className="font-bold underline">Back to dashboard</Link>.
      </Empty>
    )
  }

  const { season, rating, finishes, bestPartner, worstPartner, mostFrequentPartner, nemesis } = data
  const a = accentForName(player)

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className={cx('sticker-lg p-6 sm:p-8', a.soft)}>
        <Link to="/" className="chip bg-paper-100 hover:bg-paper-300">
          ← Home
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Avatar name={player} size="xl" className="shadow-hard" />
          <div>
            <h1 className="text-4xl font-extrabold sm:text-5xl">{player}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {rating && <Chip tone="bg-ink text-paper-100">⚡ {Math.round(rating.rating)} Elo</Chip>}
              <Chip tone="bg-paper-100">🏅 Best: {ordinal(season.bestFinish)}</Chip>
              <Chip tone="bg-paper-100">
                {season.tournaments} {season.tournaments === 1 ? 'event' : 'events'}
              </Chip>
              {season.tournamentWins > 0 && <Chip tone="bg-gold">👑 {season.tournamentWins}× champ</Chip>}
            </div>
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Elo" value={rating ? Math.round(rating.rating) : '—'} tone="bg-grape-soft" />
        <Stat label="Total Pts" value={season.totalPoints} tone="bg-sun-soft" />
        <Stat label="Win Rate" value={pct(season.winRate)} sub={`${season.wins}-${season.losses}-${season.ties}`} tone="bg-mint-soft" />
        <Stat label="Diff" value={signed(season.diff)} tone="bg-sky-soft" />
        <Stat label="Avg Finish" value={round1(season.avgFinish)} tone="bg-tang-soft" />
        <Stat label="Podiums" value={season.podiums} tone="bg-punch-soft" />
      </section>

      {/* Rating over time */}
      {rating && rating.history.length > 1 && (
        <section>
          <SectionTitle emoji="📈" title="Rating Over Time" hint="Game-by-game Elo" />
          <RatingChart series={toSeries([rating])} />
        </section>
      )}

      {/* Partners & nemesis */}
      <section>
        <SectionTitle emoji="🤝" title="Partners & Rivals" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RelCard
            emoji="💞"
            title="Best Partner"
            accent="bg-mint-soft"
            partnership={bestPartner}
            self={player}
          />
          <RelCard
            emoji="🧊"
            title="Toughest Pairing"
            accent="bg-sky-soft"
            partnership={worstPartner}
            self={player}
          />
          <RelCard
            emoji="🔁"
            title="Most Frequent"
            accent="bg-sun-soft"
            partnership={mostFrequentPartner}
            self={player}
          />
          <div className="sticker bg-punch-soft p-4">
            <div className="mb-2 text-2xl">😈</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Nemesis</div>
            {nemesis ? (
              <>
                <PlayerTag name={nemesis.opponent} size="sm" className="mt-1" />
                <div className="mt-1 font-mono text-sm tabular text-ink-soft">
                  {nemesis.winsOverX}-{nemesis.lossesToX} vs you ({nemesis.meetings} mtgs)
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-ink-soft">No clear nemesis yet 😇</div>
            )}
          </div>
        </div>
      </section>

      {/* Finishes */}
      <section>
        <SectionTitle emoji="🗓️" title="Tournament History" />
        <div className="space-y-2">
          {finishes
            .slice()
            .reverse()
            .map((f) => (
              <Link
                key={f.tournamentId}
                to={`/t/${f.tournamentId}`}
                className="sticker flex items-center justify-between gap-3 p-3 hover:-translate-y-0.5"
              >
                <div>
                  <div className="font-bold">{f.tournamentName}</div>
                  <div className="text-xs text-ink-soft">
                    🎉 {nicknameOf({ id: f.tournamentId, nickname: f.nickname })} · {formatDate(f.date)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-sm tabular text-ink-soft">{f.record}</div>
                    <div className="font-mono text-sm font-bold tabular">{f.points} pts</div>
                  </div>
                  <div
                    className={cx(
                      'grid h-12 w-12 place-items-center rounded-xl border-2 border-ink font-display text-lg font-extrabold shadow-hard-sm',
                      f.rank === 1 ? 'bg-gold' : f.rank <= 3 ? 'bg-mint-soft' : 'bg-paper-200',
                    )}
                  >
                    {ordinal(f.rank)}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  )
}

function RelCard({
  emoji,
  title,
  accent,
  partnership,
  self,
}: {
  emoji: string
  title: string
  accent: string
  partnership?: Partnership
  self: string
}) {
  const partner = partnership
    ? partnership.players[0] === self
      ? partnership.players[1]
      : partnership.players[0]
    : undefined
  return (
    <div className={cx('sticker p-4', accent)}>
      <div className="mb-2 text-2xl">{emoji}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{title}</div>
      {partner ? (
        <>
          <PlayerTag name={partner} size="sm" className="mt-1" />
          <div className="mt-1 font-mono text-sm tabular text-ink-soft">
            {partnership!.wins}-{partnership!.losses}-{partnership!.ties} · {pct(partnership!.winRate)}
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm text-ink-soft">Not enough games yet</div>
      )}
    </div>
  )
}
