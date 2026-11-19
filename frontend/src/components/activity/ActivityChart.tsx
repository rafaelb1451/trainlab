import {
  Footprints,
  HeartPulse,
  Mountain,
  Timer,
  Zap,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ActivitySeriesPoint, Sport } from '../../api/types'
import { formatClock, formatDistance, formatPace } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'

type MetricKey = 'hr' | 'paceSecPerKm' | 'power' | 'elevationM' | 'cadence'

interface MetricConfig {
  key: MetricKey
  label: string
  unit: string
  color: string
  icon: ComponentType<{ className?: string }>
}

const METRICS: MetricConfig[] = [
  { key: 'hr', label: 'FC', unit: 'bpm', color: '#2563eb', icon: HeartPulse },
  { key: 'paceSecPerKm', label: 'Pace', unit: '/km', color: '#1d4ed8', icon: Timer },
  { key: 'power', label: 'Potência', unit: 'W', color: '#f5b301', icon: Zap },
  { key: 'elevationM', label: 'Elevação', unit: 'm', color: '#64748b', icon: Mountain },
  { key: 'cadence', label: 'Cadência', unit: 'rpm', color: '#fbbf24', icon: Footprints },
]

function metricValue(metric: MetricConfig, value: number): string {
  if (metric.key === 'paceSecPerKm') return formatPace(value)
  return String(Math.round(value))
}

function metricUnit(metric: MetricConfig, sport: Sport): string {
  if (metric.key === 'cadence') return sport === 'RUN' ? 'spm' : 'rpm'
  return metric.unit
}

