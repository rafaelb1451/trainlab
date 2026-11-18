import type { Sport, Target, Threshold, Zone } from '../api/types'
import { formatNumber, formatPace, formatZoneRange } from './format'
import { zoneTypeForTarget } from './labels'

export interface AthleteTargetRange {
  /** `missing-*`: o atleta ainda não tem zona/limiar configurado para o alvo. */
  status: 'ready' | 'missing-zone' | 'missing-threshold'
  /** Texto principal exibido ao lado do alvo, ex.: `Z2 · 119–143 bpm`. */
  label: string
  /** Complemento curto: nome da zona ou o percentual aplicado. */
  hint: string | null
  zoneName: string | null
}

type TargetLike = Pick<Target, 'type' | 'zone' | 'minValue' | 'maxValue'>

function percentLabel(min: number, max: number, suffix: string): string {
  return min === max ? `${min}% ${suffix}` : `${min}–${max}% ${suffix}`
}

function rangeLabel(
  min: number,
  max: number,
  unit: 'bpm' | 'w' | 's_per_km' | 's_per_100m',
): string {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  const paceSuffix = unit === 's_per_100m' ? ' /100m' : ' /km'
  if (low === high) {
    if (unit === 'bpm') return `${formatNumber(low)} bpm`
    if (unit === 'w') return `${formatNumber(low)} W`
    return `${formatPace(low)}${paceSuffix}`
  }
  if (unit === 'bpm') return `${formatNumber(low)}–${formatNumber(high)} bpm`
  if (unit === 'w') return `${formatNumber(low)}–${formatNumber(high)} W`
  return `${formatPace(low)}–${formatPace(high)}${paceSuffix}`
}

function zoneRangeLabel(zone: Zone): string {
  if (zone.minValue === null || zone.maxValue === null) return formatZoneRange(zone)
  if (zone.unit === 'bpm') return rangeLabel(zone.minValue, zone.maxValue, 'bpm')
  if (zone.unit === 'w') return rangeLabel(zone.minValue, zone.maxValue, 'w')
  if (zone.unit === 's_per_km') return rangeLabel(zone.minValue, zone.maxValue, 's_per_km')
  if (zone.unit === 's_per_100m') return rangeLabel(zone.minValue, zone.maxValue, 's_per_100m')
  return formatZoneRange(zone)
}

/**
 * Resolve a faixa absoluta que o alvo representa para o atleta.
 *
 * - `*_ZONE`: usa a `ZoneSet` real do atleta para o esporte.
 * - `*_PERCENT`: aplica o percentual sobre LTHR/FTP/pace de limiar/CSS.
 *
 * Retorna `null` para RPE/FREE (que não têm faixa absoluta). Quando a zona ou o
 * limiar não existe, devolve um status próprio para a UI mostrar um aviso em vez
 * de esconder o campo silenciosamente.
 */
export function resolveAthleteTargetRange(
  target: TargetLike,
  sport: Sport,
  zones: Zone[],
  thresholds: Threshold[],
): AthleteTargetRange | null {
  const zoneType = zoneTypeForTarget(target.type)
  if (!zoneType) return null

  if (target.type.endsWith('_ZONE')) {
    const zoneNumber = target.zone
    if (!zoneNumber) return null
    const zone = zones.find(
      (item) =>
        item.sport === sport &&
        item.type === zoneType &&
        item.zoneNumber === zoneNumber,
    )
    if (!zone || (zone.minValue === null && zone.maxValue === null)) {
      return {
        status: 'missing-zone',
        label: 'Zona não configurada',
        hint: `Z${zoneNumber} para ${sportLabel(sport)}`,
        zoneName: null,
      }
    }
    return {
      status: 'ready',
      label: `Z${zoneNumber} · ${zoneRangeLabel(zone)}`,
      hint: zone.name,
      zoneName: zone.name,
    }
  }

  const threshold = thresholds.find((item) => item.sport === sport)
  const minPercent = target.minValue ?? 100
  const maxPercent = target.maxValue ?? 100
  if (minPercent <= 0 || maxPercent <= 0) {
    return {
      status: 'missing-threshold',
      label: 'Percentual inválido',
      hint: 'Informe percentuais maiores que zero.',
      zoneName: null,
    }
  }

  if (target.type === 'HR_PERCENT') {
    const lthr =
      threshold?.lthr ??
      (threshold?.maxHr ? Math.round(threshold.maxHr * 0.85) : null)
    if (lthr === null || lthr === undefined || lthr <= 0) {
      return {
        status: 'missing-threshold',
        label: 'Limiar não configurado',
        hint: 'Cadastre o LTHR ou a FC máxima do atleta.',
        zoneName: null,
      }
    }
    const min = Math.round((lthr * Math.min(minPercent, maxPercent)) / 100)
    const max = Math.round((lthr * Math.max(minPercent, maxPercent)) / 100)
    return {
      status: 'ready',
      label: rangeLabel(min, max, 'bpm'),
      hint: percentLabel(minPercent, maxPercent, 'do LTHR'),
      zoneName: null,
    }
  }

  if (target.type === 'POWER_PERCENT') {
    const ftp = threshold?.ftpWatts ?? null
    if (ftp === null || ftp <= 0) {
      return {
        status: 'missing-threshold',
        label: 'Limiar não configurado',
        hint: 'Cadastre o FTP do atleta.',
        zoneName: null,
      }
    }
    const min = Math.round((ftp * Math.min(minPercent, maxPercent)) / 100)
    const max = Math.round((ftp * Math.max(minPercent, maxPercent)) / 100)
    return {
      status: 'ready',
      label: rangeLabel(min, max, 'w'),
      hint: percentLabel(minPercent, maxPercent, 'do FTP'),
      zoneName: null,
    }
  }

  if (target.type === 'PACE_PERCENT') {
    const swim = sport === 'SWIM'
    const thresholdPace = swim
      ? (threshold?.cssSecPer100m ?? null)
      : (threshold?.thresholdPaceSecPerKm ?? null)
    if (thresholdPace === null || thresholdPace <= 0) {
      return {
        status: 'missing-threshold',
        label: 'Limiar não configurado',
        hint: swim ? 'Cadastre o CSS do atleta.' : 'Cadastre o pace de limiar do atleta.',
        zoneName: null,
      }
    }
    // Pace é o inverso da velocidade: maior percentual = pace menor (mais rápido).
    const fast = Math.round((thresholdPace * 100) / Math.max(minPercent, maxPercent))
    const slow = Math.round((thresholdPace * 100) / Math.min(minPercent, maxPercent))
    return {
      status: 'ready',
      label: rangeLabel(fast, slow, swim ? 's_per_100m' : 's_per_km'),
      hint: percentLabel(minPercent, maxPercent, swim ? 'do CSS' : 'do pace de limiar'),
      zoneName: null,
    }
  }

  return null
}

function sportLabel(sport: Sport): string {
  return sport === 'RUN' ? 'corrida' : sport === 'BIKE' ? 'ciclismo' : 'natação'
}
