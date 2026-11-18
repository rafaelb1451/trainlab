import type { CalendarMetric } from '../../api/types'

/**
 * Linha compacta de métricas do dia, como no TrainingPeaks:
 * `Sono 7.6h · VFC 92 · FC rep. 43 · Body Battery 42–97`.
 */
export function DayMetrics({ metrics }: { metrics: CalendarMetric | null }) {
  if (!metrics) return null

  const parts: string[] = []
  if (metrics.sleepHours !== null) {
    parts.push(`Sono ${metrics.sleepHours.toFixed(1)}h`)
  }
  if (metrics.hrv !== null) {
    parts.push(`VFC ${Math.round(metrics.hrv)}`)
  }
  if (metrics.restingHr !== null) {
    parts.push(`FC rep. ${Math.round(metrics.restingHr)}`)
  }
  if (metrics.bodyBatteryLow !== null || metrics.bodyBatteryHigh !== null) {
    parts.push(`Body Battery ${metrics.bodyBatteryLow ?? '–'}–${metrics.bodyBatteryHigh ?? '–'}`)
  }

  if (parts.length === 0) return null

  return (
    <p className="mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0 text-[9px] leading-tight text-ink-500">
      {parts.map((part) => (
        <span key={part} className="whitespace-nowrap">
          {part}
        </span>
      ))}
    </p>
  )
}
