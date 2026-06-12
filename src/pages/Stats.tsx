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
        <Chip tone="bg-sky text-paper-100">У ЦИФРАХ</Chip>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Загальна картина</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          Усе, що Odette Cup набрав за весь час — підсумки, рекорди й кумедні віхи.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Турніри" value={stats.tournaments} tone="bg-sky-soft" />
          <Stat label="Матчі" value={stats.matches} tone="bg-mint-soft" />
          <Stat label="Годин на корті" value={`${stats.hours} год`} sub="≈ 2 год на турнір" tone="bg-tang-soft" />
          <Stat label="Гравці" value={stats.players} tone="bg-punch-soft" />
        </div>
      </section>

      <section>
        <SectionTitle emoji="✨" title="Найцікавіше" hint="Цікаві факти за всю історію" />
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
          Час на корті рахуємо як ~2 години на турнір — скажи, якщо цифра інша.
        </p>
      </section>

      <section>
        <SectionTitle emoji="💸" title="Витрати" hint="Орієнтовні внески — ~$14 / 225k IDR за турнір" />
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

        <div className="mt-6 sticker-lg bg-paper-100 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-display text-xl font-extrabold sm:text-2xl">…або, натомість 🛒</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              ті самі гроші, більше фану
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Що ціла купа внесків могла б купити на Балі натомість.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.buys.map((c, i) => {
              const a = accentByKey(c.accent)
              return (
                <div key={i} className={cx('sticker flex flex-col gap-1 p-3 animate-pop-in', a.soft)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.emoji}</span>
                    <span className="font-mono text-2xl font-extrabold tabular leading-none">{c.value}</span>
                  </div>
                  <div className="text-sm font-bold leading-tight">{c.label}</div>
                  {c.caption && <div className="text-xs text-ink-soft">{c.caption}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
