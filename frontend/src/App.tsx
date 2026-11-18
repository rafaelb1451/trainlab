import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { AppLayout } from './components/AppLayout'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { ActivityAnalysisPage } from './pages/ActivityAnalysisPage'
import { AthleteDetailPage } from './pages/AthleteDetailPage'
import { AthletesPage } from './pages/AthletesPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlanPage } from './pages/PlanPage'
import { RegisterPage } from './pages/RegisterPage'
import { WorkoutBuilderPage } from './pages/WorkoutBuilderPage'
import { WorkoutsPage } from './pages/WorkoutsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 text-accent-400">
        <Activity className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="flex items-center gap-2 text-sm text-ink-500" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin text-brand-600" aria-hidden="true" />
        Carregando TrainLab…
      </p>
    </div>
  )
}

function ProtectedRoute() {
  const { token, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <SplashScreen />
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

function CoachOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (user?.role === 'ATHLETE') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route
                path="athletes"
                element={
                  <CoachOnly>
                    <AthletesPage />
                  </CoachOnly>
                }
              />
              <Route path="athletes/:id" element={<AthleteDetailPage />} />
              <Route
                path="workouts"
                element={
                  <CoachOnly>
                    <WorkoutsPage />
                  </CoachOnly>
                }
              />
              <Route
                path="workouts/new"
                element={
                  <CoachOnly>
                    <WorkoutBuilderPage />
                  </CoachOnly>
                }
              />
              <Route
                path="workouts/:id"
                element={
                  <CoachOnly>
                    <WorkoutBuilderPage />
                  </CoachOnly>
                }
              />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="activities/:id" element={<ActivityAnalysisPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  )
}
