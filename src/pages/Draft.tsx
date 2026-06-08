import { useEffect, useMemo, useRef, useState } from 'react'
import { draftTournaments, draftNames, type DraftEntry } from '../draft/draftData'
import { useDraftStore } from '../draft/draftStore'
import { supabaseConfigured, loadReview, saveReview } from '../lib/supabase'
import { seedDataset } from '../store/useAppStore'
import { computeStandings } from '../stats'
import { allPlayers, resolveName } from '../identity/aliases'
import { suggestDuplicates } from '../lib/similar'
import { isUnlocked, tryUnlock } from '../lib/settingsGate'
import { StandingsTable } from '../components/StandingsTable'
import { Avatar } from '../components/ui/Avatar'
import { SectionTitle, Chip, Stat } from '../components/ui/Bits'
import { downloadText } from '../lib/download'
import { cx } from '../lib/cx'

// name -> Cyrillic originals + tournaments it appears in (from the draft import).
const NAME_INFO = new Map(draftNames.map((n) => [n.name, n]))

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

      <CloudBar />
      {tab === 'tournaments' ? <TournamentsTab /> : <NamesTab />}
    </div>
  )
}

// --- Cloud sync (Supabase) -------------------------------------------------

function CloudBar() {
  const aliases = useDraftStore((s) => s.aliases)
  const dates = useDraftStore((s) => s.dates)
  const loadStore = useDraftStore((s) => s.load)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const [last, setLast] = useState<string | undefined>()

  // On open, pull the latest shared review so everyone sees the same state.
  useEffect(() => {
    if (!supabaseConfigured) return
    let alive = true
    setStatus('loading')
    loadReview()
      .then((r) => {
        if (!alive) return
        if (r) { loadStore({ aliases: r.aliases, dates: r.dates }); setLast(r.updated_at) }
        setStatus('idle')
      })
      .catch(() => alive && setStatus('error'))
    return () => { alive = false }
  }, [loadStore])

  if (!supabaseConfigured) {
    return (
      <div className="sticker bg-sun-soft px-4 py-2 text-sm text-ink-soft">
        ☁️ Cloud sync not configured yet — your work auto-saves on this device and you can Export the file.
      </div>
    )
  }

  const save = async () => {
    setStatus('saving')
    try {
      const t = await saveReview(aliases, dates)
      setLast(t)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const when = last ? new Date(last).toLocaleString() : 'never'
  return (
    <div className="sticker flex flex-wrap items-center justify-between gap-2 bg-mint-soft px-4 py-2 text-sm">
      <span>
        ☁️ Shared review ·{' '}
        {status === 'loading' ? 'loading…' : status === 'saving' ? 'saving…' : status === 'error' ? '⚠️ connection issue' : `last saved ${when}`}
      </span>
      <button className="btn-dark px-3 py-1" onClick={save} disabled={status === 'saving'}>
        💾 Save to cloud
      </button>
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

            {(() => {
              // Drop the "no date" warning once a date has been entered.
              const warns = t._review.warnings.filter((w) => w !== 'ok' && !(date && /no date/i.test(w)))
              return warns.length ? (
                <div className="border-t-2 border-ink/10 bg-sun-soft px-3 py-1.5 text-xs font-bold text-ink-soft">
                  ⚠️ {warns.join(' · ')}
                </div>
              ) : null
            })()}

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
  const dates = useDraftStore((s) => s.dates)
  const setAlias = useDraftStore((s) => s.setAlias)
  const removeAlias = useDraftStore((s) => s.removeAlias)
  const clearAliases = useDraftStore((s) => s.clearAliases)
  const load = useDraftStore((s) => s.load)
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const eff = useMemo(() => ({ ...seed.aliases, ...aliases }), [aliases])

  const { rawNames, counts } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of allTournaments)
      for (const m of t.matches)
        for (const p of [...m.teamA, ...m.teamB]) counts.set(p, (counts.get(p) ?? 0) + 1)
    return { rawNames: allPlayers(allTournaments, {}), counts }
  }, [])

  const canonicalCount = useMemo(() => allPlayers(allTournaments, eff).length, [eff])
  const canonicals = useMemo(() => [...new Set(rawNames.map((n) => resolveName(n, eff)))].sort((a, b) => a.localeCompare(b)), [rawNames, eff])
  const suggestions = useMemo(
    () => suggestDuplicates(rawNames).filter((s) => resolveName(s.a, eff) !== resolveName(s.b, eff)).slice(0, 40),
    [rawNames, eff],
  )

  const link = (from: string, to: string) => {
    if (!from || !to || from === to) return
    if (resolveName(to, eff) === from) return // avoid cycle
    setAlias(from, to)
  }
  const dir = (a: string, b: string): [string, string] => {
    const ca = counts.get(a) ?? 0, cb = counts.get(b) ?? 0
    return ca >= cb ? [b, a] : [a, b]
  }
  const cyrillicFor = (n: string) => NAME_INFO.get(n)?.originals ?? []
  const toursFor = (n: string): string[] => {
    const set = new Set<string>()
    for (const t of NAME_INFO.get(n)?.tournaments ?? []) set.add(t.label)
    for (const t of seedTournaments)
      if (t.matches.some((m) => [...m.teamA, ...m.teamB].includes(n))) set.add(t.nickname || t.name)
    return [...set]
  }

  // --- save / load (file hand-off) ---
  const exportJson = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), aliases, dates }
    downloadText(`odette-merges-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2))
  }
  const exportCsv = () => {
    const rows = [['name', 'canonical', 'cyrillic', 'games', 'tournaments']]
    for (const n of rawNames)
      rows.push([n, resolveName(n, eff), cyrillicFor(n).join('/'), String(counts.get(n) ?? 0), toursFor(n).join(' | ')])
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadText(`odette-names-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv')
  }
  const importFile = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result))
        load({ aliases: d.aliases, dates: d.dates })
      } catch {
        alert('Could not read that file — expected the exported JSON.')
      }
    }
    reader.readAsText(file)
  }

  const filtered = rawNames.filter(
    (n) => n.toLowerCase().includes(q.toLowerCase()) || cyrillicFor(n).some((o) => o.includes(q)),
  )
  const aliasEntries = Object.entries(aliases)

  return (
    <div className="space-y-6">
      {/* Toolbar: stats + save/export/import */}
      <div className="sticker flex flex-wrap items-center gap-3 p-3">
        <div className="flex gap-4 px-1">
          <span className="text-sm"><b className="font-mono text-lg">{rawNames.length}</b> names</span>
          <span className="text-sm"><b className="font-mono text-lg text-mint">{canonicalCount}</b> players</span>
          <span className="text-sm"><b className="font-mono text-lg">{aliasEntries.length}</b> merges</span>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-dark" onClick={exportJson}>💾 Export (send to me)</button>
          <button className="btn" onClick={exportCsv}>CSV</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⤒ Import</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
          {aliasEntries.length > 0 && <button className="btn" onClick={() => confirm('Clear all your merges?') && clearAliases()}>Reset</button>}
        </div>
      </div>
      <p className="-mt-3 px-1 text-xs text-ink-soft">
        Your work saves automatically as you go. When you're done, hit <b>Export</b> and send me the
        file (or we'll sync it via the cloud).
      </p>

      <datalist id="canon-names">{canonicals.map((c) => <option key={c} value={c} />)}</datalist>

      {/* Main: full name list with Cyrillic + tournaments */}
      <section>
        <SectionTitle emoji="📇" title="Players" hint="Tap a name to see their tournaments & merge" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search (Latin or Cyrillic)…"
          className="mb-3 w-full rounded-xl border-2 border-ink bg-paper-100 px-3 py-2 font-bold shadow-hard-sm outline-none sm:max-w-xs"
        />
        <div className="sticker divide-y divide-ink/10">
          {filtered.map((n) => {
            const canon = resolveName(n, eff)
            const merged = canon !== n
            const cyr = cyrillicFor(n)
            const isOpen = expanded === n
            return (
              <div key={n}>
                <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <button className="flex flex-1 items-center gap-2 text-left" onClick={() => setExpanded(isOpen ? null : n)}>
                    <Avatar name={canon} size="sm" />
                    <span className={cx('font-bold', merged && 'text-ink-faint line-through')}>{n}</span>
                    {cyr.length > 0 && <span className="text-ink-soft">({cyr.join(' / ')})</span>}
                    {merged && <span className="text-ink-soft">→ <b className="text-ink">{canon}</b></span>}
                  </button>
                  <span className="font-mono text-xs text-ink-faint">{counts.get(n)}g</span>
                  {merged ? (
                    <button className="btn px-2 py-0.5 text-xs" onClick={() => removeAlias(n)}>↩ unmerge</button>
                  ) : (
                    <MergeInput name={n} onMerge={(to) => link(n, to)} />
                  )}
                </div>
                {isOpen && (
                  <div className="bg-paper-300/30 px-3 py-2 text-xs text-ink-soft">
                    <span className="font-bold">Played in:</span> {toursFor(n).join(' · ') || '—'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Your merges */}
      {aliasEntries.length > 0 && (
        <section>
          <SectionTitle emoji="🧷" title="Your merges" />
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

      {/* Suggestions — de-emphasized, opt-in */}
      <details className="sticker p-3">
        <summary className="cursor-pointer text-sm font-bold">
          💡 Suggested merges ({suggestions.length}) — rough hints, double-check before applying
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {suggestions.map((s) => {
            const [loser, winner] = dir(s.a, s.b)
            return (
              <div key={`${s.a}|${s.b}`} className="flex items-center justify-between gap-2 rounded-lg border border-ink/15 p-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <b>{s.a}</b><span className="text-ink-faint">↔</span><b>{s.b}</b>
                  <span className="ml-1 text-ink-faint">·{counts.get(s.a)}/{counts.get(s.b)}</span>
                </span>
                <button className="btn shrink-0 px-2 py-0.5 text-xs" onClick={() => link(loser, winner)}>→ {winner}</button>
              </div>
            )
          })}
        </div>
      </details>
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
