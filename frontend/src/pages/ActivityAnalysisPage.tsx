import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CircleAlert,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiErrorMessage, isNotFoundError } from '../api/client'
import { activitiesApi, athletesApi } from '../api/endpoints'
import type { ActivitySummary } from '../api/types'
import { ActivityAdditionalMetrics } from '../components/activity/ActivityAdditionalMetrics'
import { ActivityChart } from '../components/activity/ActivityChart'
import { ActivityImportModal } from '../components/activity/ActivityImportModal'
import { ActivityLapComparison } from '../components/activity/ActivityLapComparison'
import { ActivityLapsSplits } from '../components/activity/ActivityLapsSplits'
import { ActivityPlanComparison } from '../components/activity/ActivityPlanComparison'
import { ActivitySummaryCards } from '../components/activity/ActivitySummaryCards'
import { ActivityZones } from '../components/activity/ActivityZones'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { ConfirmDialog, Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { ToastStack, useToasts } from '../components/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { cn } from '../lib/cn'
import {
  formatDateLong,
  formatDateShort,
  formatTime,
} from '../lib/format'
import { ACTIVITY_SOURCE_LABELS, SPORT_LABELS } from '../lib/labels'

type AnalysisTab = 'summary' | 'analysis' | 'laps'

const ANALYSIS_TABS: Array<{
  id: AnalysisTab
  label: string
  icon: typeof LayoutDashboard
}> = [
  { id: 'summary', label: 'Resumo', icon: LayoutDashboard },
  { id: 'analysis', label: 'Análise', icon: LineChart },
  { id: 'laps', label: 'Comparação de voltas', icon: ListOrdered },
]

function AnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-80" />
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-48" />
    </div>
  )
}

