import type { ComponentType } from 'react'
import { cn } from '../../lib/cn'
import { formatDateShort } from '../../lib/format'
import { Card } from '../ui/Card'

export interface MetricPoint {
  date: string
  value: number | null
}

interface MetricBarChartProps {
  title: string
  unit: string
  points: MetricPoint[]
  colorClass: string
  icon: ComponentType<{ className?: string }>
  formatValue: (value: number) => string
}

export function MetricBarChart({
  title,
  unit,
  points,
  colorClass,
  icon: Icon,
  formatValue,
}: MetricBarChartProps) {
  const values = points.flatMap((point) => (point.value === null ? [] : [point.value]))
  const max = Math.max(1, ...values)
  const latest = [...points].reverse().find((point) => point.value !== null) ?? null
  const summary =
    values.length === 0
      ? `${title}: sem registros nos últimos 14 dias.`
      : `${title}: ${values.length} registros nos últimos 14 dias. Máximo ${formatValue(max)} ${unit}.`

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-50 text-ink-600">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-xs font-semibold text-ink-900">{title}</h3>
            <p className="text-[10px] text-ink-500">Últimos 14 dias · {unit}</p>
          </div>
        </div>
        {latest?.value != null ? (
          <p className="text-right text-sm font-bold tabular-nums text-ink-900">
            {formatValue(latest.value)}
            <span className="ml-1 text-[10px] font-medium text-ink-500">{unit}</span>
          </p>
        ) : null}
      </div>

      {values.length === 0 ? (
        <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-3 text-center text-[11px] text-ink-500">
          Sem registros no período.
        </div>
      ) : (
        <>
          <div
            className="mt-4 flex h-32 items-end gap-1"
            role="img"
            aria-label={summary}
          >
            {points.map((point) => {
              const percent =
                point.value === null || max <= 0
                  ? 0
                  : Math.max(4, Math.round((point.value / max) * 100))
              const label = `${formatDateShort(point.date)}: ${
                point.value === null ? 'sem registro' : `${formatValue(point.value)} ${unit}`
              }`
              return (
                <div
                  key={point.date}
                  className="group flex h-full flex-1 items-end"
                  title={label}
                >
                  {point.value === null ? (
                    <div className="h-1 w-full rounded-full bg-ink-100" aria-hidden="true" />
                  ) : (
                    <div
                      className={cn(
                        'w-full rounded-t-md transition group-hover:opacity-75',
                        colorClass,
                      )}
                      style={{ height: `${percent}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {points.map((point, index) => (
              <span
                key={point.date}
                className="flex-1 text-center text-[9px] leading-tight text-ink-500"
              >
                {index === 0 || index === 7 || index === points.length - 1
                  ? `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}`
                  : ''}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
