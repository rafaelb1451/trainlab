import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, CircleCheck, Dumbbell, LineChart, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../api/client'
import { activitiesApi, plannedApi, workoutsApi } from '../../api/endpoints'
import type { PlannedWorkout, WorkoutSummary } from '../../api/types'
import { activityIdForSession } from '../../lib/activity'
import {
  addDays,
  formatDateLong,
  formatDateShort,
  formatEstimatedDuration,
  formatWeekday,
  toISODate,
} from '../../lib/format'
import { PLANNED_STATUS_LABELS, SPORT_LABELS } from '../../lib/labels'
import { EmptyState } from '../EmptyState'
import { ErrorAlert } from '../ErrorAlert'
import { ConfirmDialog, Skeleton } from '../Feedback'
import { SportBadge } from '../SportBadge'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'

interface AthletePlanningTabProps {
  athleteId: string
  canEdit: boolean
  onChanged: () => void
}

export function AthletePlanningTab({ athleteId, canEdit, onChanged }: AthletePlanningTabProps) {
  const queryClient = useQueryClient()
  const today = new Date()
  const from = toISODate(today)
  const to = toISODate(addDays(today, 13))
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index))

  const [addOpen, setAddOpen] = useState(false)
  const [addDate, setAddDate] = useState(from)
  const [workoutId, setWorkoutId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlannedWorkout | null>(null)

  const plannedQuery = useQuery({
    queryKey: ['planned', athleteId, from, to],
    queryFn: () => plannedApi.list({ athleteId, from, to }),
  })

  const workoutsQuery = useQuery({
    queryKey: ['workouts', { athleteId }],
    queryFn: () => workoutsApi.list({ athleteId }),
    enabled: canEdit,
  })

  // Fallback do vínculo v6: o planejado pode ainda não trazer activityId.
  const activitiesQuery = useQuery({
    queryKey: ['activities', athleteId, from, to],
    queryFn: () => activitiesApi.list({ athleteId, from, to }),
    enabled: (plannedQuery.data ?? []).some((item) => item.status === 'COMPLETED'),
    retry: false,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['planned'] })
    void queryClient.invalidateQueries({ queryKey: ['overview', athleteId] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['athletes'] })
    onChanged()
  }

  const createMutation = useMutation({
    mutationFn: plannedApi.create,
    onSuccess: (created) => {
      invalidate()
      setNotice(`Sessão adicionada em ${formatDateShort(created.scheduledDate)}.`)
      setAddOpen(false)
      setFormError(null)
      setWorkoutId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plannedApi.remove(id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      setNotice('Sessão removida do planejamento.')
    },
  })

  const planned = plannedQuery.data ?? []
  const workouts = workoutsQuery.data ?? []
  const workoutMap = new Map(workouts.map((workout) => [workout.id, workout]))

  function resolveWorkout(item: PlannedWorkout): WorkoutSummary | undefined {
    return item.workout ?? workoutMap.get(item.workoutId) ?? undefined
  }

  function resolveActivityId(item: PlannedWorkout): string | null {
    const workout = resolveWorkout(item)
    return activityIdForSession(
      {
        id: item.id,
        scheduledDate: item.scheduledDate,
        status: item.status,
        activityId: item.activityId,
        workout: workout ? { sport: workout.sport } : null,
      },
      activitiesQuery.data,
    )
  }

  function openAdd(date = from) {
    setAddDate(date)
    setFormError(null)
    createMutation.reset()
    setAddOpen(true)
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!addDate) {
      setFormError('Selecione a data da sessão.')
      return
    }
    if (!workoutId) {
      setFormError('Selecione um treino da biblioteca.')
      return
    }
    setFormError(null)
    createMutation.mutate({ athleteId, workoutId, scheduledDate: addDate })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Planejamento</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Próximos 14 dias · {formatDateShort(from)} a {formatDateShort(to)}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/workouts/new?athleteId=${athleteId}`}>
              <Button>
                <Dumbbell className="h-4 w-4" aria-hidden="true" />
                Novo treino para o atleta
              </Button>
            </Link>
            <Button variant="outline" onClick={() => openAdd()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar sessão
            </Button>
          </div>
        ) : null}
      </div>

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

      {(createMutation.isError || deleteMutation.isError) && !addOpen ? (
        <ErrorAlert
          title="Não foi possível concluir a ação"
          message={getApiErrorMessage(createMutation.error ?? deleteMutation.error)}
        />
      ) : null}

      {plannedQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar o planejamento"
          message={getApiErrorMessage(plannedQuery.error)}
          onRetry={() => void plannedQuery.refetch()}
        />
      ) : null}

      {plannedQuery.isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          {planned.length === 0 ? (
            <Card className="p-4">
              <EmptyState
                icon={CalendarDays}
                title="Nenhuma sessão nos próximos 14 dias"
                description={
                  canEdit
                    ? 'Adicione uma sessão escolhendo um treino da biblioteca e a data.'
                    : 'Seu treinador ainda não planejou sessões para este período.'
                }
                action={
                  canEdit ? (
                    <Button size="sm" onClick={() => openAdd()}>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Adicionar sessão
                    </Button>
                  ) : null
                }
                className="border-0 bg-transparent py-6"
              />
            </Card>
          ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {days.map((day, index) => {
              const iso = toISODate(day)
              const sessions = planned
                .filter((item) => item.scheduledDate.slice(0, 10) === iso)
                .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
              const isToday = index === 0
              return (
                <section
                  key={iso}
                  className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm"
                  aria-labelledby={`plan-day-${iso}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl ${
                          isToday ? 'bg-ink-900 text-accent-400' : 'bg-white text-ink-700 ring-1 ring-ink-100'
                        }`}
                      >
                        <span className="text-[9px] font-semibold uppercase leading-none">
                          {formatWeekday(iso, true).slice(0, 3)}
                        </span>
                        <span className="mt-0.5 text-sm font-bold leading-none">
                          {iso.slice(8, 10)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3
                          id={`plan-day-${iso}`}
                          className="flex items-center gap-2 truncate text-sm font-semibold text-ink-900"
                        >
                          {formatWeekday(iso)}
                          {isToday ? (
                            <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-900">
                              Hoje
                            </span>
                          ) : null}
                        </h3>
                        <p className="truncate text-[11px] text-ink-500">{formatDateLong(iso)}</p>
                      </div>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => openAdd(iso)}
                        className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-800"
                        aria-label={`Adicionar sessão em ${formatDateShort(iso)}`}
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" />
                        Sessão
                      </button>
                    ) : null}
                  </div>

                  <div className="p-3">
                    {sessions.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-ink-200 px-3 py-2.5 text-[11px] text-ink-500">
                        Nenhuma sessão planejada.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {sessions.map((item) => {
                          const workout = resolveWorkout(item)
                          const activityId = resolveActivityId(item)
                          return (
                            <div
                              key={item.id}
                              className="flex items-start gap-3 rounded-xl border border-ink-100 px-3 py-2.5"
                            >
                              <div className="mt-0.5">
                                {workout ? (
                                  <SportBadge sport={workout.sport} size="sm" />
                                ) : (
                                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">
                                    Treino
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink-900">
                                  {workout?.name ?? 'Sessão planejada'}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-500">
                                  <span>
                                    {workout
                                      ? formatEstimatedDuration(workout.estimatedDurationSec)
                                      : 'Duração a definir'}
                                  </span>
                                  {item.status !== 'PLANNED' ? (
                                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                                      {PLANNED_STATUS_LABELS[item.status]}
                                    </span>
                                  ) : null}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                {activityId ? (
                                  <Link
                                    to={`/activities/${activityId}`}
                                    className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1.5 text-[10px] font-semibold text-brand-800 transition hover:bg-brand-100"
                                    title="Analisar treino executado"
                                  >
                                    <LineChart className="h-3 w-3" aria-hidden="true" />
                                    Analisar
                                  </Link>
                                ) : null}
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteMutation.reset()
                                      setDeleteTarget(item)
                                    }}
                                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
                                    aria-label={`Remover sessão ${workout?.name ?? ''}`}
                                    title="Remover sessão"
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                ) : null}
                              </div>
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
        </>
      )}

      <Modal
        open={addOpen}
        onClose={() => {
          if (!createMutation.isPending) setAddOpen(false)
        }}
        title="Adicionar sessão"
        description="Escolha um treino da biblioteca e a data dentro dos próximos 14 dias."
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
              form="athlete-add-session"
              loading={createMutation.isPending}
              disabled={workouts.length === 0}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          </>
        }
      >
        <form id="athlete-add-session" onSubmit={handleAdd} className="space-y-4" noValidate>
          {createMutation.isError ? (
            <ErrorAlert
              title="Não foi possível adicionar"
              message={getApiErrorMessage(createMutation.error)}
            />
          ) : null}
          {formError ? <ErrorAlert title="Revise a sessão" message={formError} /> : null}
          {workoutsQuery.isError ? (
            <ErrorAlert
              title="Biblioteca indisponível"
              message={getApiErrorMessage(workoutsQuery.error)}
              onRetry={() => void workoutsQuery.refetch()}
            />
          ) : null}
          {!workoutsQuery.isLoading && workouts.length === 0 ? (
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-3 text-xs text-ink-800">
              Nenhum treino na biblioteca. Crie um treino antes de planejar.
            </div>
          ) : null}

          <Field label="Treino" htmlFor="athlete-plan-workout" required>
            <Select
              id="athlete-plan-workout"
              value={workoutId}
              onChange={(event) => setWorkoutId(event.target.value)}
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
            htmlFor="athlete-plan-date"
            hint="Dentro dos próximos 14 dias."
            required
          >
            <Input
              id="athlete-plan-date"
              type="date"
              value={addDate}
              min={from}
              max={to}
              onChange={(event) => setAddDate(event.target.value)}
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
