import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { getApiErrorMessage, isNotFoundError } from '../../api/client'
import { activitiesApi } from '../../api/endpoints'
import type { ActivitySummary } from '../../api/types'
import { ActivityImportModal } from '../activity/ActivityImportModal'
import { ActivityList } from '../activity/ActivityList'
import { EmptyState } from '../EmptyState'
import { ErrorAlert } from '../ErrorAlert'
import { Skeleton } from '../Feedback'
import { ToastStack, useToasts } from '../Toast'
import { Button } from '../ui/Button'

interface AthleteActivitiesTabProps {
  athleteId: string
  athleteName: string
  /** Importação disponível para o treinador e para o próprio atleta. */
  canImport: boolean
  onChanged: () => void
}

/** Aba "Atividades" da ficha: importação e lista de treinos executados. */
export function AthleteActivitiesTab({
  athleteId,
  athleteName,
  canImport,
  onChanged,
}: AthleteActivitiesTabProps) {
  const queryClient = useQueryClient()
  const { toasts, push, dismiss } = useToasts()
  const [importOpen, setImportOpen] = useState(false)

  const activitiesQuery = useQuery({
    queryKey: ['activities', athleteId],
    queryFn: () => activitiesApi.list({ athleteId }),
    retry: false,
  })

  const activities = activitiesQuery.data ?? []
  const notFound = isNotFoundError(activitiesQuery.error)

  function handleImported(created: ActivitySummary) {
    push('success', `Atividade "${created.name}" importada com sucesso.`)
    void queryClient.invalidateQueries({ queryKey: ['activities'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['planned'] })
    void queryClient.invalidateQueries({ queryKey: ['overview', athleteId] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    onChanged()
  }

  return (
    <div className="space-y-4" data-testid="athlete-activities-tab">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Atividades</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Treinos executados de {athleteName}, com link para a análise completa.
          </p>
        </div>
        {canImport ? (
          <Button onClick={() => setImportOpen(true)}>
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Importar atividade
          </Button>
        ) : null}
      </div>

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
            icon={Activity}
            title="Atividades ainda não disponíveis"
            description="O servidor ainda não expôs o endpoint de atividades. A importação e a análise ficarão disponíveis assim que a v6 do backend estiver ativa."
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
              canImport
                ? 'Importe um arquivo TCX ou GPX para analisar um treino executado, com gráfico, zonas, voltas e comparação com o planejado.'
                : 'Ainda não há atividades importadas para este atleta.'
            }
          />
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-500">
                {activities.length} {activities.length === 1 ? 'atividade' : 'atividades'} ·{' '}
                {canImport ? 'mais recentes primeiro' : 'somente leitura'}
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

      {canImport ? (
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
