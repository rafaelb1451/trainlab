import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Eye,
  Flame,
  ListChecks,
  Plus,
  Route,
  Save,
  Timer,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage, isNotFoundError } from '../api/client'
import { athletesApi, plannedApi, workoutsApi } from '../api/endpoints'
import type {
  Sport,
  Workout,
  WorkoutCreateInput,
  WorkoutPreview,
  WorkoutType,
} from '../api/types'
import { SPORTS, WORKOUT_TYPES } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { BlockList } from '../components/BlockList'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingState, Skeleton } from '../components/Feedback'
import { StepEditor } from '../components/StepEditor'
import { ZoneDistribution } from '../components/ZoneDistribution'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import {
  formatClock,
  formatDistance,
  formatDurationHuman,
  formatTime,
} from '../lib/format'
import {
  DIFFICULTY_LABELS,
  ROLE_LABELS,
  SPORT_LABELS,
  WORKOUT_TYPE_LABELS,
} from '../lib/labels'
import {
  builderReducer,
  createInitialState,
  estimateDistribution,
  getSelectedStep,
  getStructuralStepCount,
  getTotalDistance,
  getTotalDuration,
  getTotalStepCount,
  parseTags,
  toWorkoutPayload,
  validateBuilder,
  type BuilderInitialState,
} from '../lib/workoutBuilder'

const PREVIEW_TYPE_LABELS: Record<string, string> = {
  HR: 'Frequência cardíaca',
  PACE: 'Pace',
  POWER: 'Potência',
}

function isSport(value: string | null): value is Sport {
  return value !== null && (SPORTS as readonly string[]).includes(value)
}

function isWorkoutType(value: string | null): value is WorkoutType {
  return value !== null && (WORKOUT_TYPES as readonly string[]).includes(value)
}

function initialFromSearchParams(params: URLSearchParams): BuilderInitialState {
  const sport = params.get('sport')
  const type = params.get('type')
  const name = params.get('name')
  return {
    sport: isSport(sport) ? sport : undefined,
    type: isWorkoutType(type) ? type : undefined,
    name: name?.trim() ? name : undefined,
  }
}

