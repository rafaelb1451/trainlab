import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Clock,
  Eye,
  ListChecks,
  Plus,
  Route,
  Save,
  Timer,
} from 'lucide-react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi, workoutsApi } from '../api/endpoints'
import type {
  Sport,
  Workout,
  WorkoutPayload,
  WorkoutPreview,
  WorkoutType,
} from '../api/types'
import { SPORTS, WORKOUT_TYPES } from '../api/types'
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
} from '../lib/workoutBuilder'

const PREVIEW_TYPE_LABELS: Record<string, string> = {
  HR: 'Frequência cardíaca',
  PACE: 'Pace',
  POWER: 'Potência',
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
  const [state, dispatch] = useReducer(builderReducer, undefined, createInitialState)
  const [tagsInput, setTagsInput] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [previewAthleteId, setPreviewAthleteId] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const createdWorkoutIdRef = useRef<string | null>(null)

  const workoutQuery = useQuery({
    queryKey: ['workout', id],
    queryFn: () => workoutsApi.get(id ?? ''),
    enabled: Boolean(id),
  })

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
  })

  const athleteZonesQuery = useQuery({
    queryKey: ['zones', previewAthleteId],
    queryFn: () => athletesApi.getZones(previewAthleteId),
    enabled: Boolean(previewAthleteId),
  })

  useEffect(() => {
    if (!id) {
      if (state.loadedWorkoutId !== null) {
        dispatch({ type: 'RESET_NEW' })
      }
      createdWorkoutIdRef.current = null
      return
    }
    const workout = workoutQuery.data
    if (workout && state.loadedWorkoutId !== workout.id) {
      dispatch({ type: 'LOAD', workout })
    }
  }, [id, workoutQuery.data, state.loadedWorkoutId])

  // Sincroniza o campo de tags apenas quando um treino é carregado/trocado,
  // sem interferir na digitação do usuário.
  useEffect(() => {
    setTagsInput(state.tags.join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loadedWorkoutId])

  const saveMutation = useMutation({
    mutationFn: async (payload: WorkoutPayload): Promise<Workout> => {
      if (id) {
        return workoutsApi.update(id, payload)
      }
      const existingId = createdWorkoutIdRef.current
      const createdId =
        existingId ??
        (
          await workoutsApi.create({
            name: payload.name,
            sport: payload.sport,
            type: payload.type,
            description: payload.description,
            tags: payload.tags,
            difficulty: payload.difficulty,
          })
        ).id
      createdWorkoutIdRef.current = createdId
      return workoutsApi.update(createdId, payload)
    },
    onSuccess: (saved) => {
      dispatch({ type: 'MARK_SAVED', savedAt: new Date().toISOString(), workoutId: saved.id })
      queryClient.setQueryData(['workout', saved.id], saved)
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
      void queryClient.invalidateQueries({ queryKey: ['workout-tags'] })
      setValidationErrors([])
      createdWorkoutIdRef.current = null
      if (!id) {
        navigate(`/workouts/${saved.id}`, { replace: true })
      }
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
    (athleteZonesQuery.data ?? []).map((zone) => [
      `${zone.type}:${zone.zoneNumber}`,
      zone.name,
    ]),
  )

  function handleSave() {
    const errors = validateBuilder(state)
    setValidationErrors(errors)
    if (errors.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    saveMutation.mutate(toWorkoutPayload(state))
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

  const statusLabel = saveMutation.isPending
    ? 'Salvando…'
    : state.dirty
      ? 'Alterações não salvas'
      : state.savedAt
        ? `Salvo às ${formatTime(state.savedAt)}`
        : id
          ? 'Salvo'
          : 'Rascunho'

  const statusTone = saveMutation.isPending
    ? 'bg-accent-400'
    : state.dirty
      ? 'bg-accent-400'
      : 'bg-brand-500'

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
          <h1 className="mt-1 text-2xl font-bold text-ink-900">
            {id ? 'Editar treino' : 'Novo treino'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-ink-600">
            <span className={`h-1.5 w-1.5 rounded-full ${statusTone}`} aria-hidden="true" />
            {statusLabel}
          </span>
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Salvar treino
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 ? (
        <ErrorAlert
          title="Revise o treino antes de salvar"
          message={validationErrors.join(' ')}
        />
      ) : null}

      {saveMutation.isError ? (
        <ErrorAlert
          title="Não foi possível salvar o treino"
          message={getApiErrorMessage(saveMutation.error)}
          onRetry={() => saveMutation.mutate(toWorkoutPayload(state))}
        />
      ) : null}

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
            {(athletesQuery.data ?? []).map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.displayName}
              </option>
            ))}
          </Select>
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
                {previewAthleteId
                  ? ` · ${(athletesQuery.data ?? []).find((athlete) => athlete.id === previewAthleteId)?.displayName ?? ''}`
                  : ''}
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
