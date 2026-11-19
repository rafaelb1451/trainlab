import { Share2 } from 'lucide-react'
import { useState } from 'react'
import type { ActivitySummary } from '../../api/types'
import { Button } from '../ui/Button'
import { ActivityShareModal } from './ActivityShareModal'

export interface ActivityShareButtonProps {
  activity: ActivitySummary
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'subtle'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Gatilho da ação "Compartilhar": abre a galeria de modelos do card. */
export function ActivityShareButton({
  activity,
  variant = 'secondary',
  size = 'md',
  className,
}: ActivityShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={`Compartilhar atividade ${activity.name}`}
        data-testid="share-activity-button"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        Compartilhar
      </Button>
      <ActivityShareModal open={open} activity={activity} onClose={() => setOpen(false)} />
    </>
  )
}
