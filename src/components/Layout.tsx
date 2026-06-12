import { useEffect } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { cx } from '../lib/cx'

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
          <Tab to="/">Головна</Tab>
          <Tab to="/explore">Огляд</Tab>
          <Tab to="/stats">Статистика</Tab>
          <Tab to="/fun">Фан</Tab>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-12 text-center text-xs text-ink-faint">
        Зроблено для нашого чату · статистика рахується наживо з кожного матчу 🎾
      </footer>
    </div>
  )
}
