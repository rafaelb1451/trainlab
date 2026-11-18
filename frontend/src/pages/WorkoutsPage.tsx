import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Dumbbell, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { workoutsApi } from '../api/endpoints'
import type { Sport, WorkoutScope, WorkoutSummary } from '../api/types'
import { WORKOUT_SCOPES } from '../api/types'
import { ConfirmDialog } from '../components/Feedback'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { PageHeader } from '../components/PageHeader'
import { WorkoutCard } from '../components/WorkoutCard'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { Skeleton } from '../components/Feedback'
import { SPORT_LABELS } from '../lib/labels'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { cn } from '../lib/cn'

const SCOPE_LABELS: Record<WorkoutScope, string> = {
  all: 'Todos',
  library: 'Biblioteca',
  individual: 'Individuais',
}

export function WorkoutsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sport, setSport] = useState<Sport | ''>('')
  const [tag, setTag] = useState('')
  const [scope, setScope] = useState<WorkoutScope>('all')
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSummary | null>(null)
  const debouncedSearch = useDebouncedValue(search, 350)

  const tagsQuery = useQuery({ queryKey: ['workout-tags'], queryFn: workoutsApi.tags })

  const filters = {
    ...(sport ? { sport } : {}),
    ...(debouncedSearch.trim() ? { q: debouncedSearch } : {}),
    ...(tag ? { tag } : {}),
    scope,
  }

  const workoutsQuery = useQuery({
    queryKey: ['workouts', filters],
    queryFn: () => workoutsApi.list(filters),
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => workoutsApi.duplicate(id),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
      setNotice(`Treino duplicado: “${copy.name}”.`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workoutsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
      setDeleteTarget(null)
      setNotice('Treino excluído da biblioteca.')
    },
  })

  const tags = tagsQuery.data ?? []
  const tagOptions = tag && !tags.includes(tag) ? [tag, ...tags] : tags
  const workouts = workoutsQuery.data ?? []
  const hasContentFilters = Boolean(search.trim() || sport || tag)
  const hasFilters = hasContentFilters || scope !== 'all'

  function clearFilters() {
    setSearch('')
    setSport('')
    setTag('')
    setScope('all')
  }

  const actionError = duplicateMutation.error ?? deleteMutation.error

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca de treinos"
        description="Crie, organize e reutilize treinos estruturados para todos os atletas."
        actions={
          <Link to="/workouts/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Novo treino
            </Button>
          </Link>
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

      <div className="rounded-2xl border border-ink-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            role="group"
            aria-label="Origem dos treinos"
            className="flex w-full shrink-0 gap-1 rounded-xl bg-ink-100 p-1 lg:w-auto"
          >
            {WORKOUT_SCOPES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={scope === option}
                onClick={() => setScope(option)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition lg:flex-none',
                  scope === option
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-800',
                )}
              >
                {SCOPE_LABELS[option]}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500"
              aria-hidden="true"
            />
            <label htmlFor="workout-search" className="sr-only">
              Buscar treino por nome
            </label>
            <Input
              id="workout-search"
              placeholder="Buscar por nome do treino…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div>
              <label htmlFor="workout-sport" className="sr-only">
                Filtrar por esporte
              </label>
              <Select
                id="workout-sport"
                value={sport}
                onChange={(event) => {
                  const value = event.target.value
                  setSport(value === 'RUN' || value === 'BIKE' || value === 'SWIM' ? value : '')
                }}
                className="sm:w-44"
              >
                <option value="">Todos os esportes</option>
                {(Object.keys(SPORT_LABELS) as Sport[]).map((item) => (
                  <option key={item} value={item}>
                    {SPORT_LABELS[item]}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="workout-tag" className="sr-only">
                Filtrar por tag
              </label>
              <Select
                id="workout-tag"
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                className="sm:w-44"
              >
                <option value="">Todas as tags</option>
                {tagOptions.map((item) => (
                  <option key={item} value={item}>
                    #{item}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
          <SlidersHorizontal className="h-3.5 w-3.5 text-ink-500" aria-hidden="true" />
          <p className="text-xs text-ink-500">
            {workouts.length} {workouts.length === 1 ? 'treino' : 'treinos'}
            {scope === 'individual'
              ? ' individuais'
              : scope === 'library'
                ? ' na biblioteca'
                : ' entre biblioteca e individuais'}
            {hasContentFilters ? ' (filtrados)' : ''}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Limpar filtros
            </button>
          ) : null}
          {tagsQuery.isError ? (
            <span className="text-xs text-red-600">Não foi possível carregar as tags.</span>
          ) : null}
        </div>
      </div>

      {workoutsQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar os treinos"
          message={getApiErrorMessage(workoutsQuery.error)}
          onRetry={() => void workoutsQuery.refetch()}
        />
      ) : null}

      {workoutsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={hasFilters ? 'Nenhum treino encontrado' : 'Biblioteca vazia'}
          description={
            hasFilters
              ? 'Ajuste a busca e os filtros para encontrar o treino desejado.'
              : 'Monte o primeiro treino estruturado com blocos, steps e alvos por zona.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            ) : (
              <Link to="/workouts/new">
                <Button>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Criar treino
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onDuplicate={(item) => {
                setNotice(null)
                duplicateMutation.mutate(item.id)
              }}
              onDelete={(item) => {
                deleteMutation.reset()
                setDeleteTarget(item)
              }}
              busy={duplicateMutation.isPending || deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir treino"
        description={
          deleteTarget
            ? `O treino “${deleteTarget.name}” será removido da biblioteca. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir treino"
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
