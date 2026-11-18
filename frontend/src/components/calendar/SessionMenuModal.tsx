import {
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  Copy,
  LineChart,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CalendarSession, PlannedStatus } from '../../api/types'
import { formatDateLong, formatDistance, formatEstimatedDuration, formatWeekday } from '../../lib/format'
import { PLANNED_STATUS_LABELS, SPORT_LABELS, WORKOUT_TYPE_LABELS } from '../../lib/labels'
import { SportBadge } from '../SportBadge'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/cn'

interface SessionMenuModalProps {
  open: boolean
  session: CalendarSession | null
  /** Atividade vinculada, resolvida pelo calendário (v6). */
  activityId: string | null
  manage: boolean
  busy: boolean
  error: string | null
  onClose: () => void
  onOpenWorkout: (workoutId: string) => void
  onAnalyze: (activityId: string) => void
  onChangeStatus: (status: PlannedStatus) => void
  onMove: (date: string) => void
  onDuplicate: () => void
  onRemove: () => void
}

const STATUS_PILL: Record<PlannedStatus, string> = {
  PLANNED: 'bg-ink-100 text-ink-600 ring-ink-200',
  COMPLETED: 'bg-brand-50 text-brand-700 ring-brand-200',
  SKIPPED: 'bg-accent-50 text-accent-700 ring-accent-200',
}

export function SessionMenuModal({
  open,
  session,
  activityId,
  manage,
  busy,
  error,
  onClose,
  onOpenWorkout,
  onAnalyze,
  onChangeStatus,
  onMove,
  onDuplicate,
  onRemove,
}: SessionMenuModalProps) {
  const [moveDate, setMoveDate] = useState('')

  useEffect(() => {
    if (open && session) setMoveDate(session.scheduledDate.slice(0, 10))
  }, [open, session])

  if (!session) return null

  const workout = session.workout
  const date = session.scheduledDate.slice(0, 10)
  const meta: string[] = []
  if (workout) {
    meta.push(WORKOUT_TYPE_LABELS[workout.type])
    if (workout.estimatedDurationSec > 0) meta.push(formatEstimatedDuration(workout.estimatedDurationSec))
    if (workout.estimatedDistanceM > 0) meta.push(formatDistance(workout.estimatedDistanceM))
    if (workout.estimatedTss > 0) meta.push(`${workout.estimatedTss} TSS`)
  }

  const canMove = Boolean(moveDate) && moveDate !== date

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
      title={workout?.name ?? 'Sessão planejada'}
      description={`${formatWeekday(date)}, ${formatDateLong(date)}`}
      size="md"
      footer={
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink-100 bg-ink-50/70 px-3.5 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {workout ? <SportBadge sport={workout.sport} /> : null}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-900">
                {workout ? SPORT_LABELS[workout.sport] : 'Treino indisponível'}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-500">{meta.join(' · ') || 'Sem estimativas'}</p>
            </div>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
              STATUS_PILL[session.status],
            )}
          >
            {PLANNED_STATUS_LABELS[session.status]}
          </span>
        </div>

        {workout?.description ? (
          <p className="line-clamp-4 rounded-xl border border-ink-100 bg-white px-3.5 py-3 text-xs leading-relaxed text-ink-600">
            {workout.description}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        {activityId ? (
          <Button
            variant="secondary"
            fullWidth
            className="justify-start"
            onClick={() => onAnalyze(activityId)}
            disabled={busy}
          >
            <LineChart className="h-4 w-4" aria-hidden="true" />
            Analisar treino
          </Button>
        ) : null}

        {manage ? (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                fullWidth
                className="justify-start"
                onClick={() => workout && onOpenWorkout(workout.id)}
                disabled={!workout || busy}
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                Abrir treino
              </Button>
              {session.status === 'COMPLETED' ? (
                <Button
                  variant="outline"
                  fullWidth
                  className="justify-start"
                  onClick={() => onChangeStatus('PLANNED')}
                  disabled={busy}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reabrir sessão
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  fullWidth
                  className="justify-start"
                  onClick={() => onChangeStatus('COMPLETED')}
                  disabled={busy}
                >
                  <CircleCheck className="h-4 w-4" aria-hidden="true" />
                  Marcar como concluída
                </Button>
              )}
            </div>

            <div className="rounded-xl border border-ink-100 p-3">
              <Field label="Mover para data…" htmlFor="session-move-date">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="session-move-date"
                    type="date"
                    value={moveDate}
                    onChange={(event) => setMoveDate(event.target.value)}
                    disabled={busy}
                  />
                  <Button
                    variant="primary"
                    onClick={() => onMove(moveDate)}
                    loading={busy}
                    disabled={!canMove}
                    className="shrink-0"
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                    Mover
                  </Button>
                </div>
              </Field>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                fullWidth
                className="justify-start"
                onClick={onDuplicate}
                disabled={busy || !workout}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Duplicar
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="justify-start text-ink-700 hover:bg-ink-100"
                onClick={onRemove}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-3 text-xs text-ink-600">
            Sessão planejada pelo seu treinador. Use “Fechar” para voltar ao calendário.
          </p>
        )}
      </div>
    </Modal>
  )
}
