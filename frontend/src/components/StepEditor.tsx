import { Copy, Gauge, Route, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { DurationType, Sport, StepRole, TargetType } from '../api/types'
import { ABSOLUTE_UNITS, STEP_ROLES } from '../api/types'
import type { BuilderStep, BuilderTarget } from '../lib/workoutBuilder'
import {
  formatClock,
  formatPercentRange,
  formatPace,
  targetTypeLabel,
} from '../lib/format'
import {
  DURATION_TYPE_LABELS,
  ROLE_LABELS,
  maxZoneForTarget,
  targetTypeLabelForSport,
  targetTypesForSport,
} from '../lib/labels'
import { cn } from '../lib/cn'
import { Card } from './ui/Card'
import { Field, Input, Select, Textarea } from './ui/Field'

interface StepEditorProps {
  step: BuilderStep
  sport: Sport
  blockTitle: string
  onChange: (patch: Partial<Pick<BuilderStep, 'role' | 'durationType' | 'durationSec' | 'distanceM' | 'notes'>>) => void
  onChangeTarget: (patch: Partial<BuilderTarget>) => void
  onDelete: () => void
  onDuplicate: () => void
}

const targetDefaults: Partial<Record<TargetType, { min: number | null; max: number | null }>> = {
  HR_PERCENT: { min: 84, max: 94 },
  PACE_PERCENT: { min: 96, max: 103 },
  POWER_PERCENT: { min: 91, max: 105 },
  RPE: { min: 6, max: 7 },
}

function toInput(value: number | null): string {
  return value === null ? '' : String(value)
}

function parseOptional(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDistanceInput(meters: number, unit: 'm' | 'km'): string {
  if (unit === 'km') {
    const km = meters / 1000
    return Number.isInteger(km) ? String(km) : String(Number(km.toFixed(3)))
  }
  return String(Math.round(meters))
}

export function StepEditor({
  step,
  sport,
  blockTitle,
  onChange,
  onChangeTarget,
  onDelete,
  onDuplicate,
}: StepEditorProps) {
  const initialUnit: 'm' | 'km' = step.distanceM !== null && step.distanceM >= 1000 ? 'km' : 'm'
  const [distanceUnit, setDistanceUnit] = useState<'m' | 'km'>(initialUnit)
  const [distanceInput, setDistanceInput] = useState(
    step.distanceM !== null ? formatDistanceInput(step.distanceM, initialUnit) : '',
  )
  const [minutesInput, setMinutesInput] = useState(
    String(Math.floor((step.durationSec ?? 0) / 60)),
  )
  const [secondsInput, setSecondsInput] = useState(String((step.durationSec ?? 0) % 60))

  const targetTypeOptions = targetTypesForSport(sport)
  const isZoneTarget = step.target.type.endsWith('_ZONE')
  const isPercentTarget = step.target.type.endsWith('_PERCENT')
  const isRpe = step.target.type === 'RPE'
  const percentUnit =
    step.target.type === 'HR_PERCENT'
      ? '% do LTHR'
      : step.target.type === 'POWER_PERCENT'
        ? '% do FTP'
        : sport === 'SWIM'
          ? '% do CSS'
          : '% do pace de limiar'

  function updateTime(minutesText: string, secondsText: string) {
    setMinutesInput(minutesText)
    setSecondsInput(secondsText)
    const minutes = Math.max(0, Math.min(999, Math.floor(Number(minutesText) || 0)))
    const seconds = Math.max(0, Math.min(59, Math.floor(Number(secondsText) || 0)))
    onChange({ durationSec: minutes * 60 + seconds })
  }

  function selectDurationType(type: DurationType) {
    if (type === step.durationType) return
    if (type === 'TIME') {
      const nextSeconds = step.durationSec ?? 600
      setMinutesInput(String(Math.floor(nextSeconds / 60)))
      setSecondsInput(String(nextSeconds % 60))
      onChange({ durationType: type, durationSec: nextSeconds, distanceM: null })
    } else if (type === 'DISTANCE') {
      const nextMeters = step.distanceM ?? 1000
      setDistanceInput(formatDistanceInput(nextMeters, distanceUnit))
      onChange({ durationType: type, durationSec: null, distanceM: nextMeters })
    } else {
      onChange({ durationType: type, durationSec: null, distanceM: null })
    }
  }

  function updateDistance(value: string) {
    setDistanceInput(value)
    const parsed = parseOptional(value)
    if (parsed === null || parsed <= 0) {
      onChange({ distanceM: null })
      return
    }
    onChange({ distanceM: Math.round(distanceUnit === 'km' ? parsed * 1000 : parsed) })
  }

  function changeDistanceUnit(nextUnit: 'm' | 'km') {
    const parsed = parseOptional(distanceInput)
    setDistanceUnit(nextUnit)
    if (parsed !== null) {
      const converted = nextUnit === 'km' ? parsed / 1000 : parsed * 1000
      setDistanceInput(
        nextUnit === 'km'
          ? String(Number(converted.toFixed(3)))
          : String(Math.round(converted)),
      )
    }
  }

  function selectTargetType(type: TargetType) {
    const maxZone = maxZoneForTarget(type)
    const defaults = targetDefaults[type]
    onChangeTarget({
      type,
      zone: type.endsWith('_ZONE') ? Math.min(step.target.zone ?? 2, maxZone) : null,
      minValue: type.endsWith('_PERCENT') || type === 'RPE' ? (defaults?.min ?? null) : null,
      maxValue: type.endsWith('_PERCENT') || type === 'RPE' ? (defaults?.max ?? null) : null,
    })
  }

  const maxZone = maxZoneForTarget(step.target.type)

  return (
    <Card className="overflow-hidden xl:sticky xl:top-20">
      <div className="border-b border-ink-100 bg-ink-50/70 px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              Editor do step
            </p>
            <h2 className="mt-0.5 text-sm font-bold text-ink-900">{ROLE_LABELS[step.role]}</h2>
            <p className="mt-0.5 truncate text-xs text-ink-500">{blockTitle || 'Sem título'}</p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onDuplicate}
              className="rounded-lg p-2 text-ink-500 transition hover:bg-white hover:text-ink-700"
              aria-label="Duplicar step"
              title="Duplicar step"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
              aria-label="Excluir step"
              title="Excluir step"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-scroll max-h-[calc(100vh-13rem)] space-y-5 overflow-y-auto p-5">
        <Field label="Papel" htmlFor="step-role">
          <Select
            id="step-role"
            value={step.role}
            onChange={(event) => {
              const value = event.target.value
              const role = (STEP_ROLES as readonly string[]).includes(value)
                ? (value as StepRole)
                : 'ACTIVE'
              onChange({ role })
            }}
          >
            {STEP_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-700">Tipo de duração</p>
          <div
            role="group"
            aria-label="Tipo de duração"
            className="grid grid-cols-3 gap-1 rounded-xl bg-ink-100 p-1"
          >
            {(Object.keys(DURATION_TYPE_LABELS) as DurationType[]).map((type) => {
              const Icon = type === 'TIME' ? Timer : type === 'DISTANCE' ? Route : Gauge
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={step.durationType === type}
                  onClick={() => selectDurationType(type)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition',
                    step.durationType === type
                      ? 'bg-white text-ink-900 shadow-sm'
                      : 'text-ink-500 hover:text-ink-800',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {DURATION_TYPE_LABELS[type]}
                </button>
              )
            })}
          </div>
        </div>

        {step.durationType === 'TIME' ? (
          <div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minutos" htmlFor="step-minutes" hint={formatClock(step.durationSec)}>
                <Input
                  id="step-minutes"
                  type="number"
                  min="0"
                  max="999"
                  inputMode="numeric"
                  value={minutesInput}
                  onChange={(event) => updateTime(event.target.value, secondsInput)}
                />
              </Field>
              <Field label="Segundos" htmlFor="step-seconds" hint="0 a 59">
                <Input
                  id="step-seconds"
                  type="number"
                  min="0"
                  max="59"
                  inputMode="numeric"
                  value={secondsInput}
                  onChange={(event) => updateTime(minutesInput, event.target.value)}
                />
              </Field>
            </div>
            <p className="mt-1.5 text-right font-mono text-xs text-ink-500">
              Duração: {formatClock(step.durationSec)}
            </p>
          </div>
        ) : step.durationType === 'DISTANCE' ? (
          <div>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="Distância" htmlFor="step-distance">
                <Input
                  id="step-distance"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={distanceInput}
                  onChange={(event) => updateDistance(event.target.value)}
                  placeholder={distanceUnit === 'km' ? '5' : '1000'}
                />
              </Field>
              <Field label="Unidade" htmlFor="step-distance-unit">
                <Select
                  id="step-distance-unit"
                  value={distanceUnit}
                  onChange={(event) => changeDistanceUnit(event.target.value === 'km' ? 'km' : 'm')}
                >
                  <option value="m">metros</option>
                  <option value="km">km</option>
                </Select>
              </Field>
            </div>
            <p className="mt-1.5 text-right text-xs text-ink-500">
              {step.distanceM !== null
                ? `${step.distanceM} m`
                : 'Distância não informada'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 px-3 py-3 text-xs text-ink-600">
            Duração aberta: o step termina por sensação ou orientação do treinador.
          </div>
        )}

        <div className="space-y-3 border-t border-ink-100 pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Alvo</h3>
            {step.target.display ? (
              <span className="max-w-[60%] truncate rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">
                {step.target.display}
              </span>
            ) : null}
          </div>

          <Field label="Tipo de alvo" htmlFor="step-target-type">
            <Select
              id="step-target-type"
              value={step.target.type}
              onChange={(event) => selectTargetType(event.target.value as TargetType)}
            >
              {targetTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {targetTypeLabelForSport(type, sport)}
                </option>
              ))}
            </Select>
          </Field>

          {isZoneTarget ? (
            <Field
              label={`Zona (${step.target.type.startsWith('POWER') ? 'potência' : step.target.type.startsWith('HR') ? 'FC' : 'pace'})`}
              htmlFor="step-target-zone"
              hint={targetTypeLabel(step.target.type, sport)}
            >
              <Select
                id="step-target-zone"
                value={step.target.zone ?? 2}
                onChange={(event) =>
                  onChangeTarget({ zone: Number(event.target.value) || 1 })
                }
              >
                {Array.from({ length: maxZone }, (_, index) => index + 1).map((zone) => (
                  <option key={zone} value={zone}>
                    Z{zone}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {isPercentTarget || isRpe ? (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={isRpe ? 'RPE mínimo' : 'Mínimo'}
                  htmlFor="step-target-min"
                  hint={isRpe ? '1–10' : percentUnit}
                >
                  <Input
                    id="step-target-min"
                    type="number"
                    min={isRpe ? 1 : 0}
                    max={isRpe ? 10 : 200}
                    value={toInput(step.target.minValue)}
                    onChange={(event) => onChangeTarget({ minValue: parseOptional(event.target.value) })}
                  />
                </Field>
                <Field
                  label={isRpe ? 'RPE máximo' : 'Máximo'}
                  htmlFor="step-target-max"
                  hint={isRpe ? '1–10' : percentUnit}
                >
                  <Input
                    id="step-target-max"
                    type="number"
                    min={isRpe ? 1 : 0}
                    max={isRpe ? 10 : 200}
                    value={toInput(step.target.maxValue)}
                    onChange={(event) => onChangeTarget({ maxValue: parseOptional(event.target.value) })}
                  />
                </Field>
              </div>
              <p className="mt-1.5 text-xs text-ink-500">
                {isRpe
                  ? `Referência: ${formatPercentRange(step.target.minValue, step.target.maxValue).replace(/%/g, '')}`
                  : `Faixa alvo: ${formatPercentRange(step.target.minValue, step.target.maxValue)} ${percentUnit}`}
              </p>
            </div>
          ) : null}

          {step.target.type === 'FREE' ? (
            <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50 px-3 py-3 text-xs text-ink-600">
              Alvo livre: o atleta define o esforço. Use as observações para orientar.
            </div>
          ) : null}

          <Field
            label="Reforço exibido"
            htmlFor="step-target-display"
            hint="Texto opcional mostrado junto ao alvo, como “cadência 90 rpm”."
          >
            <Input
              id="step-target-display"
              value={step.target.display}
              onChange={(event) => onChangeTarget({ display: event.target.value })}
              placeholder="ex.: cadência 90 rpm"
              maxLength={80}
            />
          </Field>

          <details className="group rounded-xl border border-ink-200 bg-ink-50/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-ink-600">
              Fixar alvo absoluto (opcional)
              <span className="text-[10px] font-medium text-ink-500 group-open:hidden">
                bpm / W / pace
              </span>
            </summary>
            <div className="space-y-3 border-t border-ink-200 px-3 py-3">
              <Field label="Unidade" htmlFor="step-absolute-unit">
                <Select
                  id="step-absolute-unit"
                  value={step.target.absoluteUnit}
                  onChange={(event) => {
                    const value = event.target.value
                    onChangeTarget({
                      absoluteUnit:
                        value === 'bpm' ||
                        value === 'w' ||
                        value === 's_per_km' ||
                        value === 's_per_100m'
                          ? value
                          : '',
                    })
                  }}
                >
                  <option value="">Nenhuma</option>
                  {ABSOLUTE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit === 'w' ? 'W' : unit === 'bpm' ? 'bpm' : `${unit} (segundos)`}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mínimo" htmlFor="step-absolute-min">
                  <Input
                    id="step-absolute-min"
                    type="number"
                    step="any"
                    value={toInput(step.target.absoluteMin)}
                    onChange={(event) =>
                      onChangeTarget({ absoluteMin: parseOptional(event.target.value) })
                    }
                  />
                </Field>
                <Field label="Máximo" htmlFor="step-absolute-max">
                  <Input
                    id="step-absolute-max"
                    type="number"
                    step="any"
                    value={toInput(step.target.absoluteMax)}
                    onChange={(event) =>
                      onChangeTarget({ absoluteMax: parseOptional(event.target.value) })
                    }
                  />
                </Field>
              </div>
              {step.target.absoluteUnit === 's_per_km' ||
              step.target.absoluteUnit === 's_per_100m' ? (
                <p className="text-[11px] text-ink-500">
                  Pace em segundos: {formatPace(step.target.absoluteMin)}–
                  {formatPace(step.target.absoluteMax)} por{' '}
                  {step.target.absoluteUnit === 's_per_km' ? 'km' : '100 m'}.
                </p>
              ) : null}
            </div>
          </details>
        </div>

        <Field label="Observações do step" htmlFor="step-notes">
          <Textarea
            id="step-notes"
            value={step.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Instruções técnicas, cadência, respiração…"
            className="min-h-20"
          />
        </Field>
      </div>
    </Card>
  )
}
