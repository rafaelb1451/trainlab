import { CircleCheck, CircleDashed, CircleSlash } from 'lucide-react'
import type { CalendarSession, PlannedStatus } from '../../api/types'
import { formatDistance } from '../../lib/format'
import { PLANNED_STATUS_LABELS } from '../../lib/labels'
import { cn } from '../../lib/cn'
import { SPORT_BAR } from './sportStyles'

const STATUS_STYLES: Record<PlannedStatus, string> = {
  PLANNED: 'bg-ink-100 text-ink-600 ring-ink-200/70',
  COMPLETED: 'bg-brand-50 text-brand-700 ring-brand-200',
  SKIPPED: 'bg-accent-50 text-accent-700 ring-accent-200',
}

/** Duração planejada sempre em h:mm:ss, como no TrainingPeaks. */
function formatPlannedClock(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** "P: 0:45:00 · 6.45 km · 40 TSS" — só com as partes conhecidas. */
export function sessionPlannedLine(session: CalendarSession): string {
  const workout = session.workout
  if (!workout) return 'Treino indisponível'
  const parts: string[] = []
  if (workout.estimatedDurationSec > 0) {
    parts.push(formatPlannedClock(workout.estimatedDurationSec))
  }
  if (workout.estimatedDistanceM > 0) {
    parts.push(formatDistance(workout.estimatedDistanceM))
  }
  if (workout.estimatedTss > 0) {
    parts.push(`${workout.estimatedTss} TSS`)
  }
  return parts.length > 0 ? `P: ${parts.join(' · ')}` : 'P: duração aberta'
}

type ConformityTone = 'ok' | 'skipped' | 'pending'

function conformityOf(session: CalendarSession, today: string): ConformityTone | null {
  if (session.status === 'COMPLETED') return 'ok'
  if (session.status === 'SKIPPED') return 'skipped'
  return session.scheduledDate.slice(0, 10) < today ? 'pending' : null
}

const CONFORMITY_STYLES: Record<ConformityTone, string> = {
  ok: 'text-brand-700',
  skipped: 'text-accent-700',
  pending: 'text-ink-500',
}

interface SessionCardViewProps {
  session: CalendarSession
  today: string
  onClick?: () => void
  dragging?: boolean
  overlay?: boolean
  className?: string
}

/**
 * Card compacto de sessão. É puramente visual: o wrapper com dnd-kit adiciona
 * arraste e o clique abre o menu de ações.
 */
export function SessionCardView({
  session,
  today,
  onClick,
  dragging = false,
  overlay = false,
  className,
}: SessionCardViewProps) {
  const workout = session.workout
  const sport = workout?.sport
  const conformity = conformityOf(session, today)
  const conformityLabel =
    conformity === 'ok' ? 'Conforme' : conformity === 'skipped' ? 'Não realizado' : 'Pendente'

  return (
    <button
      type="button"
      onClick={onClick}
      data-session-id={session.id}
      title={workout?.name ?? 'Treino indisponível'}
      className={cn(
        'group/session relative w-full min-w-0 overflow-hidden rounded-md border border-ink-200/80 bg-white py-1 pl-2 pr-1 text-left shadow-sm transition',
        'hover:border-brand-300 hover:shadow focus-visible:border-brand-500',
        dragging && 'opacity-40',
        overlay && 'rotate-1 shadow-pop',
        className,
      )}
    >
      <span
        className={cn(
          'absolute inset-y-0 left-0 w-[3px]',
          sport ? SPORT_BAR[sport] : 'bg-ink-300',
        )}
        aria-hidden="true"
      />
      <span className="block truncate text-[11px] font-semibold leading-tight text-ink-900">
        {workout?.name ?? 'Treino removido'}
      </span>
      <span className="mt-0.5 block text-[9.5px] leading-tight text-ink-500">
        {sessionPlannedLine(session)}
      </span>
      <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-semibold ring-1 ring-inset',
            STATUS_STYLES[session.status],
          )}
        >
          {PLANNED_STATUS_LABELS[session.status]}
        </span>
        {conformity ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-[9px] font-semibold',
              CONFORMITY_STYLES[conformity],
            )}
          >
            {conformity === 'ok' ? (
              <CircleCheck className="h-2.5 w-2.5" aria-hidden="true" />
            ) : conformity === 'skipped' ? (
              <CircleSlash className="h-2.5 w-2.5" aria-hidden="true" />
            ) : (
              <CircleDashed className="h-2.5 w-2.5" aria-hidden="true" />
            )}
            {conformityLabel}
          </span>
        ) : null}
      </span>
    </button>
  )
}
