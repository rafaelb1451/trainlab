import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  CalendarDays,
  CircleCheck,
  HeartPulse,
  Moon,
  Save,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getApiErrorMessage, isNotFoundError } from '../../api/client'
import { athletesApi } from '../../api/endpoints'
import type { AthleteDetail, AthleteOverview, Sex } from '../../api/types'
import {
  formatDateLong,
  formatDateShort,
  formatDecimal,
  formatEventCountdown,
  formatHours,
  formatMonthShort,
  formatMood,
  formatNumber,
  formatRpe,
  formatWeeklyHours,
} from '../../lib/format'
import { SEX_LABELS } from '../../lib/labels'
import { ErrorAlert } from '../ErrorAlert'
import { Skeleton } from '../Feedback'
import { SportBadge } from '../SportBadge'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Field, Input, Select, Textarea } from '../ui/Field'

interface DataFormErrors {
  displayName?: string
  heightCm?: string
  weightKg?: string
  weeklyHoursAvailable?: string
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function AthleteDataForm({
  athlete,
  canEdit,
  onSaved,
}: {
  athlete: AthleteDetail
  canEdit: boolean
  onSaved: () => void
}) {
  const queryClient = useQueryClient()
  const [displayName, setDisplayName] = useState(athlete.displayName)
  const [birthDate, setBirthDate] = useState(athlete.birthDate ?? '')
  const [sex, setSex] = useState<Sex>(athlete.sex)
  const [heightCm, setHeightCm] = useState(athlete.heightCm !== null ? String(athlete.heightCm) : '')
  const [weightKg, setWeightKg] = useState(athlete.weightKg !== null ? String(athlete.weightKg) : '')
  const [goal, setGoal] = useState(athlete.goal ?? '')
  const [eventDate, setEventDate] = useState(athlete.eventDate ?? '')
  const [weeklyHours, setWeeklyHours] = useState(
    athlete.weeklyHoursAvailable != null ? String(athlete.weeklyHoursAvailable) : '',
  )
  const [notes, setNotes] = useState(athlete.notes ?? '')
  const [errors, setErrors] = useState<DataFormErrors>({})
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof athletesApi.update>[1]) =>
      athletesApi.update(athlete.id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['athlete', athlete.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['athletes'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['overview', athlete.id] })
      setSaved(true)
      setErrors({})
      onSaved()
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const nextErrors: DataFormErrors = {}
    if (!displayName.trim()) nextErrors.displayName = 'Informe o nome do atleta.'
    const height = toOptionalNumber(heightCm)
    if (heightCm.trim() && (height === null || height <= 0)) {
      nextErrors.heightCm = 'Informe uma altura válida.'
    }
    const weight = toOptionalNumber(weightKg)
    if (weightKg.trim() && (weight === null || weight <= 0)) {
      nextErrors.weightKg = 'Informe um peso válido.'
    }
    const hours = toOptionalNumber(weeklyHours)
    if (weeklyHours.trim() && (hours === null || hours <= 0 || hours > 168)) {
      nextErrors.weeklyHoursAvailable = 'Informe de 1 a 168 horas por semana.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({
      displayName: displayName.trim(),
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

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Dados pessoais e objetivo"
        description={canEdit ? 'Atualize as informações do perfil.' : 'Visualização do perfil.'}
      />
      <form onSubmit={handleSubmit} className="space-y-5 p-5" noValidate>
        {mutation.isError ? (
          <ErrorAlert
            title="Não foi possível salvar"
            message={getApiErrorMessage(mutation.error)}
          />
        ) : null}
        {saved ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800"
          >
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
            Dados atualizados com sucesso.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nome"
            htmlFor="data-name"
            error={errors.displayName}
            className="sm:col-span-2"
          >
            <Input
              id="data-name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              aria-invalid={Boolean(errors.displayName) || undefined}
            />
          </Field>

          <Field label="E-mail" htmlFor="data-email" hint="O e-mail de acesso não pode ser alterado.">
            <Input id="data-email" value={athlete.email} disabled readOnly />
          </Field>

          <Field label="Data de nascimento" htmlFor="data-birth">
            <Input
              id="data-birth"
              type="date"
              value={birthDate}
              onChange={(event) => {
                setBirthDate(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
            />
          </Field>

          <Field label="Sexo" htmlFor="data-sex">
            <Select
              id="data-sex"
              value={sex}
              onChange={(event) => {
                const value = event.target.value
                setSex(value === 'F' ? 'F' : value === 'OTHER' ? 'OTHER' : 'M')
                setSaved(false)
              }}
              disabled={!canEdit}
            >
              <option value="M">{SEX_LABELS.M}</option>
              <option value="F">{SEX_LABELS.F}</option>
              <option value="OTHER">{SEX_LABELS.OTHER}</option>
            </Select>
          </Field>

          <Field label="Altura (cm)" htmlFor="data-height" error={errors.heightCm}>
            <Input
              id="data-height"
              type="number"
              min="0"
              step="0.1"
              value={heightCm}
              onChange={(event) => {
                setHeightCm(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              aria-invalid={Boolean(errors.heightCm) || undefined}
            />
          </Field>

          <Field label="Peso (kg)" htmlFor="data-weight" error={errors.weightKg}>
            <Input
              id="data-weight"
              type="number"
              min="0"
              step="0.1"
              value={weightKg}
              onChange={(event) => {
                setWeightKg(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              aria-invalid={Boolean(errors.weightKg) || undefined}
            />
          </Field>

          <Field
            label="Objetivo / prova"
            htmlFor="data-goal"
            hint="Objetivo principal da temporada."
            className="sm:col-span-2"
          >
            <Input
              id="data-goal"
              value={goal}
              onChange={(event) => {
                setGoal(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              placeholder="Ex.: Meia maratona sub 1h35"
            />
          </Field>

          <Field label="Data do evento" htmlFor="data-event-date">
            <Input
              id="data-event-date"
              type="date"
              value={eventDate}
              onChange={(event) => {
                setEventDate(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
            />
          </Field>

          <Field
            label="Horas semanais disponíveis"
            htmlFor="data-weekly-hours"
            error={errors.weeklyHoursAvailable}
          >
            <Input
              id="data-weekly-hours"
              type="number"
              min="0"
              max="168"
              step="0.5"
              value={weeklyHours}
              onChange={(event) => {
                setWeeklyHours(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              aria-invalid={Boolean(errors.weeklyHoursAvailable) || undefined}
            />
          </Field>

          <Field label="Observações" htmlFor="data-notes" className="sm:col-span-2">
            <Textarea
              id="data-notes"
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              placeholder="Lesões, histórico e preferências de treino…"
            />
          </Field>
        </div>

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" loading={mutation.isPending}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Salvar dados
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  )
}

function GoalCard({ athlete }: { athlete: AthleteDetail }) {
  const countdown = formatEventCountdown(athlete.eventDate)
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-accent-100 bg-accent-50/70 px-5 py-3">
        <Target className="h-4 w-4 text-accent-700" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink-900">Objetivo e disponibilidade</h2>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Objetivo</p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">
            {athlete.goal?.trim() ? athlete.goal : 'Objetivo ainda não definido.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-ink-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              Prova
            </p>
            <p className="mt-0.5 text-xs font-semibold text-ink-800">
              {athlete.eventDate ? formatDateLong(athlete.eventDate) : 'Sem data'}
            </p>
            {countdown ? <p className="mt-0.5 text-[10px] text-accent-700">{countdown}</p> : null}
          </div>
          <div className="rounded-xl bg-ink-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              Disponibilidade
            </p>
            <p className="mt-0.5 text-xs font-semibold text-ink-800">
              {formatWeeklyHours(athlete.weeklyHoursAvailable)}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-500">por semana</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function LatestMetricsCard({
  overview,
  onGoToMetrics,
}: {
  overview?: AthleteOverview
  onGoToMetrics: () => void
}) {
  const metric = overview?.latestMetric ?? null
  const sleepValues = (overview?.last7Metrics ?? []).flatMap((item) =>
    item.sleepHours === null ? [] : [item.sleepHours],
  )
  const hrvValues = (overview?.last7Metrics ?? []).flatMap((item) =>
    item.hrv === null ? [] : [item.hrv],
  )
  const sleepAverage =
    sleepValues.length > 0 ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length : null
  const hrvAverage =
    hrvValues.length > 0 ? hrvValues.reduce((sum, value) => sum + value, 0) / hrvValues.length : null
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Recuperação recente"
        description={metric ? `Registro de ${formatDateShort(metric.date)}` : 'Último registro diário'}
        actions={
          <button
            type="button"
            onClick={onGoToMetrics}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Ver métricas
          </button>
        }
      />
      <div className="p-5">
        {metric ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                <Moon className="h-3 w-3" aria-hidden="true" />
                Sono
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">{formatHours(metric.sleepHours)}</p>
            </div>
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                <Activity className="h-3 w-3" aria-hidden="true" />
                VFC
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">
                {metric.hrv != null ? `${formatNumber(metric.hrv)} ms` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                <HeartPulse className="h-3 w-3" aria-hidden="true" />
                FC repouso
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">
                {metric.restingHr != null ? `${formatNumber(metric.restingHr)} bpm` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                Body Battery
              </p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">
                {metric.bodyBatteryLow != null || metric.bodyBatteryHigh != null
                  ? `${formatNumber(metric.bodyBatteryLow)}–${formatNumber(metric.bodyBatteryHigh)}`
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">Humor</p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">{formatMood(metric.mood)}</p>
            </div>
            <div className="rounded-xl bg-ink-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">RPE</p>
              <p className="mt-0.5 text-sm font-bold text-ink-900">{formatRpe(metric.rpe)}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-ink-800">Nenhum registro recente</p>
            <p className="mt-1 text-xs text-ink-500">
              Registre sono, VFC e FC de repouso para acompanhar a recuperação.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={onGoToMetrics}>
              Registrar métrica
            </Button>
          </div>
        )}

        {overview && overview.last7Metrics.length > 0 ? (
          <div className="mt-4 space-y-1 border-t border-ink-100 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              Média dos últimos 7 registros
            </p>
            <p className="text-xs text-ink-600">
              Sono {formatHours(sleepAverage)} · VFC {formatDecimal(hrvAverage, 0)} ms
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

function UpcomingCard({
  overview,
  onGoToPlanning,
}: {
  overview?: AthleteOverview
  onGoToPlanning: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Próximas sessões" description="Agenda dos próximos dias" />
      <div className="p-4">
        {!overview ? (
          <p className="px-1 text-xs text-ink-500">A agenda aparece quando a visão 360 carregar.</p>
        ) : overview.upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 px-4 py-5 text-center">
            <CalendarDays className="mx-auto h-5 w-5 text-ink-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-medium text-ink-600">Nenhuma sessão futura.</p>
            <button
              type="button"
              onClick={onGoToPlanning}
              className="mt-1 inline-block text-[11px] font-semibold text-brand-700 hover:text-brand-800"
            >
              Abrir planejamento para adicionar.
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {overview.upcoming.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-ink-100 px-3 py-2"
              >
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-50 text-ink-800">
                  <span className="text-[9px] font-semibold uppercase leading-none">
                    {formatMonthShort(item.scheduledDate)}
                  </span>
                  <span className="mt-0.5 text-sm font-bold leading-none">
                    {item.scheduledDate.slice(8, 10)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-900">
                    {item.workout?.name ?? 'Sessão planejada'}
                  </p>
                  <p className="text-[10px] text-ink-500">
                    {item.workout ? formatDateLong(item.scheduledDate) : item.scheduledDate}
                  </p>
                </div>
                {item.workout ? <SportBadge sport={item.workout.sport} size="sm" /> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

interface AthleteOverviewTabProps {
  athlete: AthleteDetail
  overview?: AthleteOverview
  overviewLoading: boolean
  overviewError: unknown
  onRetryOverview: () => void
  canEdit: boolean
  onSaved: () => void
  onGoToMetrics: () => void
  onGoToPlanning: () => void
}

export function AthleteOverviewTab({
  athlete,
  overview,
  overviewLoading,
  overviewError,
  onRetryOverview,
  canEdit,
  onSaved,
  onGoToMetrics,
  onGoToPlanning,
}: AthleteOverviewTabProps) {
  const next = overview?.upcoming[0]
  const notFound = isNotFoundError(overviewError)

  return (
    <div className="space-y-6">
      {overviewError ? (
        notFound ? (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-ink-800">
            <p className="font-semibold">Visão 360 ainda indisponível</p>
            <p className="mt-0.5 text-xs text-ink-600">
              O endpoint <code className="font-mono">/api/athletes/{athlete.id}/overview</code> não
              respondeu. Dados pessoais, limiares, planejamento e métricas continuam acessíveis nas
              outras abas.
            </p>
          </div>
        ) : (
          <ErrorAlert
            title="Não foi possível carregar a visão 360"
            message={getApiErrorMessage(overviewError)}
            onRetry={onRetryOverview}
          />
        )
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            <TrendingUp className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Carga 7d
          </p>
          {overviewLoading && !overview ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold tabular-nums text-ink-900">
                {formatNumber(overview?.weeklyLoad.plannedMinutes ?? null)} min
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {formatNumber(overview?.weeklyLoad.plannedSessions ?? null)}{' '}
                {overview?.weeklyLoad.plannedSessions === 1 ? 'sessão' : 'sessões'} nos próximos 7
                dias
              </p>
            </>
          )}
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            <CalendarDays className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Sessões planejadas
          </p>
          {overviewLoading && !overview ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold tabular-nums text-ink-900">
                {formatNumber(overview?.weeklyLoad.plannedSessions ?? null)}
              </p>
              <p className="mt-1 text-xs text-ink-500">Próximos 7 dias</p>
            </>
          )}
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            <Timer className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Próximo treino
          </p>
          {overviewLoading && !overview ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : next ? (
            <>
              <p className="mt-2 truncate text-sm font-bold text-ink-900">
                {next.workout?.name ?? 'Sessão planejada'}
              </p>
              <p className="mt-1 text-xs text-ink-500">{formatDateLong(next.scheduledDate)}</p>
            </>
          ) : (
            <p className="mt-2 text-sm font-medium text-ink-500">Sem sessão futura</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <AthleteDataForm athlete={athlete} canEdit={canEdit} onSaved={onSaved} />
        <div className="min-w-0 space-y-4">
          <GoalCard athlete={athlete} />
          <LatestMetricsCard overview={overview} onGoToMetrics={onGoToMetrics} />
          <UpcomingCard overview={overview} onGoToPlanning={onGoToPlanning} />
        </div>
      </div>
    </div>
  )
}
