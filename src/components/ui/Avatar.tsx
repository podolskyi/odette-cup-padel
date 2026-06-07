import { Link } from 'react-router-dom'
import { accentForName } from '../../lib/colors'
import { initials } from '../../lib/format'
import { cx } from '../../lib/cx'

const SIZES = {
  sm: 'h-8 w-8 text-[11px] rounded-lg border-2',
  md: 'h-11 w-11 text-sm rounded-xl border-2',
  lg: 'h-16 w-16 text-lg rounded-2xl border-[3px]',
  xl: 'h-24 w-24 text-3xl rounded-[1.25rem] border-[3px]',
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const a = accentForName(name)
  return (
    <span
      className={cx(
        'inline-grid place-items-center border-ink font-display font-bold shadow-hard-sm',
        a.solid,
        a.on,
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

/** Avatar + name, linking to the player profile. */
export function PlayerTag({
  name,
  size = 'md',
  className,
  bold = true,
}: {
  name: string
  size?: keyof typeof SIZES
  className?: string
  bold?: boolean
}) {
  return (
    <Link
      to={`/p/${encodeURIComponent(name)}`}
      className={cx('group inline-flex items-center gap-2', className)}
    >
      <Avatar name={name} size={size} />
      <span className={cx('group-hover:underline decoration-2 underline-offset-2', bold && 'font-bold')}>
        {name}
      </span>
    </Link>
  )
}
