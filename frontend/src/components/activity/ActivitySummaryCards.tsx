import {
  Activity,
  Clock,
  Flame,
  Gauge,
  HeartPulse,
  Mountain,
  Route,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { ActivitySummary } from '../../api/types'
import {
  formatClock,
  formatDecimal,
  formatDistance,
  formatNumber,
  formatPace,
} from '../../lib/format'
import { stoppedTimeSec } from '../../lib/activityMetrics'
import { cn } from '../../lib/cn'

interface SummaryItem {
  label: string
  value: string
  hint?: string
  icon: ComponentType<{ className?: string }>
  tone: 'brand' | 'accent' | 'ink'
}

const TONE_STYLES = {
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  ink: 'bg-ink-100 text-ink-700',
} as const

/** Cards de resumo exibindo apenas as métricas que a atividade possui. */
export function ActivitySummaryCards({ activity }: { activity: ActivitySummary }) {
  const items: SummaryItem[] = [
    {
      label: 'Duração',
      value: formatClock(activity.durationSec),
      icon: Timer,
      tone: 'brand',
    },
    {
      label: 'Distância',
      value: formatDistance(activity.distanceM),
      icon: Route,
      tone: 'accent',
    },
  ]

  if (activity.movingTimeSec != null && activity.movingTimeSec > 0) {
    items.push({
      label: 'Tempo em movimento',
      value: formatClock(activity.movingTimeSec),
      icon: Timer,
      tone: 'ink',
    })
  }

  const stopped = stoppedTimeSec(activity)
  if (stopped != null && stopped > 0) {
    items.push({
      label: 'Tempo parado',
      value: formatClock(stopped),
      icon: Clock,
      tone: 'ink',
    })
  }

  if (activity.tss != null) {
    items.push({
      label: 'TSS',
      value: formatDecimal(activity.tss, 0),
      hint: activity.tssType ?? undefined,
      icon: TrendingUp,
      tone: 'accent',
    })
  }
  if (activity.intensityFactor != null) {
    items.push({
      label: 'IF',
      value: formatDecimal(activity.intensityFactor, 2),
      icon: Gauge,
      tone: 'ink',
    })
  }
  if (activity.avgHr != null) {
    items.push({
      label: 'FC média',
      value: `${formatNumber(activity.avgHr)} bpm`,
      icon: HeartPulse,
      tone: 'brand',
    })
  }
  if (activity.maxHr != null) {
    items.push({
      label: 'FC máx.',
      value: `${formatNumber(activity.maxHr)} bpm`,
      icon: HeartPulse,
      tone: 'ink',
    })
  }
  if (activity.avgPower != null) {
    items.push({
      label: 'Potência média',
      value: `${formatNumber(activity.avgPower)} W`,
      icon: Zap,
      tone: 'accent',
    })
  }
  if (activity.normalizedPower != null) {
    items.push({
      label: 'NP',
      value: `${formatNumber(activity.normalizedPower)} W`,
      hint: 'Potência normalizada',
      icon: Zap,
      tone: 'ink',
    })
  }
  if (activity.avgPaceSecPerKm != null) {
    items.push({
      label: 'Pace médio',
      value: `${formatPace(activity.avgPaceSecPerKm)}/km`,
      icon: Activity,
      tone: 'brand',
    })
  }
  if (activity.elevationGainM != null) {
    items.push({
      label: 'Ganho de elevação',
      value: `${formatNumber(activity.elevationGainM)} m`,
      icon: Mountain,
      tone: 'accent',
    })
  }
  if (activity.calories != null) {
    items.push({
      label: 'Calorias',
      value: `${formatNumber(activity.calories)} kcal`,
      icon: Flame,
      tone: 'ink',
    })
  }

  return (
    <div
      data-testid="activity-summary"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className="min-w-0 rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                  TONE_STYLES[item.tone],
                )}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                {item.label}
              </p>
            </div>
            <p className="mt-2 truncate text-xl font-bold tabular-nums text-ink-900">
              {item.value}
            </p>
            {item.hint ? <p className="mt-0.5 text-[10px] text-ink-500">{item.hint}</p> : null}
          </div>
        )
      })}
    </div>
  )
}
