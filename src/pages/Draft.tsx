import { useMemo, useState } from 'react'
import { draftTournaments, type DraftEntry } from '../draft/draftData'
import { useDraftStore } from '../draft/draftStore'
import { seedDataset } from '../store/useAppStore'
import { computeStandings } from '../stats'
import { allPlayers, resolveName } from '../identity/aliases'
import { suggestDuplicates } from '../lib/similar'
import { isUnlocked, tryUnlock } from '../lib/settingsGate'
import { StandingsTable } from '../components/StandingsTable'
import { Avatar } from '../components/ui/Avatar'
import { SectionTitle, Chip, Stat, Empty } from '../components/ui/Bits'
import { cx } from '../lib/cx'

const seed = seedDataset()
const seedTournaments = seed.tournaments

export function Draft() {
  const [unlocked, setUnlocked] = useState(isUnlocked())
  const [word, setWord] = useState('')
  const [err, setErr] = useState(false)
  const [tab, setTab] = useState<'tournaments' | 'names'>('tournaments')

  if (!unlocked) {
    const submit = () => (tryUnlock(word) ? setUnlocked(true) : (setErr(true), setWord('')))
    return (
      <div className="mx-auto mt-10 max-w-sm">
        <div className="sticker-lg bg-paper-100 p-8 text-center">
          <div className="text-5xl">🗂️</div>
          <h1 className="mt-3 text-2xl font-extrabold">Import workspace</h1>
          <p className="mt-1 text-sm text-ink-soft">Enter the secret word.</p>
          <input
            type="text"
            value={word}
            autoFocus
            data-1p-ignore
            onChange={(e) => { setWord(e.target.value); setErr(false) }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="secret word"
            className={cx('mt-5 w-full rounded-xl border-2 bg-paper-100 px-4 py-2.5 text-center font-bold shadow-hard-sm outline-none', err ? 'border-punch' : 'border-ink')}
          />
          {err && <p className="mt-2 text-sm font-bold text-punch">Nope 🎾</p>}
          <button className="btn-dark mt-4 w-full" onClick={submit}>Unlock</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <Chip tone="bg-tang text-paper-100">DRAFT · IMPORT REVIEW</Chip>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Imported tournaments</h1>
        <p className="mt-1 max-w-lg text-ink-soft">
          {draftTournaments.length} events parsed from brackets, americano-padel, padelpuffin &
          padelution. Review the data and merge name variants — nothing here touches the live app
          until you export &amp; promote.
        </p>
        <div className="mt-4 flex overflow-hidden rounded-xl border-2 border-ink shadow-hard-sm w-fit">
          {(['tournaments', 'names'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx('px-4 py-1.5 text-sm font-bold capitalize', t !== 'tournaments' && 'border-l-2 border-ink', tab === t ? 'bg-ink text-paper-100' : 'bg-paper-100')}
            >
              {t === 'tournaments' ? '🏆 Tournaments' : '🔗 Names'}
            </button>
          ))}
        </div>
      </section>

      {tab === 'tournaments' ? <TournamentsTab /> : <NamesTab />}
    </div>
  )
}

// --- Tournaments review ----------------------------------------------------

function TournamentsTab() {
  const aliases = useDraftStore((s) => s.aliases)
  const dates = useDraftStore((s) => s.dates)
  const setDate = useDraftStore((s) => s.setDate)
  const eff = useMemo(() => ({ ...seed.aliases, ...aliases }), [aliases])
  const [open, setOpen] = useState<string | null>(null)

  const ordered = [...draftTournaments].sort((a, b) =>
    ((dates[b.id] || b.date) || '0').localeCompare((dates[a.id] || a.date) || '0'),
  )
  const undated = draftTournaments.filter((t) => !(dates[t.id] || t.date)).length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tournaments" value={draftTournaments.length} tone="bg-sky-soft" />
        <Stat label="Need a date" value={undated} tone={undated ? 'bg-punch-soft' : 'bg-mint-soft'} />
        <Stat label="Matches" value={draftTournaments.reduce((n, t) => n + t.matches.length, 0)} tone="bg-sun-soft" />
        <Stat label="Draft merges" value={Object.keys(aliases).length} tone="bg-grape-soft" />
      </div>

      {ordered.map((t) => {
        const date = dates[t.id] || t.date
        const isOpen = open === t.id
        return (
          <div key={t.id} className="sticker overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-3">
              <button onClick={() => setOpen(isOpen ? null : t.id)} className="flex-1 text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  {t._source.service} · {t.format} · to {t.pointsPerMatch}
                </div>
                <div className="text-lg font-extrabold">
                  🎉 {t.nickname || t.name}
                  <span className="ml-2 font-mono text-sm font-normal text-ink-soft">
                    {t._review.players}p · {t._review.matches}m
                  </span>
                </div>
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(t.id, e.target.value)}
                className={cx('rounded-lg border-2 px-2 py-1 font-mono text-sm', date ? 'border-ink bg-paper-100' : 'border-punch bg-punch-soft')}
              />
              <a href={t._source.url} target="_blank" rel="noreferrer" className="chip bg-paper-100 hover:bg-paper-300">
                source ↗
              </a>
              <button className={cx('btn px-3 py-1 text-xs', isOpen && 'btn-dark')} onClick={() => setOpen(isOpen ? null : t.id)}>
                {isOpen ? 'Hide' : 'Review'}
              </button>
            </div>

            {t._review.warnings.some((w) => w !== 'ok') && (
              <div className="border-t-2 border-ink/10 bg-sun-soft px-3 py-1.5 text-xs font-bold text-ink-soft">
                ⚠️ {t._review.warnings.join(' · ')}
              </div>
            )}

            {isOpen && <TournamentDetail entry={t} aliases={eff} />}
          </div>
        )
      })}
    </div>
  )
}

