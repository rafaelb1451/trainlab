import type { Sport, Target, TargetType, Zone } from '../api/types'
import { SPORTS } from '../api/types'
import { SPORT_LABELS } from './labels'

export function formatClock(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return '—'
  }
  const total = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatDurationHuman(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return '—'
  }
  const total = Math.max(0, Math.round(totalSeconds))
  if (total < 60) return `${total} s`
  const hours = Math.floor(total / 3600)
  const minutes = Math.round((total % 3600) / 60)
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}

export function formatEstimatedDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || !Number.isFinite(totalSeconds) || totalSeconds <= 0) return 'Duração aberta'
  return formatDurationHuman(totalSeconds)
}

export function formatMinutes(totalSeconds: number | null | undefined): number {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return 0
  return Math.round(totalSeconds / 60)
}

export function formatPace(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—'
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function parsePace(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const withColon = /^(\d{1,3}):([0-5]?\d)$/.exec(trimmed)
  if (withColon) {
    const minutes = Number(withColon[1])
    const seconds = Number(withColon[2])
    return minutes * 60 + seconds
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return null
}

export function formatPaceWithUnit(seconds: number | null | undefined, unit: string): string {
  if (seconds === null || seconds === undefined) return '—'
  const suffix = unit === 's_per_100m' ? '/100m' : '/km'
  return `${formatPace(seconds)}${suffix}`
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '—'
  if (meters >= 1000) {
    const km = meters / 1000
    return `${Number.isInteger(km) ? km.toFixed(0) : km.toFixed(2)} km`
  }
  return `${Math.round(meters)} m`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercentRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min === null || min === undefined) {
    if (max === null || max === undefined) return '—'
    return `até ${max}%`
  }
  if (max === null || max === undefined) return `${min}%`
  return `${min}–${max}%`
}

export function formatZoneRange(zone: Zone): string {
  const { minValue, maxValue, unit, type } = zone
  if (minValue === null && maxValue === null) return '—'
  if (unit === 's_per_km' || unit === 's_per_100m') {
    const suffix = unit === 's_per_100m' ? '/100m' : '/km'
    if (minValue === null && maxValue !== null) return `até ${formatPace(maxValue)}${suffix}`
    if (maxValue === null && minValue !== null) return `${formatPace(minValue)}${suffix}`
    return `${formatPace(minValue)}–${formatPace(maxValue)}${suffix}`
  }
  if (unit === 'bpm') return `${formatNumber(minValue)}–${formatNumber(maxValue)} bpm`
  if (unit === 'w') return `${formatNumber(minValue)}–${formatNumber(maxValue)} W`
  if (type === 'HR') return `${formatNumber(minValue)}–${formatNumber(maxValue)} bpm`
  return `${formatNumber(minValue)}–${formatNumber(maxValue)} ${unit}`
}

export function formatDifficulty(difficulty: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(difficulty)))
  return `${clamped}/5`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return new Date(year, month - 1, day)
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISODate(value) : value
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISODate(value) : value
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
}

