import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LineChart, UploadCloud } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage, isNotFoundError } from '../api/client'
import { activitiesApi, athletesApi } from '../api/endpoints'
import type { ActivitySummary } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { ActivityImportModal } from '../components/activity/ActivityImportModal'
import { ActivityList } from '../components/activity/ActivityList'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { ToastStack, useToasts } from '../components/Toast'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'

/** Tela "Análises": atividades executadas por atleta, com importação. */
export function ActivitiesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { toasts, push, dismiss } = useToasts()
  const isCoach = user?.role !== 'ATHLETE'
  const [importOpen, setImportOpen] = useState(false)

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
    enabled: isCoach,
  })
  const athletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data])

  const [athleteId, setAthleteId] = useState(() =>
    user?.role === 'ATHLETE'
      ? (user.athleteId ?? '')
      : (searchParams.get('athleteId') ?? ''),
  )

  useEffect(() => {
    if (!isCoach) return
    if (athletes.length === 0) return
    if (athleteId && athletes.some((athlete) => athlete.id === athleteId)) return
    setAthleteId(athletes[0].id)
  }, [isCoach, athleteId, athletes])

  useEffect(() => {
    if (!isCoach) setAthleteId(user?.athleteId ?? '')
  }, [isCoach, user?.athleteId])

  const activitiesQuery = useQuery({
    queryKey: ['activities', athleteId],
    queryFn: () => activitiesApi.list({ athleteId }),
    enabled: Boolean(athleteId),
    retry: false,
  })

  const activities = activitiesQuery.data ?? []
  const selectedAthlete = athletes.find((athlete) => athlete.id === athleteId) ?? null
  const athleteName = (isCoach ? selectedAthlete?.displayName : user?.name) ?? 'Atleta'
  const notFound = isNotFoundError(activitiesQuery.error)

  function handleImported(created: ActivitySummary) {
    push('success', `Atividade "${created.name}" importada com sucesso.`)
    void queryClient.invalidateQueries({ queryKey: ['activities'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['planned'] })
    void queryClient.invalidateQueries({ queryKey: ['overview'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  return (
    <div className="space-y-5" data-testid="activities-page">
      <PageHeader
        eyebrow="Treinos executados"
        title="Análises"
        description={
          isCoach
            ? 'Importe atividades e abra a análise completa de cada treino executado.'
            : 'Suas atividades importadas, com gráficos, zonas, voltas e comparação com o planejado.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isCoach ? (
              <div className="flex items-center gap-2">
                <label htmlFor="analyses-athlete" className="sr-only">
                  Atleta
                </label>
                <Select
                  id="analyses-athlete"
                  value={athleteId}
                  onChange={(event) => setAthleteId(event.target.value)}
                  className="w-48"
                  disabled={athletesQuery.isLoading || athletes.length === 0}
                >
                  {athletes.length === 0 ? <option value="">Sem atletas</option> : null}
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.displayName}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
                {user?.name ?? 'Meu perfil'}
              </span>
            )}
            <Button onClick={() => setImportOpen(true)} disabled={!athleteId}>
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Importar atividade
            </Button>
          </div>
        }
      />

      {isCoach && athletesQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar os atletas"
          message={getApiErrorMessage(athletesQuery.error)}
          onRetry={() => void athletesQuery.refetch()}
        />
      ) : null}

      {isCoach && !athletesQuery.isLoading && athletes.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="Nenhum atleta cadastrado"
          description="Cadastre um atleta para importar atividades e analisar treinos executados."
          action={
            <Link to="/athletes">
              <Button size="sm">Ir para atletas</Button>
            </Link>
          }
        />
      ) : null}

      {!isCoach && !athleteId ? (
        <ErrorAlert
          title="Perfil de atleta não vinculado"
          message="Sua conta não está vinculada a um perfil de atleta. Fale com seu treinador."
        />
      ) : null}

      {athleteId ? (
        <>
          {activitiesQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : null}

          {activitiesQuery.isError ? (
            notFound ? (
              <EmptyState
                icon={LineChart}
                title="Análises ainda não disponíveis"
                description="O servidor ainda não expôs o endpoint de atividades. Assim que a v6 do backend estiver ativa, as atividades importadas aparecerão aqui."
                action={
                  <Button variant="outline" onClick={() => void activitiesQuery.refetch()}>
                    Tentar novamente
                  </Button>
                }
              />
            ) : (
              <ErrorAlert
                title="Não foi possível carregar as atividades"
                message={getApiErrorMessage(activitiesQuery.error)}
                onRetry={() => void activitiesQuery.refetch()}
              />
            )
          ) : null}

          {!activitiesQuery.isLoading && !activitiesQuery.isError ? (
            activities.length === 0 ? (
              <EmptyState
                icon={UploadCloud}
                title="Nenhuma atividade importada"
                description={
                  isCoach
                    ? `Importe um TCX ou GPX de ${athleteName} para analisar o treino executado, com zonas, voltas e comparação com o planejado.`
                    : 'Importe um TCX ou GPX para analisar seu treino executado, com zonas, voltas e comparação com o planejado.'
                }
              />
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-ink-500">
                    <span className="font-semibold text-ink-800">{athleteName}</span> ·{' '}
                    {activities.length}{' '}
                    {activities.length === 1 ? 'atividade' : 'atividades'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void activitiesQuery.refetch()}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Atualizar lista
                  </button>
                </div>
                <ActivityList activities={activities} detailed />
              </div>
            )
          ) : null}
        </>
      ) : null}

      {athleteId ? (
        <ActivityImportModal
          open={importOpen}
          athleteId={athleteId}
          athleteName={athleteName}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
