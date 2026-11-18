import { Plus } from 'lucide-react'
import type { CalendarDay, CalendarSession, CalendarWeek } from '../../api/types'
import {
  WEEKDAY_LABELS,
  formatMobileDayLabel,
  formatWeekRange,
  isSameMonth,
  isoDay,
  type MonthCursor,
} from '../../lib/calendar'
import { formatDateLong } from '../../lib/format'
import { cn } from '../../lib/cn'
import { DayMetrics } from './DayMetrics'
import { SessionCardView } from './SessionCard'
import { WeekSummaryCompact } from './WeekSummary'

interface MobileMonthListProps {
  weeks: Date[][]
  cursor: MonthCursor
  dayMap: Map<string, CalendarDay>
  weekMap: Map<string, CalendarWeek>
  todayIso: string
  canManage: boolean
  onAdd: (date: string) => void
  onSelectSession: (session: CalendarSession) => void
}

/** Lista semanal para telas menores que 900px: uma seção por semana, 7 dias cada. */
export function MobileMonthList({
  weeks,
  cursor,
  dayMap,
  weekMap,
  todayIso,
  canManage,
  onAdd,
  onSelectSession,
}: MobileMonthListProps) {
  return (
    <div className="space-y-4 min-[900px]:hidden">
      {weeks.map((week) => {
        const weekStart = isoDay(week[0])
        return (
          <section
            key={weekStart}
            className="overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card"
            aria-label={`Semana de ${formatWeekRange(week[0])}`}
          >
            <header className="space-y-1 border-b border-ink-100 bg-ink-50/70 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                Semana · {formatWeekRange(week[0])}
              </p>
              <WeekSummaryCompact week={weekMap.get(weekStart)} />
            </header>

            <div>
              {week.map((date, index) => {
                const iso = isoDay(date)
                const day = dayMap.get(iso)
                const sessions = day?.sessions ?? []
                const inMonth = isSameMonth(date, cursor)
                const isToday = iso === todayIso

                return (
                  <div
                    key={iso}
                    data-date={iso}
                    className={cn(
                      'border-b border-ink-100 px-3 py-2.5 last:border-b-0',
                      !inMonth && 'bg-ink-50/40',
                      isToday && 'bg-brand-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums',
                            isToday
                              ? 'bg-brand-600 text-white'
                              : inMonth
                                ? 'bg-ink-100 text-ink-800'
                                : 'bg-ink-50 text-ink-400',
                          )}
                        >
                          {date.getDate()}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'truncate text-[11px] font-semibold uppercase tracking-[0.04em]',
                              inMonth ? 'text-ink-700' : 'text-ink-400',
                            )}
                          >
                            {WEEKDAY_LABELS[index]} · {formatMobileDayLabel(date)}
                          </p>
                          {isToday ? (
                            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-brand-700">
                              Hoje
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => onAdd(iso)}
                          className="rounded-lg border border-ink-200 bg-white p-1.5 text-ink-500 transition hover:border-brand-300 hover:text-brand-700"
                          aria-label={`Adicionar sessão em ${formatDateLong(iso)}`}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>

                    <DayMetrics metrics={day?.metrics ?? null} />

                    {sessions.length > 0 ? (
                      <div className="mt-1.5 space-y-1.5">
                        {sessions.map((session) => (
                          <SessionCardView
                            key={session.id}
                            session={session}
                            today={todayIso}
                            onClick={() => onSelectSession(session)}
                            className="py-1.5 pl-2.5"
                          />
                        ))}
                      </div>
                    ) : canManage ? (
                      <button
                        type="button"
                        onClick={() => onAdd(iso)}
                        className="mt-1.5 w-full rounded-lg border border-dashed border-ink-200 px-2 py-1.5 text-left text-[10px] font-medium text-ink-400 transition hover:border-brand-300 hover:text-brand-700"
                      >
                        + Adicionar sessão
                      </button>
                    ) : (
                      <p className="mt-1.5 text-[10px] text-ink-400">Sem sessões planejadas.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
