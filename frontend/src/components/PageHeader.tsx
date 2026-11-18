import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
              {eyebrow}
            </p>
            <span className="mt-2 block h-1 w-10 rounded-full bg-accent-400" aria-hidden="true" />
          </>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
