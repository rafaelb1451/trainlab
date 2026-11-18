import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Plus,
  Timer,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import { getApiErrorMessage } from '../api/client'
import { athletesApi, plannedApi, workoutsApi } from '../api/endpoints'
import type { AthleteSummary, PlannedWorkout, WorkoutSummary } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Skeleton } from '../components/Feedback'
import {
  addDays,
  formatDateShort,
  formatEstimatedDuration,
  formatMinutes,
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

interface StatCardProps {
  label: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
  tone: 'brand' | 'sky' | 'violet' | 'amber'
}

const statTones: Record<StatCardProps['tone'], string> = {
  brand: 'bg-brand-50 text-brand-700',
  sky: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
  amber: 'bg-amber-50 text-amber-700',
}

function StatCard({ label, value, hint, icon: Icon, tone }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${statTones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  )
}

function RecentWorkoutRow({ workout }: { workout: WorkoutSummary }) {
  return (
    <Link
      to={`/workouts/${workout.id}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white">
        <Dumbbell className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{workout.name}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {WORKOUT_TYPE_LABELS[workout.type]} · {formatEstimatedDuration(workout.estimatedDurationSec)} ·{' '}
          {workout.stepCount} {workout.stepCount === 1 ? 'step' : 'steps'}
        </p>
      </div>
      <SportBadge sport={workout.sport} size="sm" />
      <ArrowRight
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500"
        aria-hidden="true"
      />
    </Link>
  )
}

function RecentAthleteRow({ athlete }: { athlete: AthleteSummary }) {
  const summaries = formatThresholdSummary(athlete.thresholdSummary)
  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-slate-200 hover:bg-slate-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-brand-300">
        {initials(athlete.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{athlete.displayName}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {athlete.sports.length > 0
            ? athlete.sports.map((sport) => SPORT_LABELS[sport]).join(' · ')
            : 'Sem modalidades configuradas'}
        </p>
      </div>
      <div className="hidden max-w-[220px] truncate text-right text-[11px] text-slate-500 sm:block">
        {summaries[0] ?? 'Sem limiares'}
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500"
        aria-hidden="true"
      />
    </Link>
  )
}

function PlannedSessionRow({
  planned,
  workout,
}: {
  planned: PlannedWorkout
  workout?: WorkoutSummary
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
      <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 text-slate-600">
        <span className="text-[10px] font-semibold uppercase leading-none">
          {formatWeekday(planned.scheduledDate, true).slice(0, 3)}
        </span>
        <span className="mt-0.5 text-sm font-bold leading-none">
          {formatDateShort(planned.scheduledDate).split(' ')[0]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {workout?.name ?? planned.workout?.name ?? 'Sessão planejada'}
        </p>
        <p className="truncate text-xs text-slate-500">
          {planned.athleteName ? `${planned.athleteName} · ` : ''}
          {workout
            ? formatEstimatedDuration(workout.estimatedDurationSec)
            : 'Duração a definir'}
        </p>
      </div>
      {workout ? <SportBadge sport={workout.sport} size="sm" /> : null}
    </div>
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
          tone="sky"
        />
        <StatCard
          label="Modalidades"
          value={String(profile?.sports.length ?? 0)}
          hint={profile?.sports.map((sport) => SPORT_LABELS[sport]).join(' · ') || 'Nenhuma ainda'}
          icon={TrendingUp}
          tone="violet"
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
                  <PlannedSessionRow
                    key={item.id}
                    planned={item}
                    workout={item.workout ?? undefined}
                  />
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
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-brand-300">
                    {initials(profile.displayName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {profile.displayName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{profile.email}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {profile.sports.length > 0 ? (
                    profile.sports.map((sport) => <SportBadge key={sport} sport={sport} size="sm" />)
                  ) : (
                    <span className="text-xs text-slate-500">Nenhuma modalidade configurada</span>
                  )}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
                  {formatThresholdSummary(profile.thresholdSummary).map((line) => (
                    <p key={line} className="text-xs text-slate-600">
                      {line}
                    </p>
                  ))}
                  {profile.thresholdSummary === undefined ||
                  formatThresholdSummary(profile.thresholdSummary).length === 0 ? (
                    <p className="text-xs text-slate-500">Limiares ainda não configurados.</p>
                  ) : null}
                </div>
                <Link to={`/athletes/${profile.id}`} className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Ver dados e zonas
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-slate-500">
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
  const today = new Date()
  const from = toISODate(today)
  const to = toISODate(addDays(today, 6))

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
    enabled: !isAthlete,
  })

  const workoutsQuery = useQuery({
    queryKey: ['workouts', {}],
    queryFn: () => workoutsApi.list(),
    enabled: !isAthlete,
  })

  const plannedQuery = useQuery({
    queryKey: ['planned', { from, to }],
    queryFn: () => plannedApi.list({ from, to }),
    enabled: !isAthlete,
  })

  if (isAthlete) {
    return <AthleteDashboard name={user?.name ?? 'Atleta'} />
  }

  const athletes = athletesQuery.data ?? []
  const workouts = workoutsQuery.data ?? []
  const planned = plannedQuery.data ?? []
  const workoutMap = new Map(workouts.map((workout) => [workout.id, workout]))
  const plannedSeconds = planned.reduce((sum, item) => {
    const workout = workoutMap.get(item.workoutId) ?? item.workout ?? undefined
    return sum + (workout?.estimatedDurationSec ?? 0)
  }, 0)

  const recentWorkouts = [...workouts]
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, 5)
  const recentAthletes = athletes.slice(0, 5)
  const upcoming = [...planned].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  const hasError = athletesQuery.isError || workoutsQuery.isError
  const isInitialLoading =
    (athletesQuery.isLoading && athletes.length === 0) || (workoutsQuery.isLoading && workouts.length === 0)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel do treinador"
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'treinador'}`}
        description="Um panorama rápido dos seus atletas, treinos e da semana que vem por aí."
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

      {hasError ? (
        <ErrorAlert
          title="Não foi possível carregar o painel"
          message={getApiErrorMessage(athletesQuery.error ?? workoutsQuery.error)}
          onRetry={() => {
            void athletesQuery.refetch()
            void workoutsQuery.refetch()
          }}
        />
      ) : null}

      {isInitialLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Atletas"
            value={String(athletes.length)}
            hint="Ativos no seu plantel"
            icon={Users}
            tone="brand"
          />
          <StatCard
            label="Treinos"
            value={String(workouts.length)}
            hint="Na biblioteca"
            icon={Dumbbell}
            tone="sky"
          />
          <StatCard
            label="Minutos planejados"
            value={`${formatMinutes(plannedSeconds)} min`}
            hint={`${planned.length} ${planned.length === 1 ? 'sessão' : 'sessões'} nos próximos 7 dias`}
            icon={Timer}
            tone="violet"
          />
        </div>
      )}

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
            title="Atletas"
            description="Plantel recente"
            actions={
              <Link
                to="/athletes"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Ver todos
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          />
          <div className="p-3">
            {athletesQuery.isLoading ? (
              <div className="space-y-2 p-1">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : athletesQuery.isError ? (
              <ErrorAlert
                message={getApiErrorMessage(athletesQuery.error)}
                onRetry={() => void athletesQuery.refetch()}
                className="m-2"
              />
            ) : recentAthletes.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum atleta cadastrado"
                description="Cadastre seu primeiro atleta para montar o plantel."
                action={
                  <Link to="/athletes">
                    <Button size="sm">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Novo atleta
                    </Button>
                  </Link>
                }
                className="border-0 bg-transparent py-8"
              />
            ) : (
              <div className="space-y-1">
                {recentAthletes.map((athlete) => (
                  <RecentAthleteRow key={athlete.id} athlete={athlete} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Próximas sessões"
          description="Planejamento dos próximos 7 dias"
          actions={
            <Link
              to="/plan"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Ver planejamento
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
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
          ) : upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Semana livre"
              description="Nenhuma sessão planejada para os próximos 7 dias."
              action={
                <Link to="/plan">
                  <Button size="sm" variant="outline">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Planejar semana
                  </Button>
                </Link>
              }
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {upcoming.slice(0, 6).map((item) => (
                <PlannedSessionRow
                  key={item.id}
                  planned={item}
                  workout={workoutMap.get(item.workoutId) ?? item.workout ?? undefined}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
