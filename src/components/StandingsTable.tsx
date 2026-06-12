import { Link } from 'react-router-dom'
import type { PlayerStanding } from '../stats'
import { Avatar } from './ui/Avatar'
import { signed } from '../lib/format'
import { cx } from '../lib/cx'

export function StandingsTable({
  standings,
  className,
  onPlayer,
}: {
  standings: PlayerStanding[]
  className?: string
  /** When set, clicking a player calls this instead of linking to the profile (used in the draft tool). */
  onPlayer?: (name: string) => void
}) {
  const last = standings.length
  return (
    <div className={cx('sticker overflow-hidden', className)}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink bg-ink text-paper-100">
            <Th className="w-10 pl-3 text-center">#</Th>
            <Th>Гравець</Th>
            <Th className="text-center">W-L-T</Th>
            <Th className="text-center">Diff</Th>
            <Th className="pr-4 text-right">Pts</Th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const champ = s.rank === 1
            const spoon = s.rank === last
            return (
              <tr
                key={s.player}
                className={cx(
                  'border-b border-ink/10 transition-colors last:border-0',
                  champ ? 'bg-gold-soft' : spoon ? 'bg-tang-soft/60' : 'hover:bg-paper-300/50',
                )}
              >
                <td className="py-2 pl-3 text-center">
                  <span
                    className={cx(
                      'inline-grid h-6 w-6 place-items-center rounded-md font-mono text-xs font-bold',
                      champ && 'bg-gold text-ink shadow-hard-sm',
                      spoon && 'bg-tang text-ink',
                    )}
                  >
                    {s.rank}
                  </span>
                </td>
                <td className="py-2">
                  {onPlayer ? (
                    <button
                      onClick={() => onPlayer(s.player)}
                      className="group inline-flex items-center gap-2.5 text-left"
                    >
                      <Avatar name={s.player} size="sm" />
                      <span className="font-bold group-hover:underline decoration-2 underline-offset-2">
                        {s.player}
                        {champ && <span className="ml-1">👑</span>}
                        {spoon && <span className="ml-1">🥄</span>}
                      </span>
                    </button>
                  ) : (
                    <Link
                      to={`/p/${encodeURIComponent(s.player)}`}
                      className="group inline-flex items-center gap-2.5"
                    >
                      <Avatar name={s.player} size="sm" />
                      <span className="font-bold group-hover:underline decoration-2 underline-offset-2">
                        {s.player}
                        {champ && <span className="ml-1">👑</span>}
                        {spoon && <span className="ml-1">🥄</span>}
                      </span>
                    </Link>
                  )}
                </td>
                <td className="py-2 text-center font-mono text-sm tabular text-ink-soft">
                  {s.wins}-{s.losses}-{s.ties}
                </td>
                <td
                  className={cx(
                    'py-2 text-center font-mono text-sm font-bold tabular',
                    s.diff > 0 ? 'text-mint' : s.diff < 0 ? 'text-punch' : 'text-ink-faint',
                  )}
                >
                  {signed(s.diff)}
                </td>
                <td className="py-2 pr-4 text-right font-mono text-lg font-bold tabular">{s.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cx('py-2 text-[11px] font-bold uppercase tracking-wider', className)}>{children}</th>
  )
}
