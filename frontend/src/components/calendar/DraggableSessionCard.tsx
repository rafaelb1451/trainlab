import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CalendarSession } from '../../api/types'
import { SessionCardView } from './SessionCard'

interface DraggableSessionCardProps {
  session: CalendarSession
  today: string
  disabled: boolean
  onClick: () => void
}

/** Envolve o card com o arraste do dnd-kit (somente desktop). */
export function DraggableSessionCard({
  session,
  today,
  disabled,
  onClick,
}: DraggableSessionCardProps) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `session:${session.id}`,
    data: { sessionId: session.id },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      className={disabled ? undefined : 'cursor-grab touch-none active:cursor-grabbing'}
    >
      <SessionCardView session={session} today={today} onClick={onClick} dragging={isDragging} />
    </div>
  )
}

/** Card fantasma exibido sob o cursor durante o arraste. */
export function SessionDragOverlay({ session, today }: { session: CalendarSession; today: string }) {
  return (
    <div className="w-44 rotate-2">
      <SessionCardView session={session} today={today} overlay />
    </div>
  )
}
