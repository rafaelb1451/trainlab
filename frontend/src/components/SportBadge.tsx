import { Bike, Footprints, Waves } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Sport } from '../api/types'
import { SPORT_LABELS } from '../lib/labels'
import { cn } from '../lib/cn'

const styles: Record<
  Sport,
  { classes: string; icon: ComponentType<{ className?: string }> }
> = {
  RUN: {
    classes: 'bg-accent-50 text-accent-700 ring-accent-200',
    icon: Footprints,
  },
  BIKE: {
    classes: 'bg-brand-50 text-brand-700 ring-brand-200',
    icon: Bike,
  },
  SWIM: {
    classes: 'bg-brand-200 text-brand-900 ring-brand-300',
    icon: Waves,
  },
}

interface SportBadgeProps {
  sport: Sport
  size?: 'sm' | 'md'
  withIcon?: boolean
  className?: string
}

export function SportBadge({ sport, size = 'md', withIcon = true, className }: SportBadgeProps) {
  const config = styles[sport]
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset',
        config.classes,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className,
      )}
    >
      {withIcon ? <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden="true" /> : null}
      {SPORT_LABELS[sport]}
    </span>
  )
}
