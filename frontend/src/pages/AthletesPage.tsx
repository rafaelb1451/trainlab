import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Plus,
  Search,
  Target,
  Timer,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi, dashboardApi, plannedApi, workoutsApi } from '../api/endpoints'
import type { AthleteSummary, DailyMetric, Sex } from '../api/types'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { Button } from '../components/ui/Button'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import {
  addDays,
  formatAge,
  formatDateShort,
  formatEventCountdown,
  formatLatestMetric,
  formatNumber,
  formatThresholdSummary,
  formatWeeklyHours,
  toISODate,
} from '../lib/format'
import { SEX_LABELS } from '../lib/labels'

interface NewAthleteErrors {
  displayName?: string
  email?: string
  password?: string
  birthDate?: string
  heightCm?: string
  weightKg?: string
  weeklyHoursAvailable?: string
}

interface EnrichedAthlete {
  athlete: AthleteSummary
  plannedMinutes7d: number
  nextSessionDate: string | null
  nextWorkoutName: string | null
  latestMetric: DailyMetric | null
  summaries: string[]
  age: string | null
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

function AthleteCard({ entry }: { entry: EnrichedAthlete }) {
  const { athlete, latestMetric } = entry
  const countdown = formatEventCountdown(athlete.eventDate)

  return (
    <Link
      to={`/athletes/${athlete.id}`}
      className="group flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-accent-400">
          {initials(athlete.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-ink-900">{athlete.displayName}</h2>
          <p className="truncate text-xs text-ink-500">{athlete.email}</p>
        </div>
        <ArrowRight
          className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {athlete.sports.length > 0 ? (
          athlete.sports.map((sport) => <SportBadge key={sport} sport={sport} size="sm" />)
        ) : (
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-600">
            Sem modalidades
          </span>
        )}
        {athlete.weeklyHoursAvailable != null ? (
          <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-medium text-ink-600">
            {formatWeeklyHours(athlete.weeklyHoursAvailable)} disponíveis
          </span>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-accent-100 bg-accent-50/70 px-3 py-2.5">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
          <Target className="h-3 w-3" aria-hidden="true" />
          Objetivo
        </p>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-ink-800">
          {athlete.goal?.trim() ? athlete.goal : 'Objetivo ainda não definido.'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-600">
          {athlete.eventDate ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ink-800">
              <CalendarDays className="h-3 w-3 text-brand-600" aria-hidden="true" />
              {formatDateShort(athlete.eventDate)}
            </span>
          ) : (
            <span className="text-ink-500">Sem data de prova</span>
          )}
          {countdown ? <span>· {countdown}</span> : null}
        </div>
      </div>

      <div className="mt-3 space-y-1 border-t border-ink-100 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Limiares</p>
        {entry.summaries.length > 0 ? (
          entry.summaries.slice(0, 2).map((summary) => (
            <p key={summary} className="truncate text-xs text-ink-600">
              {summary}
            </p>
          ))
        ) : (
          <p className="text-xs text-ink-500">Ainda não configurados</p>
        )}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <div className="rounded-xl bg-ink-50 px-3 py-2">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            <Timer className="h-3 w-3" aria-hidden="true" />
            Carga 7d
          </p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-ink-900">
            {formatNumber(entry.plannedMinutes7d)} min
          </p>
        </div>
        <div className="rounded-xl bg-ink-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Próxima sessão
          </p>
          {entry.nextSessionDate ? (
            <>
              <p className="mt-0.5 text-sm font-bold text-ink-900">
                {formatDateShort(entry.nextSessionDate)}
              </p>
              <p className="truncate text-[10px] text-ink-500">
                {entry.nextWorkoutName ?? 'Sessão planejada'}
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-xs font-medium text-ink-500">Sem sessão</p>
          )}
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-ink-100 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
          Último registro
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-700">{formatLatestMetric(latestMetric)}</p>
        {latestMetric ? (
          <p className="text-[10px] text-ink-500">{formatDateShort(latestMetric.date)}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
        <span>{SEX_LABELS[athlete.sex]}</span>
        {entry.age ? <span>{entry.age}</span> : null}
        {athlete.birthDate ? <span>Nasc. {formatDateShort(athlete.birthDate)}</span> : null}
      </div>
    </Link>
  )
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
  const [goal, setGoal] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<NewAthleteErrors>({})

  const today = new Date()
  const from = toISODate(today)
  const to = toISODate(addDays(today, 6))

  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: athletesApi.list })
  const plannedQuery = useQuery({
    queryKey: ['planned', { from, to }],
    queryFn: () => plannedApi.list({ from, to }),
  })
  const workoutsQuery = useQuery({
    queryKey: ['workouts', {}],
    queryFn: () => workoutsApi.list(),
  })
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  })

  const createMutation = useMutation({
    mutationFn: athletesApi.create,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['athletes'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
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
    setGoal('')
    setEventDate('')
    setWeeklyHours('')
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
    const hours = parseOptionalNumber(weeklyHours)
    if (weeklyHours.trim() && (hours === null || hours <= 0 || hours > 168)) {
      nextErrors.weeklyHoursAvailable = 'Informe de 1 a 168 horas por semana.'
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
      goal: goal.trim() || null,
      eventDate: eventDate || null,
      weeklyHoursAvailable: hours,
    })
  }

  const enriched = useMemo<EnrichedAthlete[]>(() => {
    const list = athletesQuery.data ?? []
    const planned = plannedQuery.data ?? []
    const workouts = workoutsQuery.data ?? []
    const roster = dashboardQuery.data?.roster ?? []
    const workoutMap = new Map(workouts.map((workout) => [workout.id, workout]))
    const rosterMap = new Map(roster.map((entry) => [entry.athleteId, entry]))

    return list.map((athlete) => {
      const sessions = planned
        .filter((item) => item.athleteId === athlete.id)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
      const plannedMinutes = sessions.reduce((sum, item) => {
        const workout = item.workout ?? workoutMap.get(item.workoutId)
        return sum + Math.round((workout?.estimatedDurationSec ?? 0) / 60)
      }, 0)
      const next = sessions.find((item) => item.scheduledDate.slice(0, 10) >= from)
      const nextWorkout = next ? (next.workout ?? workoutMap.get(next.workoutId)) : undefined
      return {
        athlete,
        plannedMinutes7d: plannedMinutes,
        nextSessionDate: next?.scheduledDate ?? null,
        nextWorkoutName: nextWorkout?.name ?? null,
        latestMetric: rosterMap.get(athlete.id)?.latestMetric ?? null,
        summaries: formatThresholdSummary(athlete.thresholdSummary),
        age: formatAge(athlete.birthDate),
      }
    })
  }, [athletesQuery.data, dashboardQuery.data, from, plannedQuery.data, workoutsQuery.data])

  const athletes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return enriched
    return enriched.filter(
      ({ athlete }) =>
        athlete.displayName.toLowerCase().includes(term) ||
        athlete.email.toLowerCase().includes(term) ||
        (athlete.goal ?? '').toLowerCase().includes(term),
    )
  }, [enriched, search])

  const isInitialLoading = athletesQuery.isLoading || plannedQuery.isLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="Atletas"
        description="Objetivo, carga da semana, próximos treinos e limiares de cada atleta do plantel."
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

      {plannedQuery.isError ? (
        <ErrorAlert
          title="Carga semanal indisponível"
          message={getApiErrorMessage(plannedQuery.error)}
          onRetry={() => void plannedQuery.refetch()}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <label htmlFor="athlete-search" className="sr-only">
            Buscar atleta
          </label>
          <Input
            id="athlete-search"
            placeholder="Buscar por nome, e-mail ou objetivo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-xs font-medium text-ink-500">
          {athletes.length} {athletes.length === 1 ? 'atleta' : 'atletas'}
          {search.trim() ? ' encontrados' : ' no plantel'}
        </p>
      </div>

      {isInitialLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[360px]" />
          <Skeleton className="h-[360px]" />
          <Skeleton className="h-[360px]" />
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
          {athletes.map((entry) => (
            <AthleteCard key={entry.athlete.id} entry={entry} />
          ))}
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
              label="Objetivo / prova"
              htmlFor="athlete-goal"
              hint="Ex.: Meia maratona sub 1h35."
              className="sm:col-span-2"
            >
              <Input
                id="athlete-goal"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Objetivo principal da temporada"
              />
            </Field>

            <Field label="Data do evento" htmlFor="athlete-event-date">
              <Input
                id="athlete-event-date"
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
            </Field>

            <Field
              label="Horas semanais disponíveis"
              htmlFor="athlete-weekly-hours"
              error={errors.weeklyHoursAvailable}
              hint="Tempo real de treino por semana."
            >
              <Input
                id="athlete-weekly-hours"
                type="number"
                inputMode="decimal"
                min="0"
                max="168"
                step="0.5"
                value={weeklyHours}
                onChange={(event) => setWeeklyHours(event.target.value)}
                placeholder="10"
                aria-invalid={Boolean(errors.weeklyHoursAvailable) || undefined}
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