export function ActivityAnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, push, dismiss } = useToasts()
  const [tab, setTab] = useState<AnalysisTab>('summary')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const analysisQuery = useQuery({
    queryKey: ['activity-analysis', id],
    queryFn: () => activitiesApi.analysis(id ?? ''),
    enabled: Boolean(id),
    retry: false,
  })

  const activityAthleteId = analysisQuery.data?.activity.athleteId
  const athleteZonesQuery = useQuery({
    queryKey: ['zones', activityAthleteId],
    queryFn: () => athletesApi.getZones(activityAthleteId ?? ''),
    enabled: Boolean(activityAthleteId),
    retry: false,
  })

  const deleteMutation = useMutation({
    mutationFn: (activityId: string) => activitiesApi.remove(activityId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activities'] })
      void queryClient.invalidateQueries({ queryKey: ['calendar'] })
      void queryClient.invalidateQueries({ queryKey: ['planned'] })
      const athleteId = analysisQuery.data?.activity.athleteId
      navigate(athleteId ? `/activities?athleteId=${athleteId}` : '/activities', {
        replace: true,
      })
    },
    onError: (error) => {
      setActionError(getApiErrorMessage(error, 'Não foi possível excluir a atividade.'))
      setConfirmOpen(false)
    },
  })

  const analysis = analysisQuery.data
  const activity = analysis?.activity

  if (!id) {
    return (
      <ErrorAlert
        title="Atividade inválida"
        message="Não foi possível identificar a atividade solicitada."
      />
    )
  }

  if (analysisQuery.isLoading) {
    return <AnalysisSkeleton />
  }

  if (analysisQuery.isError || !analysis || !activity) {
    const notFound = isNotFoundError(analysisQuery.error)
    return (
      <div className="space-y-4">
        <Link
          to="/activities"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para análises
        </Link>
        {notFound ? (
          <EmptyState
            icon={LineChart}
            title="Atividade não encontrada"
            description="A atividade pode ter sido removida ou o serviço de análises ainda não está disponível neste servidor."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" onClick={() => void analysisQuery.refetch()}>
                  Tentar novamente
                </Button>
                <Link to="/activities">
                  <Button>Ir para análises</Button>
                </Link>
              </div>
            }
          />
        ) : (
          <ErrorAlert
            title="Não foi possível carregar a análise"
            message={getApiErrorMessage(analysisQuery.error)}
            onRetry={() => void analysisQuery.refetch()}
          />
        )}
      </div>
    )
  }

  const start = new Date(activity.startTime)
  const dateLabel = Number.isNaN(start.getTime())
    ? formatDateLong(activity.startTime)
    : `${formatDateLong(activity.startTime)} · ${formatTime(activity.startTime)}`
  const athleteLabel = activity.athleteName?.trim() || 'Atleta'
  const laps = analysis.laps ?? []
  const splits = analysis.splits ?? []
  const lapSourceLabel =
    (activity.deviceLaps ?? 0) > 0
      ? 'voltas do dispositivo'
      : (activity.userLaps ?? 0) > 0
        ? 'voltas do usuário'
        : null
  const zones = analysis.zones ?? []
  const series = analysis.series ?? []

  function handleImported(created: ActivitySummary) {
    push('success', `Atividade "${created.name}" importada com sucesso.`)
    void queryClient.invalidateQueries({ queryKey: ['activities'] })
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
    void queryClient.invalidateQueries({ queryKey: ['planned'] })
    void queryClient.invalidateQueries({ queryKey: ['overview'] })
    navigate(`/activities/${created.id}`)
  }

  return (
    <div className="space-y-5" data-testid="activity-analysis-page">
      <PageHeader
        eyebrow={`${SPORT_LABELS[activity.sport]} · ${formatDateShort(activity.startTime)}`}
        title={activity.name}
        description={dateLabel}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              Importar atividade
            </Button>
            <Link to={`/activities?athleteId=${activity.athleteId}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>
            </Link>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Excluir
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600">
        <SportBadge sport={activity.sport} />
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-ink-800">Fonte:</span>{' '}
          {ACTIVITY_SOURCE_LABELS[activity.source]}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-ink-800">Atleta:</span> {athleteLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-ink-800">Esporte:</span>{' '}
          {SPORT_LABELS[activity.sport]}
        </span>
        {activity.fileName ? (
          <span className="inline-flex max-w-full items-center gap-1 truncate text-ink-500">
            <span className="font-semibold text-ink-800">Arquivo:</span> {activity.fileName}
          </span>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Seções da análise"
        className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-1 shadow-sm sm:w-fit"
      >
        {ANALYSIS_TABS.map((item) => {
          const isActive = tab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`analysis-tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`analysis-panel-${item.id}`}
              data-testid={`analysis-tab-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                isActive
                  ? 'bg-accent-400 text-ink-900 shadow-sm'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </div>

      {actionError ? (
        <ErrorAlert
          title="Não foi possível excluir a atividade"
          message={actionError}
        />
      ) : null}

      <div
        role="tabpanel"
        id={`analysis-panel-${tab}`}
        aria-labelledby={`analysis-tab-${tab}`}
      >
        {tab === 'summary' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-ink-900">Estatísticas do treino</h2>
              <span className="text-[11px] text-ink-500">
                Duração, distância, carga e métricas principais
              </span>
            </div>
            <ActivitySummaryCards activity={activity} />
            <ActivityZones
              zones={zones}
              athleteZones={athleteZonesQuery.data}
              sport={activity.sport}
            />
            <ActivityAdditionalMetrics activity={activity} />
            <ActivityLapsSplits
              laps={laps}
              splits={splits}
              showSplits={false}
              lapSourceLabel={lapSourceLabel}
            />
          </div>
        ) : null}

        {tab === 'analysis' ? (
          <div className="space-y-4">
            <ActivityChart series={series} sport={activity.sport} />
            <ActivityLapsSplits
              laps={laps}
              splits={splits}
              showLaps={false}
              lapSourceLabel={lapSourceLabel}
            />
            {activity.notes ? (
              <Card className="p-5">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">
                  <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  Observações
                </p>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{activity.notes}</p>
              </Card>
            ) : null}
          </div>
        ) : null}

        {tab === 'laps' ? (
          <div className="space-y-4">
            {analysis.planned ? (
              <ActivityPlanComparison
                activity={activity}
                planned={analysis.planned}
                comparison={analysis.comparison}
              />
            ) : (
              <Card className="px-5 py-4">
                <p className="text-sm font-semibold text-ink-800">
                  Sem treino planejado vinculado
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  A atividade não foi vinculada a uma sessão do planejamento. A comparação de
                  voltas abaixo usa o pace médio da própria atividade como referência.
                </p>
              </Card>
            )}
            <ActivityLapComparison activity={activity} laps={laps} />
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir atividade"
        description={`A atividade "${activity.name}" e suas amostras serão removidas. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir atividade"
        loading={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setConfirmOpen(false)
        }}
        onConfirm={() => deleteMutation.mutate(activity.id)}
      />

      {activity.athleteId ? (
        <ActivityImportModal
          open={importOpen}
          athleteId={activity.athleteId}
          athleteName={athleteLabel}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      ) : null}

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
