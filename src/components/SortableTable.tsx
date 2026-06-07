import { useMemo, useState, type ReactNode } from 'react'
import { cx } from '../lib/cx'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'center' | 'right'
  render: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
  defaultDir?: 'asc' | 'desc'
}

export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  initialSort,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  initialSort?: { key: string; dir: 'asc' | 'desc' }
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: 'desc' as const })

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, columns, sort])

  const toggle = (col: Column<T>) => {
    if (!col.sortValue) return
    setSort((s) =>
      s.key === col.key
        ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: col.defaultDir ?? 'desc' },
    )
  }

  return (
    <div className="sticker overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink bg-ink text-paper-100">
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => toggle(c)}
                className={cx(
                  'whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-wider',
                  c.sortValue && 'cursor-pointer select-none hover:text-sun',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}
              >
                {c.header}
                {sort.key === c.key && <span className="ml-1">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className="border-b border-ink/10 last:border-0 hover:bg-paper-300/50">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cx(
                    'px-3 py-2',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
