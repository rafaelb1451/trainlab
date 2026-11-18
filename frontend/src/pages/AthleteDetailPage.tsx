import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CircleCheck,
  HeartPulse,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi } from '../api/endpoints'
import type { AthleteDetail, Sex, Sport, Threshold, Zone } from '../api/types'
import { SPORTS, ZONE_TYPES } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { ErrorAlert } from '../components/ErrorAlert'
import { LoadingState, Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { SportBadge } from '../components/SportBadge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { ZoneTable } from '../components/ZoneTable'
import {
  formatAge,
  formatDateLong,
  formatPace,
  formatThresholdSummary,
  parsePace,
} from '../lib/format'
import { SEX_LABELS, SPORT_LABELS, ZONE_TYPE_LABELS } from '../lib/labels'

type Tab = 'dados' | 'zonas'

interface DataFormErrors {
  displayName?: string
  heightCm?: string
  weightKg?: string
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
  const [notes, setNotes] = useState(athlete.notes ?? '')
  const [errors, setErrors] = useState<DataFormErrors>({})
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof athletesApi.update>[1]) =>
      athletesApi.update(athlete.id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(['athlete', athlete.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['athletes'] })
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
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    mutation.mutate({
      displayName: displayName.trim(),
      birthDate: birthDate || null,
      sex,
      heightCm: height,
      weightKg: weight,
      notes: notes.trim() || null,
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Dados do atleta"
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

interface ThresholdErrors {
  maxHr?: string
  restingHr?: string
  lthr?: string
  ftpWatts?: string
  pace?: string
  css?: string
}

function ThresholdCard({
  athleteId,
  sport,
  threshold,
  canEdit,
  onSaved,
}: {
  athleteId: string
  sport: Sport
  threshold: Threshold | undefined
  canEdit: boolean
  onSaved: () => void
}) {
  const [maxHr, setMaxHr] = useState(threshold?.maxHr != null ? String(threshold.maxHr) : '')
  const [restingHr, setRestingHr] = useState(
    threshold?.restingHr != null ? String(threshold.restingHr) : '',
  )
  const [lthr, setLthr] = useState(threshold?.lthr != null ? String(threshold.lthr) : '')
  const [ftpWatts, setFtpWatts] = useState(
    threshold?.ftpWatts != null ? String(threshold.ftpWatts) : '',
  )
  const [pace, setPace] = useState(
    threshold?.thresholdPaceSecPerKm != null ? formatPace(threshold.thresholdPaceSecPerKm) : '',
  )
  const [css, setCss] = useState(
    threshold?.cssSecPer100m != null ? formatPace(threshold.cssSecPer100m) : '',
  )
  const [errors, setErrors] = useState<ThresholdErrors>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMaxHr(threshold?.maxHr != null ? String(threshold.maxHr) : '')
    setRestingHr(threshold?.restingHr != null ? String(threshold.restingHr) : '')
    setLthr(threshold?.lthr != null ? String(threshold.lthr) : '')
    setFtpWatts(threshold?.ftpWatts != null ? String(threshold.ftpWatts) : '')
    setPace(
      threshold?.thresholdPaceSecPerKm != null ? formatPace(threshold.thresholdPaceSecPerKm) : '',
    )
    setCss(threshold?.cssSecPer100m != null ? formatPace(threshold.cssSecPer100m) : '')
  }, [threshold])

  const mutation = useMutation({
    mutationFn: (body: Omit<Threshold, 'updatedAt'>) =>
      athletesApi.putThreshold(athleteId, sport, body),
    onSuccess: () => {
      setSaved(true)
      setErrors({})
      onSaved()
    },
  })

  function invalidPositive(value: string): boolean {
    if (!value.trim()) return false
    const parsed = toOptionalNumber(value)
    return parsed === null || parsed <= 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return
    const nextErrors: ThresholdErrors = {}
    if (invalidPositive(maxHr)) nextErrors.maxHr = 'Valor inválido.'
    if (invalidPositive(restingHr)) nextErrors.restingHr = 'Valor inválido.'
    if (invalidPositive(lthr)) nextErrors.lthr = 'Valor inválido.'
    if (sport === 'BIKE' && invalidPositive(ftpWatts)) nextErrors.ftpWatts = 'Valor inválido.'
    const parsedPace = parsePace(pace)
    if (sport === 'RUN' && pace.trim() && (parsedPace === null || parsedPace <= 0)) {
      nextErrors.pace = 'Use o formato mm:ss, por exemplo 4:35.'
    }
    const parsedCss = parsePace(css)
    if (sport === 'SWIM' && css.trim() && (parsedCss === null || parsedCss <= 0)) {
      nextErrors.css = 'Use o formato mm:ss, por exemplo 1:45.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    mutation.mutate({
      sport,
      maxHr: toOptionalNumber(maxHr),
      restingHr: toOptionalNumber(restingHr),
      lthr: toOptionalNumber(lthr),
      ftpWatts: sport === 'BIKE' ? toOptionalNumber(ftpWatts) : (threshold?.ftpWatts ?? null),
      thresholdPaceSecPerKm:
        sport === 'RUN' ? parsedPace : (threshold?.thresholdPaceSecPerKm ?? null),
      cssSecPer100m: sport === 'SWIM' ? parsedCss : (threshold?.cssSecPer100m ?? null),
    })
  }

  const title =
    sport === 'RUN'
      ? 'Corrida — limiar de pace'
      : sport === 'BIKE'
        ? 'Ciclismo — limiar de potência'
        : 'Natação — limiar de CSS'

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">Valores usados para gerar as zonas.</p>
        </div>
        <SportBadge sport={sport} size="sm" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-5" noValidate>
        {mutation.isError ? (
          <ErrorAlert
            title="Não foi possível salvar"
            message={getApiErrorMessage(mutation.error)}
            className="text-xs"
          />
        ) : null}
        {saved ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800"
          >
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Limiares salvos e zonas recalculadas.
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Field label="FC máxima" htmlFor={`${sport}-maxhr`} error={errors.maxHr}>
            <Input
              id={`${sport}-maxhr`}
              type="number"
              min="0"
              value={maxHr}
              onChange={(event) => {
                setMaxHr(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              placeholder="190"
              aria-invalid={Boolean(errors.maxHr) || undefined}
            />
          </Field>
          <Field label="FC repouso" htmlFor={`${sport}-resthr`} error={errors.restingHr}>
            <Input
              id={`${sport}-resthr`}
              type="number"
              min="0"
              value={restingHr}
              onChange={(event) => {
                setRestingHr(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              placeholder="50"
              aria-invalid={Boolean(errors.restingHr) || undefined}
            />
          </Field>
          <Field label="LTHR (bpm)" htmlFor={`${sport}-lthr`} error={errors.lthr}>
            <Input
              id={`${sport}-lthr`}
              type="number"
              min="0"
              value={lthr}
              onChange={(event) => {
                setLthr(event.target.value)
                setSaved(false)
              }}
              disabled={!canEdit}
              placeholder="170"
              aria-invalid={Boolean(errors.lthr) || undefined}
            />
          </Field>

          {sport === 'RUN' ? (
            <Field
              label="Pace limiar"
              htmlFor={`${sport}-pace`}
              error={errors.pace}
              hint="mm:ss por km"
            >
              <Input
                id={`${sport}-pace`}
                value={pace}
                onChange={(event) => {
                  setPace(event.target.value)
                  setSaved(false)
                }}
                disabled={!canEdit}
                placeholder="4:35"
                inputMode="numeric"
                aria-invalid={Boolean(errors.pace) || undefined}
              />
            </Field>
          ) : null}

          {sport === 'BIKE' ? (
            <Field label="FTP (W)" htmlFor={`${sport}-ftp`} error={errors.ftpWatts}>
              <Input
                id={`${sport}-ftp`}
                type="number"
                min="0"
                value={ftpWatts}
                onChange={(event) => {
                  setFtpWatts(event.target.value)
                  setSaved(false)
                }}
                disabled={!canEdit}
                placeholder="250"
                aria-invalid={Boolean(errors.ftpWatts) || undefined}
              />
            </Field>
          ) : null}

          {sport === 'SWIM' ? (
            <Field
              label="CSS"
              htmlFor={`${sport}-css`}
              error={errors.css}
              hint="mm:ss por 100 m"
            >
              <Input
                id={`${sport}-css`}
                value={css}
                onChange={(event) => {
                  setCss(event.target.value)
                  setSaved(false)
                }}
                disabled={!canEdit}
                placeholder="1:45"
                inputMode="numeric"
                aria-invalid={Boolean(errors.css) || undefined}
              />
            </Field>
          ) : null}
        </div>

        {canEdit ? (
          <Button type="submit" size="sm" fullWidth loading={mutation.isPending}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Salvar e recalcular zonas
          </Button>
        ) : null}
      </form>
    </Card>
  )
}

function ThresholdSummaryCard({
  thresholds,
  zones,
  onEdit,
}: {
  thresholds: Threshold[]
  zones: Zone[]
  onEdit: () => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Resumo de limiares"
        description="Valores atuais por modalidade"
        actions={
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Editar
          </button>
        }
      />
      <div className="space-y-3 p-5">
        {SPORTS.map((sport) => {
          const threshold = thresholds.find((item) => item.sport === sport)
          const highlights = formatThresholdSummary(threshold)
          const zoneCount = zones.filter((zone) => zone.sport === sport).length
          return (
            <div key={sport} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <SportBadge sport={sport} size="sm" />
                <span className="text-[11px] text-slate-500">
                  {zoneCount} {zoneCount === 1 ? 'zona' : 'zonas'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">
                {highlights.length > 0
                  ? highlights.join(' · ')
                  : 'Limiares ainda não configurados.'}
              </p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function AthleteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const canEdit = user?.role !== 'ATHLETE'
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('dados')

  const athleteQuery = useQuery({
    queryKey: ['athlete', id],
    queryFn: () => athletesApi.get(id ?? ''),
    enabled: Boolean(id),
  })

  const thresholdsQuery = useQuery({
    queryKey: ['thresholds', id],
    queryFn: () => athletesApi.getThresholds(id ?? ''),
    enabled: Boolean(id),
  })

  const zonesQuery = useQuery({
    queryKey: ['zones', id],
    queryFn: () => athletesApi.getZones(id ?? ''),
    enabled: Boolean(id),
  })

  function refreshAll() {
    if (!id) return
    void queryClient.invalidateQueries({ queryKey: ['thresholds', id] })
    void queryClient.invalidateQueries({ queryKey: ['zones', id] })
    void queryClient.invalidateQueries({ queryKey: ['athlete', id] })
    void queryClient.invalidateQueries({ queryKey: ['athletes'] })
  }

  const athlete = athleteQuery.data

  if (!id) {
    return (
      <ErrorAlert
        title="Atleta inválido"
        message="Não foi possível identificar o atleta solicitado."
      />
    )
  }

  if (athleteQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (athleteQuery.isError || !athlete) {
    return (
      <div className="space-y-4">
        <Link
          to={canEdit ? '/athletes' : '/'}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {canEdit ? 'Voltar para atletas' : 'Voltar para o dashboard'}
        </Link>
        <ErrorAlert
          title="Não foi possível carregar o atleta"
          message={getApiErrorMessage(athleteQuery.error)}
          onRetry={() => void athleteQuery.refetch()}
        />
      </div>
    )
  }

  const thresholds = thresholdsQuery.data ?? athlete.thresholds ?? []
  const zones = zonesQuery.data ?? []
  const thresholdMap = new Map(thresholds.map((threshold) => [threshold.sport, threshold]))
  const age = formatAge(athlete.birthDate)
  const zoneSports = SPORTS.filter((sport) => zones.some((zone) => zone.sport === sport))

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={canEdit ? '/athletes' : '/'}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {canEdit ? 'Voltar para atletas' : 'Voltar para o dashboard'}
        </Link>
      </div>

      <PageHeader
        eyebrow="Ficha do atleta"
        title={athlete.displayName}
        description={athlete.email}
        actions={
          <div className="flex flex-wrap gap-1.5">
            {athlete.sports.length > 0 ? (
              athlete.sports.map((sport) => <SportBadge key={sport} sport={sport} />)
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                Sem modalidades
              </span>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 text-xs text-slate-600 shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <HeartPulse className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          {SEX_LABELS[athlete.sex]}
          {age ? ` · ${age}` : ''}
        </span>
        <span>Nascimento: {athlete.birthDate ? formatDateLong(athlete.birthDate) : 'não informado'}</span>
        <span>Altura: {athlete.heightCm != null ? `${athlete.heightCm} cm` : '—'}</span>
        <span>Peso: {athlete.weightKg != null ? `${athlete.weightKg} kg` : '—'}</span>
        <span className="text-slate-400">
          {athlete.sports.length > 0
            ? athlete.sports.map((sport) => SPORT_LABELS[sport]).join(' · ')
            : 'Nenhuma modalidade configurada'}
        </span>
      </div>

      <div role="tablist" aria-label="Seções do atleta" className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          role="tab"
          id="tab-dados"
          aria-selected={tab === 'dados'}
          aria-controls="panel-dados"
          onClick={() => setTab('dados')}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'dados'
              ? 'border-brand-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dados
        </button>
        <button
          type="button"
          role="tab"
          id="tab-zonas"
          aria-selected={tab === 'zonas'}
          aria-controls="panel-zonas"
          onClick={() => setTab('zonas')}
          className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            tab === 'zonas'
              ? 'border-brand-500 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Limiares &amp; Zonas
        </button>
      </div>

      {tab === 'dados' ? (
        <div
          role="tabpanel"
          id="panel-dados"
          aria-labelledby="tab-dados"
          className="grid gap-6 lg:grid-cols-[1.5fr_1fr]"
        >
          <AthleteDataForm athlete={athlete} canEdit={canEdit} onSaved={refreshAll} />
          <div className="space-y-4">
            <ThresholdSummaryCard
              thresholds={thresholds}
              zones={zones}
              onEdit={() => setTab('zonas')}
            />
            {athlete.notes ? (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-900">Observações</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{athlete.notes}</p>
              </Card>
            ) : null}
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="panel-zonas" aria-labelledby="tab-zonas" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Limiares por modalidade</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Ao salvar, as zonas são recalculadas automaticamente pelo servidor.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void thresholdsQuery.refetch()
                void zonesQuery.refetch()
              }}
              loading={thresholdsQuery.isFetching || zonesQuery.isFetching}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Atualizar
            </Button>
          </div>

          {thresholdsQuery.isError ? (
            <ErrorAlert
              title="Não foi possível carregar os limiares"
              message={getApiErrorMessage(thresholdsQuery.error)}
              onRetry={() => void thresholdsQuery.refetch()}
            />
          ) : null}
          {zonesQuery.isError ? (
            <ErrorAlert
              title="Não foi possível carregar as zonas"
              message={getApiErrorMessage(zonesQuery.error)}
              onRetry={() => void zonesQuery.refetch()}
            />
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            {SPORTS.map((sport) => (
              <ThresholdCard
                key={sport}
                athleteId={athlete.id}
                sport={sport}
                threshold={thresholdMap.get(sport)}
                canEdit={canEdit}
                onSaved={refreshAll}
              />
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900">Zonas de treino</h2>
            </div>

            {zonesQuery.isLoading ? (
              <LoadingState label="Carregando zonas…" />
            ) : zones.length === 0 ? (
              <Card className="p-6">
                <p className="text-sm font-medium text-slate-700">Nenhuma zona gerada ainda.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Preencha os limiares de pelo menos uma modalidade e salve para que o servidor gere
                  as zonas de FC, pace e potência.
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                {zoneSports.map((sport) => {
                  const sportZones = zones.filter((zone) => zone.sport === sport)
                  const types = ZONE_TYPES.filter((type) =>
                    sportZones.some((zone) => zone.type === type),
                  )
                  return (
                    <Card key={sport} className="overflow-hidden">
                      <CardHeader
                        title={`Zonas · ${SPORT_LABELS[sport]}`}
                        description={`${sportZones.length} zonas configuradas`}
                        actions={<SportBadge sport={sport} size="sm" />}
                      />
                      <div className="grid gap-5 p-5 lg:grid-cols-2 xl:grid-cols-3">
                        {types.map((type) => (
                          <div key={type}>
                            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {ZONE_TYPE_LABELS[type]}
                            </h4>
                            <ZoneTable
                              zones={sportZones.filter((zone) => zone.type === type)}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
