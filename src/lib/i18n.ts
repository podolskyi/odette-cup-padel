import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Dead-simple bilingual support: every UI string is written inline as
// `t('English', 'Українською')`. There's no key catalogue to keep in sync —
// both languages live right at the call site. Stat jargon (Pts, Elo, Win%…)
// and the playful award titles read the same in both, so they stay plain
// literals and never need wrapping.

export type Lang = 'uk' | 'en'

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
}

export const useLang = create<LangState>()(
  persist(
    (set) => ({
      lang: 'uk', // community default; the header toggle flips it
      setLang: (lang) => set({ lang }),
      toggle: () => set((s) => ({ lang: s.lang === 'uk' ? 'en' : 'uk' })),
    }),
    { name: 'odette-cup-padel:lang' },
  ),
)

// Module-level mirror so non-React code (the stats helpers in fun.ts /
// aggregate.ts, plus format.ts) can translate without threading `lang`
// through every function signature. Kept in sync with the store below.
let _lang: Lang = useLang.getState().lang
const syncHtmlLang = (lang: Lang) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lang
}
syncHtmlLang(_lang)
useLang.subscribe((s) => {
  _lang = s.lang
  syncHtmlLang(s.lang)
})

export const getLang = (): Lang => _lang

/** Pick the English or Ukrainian variant for the current language. */
export const t = (en: string, uk: string): string => (_lang === 'en' ? en : uk)

/**
 * Hook for components: subscribing to `lang` makes them re-render on a switch.
 * Returns the same module-level `t` plus the active `lang` (handy for useMemo
 * deps when the rendered text comes from a memoised stats computation).
 */
export function useT(): { t: typeof t; lang: Lang } {
  const lang = useLang((s) => s.lang)
  return { t, lang }
}
