import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { funInsights, type FunInsight } from '../stats'
import { Avatar } from '../components/ui/Avatar'
import { SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { accentByKey } from '../lib/colors'
import { cx } from '../lib/cx'

export function Fun() {
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const insights = useMemo(() => funInsights({ tournaments, aliases }), [tournaments, aliases])

  return (
    <div className="space-y-8">
      <section className="sticker-lg relative overflow-hidden bg-paper-100 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-4 -top-6 text-[7rem] opacity-10">🤪</div>
        <Chip tone="bg-punch text-paper-100">HALL OF FAME &amp; SHAME</Chip>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">The Fun Stuff</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          Season-long superlatives, lovingly data-driven. Every number is real 🎾
        </p>
        <div className="mt-4 rounded-2xl border-2 border-ink bg-sun-soft p-3 text-sm">
          <span className="font-bold">😅 It's all love.</span> These awards roast everyone equally and
          purely for laughs. The stats are real, but the bragging rights are temporary — and showing
          up is the real win. No padel egos were permanently harmed. 💛
        </div>
      </section>

      <section>
        <SectionTitle emoji="🏅" title="Superlatives" hint="Across every Odette Cup so far" />
        {insights.length === 0 ? (
          <Empty emoji="🤷">Not enough data yet — play a few more events!</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((it) => (
              <FunCard key={it.key} insight={it} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function FunCard({ insight }: { insight: FunInsight }) {
  const a = accentByKey(insight.accent)
  return (
    <div className={cx('sticker flex flex-col gap-3 p-4 animate-pop-in', a.soft)}>
      <div className="flex items-center gap-3">
        <span
          className={cx(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink text-2xl shadow-hard-sm',
            a.solid,
          )}
        >
          {insight.emoji}
        </span>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Award</div>
          <h3 className="text-lg font-extrabold leading-none">{insight.title}</h3>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {insight.players.map((p) => (
            <Avatar key={p} name={p} size="sm" />
          ))}
        </div>
        <span className="font-bold">
          {insight.players.map((p, i) => (
            <span key={p}>
              {i > 0 && <span className="text-ink-faint"> &amp; </span>}
              <Link to={`/p/${encodeURIComponent(p)}`} className="hover:underline">
                {p}
              </Link>
            </span>
          ))}
        </span>
      </div>

      <div className="font-mono text-xl font-bold tabular">{insight.value}</div>
      <p className="mt-auto text-xs italic text-ink-soft">{insight.caption}</p>
    </div>
  )
}
