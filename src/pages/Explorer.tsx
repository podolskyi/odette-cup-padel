import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { seasonInsights, pairKey, type HeadToHead } from '../stats'
import { SortableTable, type Column } from '../components/SortableTable'
import { PlayerTag } from '../components/ui/Avatar'
import { SectionTitle, Chip, Empty, Stat } from '../components/ui/Bits'
import { pct, round1, signed } from '../lib/format'

export function Explorer() {
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)

  const { partnerships, rivalries, glue } = useMemo(
    () => seasonInsights({ tournaments, aliases }),
    [tournaments, aliases],
  )

  // Pairs who teamed up 2+ times.
  const duos = partnerships.filter((p) => p.games >= 2)

  // One row per rivalry: the dominant direction, 2+ meetings.
  const rivalryRows = useMemo(() => {
    const best = new Map<string, HeadToHead>()
    for (const h of rivalries.values()) {
      if (h.meetings < 2) continue
      const key = pairKey(h.player, h.opponent)
      const cur = best.get(key)
      if (!cur || h.wins > cur.wins || (h.wins === cur.wins && h.pointMargin > cur.pointMargin)) {
        best.set(key, h)
      }
    }
    return [...best.values()].filter((h) => h.wins !== h.losses)
  }, [rivalries])

  const duoCols: Column<(typeof duos)[number]>[] = [
    {
      key: 'duo',
      header: 'Duo',
      render: (p) => (
        <div className="flex items-center gap-1">
          <PlayerTag name={p.players[0]} size="sm" bold={false} />
          <span className="text-ink-faint">&</span>
          <PlayerTag name={p.players[1]} size="sm" bold={false} />
        </div>
      ),
      sortValue: (p) => p.key,
    },
    { key: 'games', header: 'Games', align: 'center', render: (p) => p.games, sortValue: (p) => p.games },
    {
      key: 'wlt',
      header: 'W-L-T',
      align: 'center',
      render: (p) => (
        <span className="font-mono tabular">
          {p.wins}-{p.losses}-{p.ties}
        </span>
      ),
      sortValue: (p) => p.wins,
    },
    {
      key: 'win',
      header: 'Win%',
      align: 'center',
      render: (p) => <span className="font-mono tabular font-bold">{pct(p.winRate)}</span>,
      sortValue: (p) => p.winRate,
    },
    {
      key: 'ppg',
      header: 'Pts/G',
      align: 'right',
      render: (p) => <span className="font-mono tabular">{round1(p.pointsPerGame)}</span>,
      sortValue: (p) => p.pointsPerGame,
    },
  ]

  const rivalCols: Column<HeadToHead>[] = [
    {
      key: 'leader',
      header: 'Leads',
      render: (h) => <PlayerTag name={h.player} size="sm" bold={false} />,
      sortValue: (h) => h.player,
    },
    {
      key: 'rec',
      header: 'Record',
      align: 'center',
      render: (h) => (
        <span className="font-mono tabular font-bold">
          {h.wins}-{h.losses}
          {h.ties ? `-${h.ties}` : ''}
        </span>
      ),
      sortValue: (h) => h.wins - h.losses,
    },
    {
      key: 'foe',
      header: 'Over',
      render: (h) => <PlayerTag name={h.opponent} size="sm" bold={false} />,
      sortValue: (h) => h.opponent,
    },
    {
      key: 'mtg',
      header: 'Mtgs',
      align: 'center',
      render: (h) => h.meetings,
      sortValue: (h) => h.meetings,
    },
    {
      key: 'margin',
      header: 'Margin',
      align: 'right',
      render: (h) => <span className="font-mono tabular">{signed(h.pointMargin)}</span>,
      sortValue: (h) => h.pointMargin,
    },
  ]

  return (
    <div className="space-y-10">
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <Chip tone="bg-mint">EXPLORER</Chip>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Duos, Rivals & Glue</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          Who plays best together, who owns whom, and who quietly makes everyone around them better.
        </p>
      </section>

      <section>
        <SectionTitle emoji="🤝" title="Best Partnerships" hint="Pairs who teamed up 2+ times — tap a header to sort" />
        {duos.length ? (
          <SortableTable
            columns={duoCols}
            rows={duos}
            rowKey={(p) => p.key}
            initialSort={{ key: 'win', dir: 'desc' }}
          />
        ) : (
          <Empty emoji="🤝">No repeat partnerships yet — add more tournaments.</Empty>
        )}
      </section>

      <section>
        <SectionTitle emoji="⚔️" title="Rivalries" hint="One-sided head-to-heads, 2+ meetings" />
        {rivalryRows.length ? (
          <SortableTable
            columns={rivalCols}
            rows={rivalryRows}
            rowKey={(h) => `${h.player}>${h.opponent}`}
            initialSort={{ key: 'rec', dir: 'desc' }}
          />
        ) : (
          <Empty emoji="⚔️">No decisive rivalries yet.</Empty>
        )}
      </section>

      <section>
        <SectionTitle
          emoji="🧲"
          title="The Glue"
          hint="Players who lift their partners' win rate (6+ shared games)"
        />
        {glue.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {glue.slice(0, 6).map((g, i) => (
              <div key={g.player} className="sticker flex items-center gap-3 p-4">
                <span className="font-display text-2xl font-extrabold text-ink-faint">{i + 1}</span>
                <PlayerTag name={g.player} size="md" />
                <div className="ml-auto text-right">
                  <div className="font-mono text-xl font-bold tabular text-mint">
                    {signed(Math.round(g.uplift * 100))}%
                  </div>
                  <div className="text-[11px] text-ink-soft">{g.partners} partners</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty emoji="🧲">
            Not enough shared games yet — “The Glue” needs a few more tournaments to mean something.
          </Empty>
        )}
      </section>

      <Stat
        label="How it's measured"
        value="Partner uplift"
        sub="For each player we compare how their partners do WITH them vs their usual win rate, weighted by games together."
        tone="bg-grape-soft"
      />
    </div>
  )
}
