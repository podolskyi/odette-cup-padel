import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { aggregateStats } from '../stats'
import { Stat, SectionTitle, Chip } from '../components/ui/Bits'
import { accentByKey } from '../lib/colors'
import { cx } from '../lib/cx'

export function Stats() {
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const stats = useMemo(() => aggregateStats({ tournaments, aliases }), [tournaments, aliases])

  return (
    <div className="space-y-8">
      <section className="sticker-lg relative overflow-hidden bg-paper-100 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-4 -top-6 text-[7rem] opacity-10">📊</div>
        <Chip tone="bg-sky text-paper-100">BY THE NUMBERS</Chip>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">The Big Picture</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          Everything the Odette Cup has racked up so far — totals, records and silly milestones.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Tournaments" value={stats.tournaments} tone="bg-sky-soft" />
          <Stat label="Matches" value={stats.matches} tone="bg-mint-soft" />
          <Stat label="Hours on court" value={`${stats.hours}h`} sub="≈ 2h per night" tone="bg-tang-soft" />
          <Stat label="Players" value={stats.players} tone="bg-punch-soft" />
        </div>
      </section>

      <section>
        <SectionTitle emoji="✨" title="Highlights" hint="Fun facts from the whole history" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {stats.cards.map((c, i) => {
            const a = accentByKey(c.accent)
            return (
              <div key={i} className={cx('sticker flex flex-col gap-1 p-4 animate-pop-in', a.soft)}>
                <div
                  className={cx(
                    'mb-1 grid h-11 w-11 place-items-center rounded-xl border-2 border-ink text-2xl shadow-hard-sm',
                    a.solid,
                  )}
                >
                  {c.emoji}
                </div>
                <div className="font-mono text-3xl font-extrabold tabular leading-none">{c.value}</div>
                <div className="text-sm font-bold">{c.label}</div>
                {c.caption && <div className="text-xs text-ink-soft">{c.caption}</div>}
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Court time assumes ~2 hours per tournament — tell me if a different number fits.
        </p>
      </section>

      <section>
        <SectionTitle emoji="💸" title="The Damage" hint="Entry fees, roughly — ~$14 / 225k IDR per night" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.money.map((c, i) => {
            const a = accentByKey(c.accent)
            return (
              <div key={i} className={cx('sticker flex flex-col gap-1 p-4 animate-pop-in', a.soft)}>
                <div
                  className={cx(
                    'mb-1 grid h-11 w-11 place-items-center rounded-xl border-2 border-ink text-2xl shadow-hard-sm',
                    a.solid,
                  )}
                >
                  {c.emoji}
                </div>
                <div className="font-mono text-3xl font-extrabold tabular leading-none">{c.value}</div>
                <div className="text-sm font-bold">{c.label}</div>
                {c.caption && <div className="text-xs text-ink-soft">{c.caption}</div>}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
