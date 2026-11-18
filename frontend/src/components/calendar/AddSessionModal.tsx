import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Dumbbell, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { plannedApi, workoutsApi } from '../../api/endpoints'
import type { PlannedWorkout, Sport, WorkoutSummary, WorkoutType } from '../../api/types'
import { SPORTS, WORKOUT_TYPES } from '../../api/types'
import { ErrorAlert } from '../ErrorAlert'
import { SportBadge } from '../SportBadge'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { formatDateLong, formatDistance, formatEstimatedDuration } from '../../lib/format'
import { SPORT_LABELS, WORKOUT_TYPE_LABELS } from '../../lib/labels'
import { cn } from '../../lib/cn'

type AddTab = 'library' | 'new'

export interface CreateWorkoutDraft {
  name: string
  sport: Sport
  type: WorkoutType
  date: string
}

interface AddSessionModalProps {
  open: boolean
  athleteId: string
  athleteName: string
  initialDate: string
  onClose: () => void
  onCreated: (created: PlannedWorkout) => void
  /** Abre o construtor com atleta e data já preenchidos (v5). */
  onCreateNew: (draft: CreateWorkoutDraft) => void
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
  onCreateNew,
}: AddSessionModalProps) {
  const [tab, setTab] = useState<AddTab>('library')
  const [date, setDate] = useState(initialDate)
  const [search, setSearch] = useState('')
  const [workoutId, setWorkoutId] = useState('')
  const [errors, setErrors] = useState<{ workoutId?: string; date?: string }>({})
  const [newName, setNewName] = useState('')
  const [newSport, setNewSport] = useState<Sport>('RUN')
  const [newType, setNewType] = useState<WorkoutType>('ENDURANCE')
  const [newErrors, setNewErrors] = useState<{ name?: string; date?: string }>({})

  const workoutsQuery = useQuery({
    // Biblioteca + treinos individuais do atleta selecionado (v5).
    queryKey: ['workouts', { athleteId }],
    queryFn: () => workoutsApi.list({ athleteId }),
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
    setTab('library')
    setDate(initialDate)
    setSearch('')
    setWorkoutId('')
    setErrors({})
    setNewName('')
    setNewSport('RUN')
    setNewType('ENDURANCE')
    setNewErrors({})
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
        WORKOUT_TYPE_LABELS[workout.type].toLowerCase().includes(term) ||
        (workout.athleteName ?? '').toLowerCase().includes(term),
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

  function handleCreateNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { name?: string; date?: string } = {}
    if (!newName.trim()) nextErrors.name = 'Informe o nome do treino.'
    if (!date) nextErrors.date = 'Informe a data da sessão.'
    setNewErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onCreateNew({ name: newName.trim(), sport: newSport, type: newType, date })
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
          {tab === 'library' ? (
            <Button
              type="submit"
              form="add-session-calendar-form"
              loading={createMutation.isPending}
              disabled={workouts.length === 0}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          ) : (
            <Button type="submit" form="add-session-new-workout-form">
              <Dumbbell className="h-4 w-4" aria-hidden="true" />
              Criar e agendar
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label="Como adicionar a sessão"
          className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1"
        >
          <button
            type="button"
            role="tab"
            id="add-session-tab-library"
            aria-selected={tab === 'library'}
            aria-controls="add-session-panel-library"
            data-testid="add-session-tab-library"
            onClick={() => setTab('library')}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-semibold transition',
              tab === 'library'
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            Da biblioteca
          </button>
          <button
            type="button"
            role="tab"
            id="add-session-tab-new"
            aria-selected={tab === 'new'}
            aria-controls="add-session-panel-new"
            data-testid="add-session-tab-new"
            onClick={() => setTab('new')}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-semibold transition',
              tab === 'new'
                ? 'bg-white text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            Criar novo treino
          </button>
        </div>

        <div className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-700">
            Atleta
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">{athleteName}</p>
        </div>

        <Field
          label="Data"
          htmlFor="calendar-add-date"
          error={tab === 'library' ? errors.date : newErrors.date}
          required
        >
          <Input
            id="calendar-add-date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              setErrors((current) => ({ ...current, date: undefined }))
              setNewErrors((current) => ({ ...current, date: undefined }))
            }}
            aria-invalid={
              Boolean(tab === 'library' ? errors.date : newErrors.date) || undefined
            }
          />
        </Field>

        {tab === 'library' ? (
          <form
            id="add-session-calendar-form"
            role="tabpanel"
            aria-labelledby="add-session-tab-library"
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            {createMutation.isError ? (
              <ErrorAlert
                title="Não foi possível adicionar"
                message={getApiErrorMessage(createMutation.error)}
              />
            ) : null}

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
                  placeholder="Buscar treino por nome, tipo ou atleta…"
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
                  Nenhum treino encontrado. Ajuste a busca, crie um treino novo na outra aba ou
                  cadastre um treino na biblioteca.
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
                            {workout.athleteName ? ` · Individual · ${workout.athleteName}` : ''}
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
        ) : (
          <form
            id="add-session-new-workout-form"
            role="tabpanel"
            aria-labelledby="add-session-tab-new"
            onSubmit={handleCreateNew}
            className="space-y-4"
            noValidate
          >
            <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-3 text-xs text-ink-800">
              O construtor abre com <strong>{athleteName}</strong> e a data escolhida
              preenchidos. Ao salvar, a sessão volta para o calendário já agendada.
            </div>

            <Field
              label="Nome do treino"
              htmlFor="calendar-new-workout-name"
              error={newErrors.name}
              required
            >
              <Input
                id="calendar-new-workout-name"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value)
                  setNewErrors((current) => ({ ...current, name: undefined }))
                }}
                placeholder="ex.: Intervalado 6×400 m"
                aria-invalid={Boolean(newErrors.name) || undefined}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Esporte" htmlFor="calendar-new-workout-sport" required>
                <Select
                  id="calendar-new-workout-sport"
                  value={newSport}
                  onChange={(event) => {
                    const value = event.target.value
                    setNewSport(value === 'BIKE' || value === 'SWIM' ? value : 'RUN')
                  }}
                >
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {SPORT_LABELS[sport]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Tipo" htmlFor="calendar-new-workout-type" required>
                <Select
                  id="calendar-new-workout-type"
                  value={newType}
                  onChange={(event) => setNewType(event.target.value as WorkoutType)}
                >
                  {WORKOUT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {WORKOUT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <p className="text-[11px] text-ink-500">
              Blocos, steps e alvos (com as faixas reais do atleta) são definidos no construtor.
            </p>
          </form>
        )}
      </div>
    </Modal>
  )
}
