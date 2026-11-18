import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'

export type ToastTone = 'success' | 'error'

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

export interface ToastController {
  toasts: ToastItem[]
  push: (tone: ToastTone, message: string) => void
  dismiss: (id: number) => void
}

let nextToastId = 0

/** Fila de toasts local da página: sucesso some em 4s, erro em 7s. */
export function useToasts(): ToastController {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<number[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++nextToastId
      setToasts((current) => [...current.slice(-3), { id, tone, message }])
      const timer = window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000)
      timers.current.push(timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const registered = timers.current
    return () => {
      registered.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  return { toasts, push, dismiss }
}

interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'animate-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm shadow-pop',
            toast.tone === 'success'
              ? 'border-brand-200 bg-white text-ink-800'
              : 'border-red-200 bg-red-50 text-red-800',
          )}
        >
          {toast.tone === 'success' ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          )}
          <p className="min-w-0 flex-1 font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="rounded-md p-0.5 text-current opacity-60 transition hover:opacity-100"
            aria-label="Fechar aviso"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
