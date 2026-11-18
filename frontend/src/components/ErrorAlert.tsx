import { CircleAlert, RefreshCw } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'

interface ErrorAlertProps {
  message: string
  title?: string
  onRetry?: () => void
  className?: string
}

export function ErrorAlert({ message, title = 'Algo deu errado', onRetry, className }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-red-700">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="border-red-200 bg-white text-red-700 hover:bg-red-50">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Tentar novamente
        </Button>
      ) : null}
    </div>
  )
}
