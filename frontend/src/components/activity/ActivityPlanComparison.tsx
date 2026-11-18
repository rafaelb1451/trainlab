import type {
  ActivityComparison,
  ActivityPlanned,
  ActivitySummary,
} from '../../api/types'
import { formatClock, formatDecimal, formatDistance } from '../../lib/format'
import { ACTIVITY_COMPLIANCE_LABELS } from '../../lib/labels'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'

const COMPLIANCE_STYLES = {
  CONFORME: 'bg-brand-50 text-brand-700 ring-brand-200',
  PARCIAL: 'bg-accent-50 text-accent-700 ring-accent-200',
  NAO_PLANEJADO: 'bg-ink-100 text-ink-600 ring-ink-200',
} as const

function signedClock(seconds: number): string {
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : ''
  return `${sign}${formatClock(Math.abs(seconds))}`
}

function signedDistance(meters: number): string {
  const sign = meters > 0 ? '+' : meters < 0 ? '−' : ''
  return `${sign}${formatDistance(Math.abs(meters))}`
}

function signedNumber(value: number, digits = 0): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatDecimal(Math.abs(value), digits)}`
}

function deltaTone(value: number | null): string {
  if (value === null || value === 0) return 'text-ink-500'
  return value > 0 ? 'text-brand-700' : 'text-accent-700'
}

interface ActivityPlanComparisonProps {
  activity: ActivitySummary
  planned: ActivityPlanned
  comparison?: ActivityComparison | null
}

/** Comparação planejado × realizado e conformidade da sessão. */
export function ActivityPlanComparison({
  activity,
  planned,
  comparison,
}: ActivityPlanComparisonProps) {
  const plannedDuration =
    planned.plannedDurationSec != null && planned.plannedDurationSec > 0
      ? planned.plannedDurationSec
      : null
  const plannedTss = planned.estimatedTss ?? null
  const durationDelta =
    comparison?.durationDeltaSec ??
    (plannedDuration !== null ? activity.durationSec - plannedDuration : null)
  const distanceDelta = comparison?.distanceDeltaM ?? null
  const plannedDistance =
    distanceDelta !== null && activity.distanceM !== null
      ? activity.distanceM - distanceDelta
      : null
  const tssDelta =
    comparison?.tssDelta ??
    (plannedTss !== null && activity.tss != null ? activity.tss - plannedTss : null)
  const compliance = comparison?.compliance ?? null

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Planejado × realizado"
        description={planned.workoutName}
        actions={
          compliance ? (
            <span
              data-testid="activity-compliance"
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset',
                COMPLIANCE_STYLES[compliance],
              )}
            >
              {ACTIVITY_COMPLIANCE_LABELS[compliance]}
            </span>
          ) : null
        }
      />
      <div className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              Duração
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-ink-900">
              {formatClock(activity.durationSec)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              Planejado {plannedDuration !== null ? formatClock(plannedDuration) : '—'}
            </p>
            <p className={cn('mt-1 text-[11px] font-semibold tabular-nums', deltaTone(durationDelta))}>
              {durationDelta !== null ? `${signedClock(durationDelta)} de diferença` : 'Sem comparativo'}
            </p>
          </div>

          <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              Distância
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-ink-900">
              {formatDistance(activity.distanceM)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              Planejado {plannedDistance !== null ? formatDistance(plannedDistance) : '—'}
            </p>
            <p className={cn('mt-1 text-[11px] font-semibold tabular-nums', deltaTone(distanceDelta))}>
              {distanceDelta !== null ? `${signedDistance(distanceDelta)} de diferença` : 'Sem comparativo'}
            </p>
          </div>

          <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">TSS</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-ink-900">
              {activity.tss != null ? formatDecimal(activity.tss, 0) : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              Planejado {plannedTss !== null ? formatDecimal(plannedTss, 0) : '—'}
              {comparison?.ifActual != null
                ? ` · IF ${formatDecimal(comparison.ifActual, 2)}`
                : ''}
            </p>
            <p className={cn('mt-1 text-[11px] font-semibold tabular-nums', deltaTone(tssDelta))}>
              {tssDelta !== null ? `${signedNumber(tssDelta, 0)} de diferença` : 'Sem comparativo'}
            </p>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-ink-500">
          {compliance
            ? 'Conformidade calculada pelo servidor comparando a estrutura planejada com a atividade executada.'
            : 'O servidor não retornou o comparativo desta atividade.'}
          {planned.blocks && Array.isArray(planned.blocks) && planned.blocks.length > 0
            ? ` Planejamento com ${planned.blocks.length} ${planned.blocks.length === 1 ? 'bloco' : 'blocos'}.`
            : ''}
        </p>
      </div>
    </Card>
  )
}
