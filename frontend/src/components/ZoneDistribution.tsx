import type { ZoneType } from '../api/types'
import type { DistributionGroup } from '../lib/workoutBuilder'
import { formatDurationHuman } from '../lib/format'

const zoneColors = [
  'bg-sky-300',
  'bg-emerald-400',
  'bg-yellow-400',
  'bg-orange-400',
  'bg-red-500',
  'bg-fuchsia-500',
  'bg-violet-600',
]

const zoneTypeKeys: Record<ZoneType, string> = {
  HR: 'FC',
  PACE: 'Pace',
  POWER: 'Potência',
}

interface ZoneDistributionProps {
  groups: DistributionGroup[]
  zoneNames?: Map<string, string>
}

export function ZoneDistribution({ groups, zoneNames }: ZoneDistributionProps) {
  if (groups.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        A distribuição de zonas aparece quando há steps com tempo e alvo por zona.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const total = group.zones.reduce((sum, bucket) => sum + bucket.seconds, 0)
        return (
          <div key={group.type}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-700">
                {group.label}
                <span className="ml-1 font-normal text-slate-400">({zoneTypeKeys[group.type]})</span>
              </span>
              <span className="text-[11px] tabular-nums text-slate-500">
                {formatDurationHuman(total)}
              </span>
            </div>
            <div
              className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`Distribuição de ${group.label} por zona`}
            >
              {group.zones.map((bucket) => {
                if (bucket.seconds <= 0 || total <= 0) return null
                const percent = Math.round((bucket.seconds / total) * 100)
                const name = zoneNames?.get(`${group.type}:${bucket.zone}`)
                const title = `Z${bucket.zone}${name ? ` ${name}` : ''} · ${percent}% · ${formatDurationHuman(bucket.seconds)}`
                return (
                  <div
                    key={bucket.zone}
                    className={zoneColors[(bucket.zone - 1) % zoneColors.length]}
                    style={{ width: `${(bucket.seconds / total) * 100}%` }}
                    title={title}
                  />
                )
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>Z1</span>
              <span>Z{group.zones.length}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
