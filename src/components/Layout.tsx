import { useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { cx } from '../lib/cx'
import { useLang, useT } from '../lib/i18n'
import { useAppStore } from '../store/useAppStore'

/** EN ⇄ UK switch — flips the whole UI between languages. */
function LangToggle() {
  const lang = useLang((s) => s.lang)
  const toggle = useLang((s) => s.toggle)
  return (
    <button
      type="button"
      onClick={toggle}
      title={lang === 'uk' ? 'Switch to English' : 'Перемкнути на українську'}
      className="rounded-xl border-2 border-ink bg-paper-100 px-2.5 py-1.5 text-sm font-bold shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
    >
      {lang === 'uk' ? '🇬🇧 EN' : '🇺🇦 УК'}
    </button>
  )
}

/** Reset scroll to the top whenever the route changes (SPA navigations don't). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'rounded-xl border-2 border-ink px-3 py-1.5 text-sm font-bold transition-transform',
          isActive
            ? 'bg-ink text-paper-100 shadow-none'
            : 'bg-paper-100 shadow-hard-sm hover:-translate-y-0.5',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export function Layout() {
  const { t } = useT()
  const hydrateCommunity = useAppStore((s) => s.hydrateCommunity)
  // Pull in community-added tournaments + aliases once on load.
  useEffect(() => {
    void hydrateCommunity()
  }, [hydrateCommunity])
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-16 pt-4 sm:px-6">
      <ScrollToTop />
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border-2 border-ink bg-sun text-2xl shadow-hard-sm transition-transform group-hover:rotate-12">
            🎾
          </span>
          <div className="leading-none">
            <div className="font-display text-xl font-extrabold">Odette Cup</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              by Vova · Ubud Padel
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Tab to="/">{t('Home', 'Головна')}</Tab>
          <Tab to="/explore">{t('Explore', 'Огляд')}</Tab>
          <Tab to="/stats">{t('Stats', 'Статистика')}</Tab>
          <Tab to="/fun">{t('Fun', 'Фан')}</Tab>
          <LangToggle />
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 text-center text-xs text-ink-faint">
        {t(
          'Made for the group chat · stats derived live from every match 🎾',
          'Зроблено для нашого чату · статистика рахується наживо з кожного матчу 🎾',
        )}
      </footer>
    </div>
  )
}
