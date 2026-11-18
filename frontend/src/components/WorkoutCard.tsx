import { Clock, Copy, ListChecks, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { WorkoutSummary } from '../api/types'
import { DifficultyDots } from './DifficultyDots'
import { SportBadge } from './SportBadge'
import { formatEstimatedDuration } from '../lib/format'
import { WORKOUT_TYPE_LABELS } from '../lib/labels'

interface WorkoutCardProps {
  workout: WorkoutSummary
  onDuplicate: (workout: WorkoutSummary) => void
  onDelete: (workout: WorkoutSummary) => void
  busy?: boolean
}

export function WorkoutCard({ workout, onDuplicate, onDelete, busy = false }: WorkoutCardProps) {
  const visibleTags = workout.tags.slice(0, 3)
  const hiddenTags = workout.tags.length - visibleTags.length

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <SportBadge sport={workout.sport} />
          <DifficultyDots difficulty={workout.difficulty} />
        </div>

        <Link to={`/workouts/${workout.id}`} className="mt-3 block">
          <h2 className="line-clamp-2 text-base font-bold text-slate-900 group-hover:text-ink-800">
            {workout.name}
          </h2>
        </Link>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {WORKOUT_TYPE_LABELS[workout.type]}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {formatEstimatedDuration(workout.estimatedDurationSec)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {workout.stepCount} {workout.stepCount === 1 ? 'step' : 'steps'}
          </span>
        </div>

        {workout.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                #{tag}
              </span>
            ))}
            {hiddenTags > 0 ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                +{hiddenTags}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-[11px] text-slate-400">Sem tags</p>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
        <Link
          to={`/workouts/${workout.id}`}
          className="inline-flex flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Editar
        </Link>
        <button
          type="button"
          onClick={() => onDuplicate(workout)}
          disabled={busy}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:pointer-events-none disabled:opacity-50"
          aria-label={`Duplicar treino ${workout.name}`}
          title="Duplicar"
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(workout)}
          disabled={busy}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50"
          aria-label={`Excluir treino ${workout.name}`}
          title="Excluir"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