export function formatWeekday(value: string | Date, short = false): string {
  const date = typeof value === 'string' ? (parseISODate(value) ?? new Date(value)) : value
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: short ? 'short' : 'long',
  }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatAge(birthDate: string | null | undefined): string | null {
  const date = parseISODate(birthDate)
  if (!date) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1
  }
  if (age < 0 || age > 130) return null
  return `${age} ${age === 1 ? 'ano' : 'anos'}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function thresholdHighlights(record: Record<string, unknown>, sport?: Sport): string[] {
  const highlights: string[] = []
  const lthr = readNumber(record, 'lthr')
  const maxHr = readNumber(record, 'maxHr')
  const ftp = readNumber(record, 'ftpWatts')
  const pace = readNumber(record, 'thresholdPaceSecPerKm')
  const css = readNumber(record, 'cssSecPer100m')
  if (lthr !== null) highlights.push(`LTHR ${lthr} bpm`)
  if (ftp !== null) highlights.push(`FTP ${ftp} W`)
  if (pace !== null) highlights.push(`Limiar ${formatPace(pace)}/km`)
  if (css !== null) highlights.push(`CSS ${formatPace(css)}/100m`)
  if (highlights.length === 0 && maxHr !== null) highlights.push(`FC máx ${maxHr} bpm`)
  if (highlights.length === 0 && sport) highlights.push(SPORT_LABELS[sport])
  return highlights
}

function isSport(value: string): value is Sport {
  return (SPORTS as readonly string[]).includes(value)
}

/**
 * O backend pode resumir os limiares como texto, como objeto por modalidade ou
 * como um objeto de limiares. Aceitamos os três formatos sem quebrar a tela.
 */
export function formatThresholdSummary(summary: unknown): string[] {
  if (summary === null || summary === undefined || summary === '') return []
  if (typeof summary === 'string') return [summary]
  if (Array.isArray(summary)) {
    return summary.flatMap((entry) => formatThresholdSummary(entry))
  }
  if (!isRecord(summary)) return []

  if (typeof summary['sport'] === 'string') {
    const rawSport = summary['sport']
    const sport = isSport(rawSport) ? rawSport : undefined
    const highlights = thresholdHighlights(summary, sport)
    return highlights.length > 0 ? [highlights.join(' · ')] : []
  }

  const keys = Object.keys(summary)
  const sportKeys = keys.filter(isSport)
  if (sportKeys.length > 0) {
    return sportKeys.flatMap((sport) => {
      const value = summary[sport]
      if (typeof value === 'string') {
        return value.trim().length > 0 ? [`${SPORT_LABELS[sport]}: ${value}`] : []
      }
      if (!isRecord(value)) return []
      const highlights = thresholdHighlights(value, sport)
      return highlights.length > 0 ? [`${SPORT_LABELS[sport]}: ${highlights.join(' · ')}`] : []
    })
  }

  const highlights = thresholdHighlights(summary)
  return highlights.length > 0 ? [highlights.join(' · ')] : []
}

export function describeTarget(target: Target, sport: Sport): string {
  switch (target.type) {
    case 'HR_ZONE':
      return target.zone ? `FC Z${target.zone}` : 'FC por zona'
    case 'HR_PERCENT':
      return `FC ${formatPercentRange(target.minValue, target.maxValue)} LTHR`
    case 'PACE_ZONE':
      return target.zone ? `Pace Z${target.zone}` : 'Pace por zona'
    case 'PACE_PERCENT':
      return `${formatPercentRange(target.minValue, target.maxValue)} ${
        sport === 'SWIM' ? 'CSS' : 'pace'
      }`
    case 'POWER_ZONE':
      return target.zone ? `Potência Z${target.zone}` : 'Potência por zona'
    case 'POWER_PERCENT':
      return `${formatPercentRange(target.minValue, target.maxValue)} FTP`
    case 'RPE':
      return `RPE ${formatPercentRange(target.minValue, target.maxValue).replace(/%/g, '')}`
    case 'FREE':
      return 'Livre'
    default:
      return 'Alvo'
  }
}

export function targetTypeLabel(type: TargetType, sport: Sport): string {
  switch (type) {
    case 'HR_ZONE':
      return 'FC por zona'
    case 'HR_PERCENT':
      return 'FC por % do LTHR'
    case 'PACE_ZONE':
      return 'Pace por zona'
    case 'PACE_PERCENT':
      return sport === 'SWIM' ? 'Pace por % do CSS' : 'Pace por % do limiar'
    case 'POWER_ZONE':
      return 'Potência por zona'
    case 'POWER_PERCENT':
      return 'Potência por % do FTP'
    case 'RPE':
      return 'RPE (esforço percebido)'
    case 'FREE':
      return 'Livre'
    default:
      return type
  }
}
