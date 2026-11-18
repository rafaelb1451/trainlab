import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { authApi } from '../api/endpoints'
import type { UserRole } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { AuthLayout } from '../components/AuthLayout'
import { ErrorAlert } from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'

interface RegisterErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export function RegisterPage() {
  const { user, initializing, login } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('COACH')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<RegisterErrors>({})

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.token, data.user)
      navigate('/', { replace: true })
    },
  })

  if (user && !initializing) {
    return <Navigate to="/" replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: RegisterErrors = {}
    if (!name.trim()) {
      nextErrors.name = 'Informe seu nome.'
    } else if (name.trim().length < 2) {
      nextErrors.name = 'Informe pelo menos 2 caracteres.'
    }
    if (!email.trim()) {
      nextErrors.email = 'Informe seu e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.'
    }
    if (!password) {
      nextErrors.password = 'Crie uma senha.'
    } else if (password.length < 8) {
      nextErrors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'As senhas não coincidem.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({ name: name.trim(), email: email.trim(), password, role })
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece a planejar treinos estruturados em poucos minutos."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {mutation.isError ? (
          <ErrorAlert
            title="Não foi possível criar a conta"
            message={getApiErrorMessage(mutation.error)}
          />
        ) : null}

        <Field label="Nome completo" htmlFor="register-name" error={errors.name} required>
          <Input
            id="register-name"
            name="name"
            autoComplete="name"
            placeholder="Seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name) || undefined}
            autoFocus
          />
        </Field>

        <Field label="E-mail" htmlFor="register-email" error={errors.email} required>
          <Input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email) || undefined}
          />
        </Field>

        <Field label="Perfil" htmlFor="register-role" hint="Treinadores gerenciam atletas e treinos.">
          <Select
            id="register-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value === 'ATHLETE' ? 'ATHLETE' : 'COACH')}
          >
            <option value="COACH">Treinador</option>
            <option value="ATHLETE">Atleta</option>
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" htmlFor="register-password" error={errors.password} required>
            <div className="relative">
              <Input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password) || undefined}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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

          <Field
            label="Confirmar senha"
            htmlFor="register-confirm"
            error={errors.confirmPassword}
            required
          >
            <Input
              id="register-confirm"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={Boolean(errors.confirmPassword) || undefined}
            />
          </Field>
        </div>

        <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
          {mutation.isPending ? (
            'Criando conta…'
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Criar conta
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">Quer apenas testar a demonstração?</p>
        <p className="mt-1">
          Entre com{' '}
          <span className="font-mono text-[11px] text-slate-800">coach@trainlab.app</span> /{' '}
          <span className="font-mono text-[11px] text-slate-800">coach1234</span> ou{' '}
          <span className="font-mono text-[11px] text-slate-800">marina@trainlab.app</span> /{' '}
          <span className="font-mono text-[11px] text-slate-800">atleta1234</span>.
        </p>
      </div>
    </AuthLayout>
  )
}