function PreviewContent({ preview }: { preview: WorkoutPreview }) {
  const distributionEntries = Object.entries(preview.totals.zoneDistribution ?? {})
    .map(([type, zones]) => ({
      type,
      zones: Object.entries(zones)
        .filter(([, seconds]) => seconds > 0)
        .sort(([a], [b]) => Number(a) - Number(b)),
    }))
    .filter((entry) => entry.zones.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
          {preview.athleteName}
        </span>
        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
          {SPORT_LABELS[preview.sport]}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDurationHuman(preview.totals.durationSec)}
        </span>
        {preview.totals.distanceM > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
            <Route className="h-3.5 w-3.5" aria-hidden="true" />
            {formatDistance(preview.totals.distanceM)}
          </span>
        ) : null}
      </div>

      {distributionEntries.length > 0 ? (
        <div className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Distribuição de zonas
          </h3>
          <div className="mt-2 space-y-1.5">
            {distributionEntries.map((entry) => (
              <p key={entry.type} className="text-xs text-ink-600">
                <span className="font-semibold text-ink-800">
                  {PREVIEW_TYPE_LABELS[entry.type] ?? entry.type}:
                </span>{' '}
                {entry.zones
                  .map(([zone, seconds]) => `Z${zone} ${formatDurationHuman(seconds)}`)
                  .join(' · ')}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {preview.blocks.length === 0 ? (
          <p className="text-sm text-ink-500">Este treino ainda não tem blocos.</p>
        ) : (
          preview.blocks.map((block, blockIndex) => (
            <div
              key={`${blockIndex}-${block.title ?? 'bloco'}`}
              className="overflow-hidden rounded-2xl border border-ink-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 bg-ink-50 px-4 py-2.5">
                <h4 className="text-sm font-semibold text-ink-800">
                  Bloco {blockIndex + 1}
                  {block.title ? ` · ${block.title}` : ''}
                </h4>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                  {block.repeatCount}×
                </span>
              </div>
              <div className="divide-y divide-ink-100">
                {block.steps.map((step, stepIndex) => {
                  const duration =
                    step.durationType === 'TIME'
                      ? formatClock(step.durationSec)
                      : step.durationType === 'DISTANCE'
                        ? formatDistance(step.distanceM)
                        : 'Aberta'
                  return (
                    <div
                      key={`${stepIndex}-${step.role}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5"
                    >
                      <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        {ROLE_LABELS[step.role]}
                      </span>
                      <span className="w-20 shrink-0 font-mono text-xs text-ink-600">
                        {duration}
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-ink-800">
                        {step.target.display ?? step.target.zoneName ?? '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function WorkoutBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const isCoach = user?.role !== 'ATHLETE'
  const isAthleteUser = user?.role === 'ATHLETE'

  const urlAthleteId = searchParams.get('athleteId') ?? ''
  const urlDate = searchParams.get('date') ?? ''

  const [state, dispatch] = useReducer(builderReducer, undefined, () =>
    createInitialState(initialFromSearchParams(searchParams)),
  )
  const [tagsInput, setTagsInput] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [previewAthleteId, setPreviewAthleteId] = useState(urlAthleteId)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(urlDate)

  const workoutQuery = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutsApi.get(id ?? ''),
    enabled: Boolean(id),
  })

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
    enabled: isCoach,
  })

  // O atleta dono do treino é imutável depois da criação. Para o treinador o
  // contexto vem da URL (create) ou do próprio treino carregado (edit); para o
  // atleta logado usamos sempre o perfil vinculado à conta.
  const lockedAthleteId = workoutQuery.data?.athleteId ?? null
  const contextAthleteId = isAthleteUser
    ? (user?.athleteId ?? '')
    : (lockedAthleteId ?? urlAthleteId)

  const athleteZonesQuery = useQuery({
    queryKey: ['zones', contextAthleteId],
    queryFn: () => athletesApi.getZones(contextAthleteId),
    enabled: Boolean(contextAthleteId),
  })

  const athleteThresholdsQuery = useQuery({
    queryKey: ['thresholds', contextAthleteId],
    queryFn: () => athletesApi.getThresholds(contextAthleteId),
    enabled: Boolean(contextAthleteId),
  })

  useEffect(() => {
    if (!id) {
      if (state.loadedWorkoutId !== null) {
        dispatch({
          type: 'RESET_NEW',
          initial: initialFromSearchParams(searchParams),
        })
      }
      return
    }
    const workout = workoutQuery.data
    if (workout && state.loadedWorkoutId !== workout.id) {
      dispatch({ type: 'LOAD', workout })
    }
    // `searchParams` não entra nas dependências: o reset só precisa dos params
    // do momento em que a rota muda de edição para criação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, workoutQuery.data, state.loadedWorkoutId])

  // Mantém a URL coerente ao abrir um treino individual sem `athleteId` e
  // garante que um treino existente nunca seja editado com zonas de outro atleta.
  useEffect(() => {
    if (!isCoach || !id) return
    const ownedAthleteId = workoutQuery.data?.athleteId
    if (!ownedAthleteId || urlAthleteId === ownedAthleteId) return
    const next = new URLSearchParams(searchParams)
    next.set('athleteId', ownedAthleteId)
    setSearchParams(next, { replace: true })
  }, [isCoach, id, workoutQuery.data?.athleteId, urlAthleteId, searchParams, setSearchParams])

  // Sincroniza o campo de tags apenas quando um treino é carregado/trocado,
  // sem interferir na digitação do usuário.
  useEffect(() => {
    setTagsInput(state.tags.join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loadedWorkoutId])

  // O contexto do cabeçalho também é o atleta padrão da pré-visualização.
  useEffect(() => {
    setPreviewAthleteId(contextAthleteId)
  }, [contextAthleteId])

  const athletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data])
  const contextAthlete = athletes.find((athlete) => athlete.id === contextAthleteId) ?? null
  const contextAthleteName =
    contextAthlete?.displayName ??
    (lockedAthleteId ? workoutQuery.data?.athleteName : null) ??
    (isAthleteUser ? (user?.name ?? null) : null)

  const athleteContext = contextAthleteId
    ? {
        name: contextAthleteName,
        zones: athleteZonesQuery.data ?? [],
        thresholds: athleteThresholdsQuery.data ?? [],
        loading: athleteZonesQuery.isLoading || athleteThresholdsQuery.isLoading,
        error: athleteZonesQuery.isError || athleteThresholdsQuery.isError,
      }
    : null

  function updateSearchParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  function handleAthleteChange(nextAthleteId: string) {
    updateSearchParams({
      athleteId: nextAthleteId || null,
      // Sem atleta não há como agendar; limpa a data para não deixar um estado
      // inválido no cabeçalho.
      date: nextAthleteId ? scheduleDate || null : null,
    })
    if (!nextAthleteId) setScheduleDate('')
    previewMutation.reset()
  }

  function handleScheduleDate(value: string) {
    setScheduleDate(value)
    updateSearchParams({ date: value || null })
  }

  function invalidateWorkoutData() {
    void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    void queryClient.invalidateQueries({ queryKey: ['workout-tags'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['planned'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['overview'] })
  }

  const saveMutation = useMutation({
    mutationFn: async (): Promise<Workout> => {
      const payload = toWorkoutPayload(state)
      if (id) return workoutsApi.update(id, payload)
      const input: WorkoutCreateInput = {
        ...payload,
        athleteId: contextAthleteId || null,
      }
      return workoutsApi.create(input)
    },
    onSuccess: (saved) => {
      dispatch({
        type: 'MARK_SAVED',
        savedAt: new Date().toISOString(),
        workoutId: saved.id,
        estimatedTss: saved.estimatedTss ?? null,
      })
      queryClient.setQueryData(['workout', saved.id], saved)
      invalidateWorkoutData()
      setValidationErrors([])
      if (!id) {
        navigate(`/workouts/${saved.id}`, { replace: true })
      }
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: async (): Promise<{ workoutId: string }> => {
      const payload = toWorkoutPayload(state)
      if (!id) {
        // Fluxo atômico da v5: cria o treino individual e a sessão de uma vez.
        const assigned = await workoutsApi.assign({
          athleteId: contextAthleteId,
          scheduledDate: scheduleDate,
          workout: payload,
        })
        return { workoutId: assigned.workoutId }
      }
      // Edição: salva as alterações e agenda o treino existente para o atleta.
      const saved = await workoutsApi.update(id, payload)
      await plannedApi.create({
        athleteId: contextAthleteId,
        workoutId: saved.id,
        scheduledDate: scheduleDate,
      })
      return { workoutId: saved.id }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workouts'] }),
        queryClient.invalidateQueries({ queryKey: ['workout-tags'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['planned'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['athletes'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
      ])
      const params = new URLSearchParams({
        athleteId: contextAthleteId,
        date: scheduleDate,
      })
      navigate(`/plan?${params.toString()}`, {
        state: { toast: id ? 'Treino salvo e agendado' : 'Treino criado e agendado' },
      })
    },
  })

  const previewMutation = useMutation({
    mutationFn: (params: { workoutId: string; athleteId: string }) =>
      workoutsApi.preview(params.workoutId, params.athleteId),
    onSuccess: () => setPreviewOpen(true),
  })

  const selected = getSelectedStep(state)
  const totalDuration = getTotalDuration(state.blocks)
  const totalSteps = getTotalStepCount(state.blocks)
  const structuralSteps = getStructuralStepCount(state.blocks)
  const totalDistance = getTotalDistance(state.blocks)
  const distribution = estimateDistribution(state.blocks, state.sport)
  const zoneNames = new Map(
    (athleteZonesQuery.data ?? [])
      .filter((zone) => zone.sport === state.sport)
      .map((zone) => [`${zone.type}:${zone.zoneNumber}`, zone.name]),
  )

  const isSaving = saveMutation.isPending || scheduleMutation.isPending
  const mutationError = saveMutation.error ?? scheduleMutation.error
  const mutationNotFound = isNotFoundError(mutationError)
  const willSchedule = Boolean(scheduleDate && contextAthleteId && isCoach)

  function handleSave() {
    const errors = validateBuilder(state)
    if (scheduleDate && !contextAthleteId) {
      errors.push('Escolha um atleta no cabeçalho para agendar o treino.')
    }
    setValidationErrors(errors)
    if (errors.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (willSchedule) {
      scheduleMutation.mutate()
    } else {
      saveMutation.mutate()
    }
  }

  function handlePreview() {
    if (!id || !previewAthleteId) return
    previewMutation.mutate({ workoutId: id, athleteId: previewAthleteId })
  }

  const waitingForWorkout =
    Boolean(id) && workoutQuery.isSuccess && state.loadedWorkoutId !== id

  if (id && !state.loadedWorkoutId && (workoutQuery.isLoading || waitingForWorkout)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (id && workoutQuery.isError && !state.loadedWorkoutId) {
    return (
      <div className="space-y-4">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para a biblioteca
        </Link>
        <ErrorAlert
          title="Não foi possível carregar o treino"
          message={getApiErrorMessage(workoutQuery.error)}
          onRetry={() => void workoutQuery.refetch()}
        />
      </div>
    )
  }

  const statusLabel = isSaving
    ? willSchedule
      ? 'Criando e agendando…'
      : 'Salvando…'
    : state.dirty
      ? 'Alterações não salvas'
      : state.savedAt
        ? `Salvo às ${formatTime(state.savedAt)}`
        : id
          ? 'Salvo'
          : 'Rascunho'

  const statusTone = isSaving ? 'bg-accent-400' : state.dirty ? 'bg-accent-400' : 'bg-brand-500'
  // Em edição, o vínculo do treino só existe quando ele já nasceu individual;
  // escolher um atleta apenas contextualiza zonas/pré-visualização.
  const isIndividualWorkout = id ? Boolean(lockedAthleteId) : Boolean(contextAthleteId)
  const title = isIndividualWorkout
    ? id
      ? `Editar treino individualizado${contextAthleteName ? ` — ${contextAthleteName}` : ''}`
      : `Novo treino individualizado${contextAthleteName ? ` — ${contextAthleteName}` : ''}`
    : id
      ? 'Editar treino'
      : 'Novo treino'

  return (
    <div className="space-y-5 pb-64 lg:pb-48">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/workouts"
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Biblioteca de treinos
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 data-testid="builder-title" className="text-2xl font-bold text-ink-900">
              {title}
            </h1>
            {isIndividualWorkout ? (
              <span
                data-testid="builder-athlete-badge"
                className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-bold text-ink-900 ring-1 ring-inset ring-accent-300"
              >
                <UserRound className="h-3 w-3" aria-hidden="true" />
                Individual{contextAthleteName ? ` · ${contextAthleteName}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold text-ink-600">
                Biblioteca
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {contextAthleteId
              ? 'Os alvos por zona e percentual são resolvidos com as faixas reais do atleta.'
              : 'Treino compartilhado da biblioteca, sem vínculo com um atleta.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
            <span className={`h-1.5 w-1.5 rounded-full ${statusTone}`} aria-hidden="true" />
            {statusLabel}
          </span>
          <Button onClick={handleSave} loading={isSaving}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {willSchedule ? 'Salvar e agendar' : 'Salvar treino'}
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 ? (
        <ErrorAlert
          title="Revise o treino antes de salvar"
          message={validationErrors.join(' ')}
        />
      ) : null}

      {mutationError ? (
        <ErrorAlert
          title={
            mutationNotFound
              ? 'Recurso de agendamento indisponível'
              : 'Não foi possível salvar o treino'
          }
          message={
            mutationNotFound
              ? 'O backend não expôs o endpoint necessário (404). Você pode limpar o campo "Agendar para" e salvar o treino normalmente.'
              : getApiErrorMessage(mutationError)
          }
          onRetry={handleSave}
        />
      ) : null}

      <Card className="border-brand-100 bg-brand-50/40 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <Field
              label="Atleta"
              htmlFor="builder-athlete"
              hint={
                lockedAthleteId
                  ? 'Atleta definido na criação do treino individual.'
                  : id
                    ? contextAthleteId
                      ? 'Contexto de zonas e agendamento; o treino continua na biblioteca.'
                      : 'Treino de biblioteca; escolha um atleta para conferir as faixas.'
                    : contextAthleteId
                      ? 'O treino será salvo como individual deste atleta.'
                      : 'Sem atleta o treino entra na biblioteca compartilhada.'
              }
            >
              {isCoach ? (
                <Select
                  id="builder-athlete"
                  value={contextAthleteId}
                  onChange={(event) => handleAthleteChange(event.target.value)}
                  disabled={Boolean(lockedAthleteId) || athletesQuery.isLoading}
                >
                  <option value="">Biblioteca (sem atleta)</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.displayName}
                    </option>
                  ))}
                  {contextAthleteId && !contextAthlete ? (
                    <option value={contextAthleteId}>
                      {contextAthleteName ?? 'Atleta selecionado'}
                    </option>
                  ) : null}
                </Select>
              ) : (
                <div className="flex h-10 items-center rounded-xl border border-ink-200 bg-white px-3.5 text-sm font-semibold text-ink-800">
                  {contextAthleteName ?? user?.name ?? 'Meu perfil'}
                </div>
              )}
            </Field>

            <Field
              label="Agendar para"
              htmlFor="builder-schedule-date"
              hint={
                contextAthleteId
                  ? 'Opcional. Preenchido, cria o treino individual e já agenda no calendário.'
                  : 'Escolha um atleta para habilitar o agendamento.'
              }
            >
              <Input
                id="builder-schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(event) => handleScheduleDate(event.target.value)}
                disabled={!isCoach}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {contextAthleteId ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-800 ring-1 ring-inset ring-brand-200">
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {contextAthleteName ?? 'Atleta'}
              </span>
            ) : null}
            {athleteZonesQuery.isFetching || athleteThresholdsQuery.isFetching ? (
              <span className="text-[11px] font-medium text-ink-500">Carregando faixas…</span>
            ) : contextAthleteId && (athleteZonesQuery.isError || athleteThresholdsQuery.isError) ? (
              <span className="text-[11px] font-medium text-accent-700">
                Faixas indisponíveis — o treino continua editável.
              </span>
            ) : null}
            {willSchedule ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-600">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Será agendado no calendário
              </span>
            ) : null}
          </div>
        </div>

        {athletesQuery.isError ? (
          <p className="mt-3 text-xs font-medium text-accent-700">
            Não foi possível carregar os atletas.{' '}
            <button
              type="button"
              onClick={() => void athletesQuery.refetch()}
              className="font-semibold underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </p>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px_170px_150px]">
          <Field label="Nome do treino" htmlFor="builder-name" required>
            <Input
              id="builder-name"
              value={state.name}
              onChange={(event) => dispatch({ type: 'SET_NAME', value: event.target.value })}
              placeholder="ex.: Intervalado 5×1000 m"
              className="h-11 text-base font-semibold"
              aria-invalid={validationErrors.some((error) => error.includes('nome')) || undefined}
            />
          </Field>

          <Field label="Esporte" htmlFor="builder-sport">
            <Select
              id="builder-sport"
              value={state.sport}
              onChange={(event) => {
                const value = event.target.value
                const sport: Sport = value === 'BIKE' || value === 'SWIM' ? value : 'RUN'
                dispatch({ type: 'SET_SPORT', value: sport })
              }}
            >
              {SPORTS.map((sport) => (
                <option key={sport} value={sport}>
                  {SPORT_LABELS[sport]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tipo" htmlFor="builder-type">
            <Select
              id="builder-type"
              value={state.type}
              onChange={(event) =>
                dispatch({ type: 'SET_TYPE', value: event.target.value as WorkoutType })
              }
            >
              {WORKOUT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {WORKOUT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Dificuldade" htmlFor="builder-difficulty">
            <Select
              id="builder-difficulty"
              value={state.difficulty}
              onChange={(event) =>
                dispatch({ type: 'SET_DIFFICULTY', value: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  {level} · {DIFFICULTY_LABELS[level]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <Field label="Tags" htmlFor="builder-tags" hint="Separe por vírgulas.">
              <Input
                id="builder-tags"
                value={tagsInput}
                onChange={(event) => {
                  setTagsInput(event.target.value)
                  dispatch({ type: 'SET_TAGS', value: parseTags(event.target.value) })
                }}
                placeholder="ex.: intervalado, vo2, semana 3"
              />
            </Field>
            {state.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <Field label="Descrição" htmlFor="builder-description">
            <Textarea
              id="builder-description"
              value={state.description}
              onChange={(event) =>
                dispatch({ type: 'SET_DESCRIPTION', value: event.target.value })
              }
              placeholder="Objetivo do treino, orientações gerais…"
              className="min-h-20"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
          <Eye className="h-4 w-4 text-ink-500" aria-hidden="true" />
          <label htmlFor="preview-athlete" className="text-xs font-semibold text-ink-700">
            Pré-visualizar para atleta
          </label>
          {isCoach ? (
            <Select
              id="preview-athlete"
              value={previewAthleteId}
              onChange={(event) => {
                setPreviewAthleteId(event.target.value)
                previewMutation.reset()
              }}
              className="w-full sm:w-56"
              disabled={athletesQuery.isLoading}
            >
              <option value="">Selecione um atleta</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.displayName}
                </option>
              ))}
            </Select>
          ) : (
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">
              {contextAthleteName ?? user?.name ?? 'Meu perfil'}
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handlePreview}
            disabled={!id || !previewAthleteId}
            loading={previewMutation.isPending}
            title={!id ? 'Salve o treino para liberar a pré-visualização.' : undefined}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Ver alvos resolvidos
          </Button>
          {!id ? (
            <span className="text-[11px] text-accent-700">
              Salve o treino para liberar a pré-visualização.
            </span>
          ) : null}
          {athletesQuery.isError ? (
            <span className="text-[11px] text-accent-700">
              Não foi possível carregar os atletas para pré-visualizar.
            </span>
          ) : null}
          {previewMutation.isError ? (
            <span className="text-[11px] font-medium text-red-600">
              {getApiErrorMessage(previewMutation.error)}
            </span>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="structure-title" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="structure-title" className="text-base font-bold text-ink-900">
                Estrutura do treino
              </h2>
              <p className="text-xs text-ink-500">
                {state.blocks.length} {state.blocks.length === 1 ? 'bloco' : 'blocos'} ·{' '}
                {structuralSteps} {structuralSteps === 1 ? 'step' : 'steps'} · {totalSteps} com
                repetições
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'ADD_BLOCK' })}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Adicionar bloco
            </Button>
          </div>

          <BlockList
            blocks={state.blocks}
            sport={state.sport}
            selectedStepKey={state.selectedStepKey}
            onSelectStep={(blockKey, stepKey) =>
              dispatch({ type: 'SELECT_STEP', blockKey, stepKey })
            }
            onAddStep={(blockKey) => dispatch({ type: 'ADD_STEP', blockKey })}
            onRemoveBlock={(blockKey) => dispatch({ type: 'REMOVE_BLOCK', blockKey })}
            onUpdateBlock={(blockKey, patch) =>
              dispatch({ type: 'UPDATE_BLOCK', blockKey, patch })
            }
            onMoveBlock={(activeKey, overKey) =>
              dispatch({ type: 'MOVE_BLOCK', activeKey, overKey })
            }
            onMoveStep={(activeKey, targetBlockKey, targetStepKey) =>
              dispatch({ type: 'MOVE_STEP', activeKey, targetBlockKey, targetStepKey })
            }
          />
        </section>

        <aside className="min-w-0" aria-label="Editor do step selecionado">
          {selected ? (
            <StepEditor
              key={selected.step.key}
              step={selected.step}
              sport={state.sport}
              blockTitle={selected.block.title}
              athleteContext={athleteContext}
              onChange={(patch) =>
                dispatch({
                  type: 'UPDATE_STEP',
                  blockKey: selected.block.key,
                  stepKey: selected.step.key,
                  patch,
                })
              }
              onChangeTarget={(patch) =>
                dispatch({
                  type: 'UPDATE_TARGET',
                  blockKey: selected.block.key,
                  stepKey: selected.step.key,
                  patch,
                })
              }
              onDelete={() =>
                dispatch({
                  type: 'REMOVE_STEP',
                  blockKey: selected.block.key,
                  stepKey: selected.step.key,
                })
              }
              onDuplicate={() =>
                dispatch({
                  type: 'DUPLICATE_STEP',
                  blockKey: selected.block.key,
                  stepKey: selected.step.key,
                })
              }
            />
          ) : (
            <Card className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
              <ListChecks className="h-8 w-8 text-ink-300" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-ink-800">Nenhum step selecionado</h2>
              <p className="mt-1 max-w-xs text-xs text-ink-500">
                Selecione um step na estrutura do treino para editar papel, duração e alvo.
              </p>
            </Card>
          )}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 shadow-[0_-8px_30px_-20px_rgba(11,31,58,0.5)] backdrop-blur md:left-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
            <div className="flex flex-shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Duração total
                </p>
                <p className="text-lg font-bold tabular-nums text-ink-900">
                  {formatDurationHuman(totalDuration)}
                </p>
                <p className="font-mono text-[10px] text-ink-500">{formatClock(totalDuration)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  <ListChecks className="h-3 w-3" aria-hidden="true" />
                  Steps
                </p>
                <p className="text-lg font-bold tabular-nums text-ink-900">{totalSteps}</p>
                <p className="text-[10px] text-ink-500">{structuralSteps} na estrutura</p>
              </div>
              <div data-testid="builder-estimated-tss">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  <Flame className="h-3 w-3 text-accent-600" aria-hidden="true" />
                  TSS estimado
                </p>
                <p className="text-lg font-bold tabular-nums text-ink-900">
                  {state.estimatedTss !== null ? state.estimatedTss : '—'}
                </p>
                <p className="text-[10px] text-ink-500">
                  {state.estimatedTss !== null ? 'calculado pelo servidor' : 'salve para calcular'}
                </p>
              </div>
              {totalDistance > 0 ? (
                <div>
                  <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    <Route className="h-3 w-3" aria-hidden="true" />
                    Distância
                  </p>
                  <p className="text-lg font-bold tabular-nums text-ink-900">
                    {formatDistance(totalDistance)}
                  </p>
                  <p className="text-[10px] text-ink-500">steps por distância</p>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 border-t border-ink-100 pt-2.5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                Distribuição estimada de zonas
                {contextAthleteName ? ` · ${contextAthleteName}` : ''}
              </p>
              <ZoneDistribution groups={distribution} zoneNames={zoneNames} />
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Pré-visualização para atleta"
        description="Alvos absolutos resolvidos a partir dos limiares e zonas do atleta."
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>
            Fechar
          </Button>
        }
      >
        {previewMutation.isPending ? (
          <LoadingState label="Resolvendo alvos…" />
        ) : previewMutation.isError ? (
          <ErrorAlert
            title="Não foi possível pré-visualizar"
            message={getApiErrorMessage(previewMutation.error)}
            onRetry={handlePreview}
          />
        ) : previewMutation.data ? (
          <PreviewContent preview={previewMutation.data} />
        ) : (
          <p className="text-sm text-ink-500">Selecione um atleta para visualizar os alvos.</p>
        )}
      </Modal>
    </div>
  )
}
