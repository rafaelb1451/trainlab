import type { Zone } from '../api/types'
import { formatZoneRange } from '../lib/format'
import { cn } from '../lib/cn'

function unitLabel(unit: string): string {
  if (unit === 'bpm') return 'bpm'
  if (unit === 'w') return 'W'
  if (unit === 's_per_km') return 'min/km'
  if (unit === 's_per_100m') return 'min/100 m'
  return unit
}

interface ZoneTableProps {
  zones: Zone[]
  className?: string
}

export function ZoneTable({ zones, className }: ZoneTableProps) {
  const sorted = [...zones].sort((a, b) => a.zoneNumber - b.zoneNumber)
  const unit = sorted.find((zone) => zone.unit)?.unit ?? ''

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200', className)}>
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Zonas de treino</caption>
        <thead>
          <tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <th scope="col" className="w-16 px-3 py-2 font-semibold">
              Zona
            </th>
            <th scope="col" className="px-3 py-2 font-semibold">
              Nome
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Faixa
            </th>
            <th scope="col" className="hidden w-24 px-3 py-2 text-right font-semibold sm:table-cell">
              Unidade
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                Nenhuma zona configurada.
              </td>
            </tr>
          ) : (
            sorted.map((zone) => (
              <tr key={`${zone.sport}-${zone.type}-${zone.zoneNumber}`} className="bg-white">
                <td className="px-3 py-2">
                  <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-ink-900 px-1.5 py-0.5 text-[11px] font-bold text-brand-300">
                    Z{zone.zoneNumber}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">{zone.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {formatZoneRange(zone)}
                </td>
                <td className="hidden px-3 py-2 text-right text-xs text-slate-500 sm:table-cell">
                  {unitLabel(unit)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
