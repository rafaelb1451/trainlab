import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { plannedApi, workoutsApi } from '../../api/endpoints'
import type { PlannedWorkout, WorkoutSummary } from '../../api/types'
import { ErrorAlert } from '../ErrorAlert'
import { SportBadge } from '../SportBadge'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { formatDateLong, formatDistance, formatEstimatedDuration } from '../../lib/format'
import { WORKOUT_TYPE_LABELS } from '../../lib/labels'
import { cn } from '../../lib/cn'

interface AddSessionModalProps {
  open: boolean
  athleteId: string
  athleteName: string
  initialDate: string
  onClose: () => void
  onCreated: (created: PlannedWorkout) => void
}

function workoutMeta(workout: WorkoutSummary): string {
  const parts = [WORKOUT_TYPE_LABELS[workout.type], formatEstimatedDuration(workout.estimatedDurationSec)]
  if (workout.estimatedDistanceM) parts.push(formatDistance(workout.estimatedDistanceM))
  if (workout.estimatedTss) parts.push(`${workout.estimatedTss} TSS`)
  return parts.join(' · ')
}

export function AddSessionModal({
  open,
  athleteId,
  athleteName,
  initialDate,
  onClose,
  onCreated,
}: AddSessionModalProps) {
  const [date, setDate] = useState(initialDate)
  const [search, setSearch] = useState('')
  const [workoutId, setWorkoutId] = useState('')
  const [errors, setErrors] = useState<{ workoutId?: string; date?: string }>({})

  const workoutsQuery = useQuery({
    queryKey: ['workouts', {}],
    queryFn: () => workoutsApi.list(),
    enabled: open && Boolean(athleteId),
  })

  const createMutation = useMutation({
    mutationFn: plannedApi.create,
    onSuccess: (created) => {
      onCreated(created)
    },
  })

  useEffect(() => {
    if (!open) return
    setDate(initialDate)
    setSearch('')
    setWorkoutId('')
    setErrors({})
    createMutation.reset()
    // Recriar o formulário a cada abertura evita reaproveitar seleção/erro da
    // sessão anterior; `createMutation` é estável entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDate])

  const workouts = useMemo(() => workoutsQuery.data ?? [], [workoutsQuery.data])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return workouts
    return workouts.filter(
      (workout) =>
        workout.name.toLowerCase().includes(term) ||
        WORKOUT_TYPE_LABELS[workout.type].toLowerCase().includes(term),
    )
  }, [search, workouts])

  const selected = workouts.find((workout) => workout.id === workoutId) ?? null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { workoutId?: string; date?: string } = {}
    if (!workoutId) nextErrors.workoutId = 'Selecione um treino.'
    if (!date) nextErrors.date = 'Informe a data da sessão.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    createMutation.mutate({ athleteId, workoutId, scheduledDate: date })
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!createMutation.isPending) onClose()
      }}
      title="Adicionar sessão"
      description={`${athleteName} · ${formatDateLong(date)}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="add-session-calendar-form"
            loading={createMutation.isPending}
            disabled={workouts.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar
          </Button>
        </>
      }
    >
      <form id="add-session-calendar-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {createMutation.isError ? (
          <ErrorAlert
            title="Não foi possível adicionar"
            message={getApiErrorMessage(createMutation.error)}
          />
        ) : null}

        <div className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-700">
            Atleta
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">{athleteName}</p>
        </div>

        <Field label="Data" htmlFor="calendar-add-date" error={errors.date} required>
          <Input
            id="calendar-add-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={Boolean(errors.date) || undefined}
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="calendar-workout-search"
              className="flex items-center gap-1 text-xs font-semibold text-ink-700"
            >
              Treino <span className="text-brand-700" aria-hidden="true">*</span>
            </label>
            <span className="text-[11px] text-ink-500">
              {filtered.length} de {workouts.length}
            </span>
          </div>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            <Input
              id="calendar-workout-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar treino por nome ou tipo…"
              className="pl-9"
              autoComplete="off"
            />
          </div>
          {errors.workoutId ? (
            <p className="text-xs font-medium text-red-600" role="alert">
              {errors.workoutId}
            </p>
          ) : null}

          {workoutsQuery.isError ? (
            <ErrorAlert
              title="Não foi possível carregar a biblioteca"
              message={getApiErrorMessage(workoutsQuery.error)}
              onRetry={() => void workoutsQuery.refetch()}
            />
          ) : workoutsQuery.isLoading ? (
            <div className="space-y-2 rounded-xl border border-ink-100 p-2">
              <div className="h-12 animate-pulse rounded-lg bg-ink-100" />
              <div className="h-12 animate-pulse rounded-lg bg-ink-100" />
              <div className="h-12 animate-pulse rounded-lg bg-ink-100" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 px-3 py-6 text-center text-xs text-ink-500">
              Nenhum treino encontrado. Ajuste a busca ou crie um treino na biblioteca.
            </p>
          ) : (
            <div
              role="listbox"
              aria-label="Treinos da biblioteca"
              className="sidebar-scroll max-h-60 space-y-1 overflow-y-auto rounded-xl border border-ink-100 p-1.5"
            >
              {filtered.map((workout) => {
                const active = workout.id === workoutId
                return (
                  <button
                    key={workout.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setWorkoutId(workout.id)
                      setErrors((current) => ({ ...current, workoutId: undefined }))
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition',
                      active
                        ? 'border-brand-400 bg-brand-50 ring-1 ring-inset ring-brand-300'
                        : 'border-transparent hover:border-ink-200 hover:bg-ink-50',
                    )}
                  >
                    <SportBadge sport={workout.sport} size="sm" className="shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-ink-900">
                        {workout.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-ink-500">
                        {workoutMeta(workout)}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selected ? (
          <div className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/70 px-3 py-2.5">
            <SportBadge sport={selected.sport} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-ink-900">{selected.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-500">{workoutMeta(selected)}</p>
            </div>
          </div>
        ) : null}
      </form>
    </Modal>
  )
}
