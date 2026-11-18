import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import type { CalendarMetric, CalendarSession } from '../../api/types'
import { formatDateLong } from '../../lib/format'
import { cn } from '../../lib/cn'
import { DayMetrics } from './DayMetrics'
import { DraggableSessionCard } from './DraggableSessionCard'

interface DayCellProps {
  date: Date
  iso: string
  inMonth: boolean
  isToday: boolean
  sessions: CalendarSession[]
  metrics: CalendarMetric | null
  canManage: boolean
  todayIso: string
  highlighted: boolean
  onAdd: (date: string) => void
  onSelectSession: (session: CalendarSession) => void
}

/** Célula do dia na grade mensal (desktop), com alvo de soltura do dnd-kit. */
export function DayCell({
  date,
  iso,
  inMonth,
  isToday,
  sessions,
  metrics,
  canManage,
  todayIso,
  highlighted,
  onAdd,
  onSelectSession,
}: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${iso}`,
    data: { date: iso },
    disabled: !canManage,
  })

  const dropActive = highlighted && isOver

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      data-date={iso}
      aria-label={formatDateLong(iso)}
      className={cn(
        'group/cell relative min-w-0 border-b border-r border-ink-100 p-1.5 transition-colors',
        inMonth ? 'bg-white' : 'bg-ink-50/50',
        isToday && 'z-[1] bg-brand-50 ring-2 ring-inset ring-brand-600',
        dropActive && 'bg-brand-100 ring-2 ring-inset ring-brand-500',
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums',
            isToday
              ? 'bg-brand-600 text-white'
              : inMonth
                ? 'text-ink-800'
                : 'text-ink-400',
          )}
        >
          {date.getDate()}
          {isToday ? <span className="sr-only"> Hoje</span> : null}
        </span>
        {canManage ? (
          <button
            type="button"
            onClick={() => onAdd(iso)}
            className="rounded-md p-0.5 text-ink-400 opacity-0 transition hover:bg-white hover:text-brand-700 focus-visible:opacity-100 group-hover/cell:opacity-100"
            aria-label={`Adicionar sessão em ${formatDateLong(iso)}`}
            title="Adicionar sessão"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <DayMetrics metrics={metrics} />

      {sessions.length > 0 ? (
        <div className="mt-1 space-y-1">
          {sessions.map((session) => (
            <DraggableSessionCard
              key={session.id}
              session={session}
              today={todayIso}
              disabled={!canManage}
              onClick={() => onSelectSession(session)}
            />
          ))}
        </div>
      ) : null}

      {dropActive ? (
        <span className="pointer-events-none absolute inset-x-1 bottom-1 rounded-md border border-dashed border-brand-400 bg-white/80 py-0.5 text-center text-[9px] font-semibold text-brand-700">
          Soltar aqui
        </span>
      ) : null}
    </div>
  )
}
