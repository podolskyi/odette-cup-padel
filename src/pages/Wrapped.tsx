import { useMemo, useRef, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { tournamentInsights } from '../stats'
import { Avatar } from '../components/ui/Avatar'
import { exportNodeToPng } from '../lib/image'
import { nicknameOf } from '../lib/tournament'
import { formatDate, pct, round1 } from '../lib/format'
import { cx } from '../lib/cx'

export function Wrapped() {
  const { id } = useParams()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const tournament = tournaments.find((t) => t.id === id)
  const insights = useMemo(
    () => (tournament ? tournamentInsights(tournament, aliases) : null),
    [tournament, aliases],
  )

  if (!tournament || !insights) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink text-paper-100">
        <Link to="/" className="btn bg-paper-100">
          ← Back home
        </Link>
      </div>
    )
  }

  const { standings, awards } = insights
  const champ = standings[0]
  const slug = `${tournament.name}-${tournament.date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <div className="min-h-dvh bg-ink text-paper-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-ink/90 px-4 py-3 backdrop-blur">
        <Link to={`/t/${tournament.id}`} className="chip border-paper-100 bg-transparent text-paper-100">
          ← Back
        </Link>
        <div className="font-display text-sm font-bold uppercase tracking-widest text-paper-100/70">
          {tournament.name} · Wrapped
        </div>
        <div className="w-14 text-right text-xs text-paper-100/50">swipe →</div>
      </div>

      {/* Horizontal swiper */}
      <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {/* 1 — Title */}
        <Slide accent="bg-grape text-paper-100" filename={`${slug}-1-title.png`}>
          <Tag dark>🎾 The Wrapped</Tag>
          <div className="flex flex-1 flex-col justify-center">
            <div className="text-sm font-bold uppercase tracking-widest opacity-80">
              {formatDate(tournament.date)}
            </div>
            <h1 className="mt-1 font-display text-6xl font-extrabold leading-[0.9]">{tournament.name}</h1>
            <p className="mt-2 text-xl font-bold opacity-90">aka “{nicknameOf(tournament)}”</p>
            <p className="mt-3 text-lg opacity-90">
              {standings.length} players · {tournament.matches.length} matches · {tournament.format}
            </p>
          </div>
          <div className="text-7xl">🏆🎾🔥</div>
        </Slide>

        {/* 2 — Champion */}
        {champ && (
          <Slide accent="bg-gold text-ink" filename={`${slug}-2-champion.png`}>
            <Tag>👑 Champion</Tag>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Avatar name={champ.player} size="xl" className="shadow-hard-lg" />
              <h1 className="mt-4 font-display text-6xl font-extrabold leading-none">{champ.player}</h1>
              <div className="mt-4 flex gap-2">
                <Pill>{champ.points} pts</Pill>
                <Pill>
                  {champ.wins}-{champ.losses}-{champ.ties}
                </Pill>
                <Pill>+{champ.diff} diff</Pill>
              </div>
            </div>
            <p className="text-center text-lg font-bold">Champion of the {tournament.name} 🥂</p>
          </Slide>
        )}

        {/* 3 — Podium */}
        <Slide accent="bg-paper-100 text-ink" filename={`${slug}-3-podium.png`}>
          <Tag>🏅 The Podium</Tag>
          <div className="flex flex-1 flex-col justify-center gap-3">
            {standings.slice(0, 3).map((s, i) => (
              <div
                key={s.player}
                className={cx(
                  'flex items-center gap-3 rounded-2xl border-2 border-ink p-3',
                  i === 0 ? 'bg-gold' : i === 1 ? 'bg-paper-300' : 'bg-tang-soft',
                )}
              >
                <span className="text-3xl">{['🥇', '🥈', '🥉'][i]}</span>
                <Avatar name={s.player} size="md" />
                <span className="flex-1 font-display text-2xl font-extrabold">{s.player}</span>
                <span className="font-mono text-xl font-bold tabular">{s.points}</span>
              </div>
            ))}
          </div>
        </Slide>

        {/* 4 — Duo of the night */}
        {awards.bestDuo && (
          <Slide accent="bg-mint text-ink" filename={`${slug}-4-duo.png`}>
            <Tag>🤝 Duo of the Night</Tag>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex -space-x-3">
                <Avatar name={awards.bestDuo.players[0]} size="xl" />
                <Avatar name={awards.bestDuo.players[1]} size="xl" />
              </div>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
                {awards.bestDuo.players[0]}
                <br />& {awards.bestDuo.players[1]}
              </h1>
              <div className="mt-3 flex gap-2">
                <Pill>{pct(awards.bestDuo.winRate)} win</Pill>
                <Pill>{round1(awards.bestDuo.pointsPerGame)} pts/game</Pill>
              </div>
            </div>
          </Slide>
        )}

        {/* 5 — Demolition */}
        {awards.demolition && (
          <Slide accent="bg-punch text-paper-100" filename={`${slug}-5-demolition.png`}>
            <Tag dark>💥 The Demolition</Tag>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="font-mono text-8xl font-bold leading-none tabular">
                {awards.demolition.scoreFor}
                <span className="opacity-60">–</span>
                {awards.demolition.scoreAgainst}
              </div>
              <div className="mt-2 text-xl font-bold">biggest blowout (+{awards.demolition.margin})</div>
              <div className="mt-5 flex -space-x-3">
                <Avatar name={awards.demolition.winners[0]} size="lg" />
                <Avatar name={awards.demolition.winners[1]} size="lg" />
              </div>
              <div className="mt-2 font-display text-2xl font-extrabold">
                {awards.demolition.winners.join(' & ')}
              </div>
            </div>
          </Slide>
        )}

        {/* 6 — Wall + Cardio */}
        <Slide accent="bg-sky text-paper-100" filename={`${slug}-6-wall-cardio.png`}>
          <Tag dark>🧱 Wall · 🏃 Cardio</Tag>
          <div className="flex flex-1 flex-col justify-center gap-4">
            {awards.wall && (
              <DuoStat emoji="🧱" label="The Wall" name={awards.wall.player} note={`${round1(awards.wall.paPerGame)} conceded / game`} />
            )}
            {awards.cardio && (
              <DuoStat emoji="🏃" label="Cardio King/Queen" name={awards.cardio.player} note={`${awards.cardio.pf} points scored`} />
            )}
          </div>
        </Slide>

        {/* 7 — Diplomat + Heartbreaker */}
        <Slide accent="bg-tang text-ink" filename={`${slug}-7-diplomat.png`}>
          <Tag>🕊️ Diplomat · 😬 Heartbreaker</Tag>
          <div className="flex flex-1 flex-col justify-center gap-4">
            {awards.diplomat && (
              <DuoStat emoji="🕊️" label="The Diplomat" name={awards.diplomat.player} note={`${awards.diplomat.ties} tied matches`} />
            )}
            {awards.heartbreaker && (
              <DuoStat emoji="😬" label="Heartbreaker" name={awards.heartbreaker.player} note={`${awards.heartbreaker.closeLosses} losses by ≤ 2`} />
            )}
          </div>
        </Slide>

        {/* 8 — Wooden Spoon */}
        {awards.woodenSpoon && (
          <Slide accent="bg-sun text-ink" filename={`${slug}-8-spoon.png`}>
            <Tag>🥄 Wooden Spoon</Tag>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <Avatar name={awards.woodenSpoon.player} size="xl" className="animate-wiggle" />
              <h1 className="mt-4 font-display text-5xl font-extrabold">{awards.woodenSpoon.player}</h1>
              <p className="mt-3 max-w-xs text-lg font-bold">
                Last place, biggest heart. Back next week, stronger 💪
              </p>
            </div>
          </Slide>
        )}

        {/* 9 — Full standings */}
        <Slide accent="bg-paper-100 text-ink" filename={`${slug}-9-standings.png`}>
          <Tag>📊 Final Standings</Tag>
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 gap-y-0.5">
              {standings.map((s) => (
                <div key={s.player} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-right font-mono text-xs font-bold tabular text-ink-faint">
                    {s.rank}
                  </span>
                  <span className="flex-1 truncate font-bold">
                    {s.rank === 1 && '👑 '}
                    {s.player}
                  </span>
                  <span className="font-mono tabular text-ink-soft">
                    {s.wins}-{s.losses}-{s.ties}
                  </span>
                  <span className="w-10 text-right font-mono font-bold tabular">{s.points}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-xs font-bold uppercase tracking-widest text-ink-soft">
            {tournament.name} · {formatDate(tournament.date)}
          </p>
        </Slide>
      </div>
    </div>
  )
}

function Slide({
  accent,
  filename,
  children,
}: {
  accent: string
  filename: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <section className="flex w-screen shrink-0 snap-center flex-col items-center gap-3 px-5 py-6">
      <div
        ref={ref}
        className={cx(
          'flex min-h-[34rem] w-full max-w-sm flex-col gap-3 rounded-[2rem] border-[3px] border-ink p-7 shadow-hard-xl',
          accent,
        )}
      >
        {children}
      </div>
      <button
        className="btn bg-paper-100 text-ink"
        onClick={() => ref.current && exportNodeToPng(ref.current, filename)}
      >
        ⬇️ Save image
      </button>
    </section>
  )
}

function Tag({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex w-fit items-center gap-1 rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wider',
        dark ? 'border-paper-100' : 'border-ink',
      )}
    >
      {children}
    </span>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border-2 border-current px-3 py-1 font-mono text-sm font-bold tabular">
      {children}
    </span>
  )
}

function DuoStat({
  emoji,
  label,
  name,
  note,
}: {
  emoji: string
  label: string
  name: string
  note: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-4xl">{emoji}</span>
      <Avatar name={name} size="lg" />
      <div>
        <div className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</div>
        <div className="font-display text-2xl font-extrabold leading-tight">{name}</div>
        <div className="text-sm font-bold opacity-90">{note}</div>
      </div>
    </div>
  )
}
