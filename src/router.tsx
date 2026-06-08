import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TournamentDetail } from './pages/TournamentDetail'
import { PlayerProfile } from './pages/PlayerProfile'
import { Explorer } from './pages/Explorer'
import { Fun } from './pages/Fun'
import { Stats } from './pages/Stats'
import { Wrapped } from './pages/Wrapped'
import { Settings } from './pages/Settings'
import { Draft } from './pages/Draft'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/t/:id', element: <TournamentDetail /> },
      { path: '/p/:name', element: <PlayerProfile /> },
      { path: '/explore', element: <Explorer /> },
      { path: '/fun', element: <Fun /> },
      { path: '/stats', element: <Stats /> },
      // Hidden organizer settings (secret-word gated, not linked in nav).
      { path: '/settings', element: <Settings /> },
      // Hidden one-time import review + name-merge workspace.
      { path: '/draft', element: <Draft /> },
    ],
  },
  // Wrapped is full-screen (no app chrome) so it screenshots cleanly.
  { path: '/t/:id/wrapped', element: <Wrapped /> },
])
