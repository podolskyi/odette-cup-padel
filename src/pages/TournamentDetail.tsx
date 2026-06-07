import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { tournamentInsights } from '../stats'
import type { Match } from '../types'
import { StandingsTable } from '../components/StandingsTable'
import { AwardGrid } from '../components/AwardCard'
import { PodiumBlock } from '../components/PodiumBlock'
import { SectionTitle, Chip, Stat, Empty } from '../components/ui/Bits'
import { Avatar } from '../components/ui/Avatar'
import { eventTitle, nicknameOf } from '../lib/tournament'
import { cx } from '../lib/cx'

export function TournamentDetail() {
  const { id } = useParams()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const [editing, setEditing] = useState(false)

  const tournament = tournaments.find((t) => t.id === id)
  const insights = useMemo(
    () => (tournament ? tournamentInsights(tournament, aliases) : null),
    [tournament, aliases],
  )

  if (!tournament || !insights) {
    return (
      <Empty emoji="🤷">
        Tournament not found. <Link to="/" className="font-bold underline">Back to dashboard</Link>.
      </Empty>
    )
  }

  const { standings, awards } = insights
  const champion = standings[0]
  const rounds = Math.max(...tournament.matches.map((m) => m.round))

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" className="chip bg-paper-100 hover:bg-paper-300">
            ← Home
          </Link>
          <Chip tone="bg-sun-soft">🎉 {nicknameOf(tournament)}</Chip>
          <Chip tone="bg-mint-soft">{tournament.format}</Chip>
          <Chip tone="bg-sky-soft">to {tournament.pointsPerMatch} pts</Chip>
        </div>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{eventTitle(tournament)}</h1>
        {champion && (
          <p className="mt-2 flex items-center gap-2 text-ink-soft">
            Champion: <Avatar name={champion.player} size="sm" />
            <span className="font-bold text-ink">{champion.player}</span> 👑 with {champion.points} pts
          </p>
        )}
        <div className="mt-5">
          <Link to={`/t/${tournament.id}/wrapped`} className="btn-dark">
            ✨ Open Wrapped recap
          </Link>
        </div>
      </section>

      {/* Podium */}
      <section className="sticker bg-gradient-to-b from-paper-100 to-paper-200 px-4 py-8">
        <PodiumBlock standings={standings} />
      </section>

      {/* Standings */}
      <section>
        <SectionTitle emoji="🏆" title="Final Standings" hint="Points = sum of your team's scores" />
        <StandingsTable standings={standings} />
      </section>

      {/* Awards */}
      <section>
        <SectionTitle emoji="🎁" title="The Awards" hint="Auto-generated, lovingly data-driven" />
        <AwardGrid awards={awards} />
      </section>

      {/* Matches + editing */}
      <section>
        <SectionTitle
          emoji="🎾"
          title="Match Log"
          hint={editing ? 'Edit a score — everything recomputes live' : `${tournament.matches.length} matches`}
          action={
            <button
              className={cx('btn', editing && 'btn-dark')}
              onClick={() => setEditing((e) => !e)}
            >
              {editing ? '✓ Done' : '✏️ Edit scores'}
            </button>
          }
        />
        <div className="space-y-4">
          {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => (
            <div key={round}>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
                Round {round}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {tournament.matches
                  .map((m, idx) => ({ m, idx }))
                  .filter(({ m }) => m.round === round)
                  .map(({ m, idx }) => (
                    <MatchRow
                      key={idx}
                      match={m}
                      index={idx}
                      tournamentId={tournament.id}
                      total={tournament.pointsPerMatch}
                      editing={editing}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Stat
        label="Heads up"
        value="Live-derived"
        sub="All standings, awards & ratings are computed from this match log — edit a score and watch them update."
        tone="bg-grape-soft"
      />
    </div>
  )
}

function Team({ players, win }: { players: [string, string]; win: boolean }) {
  return (
    <div className={cx('flex items-center gap-1.5', win && 'font-bold')}>
      <Avatar name={players[0]} size="sm" />
      <Avatar name={players[1]} size="sm" />
      <span className="ml-0.5 truncate text-sm">
        {players[0]} & {players[1]}
      </span>
    </div>
  )
}

function MatchRow({
  match,
  index,
  tournamentId,
  total,
  editing,
}: {
  match: Match
  index: number
  tournamentId: string
  total: number
  editing: boolean
}) {
  const updateMatch = useAppStore((s) => s.updateMatch)
  const aWin = match.scoreA > match.scoreB
  const bWin = match.scoreB > match.scoreA
  const sum = match.scoreA + match.scoreB
  const bad = sum !== total

  return (
    <div className="sticker flex items-center justify-between gap-2 p-2.5">
      <Team players={match.teamA} win={aWin} />
      {editing ? (
        <div className="flex shrink-0 items-center gap-1">
          <input
            type="number"
            value={match.scoreA}
            onChange={(e) => updateMatch(tournamentId, index, { scoreA: Number(e.target.value) })}
            className="w-12 rounded-lg border-2 border-ink bg-paper-100 px-1 py-0.5 text-center font-mono font-bold"
          />
          <span className="text-ink-faint">:</span>
          <input
            type="number"
            value={match.scoreB}
            onChange={(e) => updateMatch(tournamentId, index, { scoreB: Number(e.target.value) })}
            className="w-12 rounded-lg border-2 border-ink bg-paper-100 px-1 py-0.5 text-center font-mono font-bold"
          />
        </div>
      ) : (
        <div
          className={cx(
            'shrink-0 rounded-lg border-2 border-ink px-2 py-0.5 font-mono text-sm font-bold tabular',
            bad ? 'bg-punch-soft' : 'bg-paper-200',
          )}
          title={bad ? `Scores sum to ${sum}, expected ${total}` : undefined}
        >
          {match.scoreA}–{match.scoreB}
        </div>
      )}
      <Team players={match.teamB} win={bWin} />
    </div>
  )
}
