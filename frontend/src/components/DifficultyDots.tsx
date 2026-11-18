import { DIFFICULTY_LABELS } from '../lib/labels'
import { cn } from '../lib/cn'

interface DifficultyDotsProps {
  difficulty: number
  showLabel?: boolean
  className?: string
}

export function DifficultyDots({ difficulty, showLabel = false, className }: DifficultyDotsProps) {
  const clamped = Math.min(5, Math.max(1, Math.round(difficulty)))
  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`Dificuldade ${clamped}/5 — ${DIFFICULTY_LABELS[clamped] ?? ''}`}
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className={cn(
              'h-1.5 w-3 rounded-full',
              level <= clamped ? 'bg-accent-500' : 'bg-ink-200',
            )}
          />
        ))}
      </span>
      {showLabel ? (
        <span className="text-xs text-ink-500">{DIFFICULTY_LABELS[clamped]}</span>
      ) : (
        <span className="sr-only">Dificuldade {clamped} de 5</span>
      )}
    </span>
  )
}