function TournamentDetail({ entry, aliases }: { entry: DraftEntry; aliases: Record<string, string> }) {
  const standings = useMemo(() => computeStandings(entry, aliases), [entry, aliases])
  const rounds = Math.max(...entry.matches.map((m) => m.round))
  return (
    <div className="grid gap-4 border-t-2 border-ink/10 p-3 lg:grid-cols-2">
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">Our standings</div>
        <StandingsTable standings={standings} />
      </div>
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">Match log</div>
        <div className="sticker max-h-[28rem] space-y-2 overflow-y-auto p-2">
          {Array.from({ length: rounds }, (_, r) => r + 1).map((rd) => (
            <div key={rd}>
              <div className="text-[11px] font-bold uppercase text-ink-faint">Round {rd}</div>
              {entry.matches.filter((m) => m.round === rd).map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-0.5 text-sm">
                  <span className="flex-1 truncate text-right">
                    {resolveName(m.teamA[0], aliases)} & {resolveName(m.teamA[1], aliases)}
                  </span>
                  <span className="shrink-0 rounded border border-ink bg-paper-200 px-1.5 font-mono text-xs font-bold tabular">
                    {m.scoreA}-{m.scoreB}
                  </span>
                  <span className="flex-1 truncate">
                    {resolveName(m.teamB[0], aliases)} & {resolveName(m.teamB[1], aliases)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Name merge ------------------------------------------------------------

const allTournaments = [...seedTournaments, ...draftTournaments]

function NamesTab() {
  const aliases = useDraftStore((s) => s.aliases)
  const setAlias = useDraftStore((s) => s.setAlias)
  const removeAlias = useDraftStore((s) => s.removeAlias)
  const clearAliases = useDraftStore((s) => s.clearAliases)
  const [q, setQ] = useState('')
  const [snippet, setSnippet] = useState<string | null>(null)

  const eff = useMemo(() => ({ ...seed.aliases, ...aliases }), [aliases])

  const { rawNames, counts } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of allTournaments)
      for (const m of t.matches)
        for (const p of [...m.teamA, ...m.teamB]) counts.set(p, (counts.get(p) ?? 0) + 1)
    return { rawNames: allPlayers(allTournaments, {}), counts }
  }, [])

  const canonicalCount = useMemo(() => allPlayers(allTournaments, eff).length, [eff])

  const suggestions = useMemo(
    () => suggestDuplicates(rawNames).filter((s) => resolveName(s.a, eff) !== resolveName(s.b, eff)).slice(0, 30),
    [rawNames, eff],
  )

  const canonicals = useMemo(
    () => [...new Set(rawNames.map((n) => resolveName(n, eff)))].sort((a, b) => a.localeCompare(b)),
    [rawNames, eff],
  )

  const link = (from: string, to: string) => {
    if (!from || !to || from === to) return
    if (resolveName(to, eff) === from) return // avoid cycle
    setAlias(from, to)
  }
  const dir = (a: string, b: string): [string, string] => {
    const ca = counts.get(a) ?? 0, cb = counts.get(b) ?? 0
    return ca >= cb ? [b, a] : [a, b] // merge rarer into more common
  }

  const exportAll = () => {
    const merged = { ...seed.aliases, ...aliases }
    const lines = Object.entries(merged).sort().map(([f, t]) => `  ${JSON.stringify(f)}: ${JSON.stringify(t)},`).join('\n')
    const code = `// src/data/aliases.ts\nexport const SEED_ALIASES: Record<string, string> = {\n${lines}\n}`
    setSnippet(code)
    try { navigator.clipboard?.writeText(code) } catch { /* fallback below */ }
  }

  const filtered = rawNames.filter((n) => n.toLowerCase().includes(q.toLowerCase()))
  const aliasEntries = Object.entries(aliases)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Distinct names" value={rawNames.length} tone="bg-sky-soft" />
        <Stat label="→ Players" value={canonicalCount} tone="bg-mint-soft" />
        <Stat label="Draft merges" value={aliasEntries.length} tone="bg-sun-soft" />
        <button className="btn-dark" onClick={exportAll}>⤓ Export merges</button>
      </div>

      {snippet && (
        <div className="rounded-2xl border-2 border-ink bg-grape-soft p-4">
          <div className="mb-2 text-sm font-bold">
            ✅ Copied. This is the full merged alias map — paste into{' '}
            <code className="rounded bg-paper-100 px-1">src/data/aliases.ts</code> when promoting.
          </div>
          <textarea readOnly value={snippet} onFocus={(e) => e.currentTarget.select()} className="h-40 w-full rounded-xl border-2 border-ink bg-paper-100 p-3 font-mono text-xs" />
        </div>
      )}

      <section>
        <SectionTitle emoji="💡" title="Suggested merges" hint="Look-alikes + transliteration matches — your call" />
        {suggestions.length === 0 ? (
          <Empty emoji="✅">No obvious look-alikes left.</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((s) => {
              const [loser, winner] = dir(s.a, s.b)
              return (
                <div key={`${s.a}|${s.b}`} className="sticker flex items-center justify-between gap-2 p-2.5 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Avatar name={s.a} size="sm" /> <b>{s.a}</b>
                    <span className="text-ink-faint">↔</span>
                    <Avatar name={s.b} size="sm" /> <b>{s.b}</b>
                    <span className="ml-1 text-ink-faint">·{counts.get(s.a)}/{counts.get(s.b)}</span>
                  </span>
                  <button className="btn-dark shrink-0 px-2.5 py-1 text-xs" onClick={() => link(loser, winner)}>→ {winner}</button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {aliasEntries.length > 0 && (
        <section>
          <SectionTitle emoji="🧷" title="Your merges" action={<button className="btn" onClick={clearAliases}>Reset all</button>} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {aliasEntries.map(([f, t]) => (
              <div key={f} className="sticker flex items-center justify-between gap-2 p-2 text-sm">
                <span><b className="line-through decoration-punch">{f}</b> → <b>{resolveName(t, eff)}</b></span>
                <button className="btn shrink-0 px-2 py-0.5 text-xs" onClick={() => removeAlias(f)}>↩</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle emoji="📇" title="All names" hint="Merge any name into a canonical one" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search names…"
          className="mb-3 w-full rounded-xl border-2 border-ink bg-paper-100 px-3 py-2 font-bold shadow-hard-sm outline-none sm:max-w-xs"
        />
        <datalist id="canon-names">
          {canonicals.map((c) => <option key={c} value={c} />)}
        </datalist>
        <div className="sticker divide-y divide-ink/10">
          {filtered.map((n) => {
            const canon = resolveName(n, eff)
            const merged = canon !== n
            return (
              <div key={n} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <Avatar name={canon} size="sm" />
                <span className={cx('font-bold', merged && 'text-ink-faint line-through')}>{n}</span>
                {merged && <span className="text-ink-soft">→ <b className="text-ink">{canon}</b></span>}
                <span className="ml-auto font-mono text-xs text-ink-faint">{counts.get(n)}g</span>
                {merged ? (
                  <button className="btn px-2 py-0.5 text-xs" onClick={() => removeAlias(n)}>↩</button>
                ) : (
                  <MergeInput name={n} onMerge={(to) => link(n, to)} />
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MergeInput({ name, onMerge }: { name: string; onMerge: (to: string) => void }) {
  const [v, setV] = useState('')
  return (
    <input
      list="canon-names"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && v.trim() && v.trim() !== name) { onMerge(v.trim()); setV('') }
      }}
      placeholder="merge into…"
      className="w-28 rounded-lg border-2 border-ink bg-paper-100 px-2 py-0.5 text-xs outline-none"
    />
  )
}
