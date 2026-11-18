import type { ActivitySummary, Sport } from '../api/types'

type AnyRecord = Record<string, unknown>

/**
 * Lê o primeiro campo numérico disponível. A v6 do backend pode evoluir com
 * nomes diferentes para as métricas adicionais do TP; aceitamos aliases para
 * não quebrar a tela enquanto o contrato estabiliza.
 */
export function readActivityNumber(
  activity: ActivitySummary | null | undefined,
  keys: string[],
): number | null {
  if (!activity) return null
  const record = activity as unknown as AnyRecord
  const nested = record['metrics']
  const candidates = [
    record,
    ...(typeof nested === 'object' && nested !== null ? [nested as AnyRecord] : []),
  ]
  for (const source of candidates) {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'number' && Number.isFinite(value)) return value
    }
  }
  return null
}

/** Tempo parado explícito ou calculado por duração − tempo em movimento. */
export function stoppedTimeSec(activity: ActivitySummary): number | null {
  const explicit = readActivityNumber(activity, [
    'stoppedTimeSec',
    'pausedTimeSec',
    'stopTimeSec',
  ])
  if (explicit !== null) return Math.max(0, explicit)
  if (activity.movingTimeSec != null && activity.durationSec != null) {
    return Math.max(0, activity.durationSec - activity.movingTimeSec)
  }
  return null
}

export function cadenceUnit(sport: Sport): string {
  return sport === 'RUN' ? 'spm' : 'rpm'
}

export interface ExtraMetric {
  key: string
  label: string
  value: number | null
  kind: 'number' | 'decimal' | 'pace' | 'watts' | 'meters' | 'percent' | 'bpm' | 'cadence'
  digits?: number
}

/**
 * Métricas compactas do bloco "Métricas adicionais" (referência TP).
 * Campos ausentes viram `null` e a UI mostra "—".
 */
export function extraMetrics(activity: ActivitySummary): ExtraMetric[] {
  return [
    {
      key: 'np',
      label: 'NP',
      value: readActivityNumber(activity, ['normalizedPower', 'np']),
      kind: 'watts',
    },
    {
      key: 'vi',
      label: 'VI',
      value: readActivityNumber(activity, ['variabilityIndex', 'vi']),
      kind: 'decimal',
      digits: 2,
    },
    {
      key: 'ef',
      label: 'EF',
      value: readActivityNumber(activity, ['efficiencyFactor', 'ef']),
      kind: 'decimal',
      digits: 2,
    },
    {
      key: 'pwHr',
      label: 'Pw:Hr',
      value: readActivityNumber(activity, [
        'pwHr',
        'pwHrPct',
        'powerHrDecouplingPct',
        'powerHrDecoupling',
        'decouplingPwHr',
      ]),
      kind: 'percent',
      digits: 2,
    },
    {
      key: 'paHr',
      label: 'Pa:Hr',
      value: readActivityNumber(activity, [
        'paHr',
        'paHrPct',
        'paceHrDecouplingPct',
        'paceHrDecoupling',
        'decouplingPaHr',
      ]),
      kind: 'percent',
      digits: 2,
    },
    {
      key: 'ngp',
      label: 'NGP',
      value: readActivityNumber(activity, [
        'ngpSecPerKm',
        'normalizedGradedPaceSecPerKm',
        'ngp',
      ]),
      kind: 'pace',
    },
    {
      key: 'wattsPerKg',
      label: 'W/kg',
      value: readActivityNumber(activity, ['wattsPerKg', 'powerPerKg', 'wPerKg']),
      kind: 'decimal',
      digits: 1,
    },
    {
      key: 'elevationGain',
      label: 'Ganho de elevação',
      value: activity.elevationGainM ?? null,
      kind: 'meters',
    },
    {
      key: 'elevationLoss',
      label: 'Perda de elevação',
      value: activity.elevationLossM ?? null,
      kind: 'meters',
    },
    {
      key: 'altitudeMax',
      label: 'Altitude máx.',
      value: readActivityNumber(activity, ['maxAltitudeM', 'altitudeMaxM', 'maxAltitude']),
      kind: 'meters',
    },
    {
      key: 'altitudeAvg',
      label: 'Altitude média',
      value: readActivityNumber(activity, ['avgAltitudeM', 'averageAltitudeM', 'altitudeAvgM']),
      kind: 'meters',
    },
    {
      key: 'altitudeMin',
      label: 'Altitude mín.',
      value: readActivityNumber(activity, ['minAltitudeM', 'altitudeMinM', 'minAltitude']),
      kind: 'meters',
    },
    {
      key: 'if',
      label: 'IF',
      value: activity.intensityFactor ?? null,
      kind: 'decimal',
      digits: 2,
    },
    {
      key: 'hrMax',
      label: 'FC máx.',
      value: activity.maxHr ?? null,
      kind: 'bpm',
    },
    {
      key: 'hrAvg',
      label: 'FC média',
      value: activity.avgHr ?? null,
      kind: 'bpm',
    },
    {
      key: 'hrMin',
      label: 'FC mín.',
      value: activity.minHr ?? null,
      kind: 'bpm',
    },
    {
      key: 'cadenceMax',
      label: 'Cadência máx.',
      value: readActivityNumber(activity, ['maxCadence', 'cadenceMax', 'maxCadenceRpm']),
      kind: 'cadence',
    },
    {
      key: 'cadenceAvg',
      label: 'Cadência média',
      value: readActivityNumber(activity, ['avgCadence', 'averageCadence', 'cadenceAvg']),
      kind: 'cadence',
    },
    {
      key: 'cadenceMin',
      label: 'Cadência mín.',
      value: readActivityNumber(activity, ['minCadence', 'cadenceMin', 'minCadenceRpm']),
      kind: 'cadence',
    },
  ]
}
