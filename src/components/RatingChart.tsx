import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PlayerRating } from '../stats'
import { hexForName } from '../lib/colors'

export interface RatingSeries {
  name: string
  ratings: number[] // rating after each recorded point (incl. baseline)
}

/** Build chart series straight from PlayerRating histories. */
export function toSeries(players: PlayerRating[]): RatingSeries[] {
  return players.map((p) => ({ name: p.player, ratings: p.history.map((h) => Math.round(h.rating)) }))
}

export function RatingChart({ series, height = 240 }: { series: RatingSeries[]; height?: number }) {
  const maxLen = Math.max(0, ...series.map((s) => s.ratings.length))
  const data = Array.from({ length: maxLen }, (_, i) => {
    const row: Record<string, number | null | string> = { idx: i }
    for (const s of series) row[s.name] = i < s.ratings.length ? s.ratings[i] : null
    return row
  })

  return (
    <div className="sticker p-3">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#211c1820" vertical={false} />
          <XAxis
            dataKey="idx"
            tick={{ fontSize: 11, fontFamily: 'Space Mono', fill: '#5d534a' }}
            tickFormatter={(v) => (v === 0 ? 'start' : `g${v}`)}
            interval="preserveStartEnd"
            stroke="#211c18"
          />
          <YAxis
            tick={{ fontSize: 11, fontFamily: 'Space Mono', fill: '#5d534a' }}
            domain={['dataMin - 20', 'dataMax + 20']}
            stroke="#211c18"
            width={44}
          />
          <Tooltip
            contentStyle={{
              border: '2px solid #211c18',
              borderRadius: 12,
              fontFamily: 'Outfit',
              boxShadow: '4px 4px 0 0 #211c18',
              background: '#fffcf5',
            }}
            labelFormatter={(v) => (v === 0 ? 'Start (1000)' : `Game ${v}`)}
          />
          {series.map((s) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={hexForName(s.name)}
              strokeWidth={3}
              dot={false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#211c18' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
