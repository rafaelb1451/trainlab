import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { authApi } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'

/**
 * Faixa que cobra a confirmacao do e-mail quando a conta ainda nao foi verificada.
 * Um clique reenvia o link.
 */
export function EmailVerificationBanner({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function resend() {
    setStatus('sending')
    setError('')
    try {
      await authApi.resendVerification()
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
      <MailWarning className="h-4 w-4 shrink-0 text-accent-700" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-ink-800">
        {status === 'sent'
          ? 'Link reenviado — confira a caixa de entrada (e o spam).'
          : status === 'error'
            ? error
            : (
                <>
                  Confirme seu e-mail <strong>{email}</strong> para ativar o aviso de treinos.
                </>
              )}
      </p>
      {status !== 'sent' ? (
        <button
          type="button"
          onClick={resend}
          disabled={status === 'sending'}
          className="rounded-lg bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-600 disabled:opacity-60"
        >
          {status === 'sending' ? 'Enviando...' : 'Reenviar link'}
        </button>
      ) : null}
    </div>
  )
}
