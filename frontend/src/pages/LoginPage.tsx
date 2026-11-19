import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { getApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { AuthLayout } from '../components/AuthLayout'
import { ErrorAlert } from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'

const DEMO_ACCOUNTS = [
  {
    role: 'Treinador',
    email: 'coach@trainlab.app',
    password: 'coach1234',
    description: 'Gerencia atletas, treinos e planejamento.',
  },
  {
    role: 'Atleta',
    email: 'marina@trainlab.app',
    password: 'atleta1234',
    description: 'Triatleta com limiares completos.',
  },
]

interface LoginLocationState {
  from?: string
}

export function LoginPage() {
  const { user, initializing, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.user)
      navigate(from, { replace: true })
    },
  })

  if (user && !initializing) {
    return <Navigate to="/" replace />
  }

  function handleDemoFill(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setErrors({})
    mutation.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      nextErrors.email = 'Informe seu e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.'
    }
    if (!password) {
      nextErrors.password = 'Informe sua senha.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({ email: email.trim(), password })
  }

  return (
    <AuthLayout
      title="Entrar na conta"
      subtitle="Acesse o painel para planejar e acompanhar seus treinos."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Criar conta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mutation.isError ? (
          <ErrorAlert
            title="Não foi possível entrar"
            message={getApiErrorMessage(mutation.error, 'E-mail ou senha inválidos.')}
          />
        ) : null}

        <Field label="E-mail" htmlFor="login-email" error={errors.email} required>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email) || undefined}
            autoFocus
          />
        </Field>

        <Field label="Senha" htmlFor="login-password" error={errors.password} required>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password) || undefined}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-700"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
          {mutation.isPending ? (
            'Entrando…'
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Entrar
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/80 p-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-400 text-[10px] font-bold text-ink-900">
            i
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
            Credenciais de demonstração
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {DEMO_ACCOUNTS.map((demo) => (
            <div
              key={demo.email}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-800">
                  {demo.role}{' '}
                  <span className="font-normal text-ink-500">· {demo.description}</span>
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-600">
                  {demo.email} / {demo.password}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDemoFill(demo.email, demo.password)}
                className="rounded-lg border border-ink-200 px-2.5 py-1 text-[11px] font-semibold text-ink-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
              >
                Usar
              </button>
            </div>
          ))}
        </div>
      </div>

      {mutation.isPending ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
          <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />
          Conectando ao servidor…
        </p>
      ) : null}
    </AuthLayout>
  )
}
