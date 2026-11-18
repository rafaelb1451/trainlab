import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CircleCheck,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi, plannedApi, workoutsApi } from '../api/endpoints'
import type { PlannedWorkout, WorkoutSummary } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { ConfirmDialog } from '../components/Feedback'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/Feedback'
import {
  addDays,
  formatDateLong,
  formatDateShort,
  formatEstimatedDuration,
  formatWeekday,
  toISODate,
} from '../lib/format'
import { PLANNED_STATUS_LABELS, SPORT_LABELS } from '../lib/labels'

interface AddErrors {
  athleteId?: string
  workoutId?: string
  scheduledDate?: string
}

export function PlanPage() {
  const { user } = useAuth()
  const isCoach = user?.role !== 'ATHLETE'
  const queryClient = useQueryClient()

  const currentAthleteId = user?.athleteId ?? undefined
  const today = new Date()
  const from = toISODate(today)
  const to = toISODate(addDays(today, 6))
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index))

  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState(from)
  const [athleteId, setAthleteId] = useState('')
  const [workoutId, setWorkoutId] = useState('')
  const [addErrors, setAddErrors] = useState<AddErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannedWorkout | null>(null)

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
    enabled: isCoach,
  })

  const workoutsQuery = useQuery({
    queryKey: ['workouts', {}],
    queryFn: () => workoutsApi.list(),
    enabled: isCoach,
  })

  const plannedQuery = useQuery({
    queryKey: ['planned', { athleteId: isCoach ? undefined : (currentAthleteId ?? 'self'), from, to }],
    queryFn: () =>
      plannedApi.list(
        isCoach ? { from, to } : { from, to, ...(currentAthleteId ? { athleteId: currentAthleteId } : {}) },
      ),
    enabled: isCoach || Boolean(currentAthleteId),
  })

  const createMutation = useMutation({
    mutationFn: plannedApi.create,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['planned'] })
      setNotice(`Sessão adicionada em ${formatDateShort(created.scheduledDate)}.`)
      setAddOpen(false)
      setAddErrors({})
      setWorkoutId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plannedApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['planned'] })
      setDeleteTarget(null)
      setNotice('Sessão removida do planejamento.')
    },
  })

  const athletes = athletesQuery.data ?? []
  const workouts = workoutsQuery.data ?? []
  const planned = plannedQuery.data ?? []
  const workoutMap = new Map(workouts.map((workout) => [workout.id, workout]))
  const athleteMap = new Map(athletes.map((athlete) => [athlete.id, athlete]))

  function resolveWorkout(item: PlannedWorkout): WorkoutSummary | undefined {
    return item.workout ?? workoutMap.get(item.workoutId) ?? undefined
  }

  function openAdd(date = from) {
    setAddDate(date)
    setAddErrors({})
    createMutation.reset()
    setAddOpen(true)
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: AddErrors = {}
    if (!athleteId) errors.athleteId = 'Selecione o atleta.'
    if (!workoutId) errors.workoutId = 'Selecione o treino.'
    if (!addDate) errors.scheduledDate = 'Selecione a data.'
    setAddErrors(errors)
    if (Object.keys(errors).length > 0) return
    createMutation.mutate({ athleteId, workoutId, scheduledDate: addDate })
  }

  const actionError = createMutation.error ?? deleteMutation.error

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Próximos 7 dias · ${formatDateShort(from)} – ${formatDateShort(to)}`}
        title="Planejamento"
        description={
          isCoach
            ? 'Distribua os treinos da biblioteca entre os atletas ao longo da semana.'
            : 'Acompanhe as sessões que o seu treinador planejou para você.'
        }
        actions={
          isCoach ? (
            <Button onClick={() => openAdd(from)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar sessão
            </Button>
          ) : null
        }
      />

      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
        >
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          {notice}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto text-xs font-semibold underline-offset-2 hover:underline"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {actionError ? (
        <ErrorAlert
          title="Não foi possível concluir a ação"
          message={getApiErrorMessage(actionError)}
        />
      ) : null}

      {plannedQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar o planejamento"
          message={getApiErrorMessage(plannedQuery.error)}
          onRetry={() => void plannedQuery.refetch()}
        />
      ) : null}

      {!isCoach && !currentAthleteId ? (
        <ErrorAlert
          title="Perfil de atleta não vinculado"
          message="Sua conta não está vinculada a um perfil de atleta. Fale com seu treinador."
        />
      ) : null}

      {plannedQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day, index) => {
            const iso = toISODate(day)
            const sessions = planned
              .filter((item) => item.scheduledDate.slice(0, 10) === iso)
              .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
            const isToday = index === 0

            return (
              <section
                key={iso}
                className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-sm"
                aria-labelledby={`day-${iso}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl ${
                        isToday ? 'bg-ink-900 text-accent-400' : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase leading-none">
                        {formatWeekday(iso, true).slice(0, 3)}
                      </span>
                      <span className="mt-0.5 text-sm font-bold leading-none">
                        {iso.slice(8, 10)}
                      </span>
                    </div>
                    <div>
                      <h2 id={`day-${iso}`} className="text-sm font-semibold text-ink-900">
                        {formatWeekday(iso)}
                        {isToday ? (
                          <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-900">
                            Hoje
                          </span>
                        ) : null}
                      </h2>
                      <p className="text-xs text-ink-500">{formatDateLong(iso)}</p>
                    </div>
                  </div>
                  {isCoach ? (
                    <button
                      type="button"
                      onClick={() => openAdd(iso)}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-800"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Sessão
                    </button>
                  ) : null}
                </div>

                <div className="p-3">
                  {sessions.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-ink-200 px-3 py-3 text-xs text-ink-500">
                      Nenhuma sessão planejada.
                    </p>
                  ) : (
                    <div className="grid gap-2 lg:grid-cols-2">
                      {sessions.map((item) => {
                        const workout = resolveWorkout(item)
                        const athleteName =
                          item.athleteName ?? athleteMap.get(item.athleteId)?.displayName
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-3 py-3"
                          >
                            <div className="mt-0.5">
                              {workout ? (
                                <SportBadge sport={workout.sport} size="sm" />
                              ) : (
                                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">
                                  Treino
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-ink-900">
                                {workout?.name ?? item.workout?.name ?? 'Sessão planejada'}
                              </p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                                {isCoach ? (
                                  <span className="inline-flex items-center gap-1">
                                    <UserRound className="h-3 w-3" aria-hidden="true" />
                                    {athleteName ?? 'Atleta'}
                                  </span>
                                ) : null}
                                <span>{workout ? formatEstimatedDuration(workout.estimatedDurationSec) : 'Duração a definir'}</span>
                                {item.status !== 'PLANNED' ? (
                                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                                    {PLANNED_STATUS_LABELS[item.status]}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            {isCoach ? (
                              <button
                                type="button"
                                onClick={() => {
                                  deleteMutation.reset()
                                  setDeleteTarget(item)
                                }}
                                className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                                aria-label={`Remover sessão ${workout?.name ?? ''} de ${athleteName ?? 'atleta'}`}
                                title="Remover sessão"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {planned.length === 0 && !plannedQuery.isLoading && !plannedQuery.isError ? (
        <Card className="p-4">
          <EmptyState
            icon={CalendarDays}
            title="Semana sem sessões"
            description={
              isCoach
                ? 'Adicione sessões escolhendo atleta, treino e data.'
                : 'Seu treinador ainda não planejou sessões para os próximos 7 dias.'
            }
            action={
              isCoach ? (
                <Button size="sm" onClick={() => openAdd(from)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Adicionar sessão
                </Button>
              ) : null
            }
            className="border-0 bg-transparent py-6"
          />
        </Card>
      ) : null}

      <Modal
        open={addOpen}
        onClose={() => {
          if (!createMutation.isPending) setAddOpen(false)
        }}
        title="Adicionar sessão"
        description="Associe um treino da biblioteca a um atleta em uma data da semana."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="add-session-form"
              loading={createMutation.isPending}
              disabled={athletes.length === 0 || workouts.length === 0}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </>
        }
      >
        <form id="add-session-form" onSubmit={handleAdd} className="space-y-4" noValidate>
          {createMutation.isError ? (
            <ErrorAlert
              title="Não foi possível adicionar"
              message={getApiErrorMessage(createMutation.error)}
            />
          ) : null}

          {athletesQuery.isError || workoutsQuery.isError ? (
            <ErrorAlert
              title="Dados indisponíveis"
              message={getApiErrorMessage(athletesQuery.error ?? workoutsQuery.error)}
              onRetry={() => {
                void athletesQuery.refetch()
                void workoutsQuery.refetch()
              }}
            />
          ) : null}

          {athletes.length === 0 || workouts.length === 0 ? (
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-3 text-xs text-ink-800">
              {athletes.length === 0 ? (
                <p>
                  Cadastre um atleta antes de planejar.{' '}
                  <Link to="/athletes" className="font-semibold underline">
                    Ir para atletas
                  </Link>
                </p>
              ) : null}
              {workouts.length === 0 ? (
                <p>
                  Crie um treino na biblioteca antes de planejar.{' '}
                  <Link to="/workouts/new" className="font-semibold underline">
                    Criar treino
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <Field label="Atleta" htmlFor="plan-athlete" error={addErrors.athleteId} required>
            <Select
              id="plan-athlete"
              value={athleteId}
              onChange={(event) => setAthleteId(event.target.value)}
              aria-invalid={Boolean(addErrors.athleteId) || undefined}
            >
              <option value="">Selecione um atleta</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.displayName}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Treino" htmlFor="plan-workout" error={addErrors.workoutId} required>
            <Select
              id="plan-workout"
              value={workoutId}
              onChange={(event) => setWorkoutId(event.target.value)}
              aria-invalid={Boolean(addErrors.workoutId) || undefined}
            >
              <option value="">Selecione um treino</option>
              {workouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  [{SPORT_LABELS[workout.sport]}] {workout.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Data"
            htmlFor="plan-date"
            error={addErrors.scheduledDate}
            hint="Dentro dos próximos 7 dias."
            required
          >
            <Input
              id="plan-date"
              type="date"
              value={addDate}
              min={from}
              max={to}
              onChange={(event) => setAddDate(event.target.value)}
              aria-invalid={Boolean(addErrors.scheduledDate) || undefined}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remover sessão"
        description={
          deleteTarget
            ? `A sessão de ${formatDateShort(deleteTarget.scheduledDate)} será removida do planejamento.`
            : ''
        }
        confirmLabel="Remover sessão"
        loading={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}
