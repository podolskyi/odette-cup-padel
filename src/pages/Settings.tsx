import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { allPlayers, resolveName } from '../identity/aliases'
import { suggestDuplicates } from '../lib/similar'
import { isUnlocked, tryUnlock, lockSettings } from '../lib/settingsGate'
import { SectionTitle, Chip, Empty, Stat } from '../components/ui/Bits'
import { Avatar } from '../components/ui/Avatar'
import { useT, t as tr } from '../lib/i18n'
import { cx } from '../lib/cx'

export function Settings() {
  const [unlocked, setUnlocked] = useState(isUnlocked())
  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />
  return <SettingsPanel onLock={() => { lockSettings(); setUnlocked(false) }} />
}

// --- Secret-word gate (client-side only, not real security) ----------------

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT()
  const [word, setWord] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (tryUnlock(word)) onUnlock()
    else {
      setError(true)
      setWord('')
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="sticker-lg bg-paper-100 p-8 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-2xl font-extrabold">{t('Organizer settings', 'Налаштування організатора')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('Enter the secret word to continue.', 'Введіть секретне слово, щоб продовжити.')}</p>
        <input
          type="text"
          value={word}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          onChange={(e) => {
            setWord(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('secret word', 'секретне слово')}
          className={cx(
            'mt-5 w-full rounded-xl border-2 bg-paper-100 px-4 py-2.5 text-center font-bold shadow-hard-sm outline-none',
            error ? 'border-punch' : 'border-ink',
          )}
        />
        {error && <p className="mt-2 text-sm font-bold text-punch">{t('Nope — try again 🎾', 'Не те — спробуйте ще 🎾')}</p>}
        <button className="btn-dark mt-4 w-full" onClick={submit}>
          {t('Unlock', 'Розблокувати')}
        </button>
      </div>
    </div>
  )
}

// --- The settings panel ----------------------------------------------------

function SettingsPanel({ onLock }: { onLock: () => void }) {
  const { t } = useT()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const setAlias = useAppStore((s) => s.setAlias)
  const removeAlias = useAppStore((s) => s.removeAlias)
  const clearAliases = useAppStore((s) => s.clearAliases)

  const [from, setFrom] = useState('')
  const [into, setInto] = useState('')
  const [snippet, setSnippet] = useState<string | null>(null)

  // Export the current links as a code snippet to paste into src/data/aliases.ts,
  // so manual merges ship with the next deploy (no backend in this version).
  const exportLinks = () => {
    const body = Object.entries(aliases)
      .map(([f, t]) => `  ${JSON.stringify(f)}: ${JSON.stringify(t)},`)
      .join('\n')
    const code = `// Paste into src/data/aliases.ts, then redeploy.\nexport const SEED_ALIASES: Record<string, string> = {\n${body}\n}\n`
    setSnippet(code)
    try {
      navigator.clipboard?.writeText(code)
    } catch {
      /* clipboard may be unavailable; the textarea below is the fallback */
    }
  }

  // Distinct raw names (before alias resolution) + how many games each played.
  const { rawNames, counts } = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tournaments)
      for (const m of t.matches)
        for (const p of [...m.teamA, ...m.teamB]) counts.set(p, (counts.get(p) ?? 0) + 1)
    return { rawNames: allPlayers(tournaments, {}), counts }
  }, [tournaments])

  const canonicalCount = useMemo(
    () => allPlayers(tournaments, aliases).length,
    [tournaments, aliases],
  )

  // Suggestions: look-alike pairs not already merged together.
  const suggestions = useMemo(
    () =>
      suggestDuplicates(rawNames).filter(
        (s) => resolveName(s.a, aliases) !== resolveName(s.b, aliases),
      ),
    [rawNames, aliases],
  )

  const aliasEntries = Object.entries(aliases)

  const link = (a: string, b: string) => {
    if (!a || !b || a === b) return
    // Block cycles: don't link A into something that already resolves to A.
    if (resolveName(b, aliases) === a) return
    setAlias(a, b)
  }

  // For a suggested pair, merge the less-played name into the more-played one.
  const suggestDirection = (a: string, b: string): [string, string] => {
    const ca = counts.get(a) ?? 0
    const cb = counts.get(b) ?? 0
    return ca >= cb ? [b, a] : [a, b] // [loser -> winner]
  }

  return (
    <div className="space-y-8">
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Chip tone="bg-grape text-paper-100">{t('⚙️ ORGANIZER', '⚙️ ОРГАНІЗАТОР')}</Chip>
            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{t('Settings', 'Налаштування')}</h1>
            <p className="mt-1 text-ink-soft">{t('Tidy up the data behind every stat.', 'Наведіть лад у даних за кожною статистикою.')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={exportLinks}>
              {t('⤓ Export for deploy', '⤓ Експорт для деплою')}
            </button>
            <button className="btn" onClick={onLock}>
              {t('🔒 Lock', '🔒 Заблокувати')}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label={t('Distinct names', 'Різних імен')} value={rawNames.length} tone="bg-sky-soft" />
          <Stat label={t('Unique players', 'Унікальних гравців')} value={canonicalCount} tone="bg-mint-soft" />
          <Stat label={t('Links', 'Зв’язки')} value={aliasEntries.length} tone="bg-sun-soft" />
        </div>
        {snippet && (
          <div className="mt-4 rounded-2xl border-2 border-ink bg-grape-soft p-4">
            <div className="mb-2 text-sm font-bold">
              {t('✅ Copied to clipboard. Paste into', '✅ Скопійовано в буфер. Вставте у')}{' '}
              <code className="rounded bg-paper-100 px-1">src/data/aliases.ts</code>{' '}
              {t('and redeploy so everyone gets these merges.', 'і передеплойте, щоб усі отримали ці об’єднання.')}
            </div>
            <textarea
              readOnly
              value={snippet}
              onFocus={(e) => e.currentTarget.select()}
              className="h-40 w-full rounded-xl border-2 border-ink bg-paper-100 p-3 font-mono text-xs"
            />
          </div>
        )}
      </section>

      {/* Alias linking */}
      <section>
        <SectionTitle
          emoji="🔗"
          title={t('Link synonym names', 'Зв’язати імена-синоніми')}
          hint={t('Merge the same person typed differently across tournaments (e.g. Oleksii = Oleksey)', 'Об’єднайте одну людину, записану по-різному в різних турнірах (напр. Oleksii = Oleksey)')}
        />

        {/* Suggestions */}
        <div className="mb-4">
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t('Suggested matches', 'Запропоновані збіги')}
          </div>
          {suggestions.length === 0 ? (
            <Empty emoji="✅">{t('No look-alike names left. Nice and tidy.', 'Схожих імен не лишилось. Чисто й охайно.')}</Empty>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.slice(0, 12).map((s) => {
                const [loser, winner] = suggestDirection(s.a, s.b)
                return (
                  <div
                    key={`${s.a}|${s.b}`}
                    className="sticker flex items-center justify-between gap-2 p-2.5"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Avatar name={s.a} size="sm" />
                      <span className="font-bold">{s.a}</span>
                      <span className="text-ink-faint">↔</span>
                      <Avatar name={s.b} size="sm" />
                      <span className="font-bold">{s.b}</span>
                    </div>
                    <button
                      className="btn-dark shrink-0 px-3 py-1 text-xs"
                      onClick={() => link(loser, winner)}
                      title={t(`Merge ${loser} into ${winner}`, `Об’єднати ${loser} у ${winner}`)}
                    >
                      {t('Link →', 'Зв’язати →')} {winner}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Manual merge */}
        <div className="sticker bg-paper-100 p-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t('Merge manually', 'Об’єднати вручну')}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NameSelect value={from} onChange={setFrom} names={rawNames} counts={counts} placeholder={t('this name…', 'це ім’я…')} />
            <span className="font-bold">{t('is', 'це')}</span>
            <NameSelect value={into} onChange={setInto} names={rawNames} counts={counts} placeholder={t('…the same as', '…те саме, що')} />
            <button
              className="btn-dark"
              disabled={!from || !into || from === into}
              onClick={() => {
                link(from, into)
                setFrom('')
                setInto('')
              }}
            >
              {t('🔗 Link', '🔗 Зв’язати')}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            {t('The first name becomes the second everywhere — standings, ratings, partners, the lot.', 'Перше ім’я скрізь стає другим — у таблиці, рейтингах, парах, усюди.')}
          </p>
        </div>
      </section>

      {/* Current links */}
      <section>
        <SectionTitle
          emoji="🧷"
          title={t('Current links', 'Поточні зв’язки')}
          action={
            aliasEntries.length > 0 ? (
              <button className="btn" onClick={clearAliases}>
                {t('Reset all', 'Скинути все')}
              </button>
            ) : undefined
          }
        />
        {aliasEntries.length === 0 ? (
          <Empty emoji="🪢">{t('No links yet — merged names will show up here.', 'Поки що немає зв’язків — об’єднані імена з’являться тут.')}</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {aliasEntries.map(([f, t]) => (
              <div key={f} className="sticker flex items-center justify-between gap-2 p-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-bold line-through decoration-punch decoration-2">{f}</span>
                  <span className="text-ink-faint">→</span>
                  <Avatar name={resolveName(t, aliases)} size="sm" />
                  <span className="font-bold">{resolveName(t, aliases)}</span>
                </div>
                <button className="btn shrink-0 px-3 py-1 text-xs" onClick={() => removeAlias(f)}>
                  {tr('Unlink', 'Роз’єднати')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function NameSelect({
  value,
  onChange,
  names,
  counts,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  names: string[]
  counts: Map<string, number>
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border-2 border-ink bg-paper-100 px-3 py-2 font-bold shadow-hard-sm outline-none"
    >
      <option value="">{placeholder}</option>
      {names.map((n) => (
        <option key={n} value={n}>
          {n} ({counts.get(n) ?? 0})
        </option>
      ))}
    </select>
  )
}