function readValue(point: ActivitySeriesPoint, key: MetricKey): number | null {
  const value = point[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function hasEnoughValues(series: ActivitySeriesPoint[], key: MetricKey): boolean {
  let count = 0
  for (const point of series) {
    if (readValue(point, key) !== null) count += 1
    if (count >= 2) return true
  }
  return false
}

interface ActivityChartProps {
  series: ActivitySeriesPoint[]
  sport: Sport
}

/** Gráfico principal em SVG com seletor de métrica e tooltip por hover. */
export function ActivityChart({ series, sport }: ActivityChartProps) {
  const [selected, setSelected] = useState<MetricKey | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [chartWidth, setChartWidth] = useState(720)
  const containerRef = useRef<HTMLDivElement>(null)
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width
      if (nextWidth && nextWidth > 0) setChartWidth(nextWidth)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const available = METRICS.filter((metric) => hasEnoughValues(series, metric.key))
  const activeMetric =
    (selected ? available.find((metric) => metric.key === selected) : undefined) ??
    available[0] ??
    null

  if (!activeMetric) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-ink-800">Sem série temporal nesta atividade</p>
        <p className="mt-1 text-xs text-ink-500">
          O arquivo importado não trouxe amostras suficientes para desenhar o gráfico.
        </p>
      </Card>
    )
  }

  const key = activeMetric.key
  const invertPace = key === 'paceSecPerKm'
  const width = Math.max(320, chartWidth)
  const height = width < 480 ? 220 : 280
  const pad = { top: 18, right: 16, bottom: 28, left: 50 }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const tMax = Math.max(
    1,
    series.reduce((max, point) => (point.tSec > max ? point.tSec : max), 0),
  )

  const rawValues = series.flatMap((point) => {
    const value = readValue(point, key)
    return value === null ? [] : [value]
  })
  const rawMin = Math.min(...rawValues)
  const rawMax = Math.max(...rawValues)
  const rawSpan = rawMax - rawMin
  const domainSpan = rawSpan > 0 ? rawSpan : Math.max(1, Math.abs(rawMax) * 0.1)
  const domainMin = rawMin - domainSpan * 0.08
  const domainMax = rawMax + domainSpan * 0.08
  const paddedSpan = domainMax - domainMin

  function xOf(tSec: number): number {
    return pad.left + (Math.min(tMax, Math.max(0, tSec)) / tMax) * plotWidth
  }

  function yOf(value: number): number {
    const ratio = (value - domainMin) / paddedSpan
    return pad.top + (invertPace ? ratio : 1 - ratio) * plotHeight
  }

  const segments: Array<Array<{ x: number; y: number }>> = []
  let current: Array<{ x: number; y: number }> = []
  for (const point of series) {
    const value = readValue(point, key)
    if (value === null) {
      if (current.length > 0) segments.push(current)
      current = []
      continue
    }
    current.push({ x: xOf(point.tSec), y: yOf(value) })
  }
  if (current.length > 0) segments.push(current)

  const linePath = segments
    .map((segment) =>
      segment.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' '),
    )
    .join(' ')
  const areaPath = segments
    .filter((segment) => segment.length > 1)
    .map((segment) => {
      const first = segment[0]
      const last = segment[segment.length - 1]
      const baseline = pad.top + plotHeight
      return `M ${first.x.toFixed(2)} ${baseline.toFixed(2)} ${segment
        .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ')} L ${last.x.toFixed(2)} ${baseline.toFixed(2)} Z`
    })
    .join(' ')

  const yTicks = [0, 1 / 3, 2 / 3, 1].map((ratio) => ({
    y: pad.top + ratio * plotHeight,
    value: invertPace
      ? domainMin + ratio * paddedSpan
      : domainMax - ratio * paddedSpan,
  }))
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    x: pad.left + ratio * plotWidth,
    tSec: ratio * tMax,
  }))

  const hoverPoint = hoverIndex !== null ? series[hoverIndex] : undefined
  const hoverValue = hoverPoint ? readValue(hoverPoint, key) : null
  const hoverX = hoverPoint ? xOf(hoverPoint.tSec) : null
  const hoverPct = hoverX !== null ? (hoverX / width) * 100 : 50

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (series.length === 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0
    const targetT = Math.min(1, Math.max(0, ratio)) * tMax
    let bestIndex = 0
    let bestDistance = Number.POSITIVE_INFINITY
    for (let index = 0; index < series.length; index += 1) {
      const distance = Math.abs(series[index].tSec - targetT)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    }
    setHoverIndex(bestIndex)
  }

  const tooltipPct = Math.min(90, Math.max(10, hoverPct))

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Evolução da atividade"
        description={`${activeMetric.label} ao longo do tempo · passe o cursor sobre o gráfico`}
        actions={
          <div
            role="group"
            aria-label="Métrica do gráfico"
            className="flex flex-wrap items-center gap-1"
          >
            {METRICS.map((metric) => {
              const Icon = metric.icon
              const enabled = available.some((item) => item.key === metric.key)
              const active = metric.key === key
              return (
                <button
                  key={metric.key}
                  type="button"
                  aria-pressed={active}
                  disabled={!enabled}
                  title={enabled ? `Ver ${metric.label}` : `Sem dados de ${metric.label}`}
                  onClick={() => {
                    setSelected(metric.key)
                    setHoverIndex(null)
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition',
                    active
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-brand-800',
                    !enabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {metric.label}
                </button>
              )
            })}
          </div>
        }
      />

      <div ref={containerRef} className="relative px-2 pb-2 pt-4 sm:px-4">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Gráfico de ${activeMetric.label} ao longo do tempo`}
          className="block max-w-full touch-pan-y"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeMetric.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={activeMetric.color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <text
            x={pad.left}
            y={pad.top - 5}
            className="fill-ink-500"
            fontSize="10"
            fontWeight="600"
          >
            {activeMetric.label} ({metricUnit(activeMetric, sport)})
          </text>

          {yTicks.map((tick) => (
            <g key={`y-${tick.y}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={pad.left - 7}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize="10"
                className="fill-ink-500"
              >
                {metricValue(activeMetric, tick.value)}
              </text>
            </g>
          ))}

          {xTicks.map((tick, index) => (
            <text
              key={`x-${tick.tSec}`}
              x={tick.x}
              y={height - 8}
              textAnchor={index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'}
              fontSize="10"
              className="fill-ink-500"
            >
              {formatClock(tick.tSec)}
            </text>
          ))}

          {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke={activeMetric.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {hoverPoint && hoverX !== null ? (
            <g>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={pad.top}
                y2={pad.top + plotHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {hoverValue !== null ? (
                <circle
                  cx={hoverX}
                  cy={yOf(hoverValue)}
                  r="4"
                  fill="#ffffff"
                  stroke={activeMetric.color}
                  strokeWidth="2"
                />
              ) : null}
            </g>
          ) : null}
        </svg>

        {hoverPoint ? (
          <div
            className="pointer-events-none absolute top-6 z-10 w-44 rounded-xl border border-ink-100 bg-white/95 px-3 py-2 text-[11px] shadow-pop backdrop-blur"
            style={{
              left: `${tooltipPct}%`,
              transform:
                tooltipPct < 22
                  ? 'translateX(0)'
                  : tooltipPct > 78
                    ? 'translateX(-100%)'
                    : 'translateX(-50%)',
            }}
          >
            <p className="font-bold text-ink-900">{formatClock(hoverPoint.tSec)}</p>
            {hoverPoint.distanceM != null ? (
              <p className="mt-0.5 text-ink-500">{formatDistance(hoverPoint.distanceM)}</p>
            ) : null}
            <div className="mt-1.5 space-y-0.5 border-t border-ink-100 pt-1.5">
              {METRICS.map((metric) => {
                const value = readValue(hoverPoint, metric.key)
                if (value === null) return null
                return (
                  <p
                    key={metric.key}
                    className={cn(
                      'flex items-center justify-between gap-2',
                      metric.key === key ? 'font-semibold text-ink-900' : 'text-ink-600',
                    )}
                  >
                    <span>{metric.label}</span>
                    <span className="tabular-nums">
                      {metricValue(metric, value)}
                      <span className="ml-0.5 text-[9px] text-ink-400">
                        {metricUnit(metric, sport)}
                      </span>
                    </span>
                  </p>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
