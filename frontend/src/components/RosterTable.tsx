import { ArrowRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardRosterEntry } from '../api/types'
import { cn } from '../lib/cn'
import { formatDateShort, formatLatestMetric, formatNumber } from '../lib/format'
import { SportBadge } from './SportBadge'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function AthleteIdentity({ entry }: { entry: DashboardRosterEntry }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-accent-400">
        {initials(entry.displayName)}
      </span>
      <div className="min-w-0">
        <Link
          to={`/athletes/${entry.athleteId}`}
          className="block truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
        >
          {entry.displayName}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1">
          {entry.sports.length > 0 ? (
            entry.sports.map((sport) => <SportBadge key={sport} sport={sport} size="sm" />)
          ) : (
            <span className="text-[11px] text-ink-500">Sem modalidades</span>
          )}
        </div>
      </div>
    </div>
  )
}

function NextSession({ entry }: { entry: DashboardRosterEntry }) {
  if (!entry.nextSessionDate) {
    return <span className="text-xs text-ink-500">Sem sessão</span>
  }
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-xs font-semibold text-ink-800">
        <CalendarDays className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
        {formatDateShort(entry.nextSessionDate)}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-ink-500">
        {entry.nextWorkoutName ?? 'Sessão planejada'}
      </p>
    </div>
  )
}

function LatestMetric({ entry }: { entry: DashboardRosterEntry }) {
  if (!entry.latestMetric) {
    return <span className="text-xs text-ink-500">Sem registro</span>
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-ink-700">
        {formatLatestMetric(entry.latestMetric)}
      </p>
      <p className="mt-0.5 text-[10px] text-ink-500">
        {formatDateShort(entry.latestMetric.date)}
      </p>
    </div>
  )
}

interface RosterTableProps {
  roster: DashboardRosterEntry[]
  className?: string
}

export function RosterTable({ roster, className }: RosterTableProps) {
  return (
    <div className={className}>
      {/* Tabela (telas médias e grandes) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <caption className="sr-only">Plantel de atletas com carga e último registro</caption>
          <thead>
            <tr className="border-b border-ink-100 text-[10px] uppercase tracking-[0.1em] text-ink-500">
              <th scope="col" className="px-4 py-3 font-semibold">
                Atleta
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Carga 7d
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Próximo treino
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Último registro
              </th>
              <th scope="col" className="px-2 py-3">
                <span className="sr-only">Abrir atleta</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {roster.map((entry) => (
              <tr key={entry.athleteId} className="group transition hover:bg-ink-50/70">
                <td className="max-w-[260px] px-4 py-3">
                  <AthleteIdentity entry={entry} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                      entry.plannedMinutes7d > 0
                        ? 'bg-accent-100 text-ink-900'
                        : 'bg-ink-100 text-ink-600',
                    )}
                  >
                    {formatNumber(entry.plannedMinutes7d)} min
                  </span>
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <NextSession entry={entry} />
                </td>
                <td className="max-w-[230px] px-4 py-3">
                  <LatestMetric entry={entry} />
                </td>
                <td className="px-2 py-3 text-right">
                  <Link
                    to={`/athletes/${entry.athleteId}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition group-hover:bg-brand-50 group-hover:text-brand-700"
                    aria-label={`Abrir ficha de ${entry.displayName}`}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <ul className="divide-y divide-ink-100 md:hidden">
        {roster.map((entry) => (
          <li key={entry.athleteId} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <AthleteIdentity entry={entry} />
              <Link
                to={`/athletes/${entry.athleteId}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-ink-600"
                aria-label={`Abrir ficha de ${entry.displayName}`}
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-ink-50/70 px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  Carga 7d
                </p>
                <p className="text-xs font-bold tabular-nums text-ink-900">
                  {formatNumber(entry.plannedMinutes7d)} min
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  Próximo treino
                </p>
                <NextSession entry={entry} />
              </div>
              <div className="col-span-2 border-t border-ink-100 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  Último registro
                </p>
                <LatestMetric entry={entry} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
