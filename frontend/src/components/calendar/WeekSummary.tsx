import type { CalendarSession, CalendarWeek, Sport } from '../../api/types'
import { formatMinutesAsDuration, formatWeekRange } from '../../lib/calendar'
import { SPORT_LABELS } from '../../lib/labels'
import { cn } from '../../lib/cn'
import { SPORT_DOT } from './sportStyles'

interface WeekSummaryProps {
  week: CalendarWeek | undefined
  weekStart: Date
  weekSessions: CalendarSession[]
}

function sportMinutes(weekSessions: CalendarSession[]): Array<{ sport: Sport; minutes: number }> {
  const totals = new Map<Sport, number>()
  for (const session of weekSessions) {
    const workout = session.workout
    if (!workout) continue
    totals.set(
      workout.sport,
      (totals.get(workout.sport) ?? 0) + Math.round((workout.estimatedDurationSec || 0) / 60),
    )
  }
  return [...totals.entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([sport, minutes]) => ({ sport, minutes }))
}

function LoadRow({
  label,
  value,
  suffix,
  tone,
}: {
  label: string
  value: number
  suffix: string
  tone?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-ink-500">
        {label}
      </span>
      <span className={cn('text-[11.5px] font-bold tabular-nums', tone ?? 'text-ink-900')}>
        {value}
        <span className="ml-0.5 text-[8px] font-semibold uppercase text-ink-400">{suffix}</span>
      </span>
    </div>
  )
}

/** Painel lateral de uma semana: carga (CTL/ATL/TSB) + totais planejados. */
export function WeekSummary({ week, weekStart, weekSessions }: WeekSummaryProps) {
  const ctl = week?.ctl ?? 0
  const atl = week?.atl ?? 0
  const tsb = week?.tsb ?? 0
  const tsbTone = tsb < 0 ? 'text-accent-600' : tsb > 0 ? 'text-brand-600' : 'text-ink-500'
  const sports = sportMinutes(weekSessions)

  return (
    <div className="h-full border-b border-l border-ink-200/70 bg-ink-50/70 px-2 py-2">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.03em] text-ink-400">
        {formatWeekRange(weekStart)}
      </p>
      <div className="space-y-0.5">
        <LoadRow label="Fitness" value={ctl} suffix="CTL" />
        <LoadRow label="Fadiga" value={atl} suffix="ATL" />
        <LoadRow label="Formulário" value={tsb} suffix="TSB" tone={tsbTone} />
      </div>
      <div className="mt-1.5 space-y-0.5 border-t border-ink-200/70 pt-1.5">
        <div className="flex items-baseline justify-between gap-1 text-[9.5px]">
          <span className="text-ink-500">Total Duração</span>
          <span className="font-semibold tabular-nums text-ink-800">
            {formatMinutesAsDuration(week?.plannedMinutes ?? 0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-1 text-[9.5px]">
          <span className="text-ink-500">Total TSS</span>
          <span className="font-semibold tabular-nums text-ink-800">{week?.plannedTss ?? 0}</span>
        </div>
        <div className="flex items-baseline justify-between gap-1 text-[9.5px]">
          <span className="text-ink-500">Sessões</span>
          <span className="font-semibold tabular-nums text-ink-800">
            {week?.plannedSessions ?? 0}
          </span>
        </div>
      </div>
      {sports.length > 0 ? (
        <div className="mt-1.5 space-y-0.5 border-t border-ink-200/70 pt-1.5">
          {sports.map(({ sport, minutes }) => (
            <div key={sport} className="flex items-center gap-1 text-[8.5px] text-ink-500">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SPORT_DOT[sport])} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{SPORT_LABELS[sport]}</span>
              <span className="font-semibold tabular-nums text-ink-700">
                {formatMinutesAsDuration(minutes)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Versão horizontal para o cabeçalho da semana na lista mobile. */
export function WeekSummaryCompact({ week }: { week: CalendarWeek | undefined }) {
  const tsb = week?.tsb ?? 0
  const tsbTone = tsb < 0 ? 'text-accent-600' : tsb > 0 ? 'text-brand-600' : 'text-ink-500'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
      <span className="text-ink-500">
        Fitness <strong className="font-bold text-ink-900">{week?.ctl ?? 0}</strong>
        <span className="ml-0.5 text-[8px] text-ink-400">CTL</span>
      </span>
      <span className="text-ink-500">
        Fadiga <strong className="font-bold text-ink-900">{week?.atl ?? 0}</strong>
        <span className="ml-0.5 text-[8px] text-ink-400">ATL</span>
      </span>
      <span className={cn('font-semibold', tsbTone)}>
        Formulário <strong className="font-bold">{tsb}</strong>
        <span className="ml-0.5 text-[8px] font-medium text-ink-400">TSB</span>
      </span>
      <span className="text-ink-500">
        {formatMinutesAsDuration(week?.plannedMinutes ?? 0)} · {week?.plannedTss ?? 0} TSS ·{' '}
        {week?.plannedSessions ?? 0} {week?.plannedSessions === 1 ? 'sessão' : 'sessões'}
      </span>
    </div>
  )
}
