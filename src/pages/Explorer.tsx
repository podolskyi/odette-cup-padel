import { useMemo, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { seasonInsights, pairKey, type HeadToHead } from '../stats'
import { allPlayers } from '../identity/aliases'
import { SortableTable, type Column } from '../components/SortableTable'
import { PlayerTag } from '../components/ui/Avatar'
import { SectionTitle, Chip, Empty, Stat } from '../components/ui/Bits'
import { pct, round1, signed } from '../lib/format'
import { useT } from '../lib/i18n'

export function Explorer() {
  const { t, lang } = useT()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)

  const { partnerships, rivalries, glue } = useMemo(
    () => seasonInsights({ tournaments, aliases }),
    [tournaments, aliases],
  )

  const players = useMemo(() => allPlayers(tournaments, aliases), [tournaments, aliases])
  const [filter, setFilter] = useState('')
  const active = players.includes(filter) ? filter : '' // only filter on an exact player

  const partRef = useRef<HTMLDivElement>(null)
  const rivRef = useRef<HTMLDivElement>(null)
  const glueRef = useRef<HTMLDivElement>(null)
  const jump = (r: React.RefObject<HTMLDivElement>) =>
    r.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Pairs who teamed up 2+ times (optionally filtered to one player).
  const duos = partnerships
    .filter((p) => p.games >= 2)
    .filter((p) => !active || p.players.includes(active))

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

  const rivalryShown = active
    ? rivalryRows.filter((h) => h.player === active || h.opponent === active)
    : rivalryRows
  const glueShown = active ? glue.filter((g) => g.player === active) : glue.slice(0, 12)

  const duoCols: Column<(typeof duos)[number]>[] = [
    {
      key: 'duo',
      header: t('Duo', 'Дует'),
      render: (p) => (
        <div className="flex items-center gap-1">
          <PlayerTag name={p.players[0]} size="sm" bold={false} />
          <span className="text-ink-faint">&</span>
          <PlayerTag name={p.players[1]} size="sm" bold={false} />
        </div>
      ),
      sortValue: (p) => p.key,
    },
    { key: 'games', header: t('Games', 'Ігри'), align: 'center', render: (p) => p.games, sortValue: (p) => p.games },
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
      header: t('Leads', 'Веде'),
      render: (h) => <PlayerTag name={h.player} size="sm" bold={false} />,
      sortValue: (h) => h.player,
    },
    {
      key: 'rec',
      header: t('Record', 'Рахунок'),
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
      header: t('Over', 'Над'),
      render: (h) => <PlayerTag name={h.opponent} size="sm" bold={false} />,
      sortValue: (h) => h.opponent,
    },
    {
      key: 'mtg',
      header: t('Mtgs', 'Зустр.'),
      align: 'center',
      render: (h) => h.meetings,
      sortValue: (h) => h.meetings,
    },
    {
      key: 'margin',
      header: t('Margin', 'Різниця'),
      align: 'right',
      render: (h) => <span className="font-mono tabular">{signed(h.pointMargin)}</span>,
      sortValue: (h) => h.pointMargin,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <Chip tone="bg-mint">{t('EXPLORER', 'ОГЛЯД')}</Chip>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{t('Duos, Rivals & Glue', 'Дуети, суперники та Glue')}</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          {t(
            'Who plays best together, who owns whom, and who quietly makes everyone around them better.',
            'Хто найкраще грає разом, хто кого тримає, і хто тихо робить кращими всіх навколо.',
          )}
        </p>
      </section>

      {/* Sticky filter + jump nav */}
      <div className="sticker sticky top-2 z-20 flex flex-wrap items-center gap-2 p-3">
        <div className="flex items-center gap-2">
          <input
            list="explorer-players"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('🔎 filter by player…', '🔎 фільтр за гравцем…')}
            className="w-48 rounded-xl border-2 border-ink bg-paper-100 px-3 py-1.5 font-bold shadow-hard-sm outline-none"
          />
          <datalist id="explorer-players">
            {players.map((p) => <option key={p} value={p} />)}
          </datalist>
          {filter && (
            <button className="btn px-2 py-1 text-xs" onClick={() => setFilter('')}>{t('✕ clear', '✕ очистити')}</button>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn px-3 py-1 text-sm" onClick={() => jump(partRef)}>{t('🤝 Partnerships', '🤝 Пари')}</button>
          <button className="btn px-3 py-1 text-sm" onClick={() => jump(rivRef)}>{t('⚔️ Rivalries', '⚔️ Суперники')}</button>
          <button className="btn px-3 py-1 text-sm" onClick={() => jump(glueRef)}>🧲 Glue</button>
        </div>
      </div>

      {active && (
        <p className="px-1 text-sm text-ink-soft">
          {lang === 'en' ? (
            <>
              Showing <span className="font-bold text-ink">{active}</span>'s partnerships & rivalries.
            </>
          ) : (
            <>
              Показано пари та суперництва гравця <span className="font-bold text-ink">{active}</span>.
            </>
          )}
        </p>
      )}

      <section ref={partRef} className="scroll-mt-20">
        <SectionTitle emoji="🤝" title={t('Best Partnerships', 'Найкращі пари')} hint={t('Pairs who teamed up 2+ times — tap a header to sort', 'Пари, що грали разом 2+ рази — натисни заголовок для сортування')} />
        {duos.length ? (
          <SortableTable
            columns={duoCols}
            rows={duos}
            rowKey={(p) => p.key}
            initialSort={{ key: active ? 'games' : 'win', dir: 'desc' }}
          />
        ) : (
          <Empty emoji="🤝">{active ? t(`No repeat partnerships for ${active}.`, `У ${active} немає повторних пар.`) : t('No repeat partnerships yet.', 'Поки що немає повторних пар.')}</Empty>
        )}
      </section>

      <section ref={rivRef} className="scroll-mt-20">
        <SectionTitle emoji="⚔️" title={t('Rivalries', 'Суперництва')} hint={t('One-sided head-to-heads, 2+ meetings', 'Однобокі очні протистояння, 2+ зустрічі')} />
        {rivalryShown.length ? (
          <SortableTable
            columns={rivalCols}
            rows={rivalryShown}
            rowKey={(h) => `${h.player}>${h.opponent}`}
            initialSort={{ key: 'rec', dir: 'desc' }}
          />
        ) : (
          <Empty emoji="⚔️">{active ? t(`No decisive rivalries for ${active}.`, `У ${active} немає однозначних суперництв.`) : t('No decisive rivalries yet.', 'Поки що немає однозначних суперництв.')}</Empty>
        )}
      </section>

      <section ref={glueRef} className="scroll-mt-20">
        <SectionTitle
          emoji="🧲"
          title="The Glue"
          hint={active ? t(`${active}'s partner uplift`, `Приріст партнерів гравця ${active}`) : t("Players who lift their partners' win rate", 'Гравці, що піднімають вінрейт своїх партнерів')}
        />
        {glueShown.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {glueShown.map((g, i) => (
              <div key={g.player} className="sticker flex items-center gap-3 p-4">
                <span className="font-display text-2xl font-extrabold text-ink-faint">{i + 1}</span>
                <PlayerTag name={g.player} size="md" />
                <div className="ml-auto text-right">
                  <div className="font-mono text-xl font-bold tabular text-mint">
                    {signed(Math.round(g.uplift * 100))}%
                  </div>
                  <div className="text-[11px] text-ink-soft">{g.partners} {t('partners', 'партнерів')}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty emoji="🧲">
            {t(
              '“The Glue” needs a few more shared games — a few more tournaments to mean something.',
              'Поки що замало спільних ігор — «The Glue» потребує ще кількох турнірів, щоб щось означати.',
            )}
          </Empty>
        )}
      </section>

      <Stat
        label={t("How it's measured", 'Як це рахується')}
        value={t('Partner uplift', 'Приріст партнерів')}
        sub={t(
          'For each player we compare how their partners do WITH them vs their usual win rate, weighted by games together.',
          'Для кожного гравця ми порівнюємо, як грають його партнери З НИМ і їхній звичний вінрейт, зважено за кількістю спільних ігор.',
        )}
        tone="bg-grape-soft"
      />
    </div>
  )
}
