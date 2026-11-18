import type { ActivityLap, ActivitySummary } from '../../api/types'
import {
  formatClock,
  formatDistance,
  formatNumber,
  formatPace,
} from '../../lib/format'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'

function averagePace(activity: ActivitySummary, laps: ActivityLap[]): number | null {
  const totalDistance = laps.reduce((sum, lap) => sum + (lap.distanceM ?? 0), 0)
  const totalDuration = laps.reduce((sum, lap) => sum + lap.durationSec, 0)
  if (totalDistance > 0 && totalDuration > 0) {
    return Math.round((totalDuration / totalDistance) * 1000)
  }
  return activity.avgPaceSecPerKm ?? null
}

function signedPaceDelta(delta: number): string {
  if (delta === 0) return '0 s/km'
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} s/km`
}

/** Comparação entre voltas, tendo o pace médio da atividade como referência. */
export function ActivityLapComparison({
  activity,
  laps,
}: {
  activity: ActivitySummary
  laps: ActivityLap[]
}) {
  const reference = averagePace(activity, laps)
  const fastest = laps.reduce<ActivityLap | null>((best, lap) => {
    if (lap.paceSecPerKm == null) return best
    if (!best || (best.paceSecPerKm ?? Infinity) > lap.paceSecPerKm) return lap
    return best
  }, null)
  const hasPower = laps.some((lap) => lap.avgPower != null)

  if (laps.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-ink-800">Sem voltas para comparar</p>
        <p className="mt-1 text-xs text-ink-500">
          O arquivo importado não separou voltas. Os splits por km ficam na aba Análise.
        </p>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Comparação de voltas"
        description={
          reference !== null
            ? `${laps.length} ${laps.length === 1 ? 'volta' : 'voltas'} · referência de pace ${formatPace(reference)}/km`
            : `${laps.length} ${laps.length === 1 ? 'volta' : 'voltas'} · sem pace médio de referência`
        }
      />
      <div className="sidebar-scroll max-h-[26rem] overflow-auto" data-testid="activity-lap-comparison">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <caption className="sr-only">Comparação de voltas com o pace médio</caption>
          <thead className="sticky top-0 bg-ink-50/95 text-[10px] uppercase tracking-[0.06em] text-ink-500 backdrop-blur">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Volta</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Tempo</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Distância</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Pace</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Δ pace</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">FC</th>
              {hasPower ? (
                <th scope="col" className="px-3 py-2 text-right font-semibold">Potência</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap) => {
              const delta =
                lap.paceSecPerKm != null && reference !== null
                  ? lap.paceSecPerKm - reference
                  : null
              const isFastest = fastest?.lapIndex === lap.lapIndex
              return (
                <tr key={lap.lapIndex} className="border-t border-ink-100">
                  <td className="px-3 py-2 font-semibold text-ink-800">
                    <span className="inline-flex items-center gap-1.5">
                      #{lap.lapIndex + 1}
                      {isFastest ? (
                        <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                          Mais rápida
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {formatClock(lap.durationSec)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {formatDistance(lap.distanceM)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {lap.paceSecPerKm != null ? `${formatPace(lap.paceSecPerKm)}/km` : '—'}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-semibold tabular-nums',
                      delta === null
                        ? 'text-ink-400'
                        : delta < 0
                          ? 'text-brand-700'
                          : delta > 0
                            ? 'text-accent-700'
                            : 'text-ink-500',
                    )}
                  >
                    {delta !== null ? signedPaceDelta(delta) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {lap.avgHr != null ? `${formatNumber(lap.avgHr)} bpm` : '—'}
                  </td>
                  {hasPower ? (
                    <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                      {lap.avgPower != null ? `${formatNumber(lap.avgPower)} W` : '—'}
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-ink-100 px-4 py-2.5 text-[11px] text-ink-500">
        Δ pace compara cada volta ao pace médio da atividade. Valores negativos indicam volta mais
        rápida que a média.
      </p>
    </Card>
  )
}
