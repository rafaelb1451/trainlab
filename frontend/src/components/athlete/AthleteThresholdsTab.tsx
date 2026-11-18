import { useMutation } from '@tanstack/react-query'
import { CircleCheck, RefreshCw, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { athletesApi } from '../../api/endpoints'
import type { Sport, Threshold, Zone } from '../../api/types'
import { SPORTS, ZONE_TYPES } from '../../api/types'
import { cn } from '../../lib/cn'
import { formatPace, parsePace } from '../../lib/format'
import { SPORT_LABELS, ZONE_TYPE_LABELS } from '../../lib/labels'
import { ErrorAlert } from '../ErrorAlert'
import { LoadingState, Skeleton } from '../Feedback'
import { SportBadge } from '../SportBadge'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { Field, Input } from '../ui/Field'
import { ZoneTable } from '../ZoneTable'

interface ThresholdErrors {
  maxHr?: string
  restingHr?: string
  lthr?: string
  ftpWatts?: string
  pace?: string
  css?: string
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
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
    const paceSeconds = parsePace(pace)
    if (sport === 'RUN' && pace.trim() && (paceSeconds === null || paceSeconds <= 0)) {
      nextErrors.pace = 'Use o formato mm:ss, por exemplo 4:35.'
    }
    const cssSeconds = parsePace(css)
    if (sport === 'SWIM' && css.trim() && (cssSeconds === null || cssSeconds <= 0)) {
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
        sport === 'RUN' ? paceSeconds : (threshold?.thresholdPaceSecPerKm ?? null),
      cssSecPer100m: sport === 'SWIM' ? cssSeconds : (threshold?.cssSecPer100m ?? null),
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">
            {SPORT_LABELS[sport]} — limiares
          </h3>
          <p className="mt-0.5 text-xs text-ink-500">Valores usados para gerar as zonas.</p>
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

interface AthleteThresholdsTabProps {
  athleteId: string
  initialSport?: Sport
  thresholds: Threshold[]
  zones: Zone[]
  canEdit: boolean
  thresholdsLoading: boolean
  zonesLoading: boolean
  thresholdsError: unknown
  zonesError: unknown
  onRetryThresholds: () => void
  onRetryZones: () => void
  onSaved: () => void
}

export function AthleteThresholdsTab({
  athleteId,
  initialSport = 'RUN',
  thresholds,
  zones,
  canEdit,
  thresholdsLoading,
  zonesLoading,
  thresholdsError,
  zonesError,
  onRetryThresholds,
  onRetryZones,
  onSaved,
}: AthleteThresholdsTabProps) {
  const [activeSport, setActiveSport] = useState<Sport>(initialSport)
  const threshold = thresholds.find((item) => item.sport === activeSport)
  const sportZones = zones.filter((zone) => zone.sport === activeSport)
  const zoneTypes = ZONE_TYPES.filter((type) => sportZones.some((zone) => zone.type === type))
  const refreshing = thresholdsLoading || zonesLoading

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Limiares e zonas</h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Edite os limiares por modalidade. Ao salvar, o servidor recalcula as zonas.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onRetryThresholds()
            onRetryZones()
          }}
          loading={refreshing}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Atualizar
        </Button>
      </div>

      {thresholdsError ? (
        <ErrorAlert
          title="Não foi possível carregar os limiares"
          message={getApiErrorMessage(thresholdsError)}
          onRetry={onRetryThresholds}
        />
      ) : null}
      {zonesError ? (
        <ErrorAlert
          title="Não foi possível carregar as zonas"
          message={getApiErrorMessage(zonesError)}
          onRetry={onRetryZones}
        />
      ) : null}

      <div
        role="tablist"
        aria-label="Esporte para limiares e zonas"
        className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-ink-100 bg-white p-1 shadow-sm sm:w-fit"
      >
        {SPORTS.map((sport) => {
          const isActive = sport === activeSport
          return (
            <button
              key={sport}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSport(sport)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                isActive
                  ? 'bg-accent-400 text-ink-900 shadow-sm'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
              )}
            >
              {SPORT_LABELS[sport]}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-ink-900/10 text-ink-900' : 'bg-ink-100 text-ink-600',
                )}
              >
                {thresholds.find((item) => item.sport === sport) ? 'configurado' : 'sem dados'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {thresholdsLoading && !threshold ? (
          <Skeleton className="h-[420px]" />
        ) : (
          <ThresholdCard
            key={`${athleteId}-${activeSport}`}
            athleteId={athleteId}
            sport={activeSport}
            threshold={threshold}
            canEdit={canEdit}
            onSaved={onSaved}
          />
        )}

        <Card className="overflow-hidden">
          <CardHeader
            title={`Zonas · ${SPORT_LABELS[activeSport]}`}
            description={`${sportZones.length} zonas configuradas pelo servidor`}
            actions={<SportBadge sport={activeSport} size="sm" />}
          />
          <div className="p-5">
            {zonesLoading && sportZones.length === 0 ? (
              <LoadingState label="Carregando zonas…" />
            ) : sportZones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-ink-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-ink-800">
                  Nenhuma zona de {SPORT_LABELS[activeSport].toLowerCase()} ainda.
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Preencha os limiares ao lado e salve para gerar as zonas de FC, pace ou potência.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {zoneTypes.map((type) => (
                  <div key={type}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                      {ZONE_TYPE_LABELS[type]}
                    </h4>
                    <ZoneTable zones={sportZones.filter((zone) => zone.type === type)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
