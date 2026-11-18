import { addDays, parseISODate, toISODate } from './format'

export const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

/** Cabeçalho da grade, começando na segunda-feira como no TrainingPeaks. */
export const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const

export interface MonthCursor {
  year: number
  /** Mês de 1 a 12 (mais legível que o índice 0-based do Date). */
  month: number
}

export function currentMonthCursor(today = new Date()): MonthCursor {
  return { year: today.getFullYear(), month: today.getMonth() + 1 }
}

/** Cursor do mês ao qual a data pertence. */
export function monthCursorOf(date: Date): MonthCursor {
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function monthLabel(cursor: MonthCursor): string {
  return `${MONTH_NAMES[cursor.month - 1]} ${cursor.year}`
}

export function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
  const date = new Date(cursor.year, cursor.month - 1 + delta, 1)
  return monthCursorOf(date)
}

/** Índice da segunda-feira (0) a domingo (6), independente do locale. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export interface MonthGrid {
  /** Segunda-feira da primeira semana que contém o mês. */
  start: Date
  /** Domingo da última semana que contém o mês. */
  end: Date
  weeks: Date[][]
}

/**
 * Grade mensal com semanas completas de segunda a domingo, incluindo os dias dos
 * meses vizinhos que o TrainingPeaks também exibe.
 */
export function monthGrid(cursor: MonthCursor): MonthGrid {
  const first = new Date(cursor.year, cursor.month - 1, 1)
  const last = new Date(cursor.year, cursor.month, 0)
  const start = addDays(first, -mondayIndex(first))
  const end = addDays(last, 6 - mondayIndex(last))

  const weeks: Date[][] = []
  for (let weekStart = start; weekStart <= end; weekStart = addDays(weekStart, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)))
  }
  return { start, end, weeks }
}

export function isSameMonth(date: Date, cursor: MonthCursor): boolean {
  return date.getFullYear() === cursor.year && date.getMonth() + 1 === cursor.month
}

export function isSameDay(a: Date, b: Date): boolean {
  return toISODate(a) === toISODate(b)
}

export function isoDay(date: Date): string {
  return toISODate(date)
}

const shortMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' })

export function formatShortMonthDay(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')} ${shortMonthFormatter
    .format(date)
    .replace('.', '')}`
}

/** Rótulo do intervalo da semana: "26 out – 01 nov". */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  return `${formatShortMonthDay(weekStart)} – ${formatShortMonthDay(weekEnd)}`
}

/**
 * Minutos planejados como hh:mm — usado no "Total Duração" do resumo semanal.
 * 212 → "3:32"; 45 → "0:45".
 */
export function formatMinutesAsDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return '0:00'
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  return `${hours}:${String(total % 60).padStart(2, '0')}`
}

/** Data longa curta para os títulos dos dias na lista mobile: "seg, 16 nov". */
export function formatMobileDayLabel(date: Date): string {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(date)
    .replace('.', '')
  return `${weekday}, ${formatShortMonthDay(date)}`
}

/** Segunda-feira (ISO) da semana que contém a data informada. */
export function weekStartIso(iso: string): string | null {
  const date = parseISODate(iso)
  if (!date) return null
  return toISODate(addDays(date, -mondayIndex(date)))
}
