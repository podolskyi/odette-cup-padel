import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { TournamentDetail } from './pages/TournamentDetail'
import { PlayerProfile } from './pages/PlayerProfile'
import { Explorer } from './pages/Explorer'
import { Wrapped } from './pages/Wrapped'
import { Settings } from './pages/Settings'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/t/:id', element: <TournamentDetail /> },
      { path: '/p/:name', element: <PlayerProfile /> },
      { path: '/explore', element: <Explorer /> },
      // Hidden organizer settings (secret-word gated, not linked in nav).
      { path: '/settings', element: <Settings /> },
    ],
  },
  // Wrapped is full-screen (no app chrome) so it screenshots cleanly.
  { path: '/t/:id/wrapped', element: <Wrapped /> },
])
