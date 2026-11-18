import type { ActivitySummary } from '../../api/types'
import {
  cadenceUnit,
  extraMetrics,
  type ExtraMetric,
} from '../../lib/activityMetrics'
import {
  formatDecimal,
  formatNumber,
  formatPace,
} from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'

function formatExtra(metric: ExtraMetric, sport: ActivitySummary['sport']): string {
  if (metric.value === null) return '—'
  switch (metric.kind) {
    case 'pace':
      return `${formatPace(metric.value)}/km`
    case 'watts':
      return `${formatNumber(metric.value)} W`
    case 'meters':
      return `${formatNumber(metric.value)} m`
    case 'percent':
      return `${formatDecimal(metric.value, metric.digits ?? 1)} %`
    case 'bpm':
      return `${formatNumber(metric.value)} bpm`
    case 'cadence':
      return `${formatNumber(metric.value)} ${cadenceUnit(sport)}`
    case 'decimal':
      return formatDecimal(metric.value, metric.digits ?? 2)
    case 'number':
    default:
      return formatNumber(metric.value)
  }
}

/** Bloco compacto de métricas adicionais, no estilo da análise do TP. */
export function ActivityAdditionalMetrics({ activity }: { activity: ActivitySummary }) {
  const metrics = extraMetrics(activity)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Métricas adicionais"
        description="Indicadores avançados calculados pelo servidor"
      />
      <div className="p-4">
        <dl
          data-testid="activity-extra-metrics"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        >
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="min-w-0 rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2.5"
            >
              <dt className="text-[9.5px] font-semibold uppercase leading-tight tracking-[0.06em] text-ink-500">
                {metric.label}
              </dt>
              <dd className="mt-1 truncate text-sm font-bold tabular-nums text-ink-900">
                {formatExtra(metric, activity.sport)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}
