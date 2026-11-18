import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CircleCheck, Plus, Search, UserPlus, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi } from '../api/endpoints'
import type { Sex } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import {
  formatAge,
  formatDateShort,
  formatThresholdSummary,
} from '../lib/format'
import { SEX_LABELS } from '../lib/labels'

interface NewAthleteErrors {
  displayName?: string
  email?: string
  password?: string
  birthDate?: string
  heightCm?: string
  weightKg?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function AthletesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [sex, setSex] = useState<Sex>('M')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<NewAthleteErrors>({})

  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: athletesApi.list })

  const createMutation = useMutation({
    mutationFn: athletesApi.create,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['athletes'] })
      setModalOpen(false)
      setNotice(`Atleta ${created.displayName} criado com sucesso.`)
      resetForm()
    },
  })

  function resetForm() {
    setDisplayName('')
    setEmail('')
    setPassword('')
    setBirthDate('')
    setSex('M')
    setHeightCm('')
    setWeightKg('')
    setNotes('')
    setErrors({})
    createMutation.reset()
  }

  function closeModal() {
    setModalOpen(false)
    resetForm()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: NewAthleteErrors = {}
    if (!displayName.trim()) {
      nextErrors.displayName = 'Informe o nome do atleta.'
    }
    if (!email.trim()) {
      nextErrors.email = 'Informe o e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.'
    }
    if (!password) {
      nextErrors.password = 'Defina uma senha inicial.'
    } else if (password.length < 8) {
      nextErrors.password = 'A senha deve ter no mínimo 8 caracteres.'
    }
    const height = parseOptionalNumber(heightCm)
    if (heightCm.trim() && (height === null || height <= 0)) {
      nextErrors.heightCm = 'Informe uma altura válida em cm.'
    }
    const weight = parseOptionalNumber(weightKg)
    if (weightKg.trim() && (weight === null || weight <= 0)) {
      nextErrors.weightKg = 'Informe um peso válido em kg.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    createMutation.mutate({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
      birthDate: birthDate || null,
      sex,
      heightCm: height,
      weightKg: weight,
      notes: notes.trim() || null,
    })
  }

  const athletes = useMemo(() => {
    const list = athletesQuery.data ?? []
    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (athlete) =>
        athlete.displayName.toLowerCase().includes(term) ||
        athlete.email.toLowerCase().includes(term),
    )
  }, [athletesQuery.data, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atletas"
        description="Gerencie o plantel, os limiares e as zonas de treino de cada atleta."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Novo atleta
          </Button>
        }
      />

      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800"
        >
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          {notice}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto text-xs font-semibold underline-offset-2 hover:underline"
          >
            Fechar
          </button>
        </div>
      ) : null}

      {athletesQuery.isError ? (
        <ErrorAlert
          message={getApiErrorMessage(athletesQuery.error)}
          onRetry={() => void athletesQuery.refetch()}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="athlete-search" className="sr-only">
            Buscar atleta
          </label>
          <Input
            id="athlete-search"
            placeholder="Buscar por nome ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs font-medium text-slate-500">
          {athletes.length} {athletes.length === 1 ? 'atleta' : 'atletas'}
          {search.trim() ? ' encontrados' : ' no plantel'}
        </p>
      </div>

      {athletesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : athletes.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search.trim() ? 'Nenhum atleta encontrado' : 'Nenhum atleta cadastrado'}
          description={
            search.trim()
              ? 'Tente outro termo de busca.'
              : 'Cadastre o primeiro atleta com e-mail e senha inicial para começar a planejar.'
          }
          action={
            search.trim() ? (
              <Button variant="outline" onClick={() => setSearch('')}>
                Limpar busca
              </Button>
            ) : (
              <Button onClick={() => setModalOpen(true)}>
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Cadastrar atleta
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {athletes.map((athlete) => {
            const summaries = formatThresholdSummary(athlete.thresholdSummary)
            const age = formatAge(athlete.birthDate)
            return (
              <Link
                key={athlete.id}
                to={`/athletes/${athlete.id}`}
                className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-brand-300">
                    {initials(athlete.displayName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-slate-900">{athlete.displayName}</h2>
                    <p className="truncate text-xs text-slate-500">{athlete.email}</p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {athlete.sports.length > 0 ? (
                    athlete.sports.map((sport) => (
                      <SportBadge key={sport} sport={sport} size="sm" />
                    ))
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      Sem modalidades
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Limiares
                  </p>
                  {summaries.length > 0 ? (
                    summaries.slice(0, 2).map((summary) => (
                      <p key={summary} className="truncate text-xs text-slate-600">
                        {summary}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Ainda não configurados</p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span>{SEX_LABELS[athlete.sex]}</span>
                  {age ? <span>{age}</span> : null}
                  {athlete.birthDate ? <span>Nasc. {formatDateShort(athlete.birthDate)}</span> : null}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Novo atleta"
        description="O atleta receberá acesso com o e-mail e a senha informados."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeModal} disabled={createMutation.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="new-athlete-form" loading={createMutation.isPending}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Cadastrar atleta
            </Button>
          </>
        }
      >
        <form id="new-athlete-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
          {createMutation.isError ? (
            <ErrorAlert
              title="Não foi possível cadastrar"
              message={getApiErrorMessage(createMutation.error)}
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nome"
              htmlFor="athlete-name"
              error={errors.displayName}
              required
              className="sm:col-span-2"
            >
              <Input
                id="athlete-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nome do atleta"
                aria-invalid={Boolean(errors.displayName) || undefined}
                autoFocus
              />
            </Field>

            <Field label="E-mail" htmlFor="athlete-email" error={errors.email} required>
              <Input
                id="athlete-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="atleta@exemplo.com"
                aria-invalid={Boolean(errors.email) || undefined}
              />
            </Field>

            <Field
              label="Senha inicial"
              htmlFor="athlete-password"
              error={errors.password}
              hint="Mínimo de 8 caracteres."
              required
            >
              <Input
                id="athlete-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha de acesso"
                aria-invalid={Boolean(errors.password) || undefined}
              />
            </Field>

            <Field label="Data de nascimento" htmlFor="athlete-birth">
              <Input
                id="athlete-birth"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </Field>

            <Field label="Sexo" htmlFor="athlete-sex">
              <Select
                id="athlete-sex"
                value={sex}
                onChange={(event) => {
                  const value = event.target.value
                  setSex(value === 'F' ? 'F' : value === 'OTHER' ? 'OTHER' : 'M')
                }}
              >
                <option value="M">{SEX_LABELS.M}</option>
                <option value="F">{SEX_LABELS.F}</option>
                <option value="OTHER">{SEX_LABELS.OTHER}</option>
              </Select>
            </Field>

            <Field label="Altura (cm)" htmlFor="athlete-height" error={errors.heightCm}>
              <Input
                id="athlete-height"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="175"
                aria-invalid={Boolean(errors.heightCm) || undefined}
              />
            </Field>

            <Field label="Peso (kg)" htmlFor="athlete-weight" error={errors.weightKg}>
              <Input
                id="athlete-weight"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                placeholder="70"
                aria-invalid={Boolean(errors.weightKg) || undefined}
              />
            </Field>

            <Field
              label="Observações"
              htmlFor="athlete-notes"
              hint="Lesões, histórico e preferências de treino."
              className="sm:col-span-2"
            >
              <Textarea
                id="athlete-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Informações úteis para o planejamento…"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}
