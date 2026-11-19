import type { ActivitySummary, Sport } from '../../api/types'
import { formatClock, formatDecimal, formatNumber, formatPace, parseISODate } from '../../lib/format'
import { SPORT_LABELS } from '../../lib/labels'

/** Valor numérico já formatado em pt-BR, separado da unidade. */
export interface CardMetric {
  value: string
  unit: string
}

export interface CardStat extends CardMetric {
  label: string
}

/** Dados prontos para desenhar qualquer um dos modelos de card. */
export interface ActivityCardData {
  sport: Sport
  sportLabel: string
  activityName: string
  athleteName: string
  /** Ex.: "18 NOV 2026". */
  dateLabel: string
  /** Ex.: "Quarta-feira". */
  weekdayLabel: string
  distance: CardMetric
  /** Label muda conforme o esporte: ritmo, velocidade ou ritmo de 100 m. */
  pace: CardStat
  duration: CardStat
  hr: CardStat
  elevation: CardStat
  /** Métricas opcionais usadas apenas no modelo "Lista". */
  extras: CardStat[]
  /** Alturas relativas (0–1) do mini-gráfico; vazio quando não há dados. */
  bars: number[]
}

const MONTHS = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
]

function startDate(value: string): Date | null {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed
  return parseISODate(value)
}

function dateLabels(value: string): { dateLabel: string; weekdayLabel: string } {
  const date = startDate(value)
  if (!date) return { dateLabel: '—', weekdayLabel: '' }
  const day = String(date.getDate()).padStart(2, '0')
  const dateLabel = `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
  }).format(date)
  return {
    dateLabel,
    weekdayLabel: weekday.charAt(0).toUpperCase() + weekday.slice(1),
  }
}

function distanceMetric(meters: number | null | undefined): CardMetric {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return { value: '—', unit: '' }
  }
  if (meters >= 1000) {
    return {
      value: new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(meters / 1000),
      unit: 'km',
    }
  }
  return { value: formatNumber(Math.round(meters)), unit: 'm' }
}

function paceSecondsPerKm(activity: ActivitySummary): number | null {
  const stored = activity.avgPaceSecPerKm
  if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) return stored
  const distance = activity.distanceM
  const seconds = activity.movingTimeSec ?? activity.durationSec
  if (!distance || distance <= 0 || !seconds || seconds <= 0) return null
  return seconds / (distance / 1000)
}

function paceStat(activity: ActivitySummary): CardStat {
  const pace = paceSecondsPerKm(activity)
  if (activity.sport === 'BIKE') {
    if (pace !== null && pace > 0) {
      return {
        label: 'Vel. média',
        value: formatDecimal(3600 / pace, 1),
        unit: 'km/h',
      }
    }
    return { label: 'Vel. média', value: '—', unit: '' }
  }
  if (pace === null) return { label: 'Ritmo', value: '—', unit: '' }
  if (activity.sport === 'SWIM') {
    return { label: 'Ritmo', value: formatPace(pace / 10), unit: '/100m' }
  }
  return { label: 'Ritmo', value: formatPace(pace), unit: '/km' }
}

function hrStat(activity: ActivitySummary): CardStat {
  const hr = activity.avgHr
  if (typeof hr === 'number' && Number.isFinite(hr) && hr > 0) {
    return { label: 'FC média', value: formatNumber(Math.round(hr)), unit: 'bpm' }
  }
  return { label: 'FC média', value: '—', unit: '' }
}

function elevationStat(activity: ActivitySummary): CardStat {
  const gain = activity.elevationGainM
  if (typeof gain === 'number' && Number.isFinite(gain)) {
    return { label: 'Elevação', value: formatNumber(Math.round(gain)), unit: 'm' }
  }
  return { label: 'Elevação', value: '—', unit: '' }
}

function extraStats(activity: ActivitySummary): CardStat[] {
  const extras: CardStat[] = []
  if (typeof activity.tss === 'number' && Number.isFinite(activity.tss)) {
    extras.push({
      label: activity.tssType ? `Carga (${activity.tssType})` : 'Carga',
      value: formatDecimal(activity.tss, 0),
      unit: 'TSS',
    })
  }
  if (typeof activity.calories === 'number' && Number.isFinite(activity.calories)) {
    extras.push({ label: 'Calorias', value: formatNumber(Math.round(activity.calories)), unit: 'kcal' })
  }
  if (typeof activity.avgPower === 'number' && Number.isFinite(activity.avgPower)) {
    extras.push({ label: 'Potência média', value: formatNumber(Math.round(activity.avgPower)), unit: 'W' })
  }
  return extras
}

/**
 * Converte a atividade em textos prontos para o card.
 * `bars` chega do mini-gráfico (ver `cardBars.ts`).
 */
export function buildCardData(
  activity: ActivitySummary,
  athleteName: string | null | undefined,
  bars: number[],
): ActivityCardData {
  const { dateLabel, weekdayLabel } = dateLabels(activity.startTime)
  return {
    sport: activity.sport,
    sportLabel: SPORT_LABELS[activity.sport],
    activityName: activity.name?.trim() || SPORT_LABELS[activity.sport],
    athleteName: athleteName?.trim() || 'Atleta',
    dateLabel,
    weekdayLabel,
    distance: distanceMetric(activity.distanceM),
    pace: paceStat(activity),
    duration: {
      label: 'Tempo',
      value: formatClock(activity.durationSec),
      unit: '',
    },
    hr: hrStat(activity),
    elevation: elevationStat(activity),
    extras: extraStats(activity),
    bars,
  }
}
