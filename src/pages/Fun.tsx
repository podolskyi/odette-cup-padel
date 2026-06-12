import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { funInsights, type FunInsight } from '../stats'
import { Avatar } from '../components/ui/Avatar'
import { SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { accentByKey } from '../lib/colors'
import { seededShuffle } from '../lib/shuffle'
import { cx } from '../lib/cx'

const VISIBLE = 15
const randomSeed = () => Math.floor(Math.random() * 1_000_000_000)

// Ranked variants share a "family" (key minus a trailing -N) so a single view
// never shows e.g. both Elo #1 and Elo #2 — they just enrich the rotation.
const familyOf = (key: string) => key.replace(/-\d+$/, '')

/** Pick up to `n` cards: one per family, and at most 3 cards per player, so a
 *  shuffle always feels varied. Relaxes the rules if the pool is too small. */
function pickDiverse(pool: FunInsight[], n: number): FunInsight[] {
  const out: FunInsight[] = []
  const families = new Set<string>()
  const perPlayer = new Map<string, number>()
  const bump = (it: FunInsight) => it.players.forEach((p) => perPlayer.set(p, (perPlayer.get(p) ?? 0) + 1))
  const playerMaxed = (it: FunInsight) => it.players.some((p) => (perPlayer.get(p) ?? 0) >= 3)

  for (const it of pool) {
    if (out.length >= n) break
    if (families.has(familyOf(it.key)) || playerMaxed(it)) continue
    out.push(it)
    families.add(familyOf(it.key))
    bump(it)
  }
  // Backfill (small datasets): allow repeat families, keep the player cap.
  if (out.length < n) {
    for (const it of pool) {
      if (out.length >= n) break
      if (out.includes(it) || playerMaxed(it)) continue
      out.push(it)
      bump(it)
    }
  }
  return out
}

export function Fun() {
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const pool = useMemo(() => funInsights({ tournaments, aliases }), [tournaments, aliases])
  const [seed, setSeed] = useState(randomSeed)

  const visible = useMemo(() => pickDiverse(seededShuffle(pool, seed), VISIBLE), [pool, seed])

  return (
    <div className="space-y-8">
      <section className="sticker-lg relative overflow-hidden bg-paper-100 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-4 -top-6 text-[7rem] opacity-10">🤪</div>
        <Chip tone="bg-punch text-paper-100">HALL OF FAME &amp; SHAME</Chip>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Найвеселіше</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          Сезонні номінації, з любов’ю пораховані з даних. Кожна цифра — справжня 🎾
        </p>
        <div className="mt-4 rounded-2xl border-2 border-ink bg-sun-soft p-3 text-sm">
          <span className="font-bold">😅 Усе по любові.</span> Ці нагороди підколюють усіх однаково й
          суто заради сміху. Статистика справжня, але право похизуватися тимчасове — а головна
          перемога в тому, що ти прийшов грати. Жодне падел-его не постраждало назавжди. 💛
        </div>
      </section>

      <section>
        <SectionTitle
          emoji="🏅"
          title="Номінації"
          hint={
            pool.length
              ? `Випадкові ${Math.min(VISIBLE, pool.length)} з ${pool.length} — тисни перемішати`
              : 'З усіх Odette Cup за весь час'
          }
          action={
            pool.length > VISIBLE ? (
              <button
                type="button"
                onClick={() => setSeed(randomSeed())}
                className="group flex shrink-0 items-center gap-2 rounded-xl border-2 border-ink bg-sun px-4 py-2 text-sm font-extrabold shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
              >
                <span className="text-lg transition-transform duration-300 group-hover:rotate-180 group-active:rotate-[360deg]">
                  🎲
                </span>
                Здивуй мене
              </button>
            ) : undefined
          }
        />
        {pool.length === 0 ? (
          <Empty emoji="🤷">Поки що замало даних — зіграйте ще кілька турнірів!</Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((it) => (
              // Key by seed so every shuffle re-mounts the cards and replays the pop-in.
              <FunCard key={`${seed}-${it.key}`} insight={it} />
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
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Нагорода</div>
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
