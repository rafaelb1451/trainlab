import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  HeartPulse,
  LayoutDashboard,
  LineChart,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthProvider'
import { ErrorAlert } from '../components/ErrorAlert'
import { Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { AthleteActivitiesTab } from '../components/athlete/AthleteActivitiesTab'
import { AthleteMetricsTab } from '../components/athlete/AthleteMetricsTab'
import { AthleteOverviewTab } from '../components/athlete/AthleteOverviewTab'
import { AthletePlanningTab } from '../components/athlete/AthletePlanningTab'
import { AthleteThresholdsTab } from '../components/athlete/AthleteThresholdsTab'
import { cn } from '../lib/cn'

type Tab = 'overview' | 'activities' | 'thresholds' | 'planning' | 'metrics'

const TAB_IDS: Tab[] = ['overview', 'activities', 'thresholds', 'planning', 'metrics']

const TABS: Array<{
  id: Tab
  label: string
  icon: typeof LayoutDashboard
}> = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'activities', label: 'Atividades', icon: LineChart },
  { id: 'thresholds', label: 'Limiares & Zonas', icon: HeartPulse },
  { id: 'planning', label: 'Planejamento', icon: CalendarDays },
  { id: 'metrics', label: 'Métricas', icon: Activity },
]

function tabFromParam(value: string | null): Tab {
  return TAB_IDS.find((tab) => tab === value) ?? 'overview'
}

export function AthleteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const canEdit = user?.role !== 'ATHLETE'
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => tabFromParam(searchParams.get('tab')))

  function selectTab(next: Tab) {
    setTab(next)
    const params = new URLSearchParams(searchParams)
    if (next === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', next)
    }
    setSearchParams(params, { replace: true })
  }

  const athleteQuery = useQuery({
    queryKey: ['athlete', id],
    queryFn: () => athletesApi.get(id ?? ''),
    enabled: Boolean(id),
  })

  const thresholdsQuery = useQuery({
    queryKey: ['thresholds', id],
    queryFn: () => athletesApi.getThresholds(id ?? ''),
    enabled: Boolean(id),
  })

  const zonesQuery = useQuery({
    queryKey: ['zones', id],
    queryFn: () => athletesApi.getZones(id ?? ''),
    enabled: Boolean(id),
  })

  const overviewQuery = useQuery({
    queryKey: ['overview', id],
    queryFn: () => athletesApi.overview(id ?? ''),
    enabled: Boolean(id),
  })

  function refreshAll() {
    if (!id) return
    void queryClient.invalidateQueries({ queryKey: ['thresholds', id] })
    void queryClient.invalidateQueries({ queryKey: ['zones', id] })
    void queryClient.invalidateQueries({ queryKey: ['athlete', id] })
    void queryClient.invalidateQueries({ queryKey: ['overview', id] })
    void queryClient.invalidateQueries({ queryKey: ['athletes'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const athlete = athleteQuery.data

  if (!id) {
    return (
      <ErrorAlert
        title="Atleta inválido"
        message="Não foi possível identificar o atleta solicitado."
      />
    )
  }

  if (athleteQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (athleteQuery.isError || !athlete) {
    return (
      <div className="space-y-4">
        <Link
          to={canEdit ? '/athletes' : '/'}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {canEdit ? 'Voltar para atletas' : 'Voltar para o painel'}
        </Link>
        <ErrorAlert
          title="Não foi possível carregar o atleta"
          message={getApiErrorMessage(athleteQuery.error)}
          onRetry={() => void athleteQuery.refetch()}
        />
      </div>
    )
  }

  const thresholds = thresholdsQuery.data ?? athlete.thresholds ?? []
  const zones = zonesQuery.data ?? []
  const overview = overviewQuery.data

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={canEdit ? '/athletes' : '/'}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {canEdit ? 'Voltar para atletas' : 'Voltar para o painel'}
        </Link>
      </div>

      <PageHeader
        eyebrow="Ficha do atleta"
        title={athlete.displayName}
        description={athlete.email}
        actions={
          <div className="flex flex-wrap gap-1.5">
            {athlete.sports.length > 0 ? (
              athlete.sports.map((sport) => <SportBadge key={sport} sport={sport} />)
            ) : (
              <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600">
                Sem modalidades
              </span>
            )}
          </div>
        }
      />

      <div
        role="tablist"
        aria-label="Seções da ficha do atleta"
        className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-1 shadow-sm sm:w-fit"
      >
        {TABS.map((item) => {
          const isActive = tab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              onClick={() => selectTab(item.id)}
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

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' ? (
          <AthleteOverviewTab
            athlete={athlete}
            overview={overview}
            overviewLoading={overviewQuery.isLoading}
            overviewError={overviewQuery.error}
            onRetryOverview={() => void overviewQuery.refetch()}
            canEdit={canEdit}
            onSaved={refreshAll}
            onGoToMetrics={() => selectTab('metrics')}
            onGoToPlanning={() => selectTab('planning')}
            onGoToActivities={() => selectTab('activities')}
          />
        ) : null}

        {tab === 'activities' ? (
          <AthleteActivitiesTab
            athleteId={athlete.id}
            athleteName={athlete.displayName}
            canImport={canEdit || user?.athleteId === athlete.id}
            onChanged={refreshAll}
          />
        ) : null}

        {tab === 'thresholds' ? (
          <AthleteThresholdsTab
            athleteId={athlete.id}
            initialSport={athlete.sports[0] ?? 'RUN'}
            thresholds={thresholds}
            zones={zones}
            canEdit={canEdit}
            thresholdsLoading={thresholdsQuery.isLoading}
            zonesLoading={zonesQuery.isLoading}
            thresholdsError={thresholdsQuery.error}
            zonesError={zonesQuery.error}
            onRetryThresholds={() => void thresholdsQuery.refetch()}
            onRetryZones={() => void zonesQuery.refetch()}
            onSaved={refreshAll}
          />
        ) : null}

        {tab === 'planning' ? (
          <AthletePlanningTab
            athleteId={athlete.id}
            canEdit={canEdit}
            onChanged={refreshAll}
          />
        ) : null}

        {tab === 'metrics' ? (
          <AthleteMetricsTab athleteId={athlete.id} canEdit={canEdit} onChanged={refreshAll} />
        ) : null}
      </div>
    </div>
  )
}
