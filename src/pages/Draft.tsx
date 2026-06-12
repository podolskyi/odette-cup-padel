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
          <h1 className="mt-3 text-2xl font-extrabold">Робоча область імпорту</h1>
          <p className="mt-1 text-sm text-ink-soft">Введіть секретне слово.</p>
          <input
            type="text"
            value={word}
            autoFocus
            data-1p-ignore
            onChange={(e) => { setWord(e.target.value); setErr(false) }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="секретне слово"
            className={cx('mt-5 w-full rounded-xl border-2 bg-paper-100 px-4 py-2.5 text-center font-bold shadow-hard-sm outline-none', err ? 'border-punch' : 'border-ink')}
          />
          {err && <p className="mt-2 text-sm font-bold text-punch">Не те 🎾</p>}
          <button className="btn-dark mt-4 w-full" onClick={submit}>Розблокувати</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <Chip tone="bg-tang text-paper-100">ЧЕРНЕТКА · ПЕРЕВІРКА ІМПОРТУ</Chip>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Імпортовані турніри</h1>
        <p className="mt-1 max-w-lg text-ink-soft">
          {draftTournaments.length} турнірів розібрано з brackets, americano-padel, padelpuffin та
          padelution. Перевірте дані й об’єднайте варіанти імен — нічого тут не торкається живого
          застосунку, доки ви не експортуєте й не опублікуєте.
        </p>
        <div className="mt-4 flex overflow-hidden rounded-xl border-2 border-ink shadow-hard-sm w-fit">
          {(['tournaments', 'names'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx('px-4 py-1.5 text-sm font-bold capitalize', t !== 'tournaments' && 'border-l-2 border-ink', tab === t ? 'bg-ink text-paper-100' : 'bg-paper-100')}
            >
              {t === 'tournaments' ? '🏆 Турніри' : '🔗 Імена'}
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
  const [status, setStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading')
  const [last, setLast] = useState<string | undefined>()
  const loadedRef = useRef(false)

  // On open, pull the latest shared review (the DB is the source of truth).
  useEffect(() => {
    if (!supabaseConfigured) { loadedRef.current = true; return }
    let alive = true
    loadReview()
      .then((r) => {
        if (!alive) return
        if (r) { loadStore({ aliases: r.aliases, dates: r.dates }); setLast(r.updated_at) }
        loadedRef.current = true
        setStatus('saved')
      })
      .catch(() => { if (alive) { loadedRef.current = true; setStatus('error') } })
    return () => { alive = false }
  }, [loadStore])

  // Auto-save every change (debounced) — no button to forget.
  useEffect(() => {
    if (!supabaseConfigured || !loadedRef.current) return
    setStatus('saving')
    const id = setTimeout(() => {
      saveReview(aliases, dates).then((t) => { setLast(t); setStatus('saved') }).catch(() => setStatus('error'))
    }, 700)
    return () => clearTimeout(id)
  }, [aliases, dates])

  if (!supabaseConfigured) {
    return (
      <div className="sticker bg-sun-soft px-4 py-2 text-sm text-ink-soft">
        ☁️ Хмару не налаштовано — робота зберігається лише на цьому пристрої.
      </div>
    )
  }

  const when = last ? new Date(last).toLocaleTimeString() : ''
  const label =
    status === 'loading' ? 'Завантаження збереженого…'
      : status === 'saving' ? 'Збереження…'
      : status === 'error' ? '⚠️ Проблема зі з’єднанням — робота в безпеці локально й синхронізується за наступної зміни'
      : `Усі зміни збережено автоматично${when ? ` · ${when}` : ''}`
  return (
    <div className={cx('sticker px-4 py-2 text-sm font-bold', status === 'error' ? 'bg-punch-soft' : 'bg-mint-soft')}>
      ☁️ {label}
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
  const [popup, setPopup] = useState<string | null>(null)

  const ordered = [...draftTournaments].sort((a, b) =>
    ((dates[b.id] || b.date) || '0').localeCompare((dates[a.id] || a.date) || '0'),
  )
  const undated = draftTournaments.filter((t) => !(dates[t.id] || t.date)).length

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Турніри" value={draftTournaments.length} tone="bg-sky-soft" />
        <Stat label="Без дати" value={undated} tone={undated ? 'bg-punch-soft' : 'bg-mint-soft'} />
        <Stat label="Матчі" value={draftTournaments.reduce((n, t) => n + t.matches.length, 0)} tone="bg-sun-soft" />
        <Stat label="Об’єднань у чернетці" value={Object.keys(aliases).length} tone="bg-grape-soft" />
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
                джерело ↗
              </a>
              <button className={cx('btn px-3 py-1 text-xs', isOpen && 'btn-dark')} onClick={() => setOpen(isOpen ? null : t.id)}>
                {isOpen ? 'Сховати' : 'Перевірити'}
              </button>
            </div>

            {(() => {
              // Empty (0-0) courts are normal (time ran out) — never warn about them.
              // Drop the "no date" warning too once a date has been entered.
              const warns = t._review.warnings.filter(
                (w) => w !== 'ok' && !/empty court/i.test(w) && !(date && /no date/i.test(w)),
              )
              return warns.length ? (
                <div className="border-t-2 border-ink/10 bg-sun-soft px-3 py-1.5 text-xs font-bold text-ink-soft">
                  ⚠️ {warns.join(' · ')}
                </div>
              ) : null
            })()}

            {isOpen && <TournamentDetail entry={t} aliases={eff} onPlayer={setPopup} />}
          </div>
        )
      })}
      {popup && <DraftPlayerModal player={popup} aliases={eff} onClose={() => setPopup(null)} />}
    </div>
  )
}

