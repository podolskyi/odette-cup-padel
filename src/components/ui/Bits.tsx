import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

/** A labelled stat tile with a big mono number. */
export function Stat({
  label,
  value,
  sub,
  tone = 'bg-paper-100',
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: string
  className?: string
}) {
  return (
    <div className={cx('sticker px-4 py-3', tone, className)}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</div>
      <div className="font-mono text-2xl font-bold tabular leading-tight">{value}</div>
      {sub != null && <div className="text-xs text-ink-soft">{sub}</div>}
    </div>
  )
}

export function SectionTitle({
  emoji,
  title,
  hint,
  action,
}: {
  emoji?: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
          {emoji && <span className="text-2xl">{emoji}</span>}
          {title}
        </h2>
        {hint && <p className="text-sm text-ink-soft">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Chip({
  children,
  tone = 'bg-paper-100',
  className,
}: {
  children: ReactNode
  tone?: string
  className?: string
}) {
  return <span className={cx('chip', tone, className)}>{children}</span>
}

export function Empty({ emoji = '🎾', children }: { emoji?: string; children: ReactNode }) {
  return (
    <div className="sticker grid place-items-center gap-2 px-6 py-12 text-center">
      <div className="text-4xl">{emoji}</div>
      <p className="max-w-sm text-sm text-ink-soft">{children}</p>
    </div>
  )
}
