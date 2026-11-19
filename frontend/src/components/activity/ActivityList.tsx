import { ArrowUpRight, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ActivitySummary } from '../../api/types'
import { sortActivitiesDesc } from '../../lib/activity'
import {
  formatClock,
  formatDateShort,
  formatDecimal,
  formatDistance,
  formatTime,
} from '../../lib/format'
import { ACTIVITY_SOURCE_LABELS } from '../../lib/labels'
import { SportBadge } from '../SportBadge'

interface ActivityListProps {
  activities: ActivitySummary[]
  /** Mostra a coluna de fonte e o nome do arquivo, quando disponível. */
  detailed?: boolean
  /** Quando informado, exibe o botão de compartilhar o card da atividade. */
  onShare?: (activity: ActivitySummary) => void
}

/** Lista/tabela reutilizável de atividades executadas (aba e tela Análises). */
export function ActivityList({ activities, detailed = false, onShare }: ActivityListProps) {
  const sorted = sortActivitiesDesc(activities)

  return (
    <div
      data-testid="activity-list"
      className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card"
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">Atividades executadas</caption>
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/70 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
            <th scope="col" className="px-4 py-2.5">
              Data
            </th>
            <th scope="col" className="px-3 py-2.5">
              Atividade
            </th>
            <th scope="col" className="px-3 py-2.5">
              Esporte
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Duração
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Distância
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              TSS
            </th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((activity) => (
            <tr
              key={activity.id}
              data-activity-id={activity.id}
              className="border-b border-ink-100/80 last:border-0 hover:bg-ink-50/60"
            >
              <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-600">
                <span className="block font-semibold text-ink-800">
                  {formatDateShort(activity.startTime)}
                </span>
                <span className="text-[10px] text-ink-500">{formatTime(activity.startTime)}</span>
              </td>
              <td className="max-w-[18rem] px-3 py-3">
                <p className="truncate text-xs font-semibold text-ink-900">{activity.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-ink-500">
                  <span>{ACTIVITY_SOURCE_LABELS[activity.source]}</span>
                  {detailed && activity.fileName ? (
                    <span className="truncate">· {activity.fileName}</span>
                  ) : null}
                  {activity.plannedWorkoutId ? <span>· vinculada ao planejado</span> : null}
                </p>
              </td>
              <td className="px-3 py-3">
                <SportBadge sport={activity.sport} size="sm" />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold tabular-nums text-ink-800">
                {formatClock(activity.durationSec)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold tabular-nums text-ink-800">
                {formatDistance(activity.distanceM)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold tabular-nums text-ink-800">
                {activity.tss != null ? formatDecimal(activity.tss, 0) : '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    to={`/activities/${activity.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    Analisar
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                  {onShare ? (
                    <button
                      type="button"
                      onClick={() => onShare(activity)}
                      aria-label={`Compartilhar atividade ${activity.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
