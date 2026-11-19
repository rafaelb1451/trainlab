import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { authApi } from '../api/endpoints'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui/Button'

type State = 'loading' | 'ok' | 'error'

/**
 * Página que o link do e-mail abre. Consome o token uma única vez e confirma a conta.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('Este link nao tem o codigo de confirmacao. Copie o link inteiro do e-mail.')
      return
    }
    let active = true
    authApi
      .verifyEmail(token)
      .then(() => {
        if (!active) return
        setState('ok')
        setMessage('Seu e-mail foi confirmado. A conta esta ativa.')
      })
      .catch((error: unknown) => {
        if (!active) return
        setState('error')
        setMessage(getApiErrorMessage(error))
      })
    return () => {
      active = false
    }
  }, [token])

  return (
    <AuthLayout
      title={state === 'ok' ? 'E-mail confirmado' : 'Confirmacao de e-mail'}
      subtitle={
        state === 'loading'
          ? 'Validando seu link...'
          : state === 'ok'
            ? 'Tudo certo com a sua conta.'
            : 'Nao foi possivel confirmar.'
      }
      footer={
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Ir para o login
        </Link>
      }
    >
      <div className="space-y-4">
        <p
          className={
            state === 'ok'
              ? 'rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700'
              : state === 'error'
                ? 'rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700'
                : 'rounded-xl bg-ink-100 px-4 py-3 text-sm text-ink-600'
          }
          role={state === 'error' ? 'alert' : 'status'}
        >
          {state === 'loading' ? 'Aguarde um instante...' : message}
        </p>

        {state === 'ok' ? (
          <Link to="/">
            <Button className="w-full">Entrar no TrainLab</Button>
          </Link>
        ) : null}
      </div>
    </AuthLayout>
  )
}
