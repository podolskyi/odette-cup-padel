import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Tournament } from '../types'
import { useAppStore } from '../store/useAppStore'
import { fetchAmericanoHtml, saveCommunityTournament, saveCommunityAliases } from '../lib/supabase'
import { parseAmericanoPadelHtml, americanoIdFromUrl, type HtmlParseResult } from '../parser/americanoPadelHtml'
import { seriesNameFromTitle } from '../parser/americanoPadel'
import { isUnlocked, tryUnlock } from '../lib/settingsGate'
import { allPlayers } from '../identity/aliases'
import { computeStandings } from '../stats'
import { levenshtein } from '../lib/similar'
import { PodiumBlock } from '../components/PodiumBlock'
import { Avatar } from '../components/ui/Avatar'
import { Chip, SectionTitle } from '../components/ui/Bits'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'

const EXAMPLE = 'https://americano-padel.com/r/881cef1d-f00f-4618-a8c2-dfdfbaec3497'

/** Best canonical match for a parsed name (case-only or close + shared prefix). */
function suggestCanonical(name: string, canon: string[]): string | undefined {
  const nl = name.toLowerCase()
  let best: { c: string; d: number } | undefined
  for (const c of canon) {
    const cl = c.toLowerCase()
    if (cl === nl && c !== name) return c // case-only variant — strong match
    const d = levenshtein(nl, cl)
    const prefix = (() => {
      let i = 0
      while (i < nl.length && i < cl.length && nl[i] === cl[i]) i++
      return i
    })()
    if (d <= 2 && prefix >= 3 && (!best || d < best.d)) best = { c, d }
  }
  return best?.c
}

