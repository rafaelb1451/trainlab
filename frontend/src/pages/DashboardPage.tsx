import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Dumbbell,
  Plus,
  Timer,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage, isNotFoundError } from '../api/client'
import { athletesApi, dashboardApi, plannedApi, workoutsApi } from '../api/endpoints'
import type { WorkoutSummary } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'
import { RosterTable } from '../components/RosterTable'
import { SportBadge } from '../components/SportBadge'
import { StatCard } from '../components/StatCard'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Skeleton } from '../components/Feedback'
import {
  addDays,
  formatDateShort,
  formatEstimatedDuration,
  formatMinutes,
  formatNumber,
  formatThresholdSummary,
  formatWeekday,
  toISODate,
} from '../lib/format'
import { SPORT_LABELS, WORKOUT_TYPE_LABELS } from '../lib/labels'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function RecentWorkoutRow({ workout }: { workout: WorkoutSummary }) {
  return (
    <Link
      to={`/workouts/${workout.id}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-ink-100 hover:bg-ink-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-500 group-hover:bg-white">
        <Dumbbell className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{workout.name}</p>
        <p className="mt-0.5 truncate text-xs text-ink-500">
          {WORKOUT_TYPE_LABELS[workout.type]} ·{' '}
          {formatEstimatedDuration(workout.estimatedDurationSec)} · {workout.stepCount}{' '}
          {workout.stepCount === 1 ? 'step' : 'steps'}
        </p>
      </div>
      <SportBadge sport={workout.sport} size="sm" />
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-brand-600"
        aria-hidden="true"
      />
    </Link>
  )
}

function AthleteDashboard({ name }: { name: string }) {
  const { user } = useAuth()
  const today = new Date()
  const from = toISODate(today)
  const to = toISODate(addDays(today, 6))
  const athleteId = user?.athleteId ?? undefined

  const profileQuery = useQuery({
    queryKey: ['athlete', athleteId],
    queryFn: () => athletesApi.get(athleteId ?? ''),
    enabled: Boolean(athleteId),
  })

  const plannedQuery = useQuery({
    queryKey: ['planned', { athleteId: athleteId ?? 'self', from, to }],
    queryFn: () => plannedApi.list({ athleteId, from, to }),
    enabled: Boolean(athleteId),
  })

  const profile = profileQuery.data
  const planned = plannedQuery.data ?? []
  const totalSeconds = planned.reduce(
    (sum, item) => sum + (item.workout?.estimatedDurationSec ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão do atleta"
        title={`${greeting()}, ${name.split(' ')[0]}`}
        description="Seu perfil, seus limiares e as sessões planejadas para os próximos 7 dias."
      />

      {profileQuery.isError ? (
        <ErrorAlert
          message={getApiErrorMessage(profileQuery.error)}
          onRetry={() => void profileQuery.refetch()}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Sessões na semana"
          value={String(planned.length)}
          hint="Próximos 7 dias"
          icon={CalendarDays}
          tone="brand"
        />
        <StatCard
          label="Tempo planejado"
          value={`${formatMinutes(totalSeconds)} min`}
          hint="Somatório das sessões"
          icon={Timer}
          tone="accent"
        />
        <StatCard
          label="Modalidades"
          value={String(profile?.sports.length ?? 0)}
          hint={profile?.sports.map((sport) => SPORT_LABELS[sport]).join(' · ') || 'Nenhuma ainda'}
          icon={TrendingUp}
          tone="ink"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title="Sessões planejadas"
            description="Próximos 7 dias"
            actions={
              <Link to="/plan" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
                Ver planejamento
              </Link>
            }
          />
          <div className="p-4">
            {plannedQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : plannedQuery.isError ? (
              <ErrorAlert
                message={getApiErrorMessage(plannedQuery.error)}
                onRetry={() => void plannedQuery.refetch()}
              />
            ) : planned.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Nenhuma sessão planejada"
                description="Quando seu treinador atribuir treinos, eles aparecerão aqui."
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="space-y-2">
                {planned.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-50 text-ink-800">
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {formatWeekday(item.scheduledDate, true).slice(0, 3)}
                      </span>
                      <span className="mt-0.5 text-sm font-bold leading-none">
                        {formatDateShort(item.scheduledDate).split(' ')[0]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {item.workout?.name ?? 'Sessão planejada'}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {item.workout
                          ? formatEstimatedDuration(item.workout.estimatedDurationSec)
                          : 'Duração a definir'}
                      </p>
                    </div>
                    {item.workout ? <SportBadge sport={item.workout.sport} size="sm" /> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Meu perfil" description="Limiares e dados esportivos" />
          <div className="p-5">
            {profileQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-20" />
              </div>
            ) : profile ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-accent-400">
                    {initials(profile.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {profile.displayName}
                    </p>
                    <p className="truncate text-xs text-ink-500">{profile.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {profile.sports.length > 0 ? (
                    profile.sports.map((sport) => <SportBadge key={sport} sport={sport} size="sm" />)
                  ) : (
                    <span className="text-xs text-ink-500">Nenhuma modalidade configurada</span>
                  )}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-4">
                  {formatThresholdSummary(profile.thresholdSummary).map((line) => (
                    <p key={line} className="text-xs text-ink-600">
                      {line}
                    </p>
                  ))}
                  {formatThresholdSummary(profile.thresholdSummary).length === 0 ? (
                    <p className="text-xs text-ink-500">Limiares ainda não configurados.</p>
                  ) : null}
                </div>
                <Link to={`/athletes/${profile.id}`} className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Ver ficha completa
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-ink-500">
                Perfil de atleta não vinculado. Fale com seu treinador.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const isAthlete = user?.role === 'ATHLETE'

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    enabled: !isAthlete,
  })

  const workoutsQuery = useQuery({
    queryKey: ['workouts', {}],
    queryFn: () => workoutsApi.list(),
    enabled: !isAthlete,
  })

  if (isAthlete) {
    return <AthleteDashboard name={user?.name ?? 'Atleta'} />
  }

  const dashboard = dashboardQuery.data
  const workouts = workoutsQuery.data ?? []
  const recentWorkouts = [...workouts]
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, 5)
  const nextSessions = (dashboard?.roster ?? [])
    .filter((entry) => entry.nextSessionDate !== null)
    .sort((a, b) => (a.nextSessionDate ?? '').localeCompare(b.nextSessionDate ?? ''))
    .slice(0, 5)

  const dashboardUnavailable = dashboardQuery.isError
  const dashboardNotFound = isNotFoundError(dashboardQuery.error)
  const isInitialLoading = dashboardQuery.isLoading && !dashboard

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel do treinador"
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'treinador'}`}
        description="Carga do plantel, próximos treinos e recuperação em um só painel."
        actions={
          <>
            <Link to="/athletes">
              <Button variant="outline">
                <Users className="h-4 w-4" aria-hidden="true" />
                Atletas
              </Button>
            </Link>
            <Link to="/workouts/new">
              <Button>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Novo treino
              </Button>
            </Link>
          </>
        }
      />

      {dashboardUnavailable ? (
        <ErrorAlert
          title="Painel 360 indisponível"
          message={
            dashboardNotFound
              ? 'O endpoint /api/dashboard ainda não está disponível neste servidor. Os cards de treinos recentes continuam funcionando; tente novamente em instantes.'
              : getApiErrorMessage(dashboardQuery.error)
          }
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Atletas"
          value={dashboard ? formatNumber(dashboard.athleteCount) : '—'}
          hint="Plantel ativo"
          icon={Users}
          tone="brand"
          loading={isInitialLoading}
        />
        <StatCard
          label="Treinos"
          value={dashboard ? formatNumber(dashboard.workoutCount) : '—'}
          hint="Na biblioteca"
          icon={Dumbbell}
          tone="accent"
          loading={isInitialLoading}
        />
        <StatCard
          label="Sessões planejadas"
          value={dashboard ? formatNumber(dashboard.plannedSessions7d) : '—'}
          hint="Próximos 7 dias"
          icon={CalendarDays}
          tone="ink"
          loading={isInitialLoading}
        />
        <StatCard
          label="Minutos planejados"
          value={dashboard ? `${formatNumber(dashboard.plannedMinutes7d)} min` : '—'}
          hint="Carga da semana"
          icon={Clock}
          tone="cyan"
          loading={isInitialLoading}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Plantel"
          description="Carga dos próximos 7 dias, próximo treino e último registro de saúde"
          actions={
            <Link
              to="/athletes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Ver atletas
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />
        {dashboardQuery.isLoading && !dashboard ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : dashboardUnavailable && !dashboard ? (
          <EmptyState
            icon={Users}
            title="Não foi possível carregar o plantel"
            description="Os dados do painel chegam pelo endpoint /api/dashboard. Assim que ele estiver disponível, a tabela aparece aqui automaticamente."
            action={
              <Button variant="outline" onClick={() => void dashboardQuery.refetch()}>
                Tentar novamente
              </Button>
            }
            className="border-0 bg-transparent py-10"
          />
        ) : (dashboard?.roster.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title="Plantel vazio"
            description="Cadastre seu primeiro atleta para acompanhar carga, próximos treinos e recuperação."
            action={
              <Link to="/athletes">
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Novo atleta
                </Button>
              </Link>
            }
            className="border-0 bg-transparent py-10"
          />
        ) : (
          <RosterTable roster={dashboard?.roster ?? []} />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Treinos recentes"
            description="Últimas atualizações da biblioteca"
            actions={
              <Link
                to="/workouts"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          <div className="p-3">
            {workoutsQuery.isLoading ? (
              <div className="space-y-2 p-1">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : workoutsQuery.isError ? (
              <ErrorAlert
                message={getApiErrorMessage(workoutsQuery.error)}
                onRetry={() => void workoutsQuery.refetch()}
                className="m-2"
              />
            ) : recentWorkouts.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title="Nenhum treino na biblioteca"
                description="Crie seu primeiro treino estruturado para começar."
                action={
                  <Link to="/workouts/new">
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Novo treino
                    </Button>
                  </Link>
                }
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="space-y-1">
                {recentWorkouts.map((workout) => (
                  <RecentWorkoutRow key={workout.id} workout={workout} />
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Próximos treinos"
            description="Sessões agendadas do plantel"
            actions={
              <Link
                to="/plan"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Planejamento
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          <div className="p-4">
            {dashboardQuery.isLoading && !dashboard ? (
              <div className="space-y-2">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : dashboardUnavailable && !dashboard ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-6 text-center text-xs text-ink-500">
                Dados do painel indisponíveis. Tente novamente em instantes.
              </div>
            ) : nextSessions.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Semana livre"
                description="Nenhuma sessão futura agendada para o plantel."
                action={
                  <Link to="/plan">
                    <Button size="sm" variant="outline">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      Planejar semana
                    </Button>
                  </Link>
                }
                className="border-0 bg-transparent py-6"
              />
            ) : (
              <div className="space-y-2">
                {nextSessions.map((entry) => (
                  <Link
                    key={entry.athleteId}
                    to={`/athletes/${entry.athleteId}`}
                    className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2.5 transition hover:border-brand-200 hover:bg-ink-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-50 text-ink-800">
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {entry.nextSessionDate
                          ? formatWeekday(entry.nextSessionDate, true).slice(0, 3)
                          : '—'}
                      </span>
                      <span className="mt-0.5 text-sm font-bold leading-none">
                        {entry.nextSessionDate
                          ? formatDateShort(entry.nextSessionDate).split(' ')[0]
                          : '—'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {entry.nextWorkoutName ?? 'Sessão planejada'}
                      </p>
                      <p className="truncate text-xs text-ink-500">{entry.displayName}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
