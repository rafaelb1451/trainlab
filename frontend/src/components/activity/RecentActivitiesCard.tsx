import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, LineChart, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isNotFoundError } from '../../api/client'
import { activitiesApi } from '../../api/endpoints'
import { sortActivitiesDesc } from '../../lib/activity'
import {
  formatClock,
  formatDateShort,
  formatDecimal,
  formatDistance,
} from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'
import { Skeleton } from '../Feedback'
import { SportBadge } from '../SportBadge'

interface RecentActivitiesCardProps {
  athleteId: string
  onGoToActivities: () => void
}

/** Card da visão geral com as últimas atividades e atalho para a análise. */
export function RecentActivitiesCard({
  athleteId,
  onGoToActivities,
}: RecentActivitiesCardProps) {
  const activitiesQuery = useQuery({
    queryKey: ['activities', athleteId],
    queryFn: () => activitiesApi.list({ athleteId }),
    retry: false,
  })

  const activities = sortActivitiesDesc(activitiesQuery.data ?? []).slice(0, 3)
  const notFound = isNotFoundError(activitiesQuery.error)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Atividades recentes"
        description="Treinos executados e analisados"
        actions={
          <button
            type="button"
            onClick={onGoToActivities}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Ver todas
          </button>
        }
      />
      <div className="p-4">
        {activitiesQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : activitiesQuery.isError ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-5 text-center">
            <LineChart className="mx-auto h-5 w-5 text-ink-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-ink-700">
              {notFound ? 'Análises ainda não disponíveis' : 'Não foi possível carregar as atividades'}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">
              {notFound
                ? 'A importação e a análise ficarão disponíveis quando o servidor expuser as atividades.'
                : 'Tente novamente em instantes.'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {!notFound ? (
                <button
                  type="button"
                  onClick={() => void activitiesQuery.refetch()}
                  className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  Tentar novamente
                </button>
              ) : null}
              <button
                type="button"
                onClick={onGoToActivities}
                className="text-[11px] font-semibold text-brand-700 hover:text-brand-800"
              >
                Abrir atividades
              </button>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-5 text-center">
            <UploadCloud className="mx-auto h-5 w-5 text-ink-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-ink-700">Nenhuma atividade importada</p>
            <p className="mt-1 text-[11px] text-ink-500">
              Importe um TCX/GPX na aba Atividades para analisar o treino executado.
            </p>
            <button
              type="button"
              onClick={onGoToActivities}
              className="mt-3 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Ir para Atividades
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activities.map((activity) => (
              <Link
                key={activity.id}
                to={`/activities/${activity.id}`}
                className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 transition hover:border-ink-100 hover:bg-ink-50"
              >
                <SportBadge sport={activity.sport} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-900">{activity.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-ink-500">
                    {formatDateShort(activity.startTime)} · {formatClock(activity.durationSec)} ·{' '}
                    {formatDistance(activity.distanceM)}
                    {activity.tss != null ? ` · ${formatDecimal(activity.tss, 0)} TSS` : ''}
                  </p>
                </div>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-ink-300 group-hover:text-brand-600"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
