import type { ActivityLap, ActivitySplit } from '../../api/types'
import {
  formatClock,
  formatDistance,
  formatNumber,
  formatPace,
} from '../../lib/format'
import { Card, CardHeader } from '../ui/Card'

function pace(value: number | null | undefined): string {
  return value != null ? `${formatPace(value)}/km` : '—'
}

export interface LapCounts {
  device?: number | null
  user?: number | null
  climb?: number | null
  interval?: number | null
}

export function ActivityLapsCard({
  laps,
  sourceLabel,
  counts,
}: {
  laps: ActivityLap[]
  sourceLabel?: string | null
  counts?: LapCounts | null
}) {
  const countItems = counts
    ? [
        { label: 'Dispositivo', value: counts.device ?? null },
        { label: 'Usuário', value: counts.user ?? null },
        { label: 'Subida', value: counts.climb ?? null },
        { label: 'Intervalo', value: counts.interval ?? null },
      ].filter((item) => item.value !== null)
    : []
  const hasPower = laps.some((lap) => lap.avgPower != null)
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Voltas"
        description={`${laps.length} ${laps.length === 1 ? 'volta' : 'voltas'}${
          sourceLabel ? ` · ${sourceLabel}` : ''
        }`}
      />
      {countItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-ink-100 px-4 py-2">
          {countItems.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 text-[9.5px] font-medium text-ink-600 ring-1 ring-inset ring-ink-100"
            >
              {item.label}
              <strong className="font-bold text-ink-800">{item.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
      <div className="sidebar-scroll max-h-80 overflow-auto" data-testid="activity-laps">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <caption className="sr-only">Voltas da atividade</caption>
          <thead className="sticky top-0 bg-ink-50/95 text-[10px] uppercase tracking-[0.06em] text-ink-500 backdrop-blur">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Volta</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Tempo</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Distância</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Pace</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">FC</th>
              {hasPower ? (
                <th scope="col" className="px-3 py-2 text-right font-semibold">Potência</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap) => (
              <tr key={lap.lapIndex} className="border-t border-ink-100">
                <td className="px-3 py-2 font-semibold text-ink-800">#{lap.lapIndex + 1}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                  {formatClock(lap.durationSec)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                  {formatDistance(lap.distanceM)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                  {pace(lap.paceSecPerKm)}
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
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function SplitsCard({ splits }: { splits: ActivitySplit[] }) {
  const hasPower = splits.some((split) => split.avgPower != null)
  const hasElevation = splits.some((split) => split.elevationM != null)
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Splits por km"
        description={`${splits.length} ${splits.length === 1 ? 'parcial' : 'parciais'}`}
      />
      <div className="sidebar-scroll max-h-80 overflow-auto" data-testid="activity-splits">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <caption className="sr-only">Splits por quilômetro</caption>
          <thead className="sticky top-0 bg-ink-50/95 text-[10px] uppercase tracking-[0.06em] text-ink-500 backdrop-blur">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Km</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Tempo</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Pace</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">FC</th>
              {hasElevation ? (
                <th scope="col" className="px-3 py-2 text-right font-semibold">Elevação</th>
              ) : null}
              {hasPower ? (
                <th scope="col" className="px-3 py-2 text-right font-semibold">Potência</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {splits.map((split) => (
              <tr key={split.km} className="border-t border-ink-100">
                <td className="px-3 py-2 font-semibold text-ink-800">{split.km}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                  {formatClock(split.durationSec)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                  {pace(split.paceSecPerKm)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                  {split.avgHr != null ? `${formatNumber(split.avgHr)} bpm` : '—'}
                </td>
                {hasElevation ? (
                  <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {split.elevationM != null ? `${formatNumber(split.elevationM)} m` : '—'}
                  </td>
                ) : null}
                {hasPower ? (
                  <td className="px-3 py-2 text-right tabular-nums text-ink-700">
                    {split.avgPower != null ? `${formatNumber(split.avgPower)} W` : '—'}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Tabelas de voltas e splits por km, com as colunas disponíveis. */
interface ActivityLapsSplitsProps {
  laps: ActivityLap[]
  splits: ActivitySplit[]
  showLaps?: boolean
  showSplits?: boolean
  lapSourceLabel?: string | null
  lapCounts?: LapCounts | null
}

/** Tabelas de voltas e splits por km, com as colunas disponíveis. */
export function ActivityLapsSplits({
  laps,
  splits,
  showLaps = true,
  showSplits = true,
  lapSourceLabel,
  lapCounts,
}: ActivityLapsSplitsProps) {
  const visibleLaps = showLaps ? laps : []
  const visibleSplits = showSplits ? splits : []

  if (visibleLaps.length === 0 && visibleSplits.length === 0) {
    const missingLaps = showLaps && laps.length === 0
    const missingSplits = showSplits && splits.length === 0
    if (!missingLaps && !missingSplits) return null
    const title =
      missingLaps && missingSplits
        ? 'Sem voltas ou splits'
        : missingLaps
          ? 'Sem voltas'
          : 'Sem splits por km'
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        <p className="mt-1 text-xs text-ink-500">
          O servidor não retornou esses dados para a atividade. Arquivos sem voltas e atividades
          curtas podem não gerar splits por km.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {visibleLaps.length > 0 ? (
        <ActivityLapsCard
          laps={visibleLaps}
          sourceLabel={lapSourceLabel}
          counts={lapCounts}
        />
      ) : null}
      {visibleSplits.length > 0 ? <SplitsCard splits={visibleSplits} /> : null}
    </div>
  )
}
