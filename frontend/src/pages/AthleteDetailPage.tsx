import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  HeartPulse,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthProvider'
import { ErrorAlert } from '../components/ErrorAlert'
import { Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { AthleteMetricsTab } from '../components/athlete/AthleteMetricsTab'
import { AthleteOverviewTab } from '../components/athlete/AthleteOverviewTab'
import { AthletePlanningTab } from '../components/athlete/AthletePlanningTab'
import { AthleteThresholdsTab } from '../components/athlete/AthleteThresholdsTab'
import { cn } from '../lib/cn'
import { formatAge, formatDateLong, formatEventCountdown } from '../lib/format'
import { SEX_LABELS, SPORT_LABELS } from '../lib/labels'

type Tab = 'overview' | 'thresholds' | 'planning' | 'metrics'

const TABS: Array<{
  id: Tab
  label: string
  icon: typeof LayoutDashboard
}> = [
  { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'thresholds', label: 'Limiares & Zonas', icon: HeartPulse },
  { id: 'planning', label: 'Planejamento', icon: CalendarDays },
  { id: 'metrics', label: 'Métricas', icon: Activity },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function AthleteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const canEdit = user?.role !== 'ATHLETE'
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')

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
          {canEdit ? 'Voltar para atletas' : 'Voltar para o dashboard'}
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
  const age = formatAge(athlete.birthDate)
  const countdown = formatEventCountdown(athlete.eventDate)

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={canEdit ? '/athletes' : '/'}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {canEdit ? 'Voltar para atletas' : 'Voltar para o dashboard'}
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

      <div className="rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-accent-400">
              {initials(athlete.displayName)}
            </span>
            <span>
              {SEX_LABELS[athlete.sex]}
              {age ? ` · ${age}` : ''}
            </span>
          </span>
          <span>
            Nascimento: {athlete.birthDate ? formatDateLong(athlete.birthDate) : 'não informado'}
          </span>
          <span>Altura: {athlete.heightCm != null ? `${athlete.heightCm} cm` : '—'}</span>
          <span>Peso: {athlete.weightKg != null ? `${athlete.weightKg} kg` : '—'}</span>
          <span className="text-ink-500">
            {athlete.sports.length > 0
              ? athlete.sports.map((sport) => SPORT_LABELS[sport]).join(' · ')
              : 'Nenhuma modalidade configurada'}
          </span>
        </div>
        {athlete.goal || athlete.eventDate ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-100 pt-3 text-xs">
            <span className="rounded-full bg-accent-100 px-2.5 py-1 font-semibold text-ink-900">
              {athlete.goal?.trim() ? athlete.goal : 'Objetivo em definição'}
            </span>
            {athlete.eventDate ? (
              <span className="text-ink-600">
                Prova: {formatDateLong(athlete.eventDate)}
                {countdown ? ` · ${countdown}` : ''}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

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
            onGoToMetrics={() => setTab('metrics')}
            onGoToPlanning={() => setTab('planning')}
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

      {overview?.latestMetric ? (
        <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-4 py-3 text-xs text-ink-500 shadow-sm">
          <Sparkles className="h-4 w-4 text-accent-500" aria-hidden="true" />
          Última métrica registrada em {formatDateLong(overview.latestMetric.date)}. Abra a aba
          Métricas para ver o histórico e os gráficos.
        </div>
      ) : null}
    </div>
  )
}
