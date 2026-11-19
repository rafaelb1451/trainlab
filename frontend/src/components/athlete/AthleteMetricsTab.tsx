import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  CircleCheck,
  HeartPulse,
  Moon,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { getApiErrorMessage, isNotFoundError } from '../../api/client'
import { athletesApi } from '../../api/endpoints'
import type { DailyMetric, DailyMetricInput } from '../../api/types'
import { cn } from '../../lib/cn'
import {
  addDays,
  formatDateShort,
  formatDecimal,
  formatHours,
  formatMood,
  formatNumber,
  formatRpe,
  toISODate,
} from '../../lib/format'
import { EmptyState } from '../EmptyState'
import { ErrorAlert } from '../ErrorAlert'
import { ConfirmDialog, Skeleton } from '../Feedback'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Field, Input, Textarea } from '../ui/Field'
import { MetricBarChart, type MetricPoint } from './MetricBarChart'

interface MetricFormState {
  date: string
  sleep: string
  deep: string
  rem: string
  light: string
  awake: string
  hrv: string
  restingHr: string
  batteryLow: string
  batteryHigh: string
  stress: string
  mood: string
  rpe: string
  weight: string
  notes: string
}

function numberValue(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function emptyForm(date: string): MetricFormState {
  return {
    date,
    sleep: '',
    deep: '',
    rem: '',
    light: '',
    awake: '',
    hrv: '',
    restingHr: '',
    batteryLow: '',
    batteryHigh: '',
    stress: '',
    mood: '',
    rpe: '',
    weight: '',
    notes: '',
  }
}

function fieldError(
  label: string,
  value: string,
  min: number,
  max: number,
): string | undefined {
  if (!value.trim()) return undefined
  const parsed = numberValue(value)
  if (parsed === null || parsed < min || parsed > max) {
    return `${label} deve ficar entre ${min} e ${max}.`
  }
  return undefined
}

interface AthleteMetricsTabProps {
  athleteId: string
  canEdit: boolean
  onChanged: () => void
}

export function AthleteMetricsTab({ athleteId, canEdit, onChanged }: AthleteMetricsTabProps) {
  const queryClient = useQueryClient()
  const today = new Date()
  const todayIso = toISODate(today)
  const from = toISODate(addDays(today, -29))
  const to = todayIso

  const [form, setForm] = useState<MetricFormState>(() => emptyForm(todayIso))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DailyMetric | null>(null)

  const metricsQuery = useQuery({
    queryKey: ['metrics', athleteId, from, to],
    queryFn: () => athletesApi.metrics(athleteId, { from, to }),
  })

  const createMutation = useMutation({
    mutationFn: (input: DailyMetricInput) => athletesApi.createMetric(athleteId, input),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['metrics', athleteId] })
      void queryClient.invalidateQueries({ queryKey: ['overview', athleteId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onChanged()
      setNotice(`Métrica de ${formatDateShort(saved.date)} registrada.`)
      setErrors({})
      setForm(emptyForm(saved.date))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (metricId: string) => athletesApi.deleteMetric(athleteId, metricId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['metrics', athleteId] })
      void queryClient.invalidateQueries({ queryKey: ['overview', athleteId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onChanged()
      setDeleteTarget(null)
      setNotice('Registro removido.')
    },
  })

  const metrics = metricsQuery.data ?? []
  const notFound = isNotFoundError(metricsQuery.error)

  const chartPoints = useMemo(() => {
    const byDate = new Map(metrics.map((metric) => [metric.date.slice(0, 10), metric]))
    const days = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13))
    const build = (pick: (metric: DailyMetric) => number | null): MetricPoint[] =>
      days.map((day) => {
        const iso = toISODate(day)
        const metric = byDate.get(iso)
        return { date: iso, value: metric ? pick(metric) : null }
      })
    return {
      sleep: build((metric) => metric.sleepHours),
      hrv: build((metric) => metric.hrv),
      restingHr: build((metric) => metric.restingHr),
    }
  }, [metrics, today])

  function update<K extends keyof MetricFormState>(key: K, value: MetricFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const nextErrors: Record<string, string> = {}
    if (!form.date) nextErrors['date'] = 'Informe a data do registro.'
    const checks: Array<[keyof MetricFormState, string, number, number]> = [
      ['sleep', 'Sono', 0, 24],
      ['deep', 'Sono profundo', 0, 24],
      ['rem', 'Sono REM', 0, 24],
      ['light', 'Sono leve', 0, 24],
      ['awake', 'Tempo acordado', 0, 24],
      ['hrv', 'VFC', 1, 400],
      ['restingHr', 'FC de repouso', 20, 220],
      ['batteryLow', 'Body Battery mínimo', 0, 100],
      ['batteryHigh', 'Body Battery máximo', 0, 100],
      ['stress', 'Estresse', 0, 100],
      ['mood', 'Humor', 1, 5],
      ['rpe', 'RPE', 1, 10],
      ['weight', 'Peso', 20, 300],
    ]
    for (const [key, label, min, max] of checks) {
      const value = form[key]
      if (typeof value !== 'string') continue
      const message = fieldError(label, value, min, max)
      if (message) nextErrors[key] = message
    }
    const low = numberValue(form.batteryLow)
    const high = numberValue(form.batteryHigh)
    if (low !== null && high !== null && low > high) {
      nextErrors['batteryHigh'] = 'O máximo deve ser maior ou igual ao mínimo.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const input: DailyMetricInput = {
      date: form.date,
      sleepHours: numberValue(form.sleep),
      deepSleepHours: numberValue(form.deep),
      remSleepHours: numberValue(form.rem),
      lightSleepHours: numberValue(form.light),
      awakeHours: numberValue(form.awake),
      hrv: numberValue(form.hrv),
      restingHr: numberValue(form.restingHr),
      bodyBatteryLow: low,
      bodyBatteryHigh: high,
      stressLevel: numberValue(form.stress),
      mood: numberValue(form.mood),
      rpe: numberValue(form.rpe),
      weightKg: numberValue(form.weight),
      notes: form.notes.trim() || null,
    }
    createMutation.mutate(input)
  }

  const latestDate = metrics[0]?.date?.slice(0, 10)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-ink-900">Métricas diárias</h2>
        <p className="mt-0.5 text-sm text-ink-500">
          Sono, recuperação e percepção de esforço dos últimos 30 dias. Reenviar a mesma data
          atualiza o registro.
        </p>
      </div>

      {notFound ? (
        <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-ink-800">
          <p className="font-semibold">Métricas ainda indisponíveis neste servidor</p>
          <p className="mt-0.5 text-xs text-ink-600">
            O endpoint <code className="font-mono">/api/athletes/{athleteId}/metrics</code> não
            respondeu. Assim que estiver disponível, o formulário e o histórico aparecem aqui.
          </p>
        </div>
      ) : metricsQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar as métricas"
          message={getApiErrorMessage(metricsQuery.error)}
          onRetry={() => void metricsQuery.refetch()}
        />
      ) : null}

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

      {canEdit && !notFound ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Registrar métrica diária"
            description="Preencha os campos disponíveis. Todos são opcionais, exceto a data."
            actions={
              <span className="rounded-full bg-accent-50 px-2.5 py-1 text-[10px] font-semibold text-accent-700 ring-1 ring-inset ring-accent-200">
                Upsert por data
              </span>
            }
          />
          <form onSubmit={handleSubmit} className="space-y-5 p-5" noValidate>
            {createMutation.isError ? (
              <ErrorAlert
                title="Não foi possível salvar a métrica"
                message={getApiErrorMessage(createMutation.error)}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Data" htmlFor="metric-date" error={errors['date']} required>
                <Input
                  id="metric-date"
                  type="date"
                  value={form.date}
                  max={todayIso}
                  onChange={(event) => update('date', event.target.value)}
                  aria-invalid={Boolean(errors['date']) || undefined}
                />
              </Field>
              <Field label="Sono total (h)" htmlFor="metric-sleep" error={errors['sleep']}>
                <Input
                  id="metric-sleep"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={form.sleep}
                  onChange={(event) => update('sleep', event.target.value)}
                  placeholder="7,5"
                  aria-invalid={Boolean(errors['sleep']) || undefined}
                />
              </Field>
              <Field label="Sono profundo (h)" htmlFor="metric-deep" error={errors['deep']}>
                <Input
                  id="metric-deep"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={form.deep}
                  onChange={(event) => update('deep', event.target.value)}
                  placeholder="1,4"
                  aria-invalid={Boolean(errors['deep']) || undefined}
                />
              </Field>
              <Field label="Sono REM (h)" htmlFor="metric-rem" error={errors['rem']}>
                <Input
                  id="metric-rem"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={form.rem}
                  onChange={(event) => update('rem', event.target.value)}
                  placeholder="1,2"
                  aria-invalid={Boolean(errors['rem']) || undefined}
                />
              </Field>
              <Field label="Sono leve (h)" htmlFor="metric-light" error={errors['light']}>
                <Input
                  id="metric-light"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={form.light}
                  onChange={(event) => update('light', event.target.value)}
                  placeholder="4,5"
                  aria-invalid={Boolean(errors['light']) || undefined}
                />
              </Field>
              <Field label="Acordado (h)" htmlFor="metric-awake" error={errors['awake']}>
                <Input
                  id="metric-awake"
                  type="number"
                  min="0"
                  max="24"
                  step="0.1"
                  value={form.awake}
                  onChange={(event) => update('awake', event.target.value)}
                  placeholder="0,4"
                  aria-invalid={Boolean(errors['awake']) || undefined}
                />
              </Field>
              <Field label="VFC (ms)" htmlFor="metric-hrv" error={errors['hrv']}>
                <Input
                  id="metric-hrv"
                  type="number"
                  min="0"
                  step="1"
                  value={form.hrv}
                  onChange={(event) => update('hrv', event.target.value)}
                  placeholder="62"
                  aria-invalid={Boolean(errors['hrv']) || undefined}
                />
              </Field>
              <Field label="FC repouso (bpm)" htmlFor="metric-resting" error={errors['restingHr']}>
                <Input
                  id="metric-resting"
                  type="number"
                  min="0"
                  step="1"
                  value={form.restingHr}
                  onChange={(event) => update('restingHr', event.target.value)}
                  placeholder="48"
                  aria-invalid={Boolean(errors['restingHr']) || undefined}
                />
              </Field>
              <Field
                label="Body Battery mín."
                htmlFor="metric-battery-low"
                error={errors['batteryLow']}
              >
                <Input
                  id="metric-battery-low"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.batteryLow}
                  onChange={(event) => update('batteryLow', event.target.value)}
                  placeholder="25"
                  aria-invalid={Boolean(errors['batteryLow']) || undefined}
                />
              </Field>
              <Field
                label="Body Battery máx."
                htmlFor="metric-battery-high"
                error={errors['batteryHigh']}
              >
                <Input
                  id="metric-battery-high"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.batteryHigh}
                  onChange={(event) => update('batteryHigh', event.target.value)}
                  placeholder="85"
                  aria-invalid={Boolean(errors['batteryHigh']) || undefined}
                />
              </Field>
              <Field label="Estresse (0–100)" htmlFor="metric-stress" error={errors['stress']}>
                <Input
                  id="metric-stress"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.stress}
                  onChange={(event) => update('stress', event.target.value)}
                  placeholder="32"
                  aria-invalid={Boolean(errors['stress']) || undefined}
                />
              </Field>
              <Field label="Humor (1–5)" htmlFor="metric-mood" error={errors['mood']}>
                <Input
                  id="metric-mood"
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  value={form.mood}
                  onChange={(event) => update('mood', event.target.value)}
                  placeholder="4"
                  aria-invalid={Boolean(errors['mood']) || undefined}
                />
              </Field>
              <Field label="RPE (1–10)" htmlFor="metric-rpe" error={errors['rpe']}>
                <Input
                  id="metric-rpe"
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={form.rpe}
                  onChange={(event) => update('rpe', event.target.value)}
                  placeholder="6"
                  aria-invalid={Boolean(errors['rpe']) || undefined}
                />
              </Field>
              <Field label="Peso (kg)" htmlFor="metric-weight" error={errors['weight']}>
                <Input
                  id="metric-weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.weight}
                  onChange={(event) => update('weight', event.target.value)}
                  placeholder="58,5"
                  aria-invalid={Boolean(errors['weight']) || undefined}
                />
              </Field>
            </div>

            <Field label="Notas" htmlFor="metric-notes">
              <Textarea
                id="metric-notes"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
                placeholder="Sensações, sono, treino do dia, observações…"
                className="min-h-20"
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" loading={createMutation.isPending}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Salvar métrica
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricBarChart
          title="Sono"
          unit="h"
          points={chartPoints.sleep}
          colorClass="bg-brand-500"
          icon={Moon}
          formatValue={(value) => formatDecimal(value, 1)}
        />
        <MetricBarChart
          title="VFC"
          unit="ms"
          points={chartPoints.hrv}
          colorClass="bg-accent-400"
          icon={Activity}
          formatValue={(value) => formatNumber(value)}
        />
        <MetricBarChart
          title="FC de repouso"
          unit="bpm"
          points={chartPoints.restingHr}
          colorClass="bg-brand-400"
          icon={HeartPulse}
          formatValue={(value) => formatNumber(value)}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Histórico"
          description={`${metrics.length} ${metrics.length === 1 ? 'registro' : 'registros'} nos últimos 30 dias`}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void metricsQuery.refetch()}
              loading={metricsQuery.isFetching}
            >
              Atualizar
            </Button>
          }
        />
        {metricsQuery.isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : metrics.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Nenhum registro no período"
            description={
              canEdit
                ? 'Use o formulário acima para registrar sono, VFC, FC de repouso e percepção.'
                : 'Nenhuma métrica diária foi registrada nos últimos 30 dias.'
            }
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <caption className="sr-only">Registros diários de métricas</caption>
              <thead>
                <tr className="border-b border-ink-100 text-[10px] uppercase tracking-wide text-ink-500">
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Data
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Sono
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 font-semibold lg:table-cell">
                    Sono prof./REM/leve
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    VFC
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    FC rep.
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">
                    B. Battery
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">
                    Estresse
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Humor
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    RPE
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">
                    Peso
                  </th>
                  <th scope="col" className="hidden px-3 py-2.5 font-semibold xl:table-cell">
                    Notas
                  </th>
                  {canEdit ? (
                    <th scope="col" className="px-2 py-2.5">
                      <span className="sr-only">Ações</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {metrics.map((metric) => {
                  const isLatest = metric.date.slice(0, 10) === latestDate
                  return (
                    <tr
                      key={metric.id}
                      className={cn(
                        'transition hover:bg-ink-50/70',
                        isLatest ? 'bg-accent-50/50' : 'bg-white',
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <span className="font-semibold text-ink-900">
                          {formatDateShort(metric.date)}
                        </span>
                        {isLatest ? (
                          <span className="ml-1.5 rounded-full bg-accent-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-900">
                            Recente
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink-700">
                        {formatHours(metric.sleepHours)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-[11px] text-ink-500 lg:table-cell">
                        {formatHours(metric.deepSleepHours)} / {formatHours(metric.remSleepHours)} /{' '}
                        {formatHours(metric.lightSleepHours)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700">
                        {metric.hrv != null ? `${formatNumber(metric.hrv)} ms` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700">
                        {metric.restingHr != null ? `${formatNumber(metric.restingHr)} bpm` : '—'}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700 lg:table-cell">
                        {metric.bodyBatteryLow != null || metric.bodyBatteryHigh != null
                          ? `${formatNumber(metric.bodyBatteryLow)}–${formatNumber(metric.bodyBatteryHigh)}`
                          : '—'}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700 lg:table-cell">
                        {formatNumber(metric.stressLevel)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700">
                        {formatMood(metric.mood)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700">
                        {formatRpe(metric.rpe)}
                      </td>
                      <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-ink-700 lg:table-cell">
                        {metric.weightKg != null ? `${formatDecimal(metric.weightKg)} kg` : '—'}
                      </td>
                      <td className="hidden max-w-[220px] px-3 py-2.5 text-xs text-ink-500 xl:table-cell">
                        <span className="line-clamp-2" title={metric.notes ?? undefined}>
                          {metric.notes?.trim() ? metric.notes : '—'}
                        </span>
                      </td>
                      {canEdit ? (
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              deleteMutation.reset()
                              setDeleteTarget(metric)
                            }}
                            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
                            aria-label={`Excluir métrica de ${formatDateShort(metric.date)}`}
                            title="Excluir registro"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canEdit && !notFound ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForm(emptyForm(todayIso))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Novo registro
          </Button>
        </div>
      ) : null}

      {deleteMutation.isError ? (
        <ErrorAlert
          title="Não foi possível excluir"
          message={getApiErrorMessage(deleteMutation.error)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir métrica"
        description={
          deleteTarget
            ? `O registro de ${formatDateShort(deleteTarget.date)} será removido. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir métrica"
        loading={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}
