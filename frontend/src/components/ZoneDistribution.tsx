import type { ZoneType } from '../api/types'
import type { DistributionGroup } from '../lib/workoutBuilder'
import { formatDurationHuman } from '../lib/format'
import { zoneColor } from '../lib/zoneColors'

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
      <p className="text-xs text-ink-500">
        A distribuição de zonas aparece quando há steps com tempo e alvo por zona.
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const total = group.zones.reduce((sum, bucket) => sum + bucket.seconds, 0)
        const maxZone = group.zones.length
        return (
          <div key={group.type}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink-700">
                {group.label}
                <span className="ml-1 font-normal text-ink-500">({zoneTypeKeys[group.type]})</span>
              </span>
              <span className="text-[11px] tabular-nums text-ink-500">
                {formatDurationHuman(total)}
              </span>
            </div>
            <div
              className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-ink-100"
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
                    style={{
                      width: `${(bucket.seconds / total) * 100}%`,
                      backgroundColor: zoneColor(bucket.zone, maxZone),
                    }}
                    title={title}
                  />
                )
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-ink-500">
              <span>Z1</span>
              <span>Z{group.zones.length}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
