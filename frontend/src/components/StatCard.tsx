import type { ComponentType } from 'react'
import { cn } from '../lib/cn'
import { Card } from './ui/Card'
import { Skeleton } from './Feedback'

export type StatTone = 'brand' | 'accent' | 'ink' | 'cyan'

const toneStyles: Record<StatTone, string> = {
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  ink: 'bg-ink-100 text-ink-700',
  cyan: 'bg-brand-200 text-brand-900',
}

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon: ComponentType<{ className?: string }>
  tone?: StatTone
  loading?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
  loading = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2.5 h-8 w-24" />
          ) : (
            <p className="mt-2 text-3xl font-bold tabular-nums text-ink-900">{value}</p>
          )}
          {hint ? <p className="mt-1 truncate text-xs text-ink-500">{hint}</p> : null}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            toneStyles[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  )
}