export function AddTournament() {
  const { t } = useT()
  const navigate = useNavigate()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const upsertTournament = useAppStore((s) => s.upsertTournament)
  const setAlias = useAppStore((s) => s.setAlias)
  const markLocalOnly = useAppStore((s) => s.markLocalOnly)
  const unmarkLocalOnly = useAppStore((s) => s.unmarkLocalOnly)

  const [unlocked, setUnlocked] = useState(isUnlocked())

  // --- step state ---
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<(HtmlParseResult & { id: string }) | null>(null)
  const [date, setDate] = useState('')
  const [nickname, setNickname] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testMode, setTestMode] = useState(false)

  const parsedNames = useMemo(
    () => (draft ? [...new Set(draft.matches.flatMap((m) => [...m.teamA, ...m.teamB]))].sort((a, b) => a.localeCompare(b)) : []),
    [draft],
  )

  // Aliases implied by the current name mapping (only the ones that changed).
  const draftAliases = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [from, to] of Object.entries(mapping)) if (to && to !== from) out[from] = to
    return out
  }, [mapping])

  // Live preview tournament + standings (names resolved through the chosen aliases).
  const preview = useMemo<Tournament | null>(() => {
    if (!draft) return null
    return {
      id: draft.id,
      name: seriesNameFromTitle(draft.title) || 'Odette Cup',
      nickname: nickname.trim() || undefined,
      date,
      format: 'Americano',
      pointsPerMatch: draft.matches[0].scoreA + draft.matches[0].scoreB,
      matches: draft.matches,
    }
  }, [draft, nickname, date])

  const standings = useMemo(
    () => (preview ? computeStandings(preview, { ...aliases, ...draftAliases }) : []),
    [preview, aliases, draftAliases],
  )
  const alreadyExists = draft ? tournaments.some((t) => t.id === draft.id) : false
  // Same event already in the app under a different id (e.g. it shipped with the
  // baked-in history) — saving would double-count every match in the stats.
  const sameDateExists = draft ? tournaments.some((t) => t.id !== draft.id && t.date === date) : false
  const canon = allPlayers(tournaments, aliases)

  async function fetchTournament() {
    const id = americanoIdFromUrl(url)
    if (!id) {
      setError(t('That doesn’t look like an americano-padel.com/r/… link.', 'Це не схоже на посилання americano-padel.com/r/…'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const html = await fetchAmericanoHtml(url.trim())
      const res = parseAmericanoPadelHtml(html)
      if (!res.matches.length) throw new Error(t('No matches found on that page.', 'На цій сторінці не знайдено матчів.'))
      setDraft({ ...res, id })
      setDate(res.dateHint ?? '')
      const init: Record<string, string> = {}
      for (const n of new Set(res.matches.flatMap((m) => [...m.teamA, ...m.teamB]))) init[n] = n
      setMapping(init)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!preview) return
    if (!date) {
      setError(t('Please set the date.', 'Будь ласка, вкажіть дату.'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      upsertTournament(preview)
      for (const [from, to] of Object.entries(draftAliases)) setAlias(from, to)
      if (testMode) {
        // Draft: nothing leaves this browser. Publish/delete from the tournament page.
        markLocalOnly(preview.id)
        navigate(`/t/${preview.id}`)
        return
      }
      await saveCommunityTournament(preview)
      if (Object.keys(draftAliases).length) {
        await saveCommunityAliases({ ...aliases, ...draftAliases })
      }
      unmarkLocalOnly(preview.id)
      navigate(`/t/${preview.id}`)
    } catch (e) {
      setError(
        t('Saved on this device, but syncing to everyone failed: ', 'Збережено на цьому пристрої, але синхронізація не вдалася: ') +
          (e instanceof Error ? e.message : String(e)),
      )
    } finally {
      setSaving(false)
    }
  }

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="space-y-6">
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <Chip tone="bg-sun">{t('ADD TOURNAMENT', 'ДОДАТИ ТУРНІР')}</Chip>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{t('Import from americano-padel', 'Імпорт з americano-padel')}</h1>
        <p className="mt-2 max-w-lg text-ink-soft">
          {t(
            'Paste the link to a finished round and we’ll pull in every match automatically.',
            'Встав посилання на завершений раунд — ми автоматично підтягнемо всі матчі.',
          )}
        </p>
      </section>

      {/* Step: link input */}
      {!draft && (
        <section className="sticker p-5 sm:p-6">
          <label className="text-sm font-bold">{t('Tournament link', 'Посилання на турнір')}</label>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && fetchTournament()}
            inputMode="url"
            autoFocus
            placeholder={EXAMPLE}
            className="mt-2 w-full rounded-xl border-2 border-ink bg-paper-100 px-3 py-2.5 font-mono text-sm shadow-hard-sm outline-none"
          />
          <p className="mt-2 text-xs text-ink-faint">
            {t('Example:', 'Приклад:')} <span className="font-mono">{EXAMPLE}</span>
          </p>
          {error && <p className="mt-3 text-sm font-bold text-punch">⚠️ {error}</p>}
          <button className="btn-dark mt-4 w-full sm:w-auto" disabled={loading || !url.trim()} onClick={fetchTournament}>
            {loading ? t('Fetching…', 'Завантаження…') : t('Fetch tournament', 'Завантажити турнір')}
          </button>
        </section>
      )}

      {/* Step: review */}
      {draft && preview && (
        <>
          <section className="sticker p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t('Detected', 'Розпізнано')}</div>
                <h2 className="text-2xl font-extrabold">{draft.title || preview.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {draft.matches.length} {t('matches', 'матчів')} · {parsedNames.length} {t('players', 'гравців')} ·{' '}
                  {t('to', 'до')} {preview.pointsPerMatch} pts
                </p>
              </div>
              <button className="btn px-3 py-1 text-xs" onClick={() => { setDraft(null); setError(null) }}>
                {t('Change link', 'Змінити')}
              </button>
            </div>

            {alreadyExists && (
              <div className="mt-3 rounded-xl border-2 border-ink bg-sun-soft p-3 text-sm font-bold">
                {t('This tournament is already in the app — saving will overwrite it.', 'Цей турнір уже є в застосунку — збереження перезапише його.')}
              </div>
            )}
            {sameDateExists && (
              <div className="mt-3 rounded-xl border-2 border-ink bg-punch-soft p-3 text-sm font-bold">
                {t(
                  '⚠️ A tournament with this date is already in the app. Saving would add a DUPLICATE and double-count every match in the stats.',
                  '⚠️ Турнір із цією датою вже є в застосунку. Збереження додасть ДУБЛІКАТ і подвоїть кожен матч у статистиці.',
                )}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                {t('Date', 'Дата')}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cx('mt-1 block w-full rounded-xl border-2 px-3 py-2 font-mono text-sm shadow-hard-sm outline-none', date ? 'border-ink bg-paper-100' : 'border-punch bg-punch-soft')}
                />
              </label>
              <label className="text-sm font-bold">
                {t('Nickname (optional)', 'Прізвисько (необов’язково)')}
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('e.g. Sunset Smash', 'напр. Sunset Smash')}
                  className="mt-1 block w-full rounded-xl border-2 border-ink bg-paper-100 px-3 py-2 text-sm shadow-hard-sm outline-none"
                />
              </label>
            </div>
          </section>

          {/* Podium preview */}
          {standings.length >= 3 && (
            <section className="sticker bg-gradient-to-b from-paper-100 to-paper-200 px-4 py-6">
              <PodiumBlock standings={standings} />
            </section>
          )}

          {/* Name reconciliation */}
          <section>
            <SectionTitle
              emoji="🧩"
              title={t('Match the names', 'Звірте імена')}
              hint={t('Map any spelling variants onto the player we already know.', 'Зіставте варіанти написання з гравцем, якого ми вже знаємо.')}
            />
            <div className="sticker divide-y divide-ink/10">
              {parsedNames.map((name) => {
                const known = canon.includes(name)
                const suggestion = !known ? suggestCanonical(name, canon) : undefined
                const chosen = mapping[name] ?? name
                const isMapped = chosen !== name
                return (
                  <div key={name} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <Avatar name={chosen} size="sm" />
                    <span className={cx('font-bold', isMapped && 'text-ink-faint line-through')}>{name}</span>
                    {known ? (
                      <span className="chip bg-mint-soft text-xs">✓ {t('known', 'відомий')}</span>
                    ) : isMapped ? (
                      <span className="text-sm text-ink-soft">→ <b className="text-ink">{chosen}</b></span>
                    ) : (
                      <span className="chip bg-sky-soft text-xs">{t('new player', 'новий гравець')}</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {suggestion && chosen !== suggestion && (
                        <button
                          className="btn px-2 py-1 text-xs"
                          onClick={() => setMapping((m) => ({ ...m, [name]: suggestion }))}
                          title={t(`Same as ${suggestion}?`, `Те саме, що ${suggestion}?`)}
                        >
                          ↪ {suggestion}?
                        </button>
                      )}
                      <select
                        value={chosen}
                        onChange={(e) => setMapping((m) => ({ ...m, [name]: e.target.value }))}
                        className="max-w-[9rem] rounded-lg border-2 border-ink bg-paper-100 px-2 py-1 text-xs font-bold shadow-hard-sm outline-none"
                      >
                        <option value={name}>{t('— keep as new —', '— новий —')}</option>
                        {canon.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {error && <p className="px-1 text-sm font-bold text-punch">⚠️ {error}</p>}

          <label className="sticker flex cursor-pointer items-center gap-3 bg-sky-soft p-3 text-sm">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="h-5 w-5 accent-ink"
            />
            <span>
              <b>🧪 {t('Test run — this device only.', 'Тестовий запуск — лише цей пристрій.')}</b>{' '}
              {t(
                'Nothing is shared; you can publish or delete it from the tournament page afterwards.',
                'Нічого не публікується; потім зможеш опублікувати або видалити зі сторінки турніру.',
              )}
            </span>
          </label>

          <div className="sticky bottom-2 z-10">
            <button
              className={cx('w-full py-3 text-base', testMode ? 'btn' : 'btn-dark')}
              disabled={saving || !date}
              onClick={save}
            >
              {saving
                ? t('Saving…', 'Збереження…')
                : testMode
                  ? t('🧪 Save as test (this device only)', '🧪 Зберегти як тест (лише цей пристрій)')
                  : t('Save tournament', 'Зберегти турнір')}
            </button>
          </div>
        </>
      )}

      <Link to="/" className="inline-block text-sm font-bold text-ink-soft underline">
        {t('← Cancel', '← Скасувати')}
      </Link>
    </div>
  )
}

// --- Secret-word gate (same client-side check as Settings) ------------------

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT()
  const [word, setWord] = useState('')
  const [error, setError] = useState(false)
  const submit = () => (tryUnlock(word) ? onUnlock() : (setError(true), setWord('')))
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="sticker-lg bg-paper-100 p-8 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-3 text-2xl font-extrabold">{t('Add a tournament', 'Додати турнір')}</h1>
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
          onChange={(e) => { setWord(e.target.value); setError(false) }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('secret word', 'секретне слово')}
          className={cx('mt-5 w-full rounded-xl border-2 bg-paper-100 px-4 py-2.5 text-center font-bold shadow-hard-sm outline-none', error ? 'border-punch' : 'border-ink')}
        />
        {error && <p className="mt-2 text-sm font-bold text-punch">{t('Nope — try again 🎾', 'Не те — спробуйте ще 🎾')}</p>}
        <button className="btn-dark mt-4 w-full" onClick={submit}>{t('Unlock', 'Розблокувати')}</button>
        <Link to="/" className="mt-3 block text-sm font-bold text-ink-soft underline">{t('← Back', '← Назад')}</Link>
      </div>
    </div>
  )
}
