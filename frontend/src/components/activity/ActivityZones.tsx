import type { ActivityZone, Sport, Zone, ZoneType } from '../../api/types'
import { formatClock, formatDecimal, formatZoneRange } from '../../lib/format'
import { ZONE_TYPE_LABELS } from '../../lib/labels'
import { zoneColor } from '../../lib/zoneColors'
import { Card, CardHeader } from '../ui/Card'

const TYPE_ORDER: ZoneType[] = ['HR', 'PACE', 'POWER']

interface ActivityZonesProps {
  zones: ActivityZone[]
  athleteZones?: Zone[]
  sport?: Sport
}

/** Barras horizontais de tempo/percentual por zona (FC, pace e potência). */
export function ActivityZones({ zones, athleteZones, sport }: ActivityZonesProps) {
  const groups = TYPE_ORDER.flatMap((type) => {
    const items = zones
      .filter((zone) => zone.type === type)
      .sort((a, b) => a.zoneNumber - b.zoneNumber)
    return items.length > 0 ? [{ type, items }] : []
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Tempo em zonas"
        description="Barras empilhadas com tempo e percentual por zona"
      />
      {groups.length === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-ink-500">
          O servidor não retornou zonas para esta atividade. Confira se os limiares do atleta
          estão configurados.
        </p>
      ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-3">
          {groups.map(({ type, items }) => {
            const maxZone = Math.max(...items.map((item) => item.zoneNumber))
            const totalSeconds = items.reduce((sum, item) => sum + item.seconds, 0)
            return (
              <section key={type} aria-labelledby={`zones-${type}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    id={`zones-${type}`}
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-600"
                  >
                    {ZONE_TYPE_LABELS[type]}
                  </h3>
                  <span className="text-[10px] font-medium text-ink-500">
                    {formatClock(totalSeconds)}
                  </span>
                </div>
                <div
                  className="mt-2 flex h-3 overflow-hidden rounded-full bg-ink-100"
                  role="img"
                  aria-label={`Distribuição de tempo em zonas de ${ZONE_TYPE_LABELS[type]}`}
                >
                  {items.map((zone) => (
                    <span
                      key={`bar-${type}-${zone.zoneNumber}`}
                      className="h-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, zone.pct))}%`,
                        backgroundColor: zoneColor(zone.zoneNumber, maxZone),
                      }}
                      title={`Z${zone.zoneNumber}: ${formatClock(zone.seconds)} (${formatDecimal(zone.pct, 1)}%)`}
                    />
                  ))}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {items.map((zone) => {
                    const configured = athleteZones?.find(
                      (item) =>
                        item.type === type &&
                        item.zoneNumber === zone.zoneNumber &&
                        (!sport || item.sport === sport),
                    )
                    const range = configured ? formatZoneRange(configured) : null
                    const title = `Z${zone.zoneNumber}${range ? ` (${range})` : ''}: ${formatClock(zone.seconds)} (${formatDecimal(zone.pct, 1)}%)`
                    return (
                      <li key={`${type}-${zone.zoneNumber}`}>
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span
                            className="min-w-0 truncate font-semibold text-ink-700"
                            title={title}
                          >
                            Z{zone.zoneNumber}
                            {range ? (
                              <span className="font-normal text-ink-500">
                                <span className="mx-1 text-ink-300" aria-hidden="true">
                                  ·
                                </span>
                                {range}
                              </span>
                            ) : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-ink-500">
                            {formatClock(zone.seconds)} · {formatDecimal(zone.pct, 1)}%
                          </span>
                        </div>
                        <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:
                                zone.pct > 0
                                  ? `${Math.min(100, Math.max(1.5, zone.pct))}%`
                                  : '0%',
                              backgroundColor: zoneColor(zone.zoneNumber, maxZone),
                            }}
                            title={title}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </Card>
  )
}
