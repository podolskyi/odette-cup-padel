import type { PlayerStanding } from '../stats'
import { Avatar } from './ui/Avatar'
import { Link } from 'react-router-dom'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'

const STYLE = [
  // index 0 = winner (rank 1)
  { h: 'h-28', bg: 'bg-gold', medal: '🥇', label: ['1st', '1-е'] as const },
  { h: 'h-20', bg: 'bg-paper-300', medal: '🥈', label: ['2nd', '2-е'] as const },
  { h: 'h-14', bg: 'bg-tang-soft', medal: '🥉', label: ['3rd', '3-є'] as const },
]

/** The classic 2-1-3 podium with avatars perched on plinths. */
export function PodiumBlock({ standings }: { standings: PlayerStanding[] }) {
  const { t } = useT()
  const top = standings.slice(0, 3)
  if (top.length < 3) return null
  const order = [top[1], top[0], top[2]] // visual left-to-right: 2nd, 1st, 3rd
  const styleFor = (rank: number) => STYLE[rank - 1]

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {order.map((s) => {
        const st = styleFor(s.rank)
        return (
          <div key={s.player} className="flex w-24 flex-col items-center sm:w-28">
            <div className="mb-2 text-2xl">{st.medal}</div>
            <Link to={`/p/${encodeURIComponent(s.player)}`} className="group flex flex-col items-center">
              <Avatar name={s.player} size={s.rank === 1 ? 'lg' : 'md'} className={s.rank === 1 ? 'animate-float' : ''} />
              <div className="mt-1.5 max-w-full truncate text-center text-sm font-bold group-hover:underline">
                {s.player}
              </div>
            </Link>
            <div className="font-mono text-xs font-bold tabular text-ink-soft">{s.points} pts</div>
            <div
              className={cx(
                'mt-2 grid w-full place-items-center rounded-t-xl border-2 border-b-0 border-ink font-display text-lg font-extrabold',
                st.h,
                st.bg,
              )}
            >
              {t(st.label[0], st.label[1])}
            </div>
          </div>
        )
      })}
    </div>
  )
}
