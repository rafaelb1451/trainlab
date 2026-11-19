import {
  Activity,
  CalendarDays,
  Dumbbell,
  Gauge,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  UserRound,
  Users,
  Watch,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { cn } from '../lib/cn'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getSectionLabel(pathname: string): string {
  if (pathname === '/') return 'Painel'
  if (pathname.startsWith('/activities')) return 'Análises'
  if (pathname.startsWith('/athletes')) return 'Atletas'
  if (pathname.startsWith('/workouts')) return 'Treinos'
  if (pathname.startsWith('/plan')) return 'Calendário'
  return 'TrainLab'
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const items: NavItem[] =
    user?.role === 'ATHLETE'
      ? [
          { to: '/', label: 'Painel', icon: Gauge, end: true },
          { to: '/plan', label: 'Calendário', icon: CalendarDays },
          { to: '/activities', label: 'Análises', icon: LineChart },
          { to: '/devices', label: 'Dispositivos', icon: Watch },
          ...(user.athleteId
            ? [{ to: `/athletes/${user.athleteId}`, label: 'Meu perfil', icon: UserRound }]
            : []),
        ]
      : [
          { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
          { to: '/plan', label: 'Calendário', icon: CalendarDays },
          { to: '/athletes', label: 'Atletas', icon: Users },
          { to: '/workouts', label: 'Treinos', icon: Dumbbell },
          { to: '/devices', label: 'Dispositivos', icon: Watch },
          { to: '/activities', label: 'Análises', icon: LineChart },
        ]

  function handleLogout() {
    onNavigate?.()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-400 text-ink-900 shadow-lg shadow-accent-500/25">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-white">TrainLab</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-300">
            Treinamento
          </p>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 space-y-1 px-3 py-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-white/10 text-accent-400'
                  : 'text-ink-300 hover:bg-white/5 hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn('h-[18px] w-[18px]', isActive ? 'text-accent-400' : 'text-ink-400 group-hover:text-white')}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {isActive ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-accent-400">
            {initials(user?.name ?? '')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Visitante'}</p>
            <p className="truncate text-[11px] text-ink-300">
              {user?.role === 'ATHLETE' ? 'Atleta' : 'Treinador'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-ink-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Sair da conta"
            title="Sair"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink-900 md:block">
        <SidebarContent />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="animate-in absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-ink-900 shadow-pop">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-2 text-ink-300 hover:bg-white/10 hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-ink-600 transition hover:bg-ink-100 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">
                {getSectionLabel(location.pathname)}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-700 ring-1 ring-inset ring-accent-200 md:inline-flex">
                {user?.role === 'ATHLETE' ? 'Atleta' : 'Treinador'}
              </span>
              <p className="hidden max-w-[12rem] truncate text-xs font-semibold text-ink-700 sm:block">
                {user?.name}
              </p>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-accent-400 sm:hidden">
                {initials(user?.name ?? '')}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 transition hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Sair</span>
                <span className="sr-only sm:hidden">Sair da conta</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl overflow-x-clip px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