function TournamentDetail({
  entry,
  aliases,
  onPlayer,
}: {
  entry: DraftEntry
  aliases: Record<string, string>
  onPlayer: (name: string) => void
}) {
  const standings = useMemo(() => computeStandings(entry, aliases), [entry, aliases])
  const rounds = Math.max(...entry.matches.map((m) => m.round))
  const P = ({ raw }: { raw: string }) => {
    const n = resolveName(raw, aliases)
    return (
      <button onClick={() => onPlayer(n)} className="hover:underline decoration-2 underline-offset-2">
        {n}
      </button>
    )
  }
  return (
    <div className="grid gap-4 border-t-2 border-ink/10 p-3 lg:grid-cols-2">
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">Наша таблиця</div>
        <StandingsTable standings={standings} onPlayer={onPlayer} />
      </div>
      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">Журнал матчів</div>
        <div className="sticker max-h-[28rem] space-y-2 overflow-y-auto p-2">
          {Array.from({ length: rounds }, (_, r) => r + 1).map((rd) => (
            <div key={rd}>
              <div className="text-[11px] font-bold uppercase text-ink-faint">Раунд {rd}</div>
              {entry.matches.filter((m) => m.round === rd).map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-2 py-0.5 text-sm">
                  <span className="flex-1 truncate text-right">
                    <P raw={m.teamA[0]} /> & <P raw={m.teamA[1]} />
                  </span>
                  <span className="shrink-0 rounded border border-ink bg-paper-200 px-1.5 font-mono text-xs font-bold tabular">
                    {m.scoreA}-{m.scoreB}
                  </span>
                  <span className="flex-1 truncate">
                    <P raw={m.teamB[0]} /> & <P raw={m.teamB[1]} />
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

// Draft-scoped player popup — only the tournaments being imported (not the live app).
function DraftPlayerModal({
  player,
  aliases,
  onClose,
}: {
  player: string
  aliases: Record<string, string>
  onClose: () => void
}) {
  const rows = useMemo(() => {
    const out: { t: DraftEntry; rank: number; total: number; record: string; pts: number }[] = []
    for (const t of [...draftTournaments].sort((a, b) => (b.date || '0').localeCompare(a.date || '0'))) {
      const st = computeStandings(t, aliases)
      const r = st.find((s) => s.player === player)
      if (r) out.push({ t, rank: r.rank, total: st.length, record: `${r.wins}-${r.losses}-${r.ties}`, pts: r.points })
    }
    return out
  }, [player, aliases])
  const cyr = NAME_INFO.get(player)?.originals ?? []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="sticker-lg max-h-[85vh] w-full max-w-lg overflow-y-auto bg-paper-100 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={player} size="lg" />
            <div>
              <h3 className="text-2xl font-extrabold leading-none">{player}</h3>
              {cyr.length > 0 && <div className="mt-0.5 text-sm text-ink-soft">{cyr.join(' / ')}</div>}
              <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Профіль чернетки · {rows.length} турнір{rows.length === 1 ? '' : 'и'}
              </div>
            </div>
          </div>
          <button className="btn px-3 py-1" onClick={onClose}>✕</button>
        </div>

        <div className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <div className="text-sm text-ink-soft">Немає виступів в імпортованих турнірах.</div>
          ) : (
            rows.map(({ t, rank, total, record, pts }) => (
              <div key={t.id} className="sticker flex items-center justify-between gap-3 p-2.5">
                <div className="min-w-0">
                  <div className="truncate font-bold">🎉 {t.nickname || t.name}</div>
                  <div className="text-xs text-ink-soft">{t._source.service} · {t.date || 'без дати'}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-xs tabular text-ink-soft">{record}</div>
                    <div className="font-mono text-sm font-bold tabular">{pts} балів</div>
                  </div>
                  <div className="grid h-10 w-12 place-items-center rounded-xl border-2 border-ink bg-paper-200 font-mono text-sm font-bold tabular">
                    {rank}/{total}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Лише чернетка — турніри, що імпортуються, а не живий застосунок.
        </p>
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
  const [expanded, setExpanded] = useState<string | null>(null)

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

  const filtered = rawNames.filter(
    (n) => n.toLowerCase().includes(q.toLowerCase()) || cyrillicFor(n).some((o) => o.includes(q)),
  )
  const aliasEntries = Object.entries(aliases)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="sticker flex flex-wrap items-center gap-3 p-3">
        <div className="flex gap-4 px-1">
          <span className="text-sm"><b className="font-mono text-lg">{rawNames.length}</b> імен</span>
          <span className="text-sm"><b className="font-mono text-lg text-mint">{canonicalCount}</b> гравців</span>
          <span className="text-sm"><b className="font-mono text-lg">{aliasEntries.length}</b> об’єднань</span>
        </div>
        {aliasEntries.length > 0 && (
          <button className="btn ml-auto" onClick={() => confirm('Скинути всі ваші об’єднання?') && clearAliases()}>
            Скинути об’єднання
          </button>
        )}
      </div>

      <datalist id="canon-names">{canonicals.map((c) => <option key={c} value={c} />)}</datalist>

      {/* Main: full name list with Cyrillic + tournaments */}
      <section>
        <SectionTitle emoji="📇" title="Гравці" hint="Натисни ім’я, щоб побачити турніри та об’єднати" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="пошук (латиниця або кирилиця)…"
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
                    <button className="btn px-2 py-0.5 text-xs" onClick={() => removeAlias(n)}>↩ роз’єднати</button>
                  ) : (
                    <MergeInput name={n} onMerge={(to) => link(n, to)} />
                  )}
                </div>
                {isOpen && (
                  <div className="bg-paper-300/30 px-3 py-2 text-xs text-ink-soft">
                    <span className="font-bold">Грав у:</span> {toursFor(n).join(' · ') || '—'}
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
          <SectionTitle emoji="🧷" title="Ваші об’єднання" />
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
          💡 Запропоновані об’єднання ({suggestions.length}) — приблизні підказки, перевірте перед застосуванням
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
  const apply = () => {
    if (v.trim() && v.trim() !== name) { onMerge(v.trim()); setV('') }
  }
  return (
    <span className="flex items-center gap-1">
      <input
        list="canon-names"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && apply()}
        placeholder="об’єднати з…"
        className="w-28 rounded-lg border-2 border-ink bg-paper-100 px-2 py-0.5 text-xs outline-none"
      />
      <button
        onClick={apply}
        disabled={!v.trim() || v.trim() === name}
        className="btn px-2 py-0.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        Об’єднати
      </button>
    </span>
  )
}
