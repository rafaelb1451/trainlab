import { Bike, Footprints, Waves, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { Sport } from '../../api/types'
import type { ActivityCardData, CardMetric, CardStat } from './cardData'
import { CARD_COLORS, CARD_FONT_FAMILY, CARD_HEIGHT, CARD_WIDTH } from './cardTheme'
import type { ShareLayoutId } from './shareLayouts'

const SPORT_ICONS: Record<Sport, LucideIcon> = {
  RUN: Footprints,
  BIKE: Bike,
  SWIM: Waves,
}

/* ------------------------------------------------------------------------- */
/* Peças compartilhadas pelos modelos                                         */
/* ------------------------------------------------------------------------- */

function CardLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 4,
        lineHeight: 1.2,
        textTransform: 'uppercase',
        color: CARD_COLORS.muted,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

function MetricValue({
  metric,
  valueSize,
  unitSize,
  valueColor,
}: {
  metric: CardMetric
  valueSize: number
  unitSize: number
  valueColor?: string
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12, maxWidth: '100%' }}>
      <span
        style={{
          fontSize: valueSize,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: valueSize >= 100 ? -4 : -1,
          color: valueColor ?? CARD_COLORS.ink,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {metric.value}
      </span>
      {metric.unit ? (
        <span style={{ fontSize: unitSize, fontWeight: 600, color: CARD_COLORS.muted }}>
          {metric.unit}
        </span>
      ) : null}
    </span>
  )
}

function StatBlock({
  stat,
  valueSize = 46,
  unitSize = 24,
}: {
  stat: CardStat
  valueSize?: number
  unitSize?: number
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <CardLabel style={{ letterSpacing: 3 }}>{stat.label}</CardLabel>
      <div style={{ marginTop: 8 }}>
        <MetricValue metric={stat} valueSize={valueSize} unitSize={unitSize} />
      </div>
    </div>
  )
}

function SportPill({ sport, label }: { sport: Sport; label: string }) {
  const Icon = SPORT_ICONS[sport]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 26px',
        borderRadius: 999,
        background: CARD_COLORS.blue,
        color: CARD_COLORS.white,
        fontSize: 27,
        fontWeight: 700,
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={34} strokeWidth={2.2} color={CARD_COLORS.white} aria-hidden="true" />
      {label}
    </span>
  )
}

function AccentBar({ style }: { style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: 72,
        height: 8,
        borderRadius: 999,
        background: CARD_COLORS.yellow,
        ...style,
      }}
    />
  )
}

function BrandFooter({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 34,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: 0.2,
          color: CARD_COLORS.ink,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: CARD_COLORS.yellow,
          }}
        />
        TrainLab
      </span>
      {label ? (
        <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: 1, color: CARD_COLORS.muted }}>
          {label}
        </span>
      ) : null}
    </div>
  )
}

function MiniBars({ bars, height = 108 }: { bars: number[]; height?: number }) {
  if (bars.length < 2) return null
  const peak = Math.max(...bars)
  return (
    <div style={{ marginTop: 30 }}>
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 7,
          height,
          paddingBottom: 3,
          borderBottom: `2px solid ${CARD_COLORS.line}`,
        }}
      >
        {bars.map((bar, index) => {
          const isPeak = peak - bar < 1e-6
          const percent = Math.round(Math.min(1, Math.max(0.08, bar)) * 100)
          return (
            <span
              key={index}
              style={{
                flex: 1,
                height: `${percent}%`,
                borderRadius: '6px 6px 0 0',
                background: isPeak ? CARD_COLORS.yellow : CARD_COLORS.blue,
                opacity: isPeak ? 1 : 0.82,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        padding: '52px 54px',
        borderRadius: 56,
        background: CARD_COLORS.panel,
        border: '2px solid rgba(255, 255, 255, 0.72)',
        boxShadow: '0 36px 100px rgba(15, 23, 42, 0.24)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function CardHeading({ data }: { data: ActivityCardData }) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <SportPill sport={data.sport} label={data.sportLabel} />
        <span
          style={{
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: 3,
            color: CARD_COLORS.muted,
            whiteSpace: 'nowrap',
          }}
        >
          {data.dateLabel}
        </span>
      </div>
      <div style={{ marginTop: 28 }}>
        <p
          style={{
            margin: 0,
            fontSize: 27,
            fontWeight: 600,
            letterSpacing: 0.4,
            color: CARD_COLORS.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.athleteName}
        </p>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 50,
            fontWeight: 800,
            lineHeight: 1.14,
            color: CARD_COLORS.ink,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {data.activityName}
        </p>
      </div>
      <AccentBar style={{ marginTop: 26 }} />
    </>
  )
}

/* ------------------------------------------------------------------------- */
/* Modelo 1 — Completo (estatísticas + mini-gráfico)                          */
/* ------------------------------------------------------------------------- */

function CompleteCard({ data }: { data: ActivityCardData }) {
  return (
    <Panel>
      <CardHeading data={data} />
      <div style={{ marginTop: 30 }}>
        <CardLabel>Distância</CardLabel>
        <div style={{ marginTop: 4 }}>
          <MetricValue metric={data.distance} valueSize={148} unitSize={46} />
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '28px 44px',
          marginTop: 36,
          paddingTop: 34,
          borderTop: `2px solid ${CARD_COLORS.line}`,
        }}
      >
        <StatBlock stat={data.pace} />
        <StatBlock stat={data.duration} />
        <StatBlock stat={data.hr} />
        <StatBlock stat={data.elevation} />
      </div>
      <MiniBars bars={data.bars} />
      <BrandFooter label={data.weekdayLabel} />
    </Panel>
  )
}

/* ------------------------------------------------------------------------- */
/* Modelo 2 — Números grandes empilhados                                      */
/* ------------------------------------------------------------------------- */

function BigNumberRow({
  label,
  metric,
  accent,
}: {
  label: string
  metric: CardMetric
  accent: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 28, padding: '22px 0', borderBottom: `2px solid ${CARD_COLORS.line}` }}>
      <span
        aria-hidden="true"
        style={{ width: 10, borderRadius: 999, background: accent, flexShrink: 0 }}
      />
      <div style={{ minWidth: 0 }}>
        <CardLabel>{label}</CardLabel>
        <div style={{ marginTop: 6 }}>
          <MetricValue metric={metric} valueSize={100} unitSize={34} />
        </div>
      </div>
    </div>
  )
}

function BigNumbersCard({ data }: { data: ActivityCardData }) {
  return (
    <Panel>
      <CardHeading data={data} />
      <div style={{ marginTop: 30 }}>
        <BigNumberRow label="Distância" metric={data.distance} accent={CARD_COLORS.yellow} />
        <BigNumberRow label={data.pace.label} metric={data.pace} accent={CARD_COLORS.blue} />
        <BigNumberRow label={data.duration.label} metric={data.duration} accent={CARD_COLORS.blueDark} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 30,
          marginTop: 28,
        }}
      >
        <StatBlock stat={data.hr} valueSize={44} unitSize={22} />
        <StatBlock stat={data.elevation} valueSize={44} unitSize={22} />
      </div>
      <MiniBars bars={data.bars} height={78} />
      <BrandFooter label={data.weekdayLabel} />
    </Panel>
  )
}

/* ------------------------------------------------------------------------- */
/* Modelo 3 — Lista rótulo/valor                                              */
/* ------------------------------------------------------------------------- */

function ListCard({ data }: { data: ActivityCardData }) {
  const rows: CardStat[] = [
    { label: 'Distância', ...data.distance },
    data.pace,
    data.duration,
    data.hr,
    data.elevation,
    ...data.extras,
  ]

  return (
    <Panel>
      <CardHeading data={data} />
      <div style={{ marginTop: 30, borderTop: `2px solid ${CARD_COLORS.line}` }}>
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 24,
              padding: '19px 0',
              borderBottom: index === rows.length - 1 ? 'none' : `2px solid ${CARD_COLORS.line}`,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 600, color: CARD_COLORS.muted }}>
              {row.label}
            </span>
            <MetricValue metric={row} valueSize={38} unitSize={22} />
          </div>
        ))}
      </div>
      <BrandFooter label={data.dateLabel} />
    </Panel>
  )
}

/* ------------------------------------------------------------------------- */
/* Modelo 4 — Data minimalista com ícone do esporte                           */
/* ------------------------------------------------------------------------- */

function StatChip({ stat }: { stat: CardStat }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 9,
        padding: '11px 22px',
        borderRadius: 999,
        background: CARD_COLORS.blueSoft,
        fontSize: 25,
        fontWeight: 700,
        color: CARD_COLORS.ink,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontWeight: 700, color: CARD_COLORS.muted }}>{stat.label}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{stat.value}</span>
      {stat.unit ? (
        <span style={{ fontSize: 20, fontWeight: 600, color: CARD_COLORS.muted }}>{stat.unit}</span>
      ) : null}
    </span>
  )
}

function MinimalDateCard({ data }: { data: ActivityCardData }) {
  const Icon = SPORT_ICONS[data.sport]
  const [day = '—', month = '', year = ''] = data.dateLabel.split(' ')

  return (
    <Panel style={{ textAlign: 'center', padding: '58px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 146,
            height: 146,
            borderRadius: 999,
            background: CARD_COLORS.blue,
            boxShadow: '0 18px 44px rgba(37, 99, 235, 0.36)',
          }}
        >
          <Icon size={76} strokeWidth={2} color={CARD_COLORS.white} aria-hidden="true" />
        </span>
      </div>
      <p
        style={{
          margin: '20px 0 0',
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: CARD_COLORS.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.athleteName}
      </p>
      <AccentBar style={{ margin: '16px auto 0', width: 64 }} />
      <p
        style={{
          margin: '18px 0 0',
          fontSize: 126,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: -4,
          color: CARD_COLORS.ink,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {day} {month}
      </p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 7,
          color: CARD_COLORS.muted,
        }}
      >
        {year}
      </p>
      <p
        style={{
          margin: '10px 0 0',
          fontSize: 26,
          fontWeight: 700,
          color: CARD_COLORS.blue,
          whiteSpace: 'nowrap',
        }}
      >
        {data.weekdayLabel} · {data.sportLabel}
      </p>
      <p
        style={{
          margin: '24px 0 0',
          fontSize: 38,
          fontWeight: 800,
          color: CARD_COLORS.ink,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {data.activityName}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 30,
          marginTop: 32,
        }}
      >
        <div>
          <CardLabel style={{ letterSpacing: 3 }}>Distância</CardLabel>
          <div style={{ marginTop: 6 }}>
            <MetricValue metric={data.distance} valueSize={88} unitSize={30} />
          </div>
        </div>
        <span
          aria-hidden="true"
          style={{ width: 2, height: 76, background: CARD_COLORS.line }}
        />
        <div>
          <CardLabel style={{ letterSpacing: 3 }}>{data.pace.label}</CardLabel>
          <div style={{ marginTop: 6 }}>
            <MetricValue metric={data.pace} valueSize={48} unitSize={22} />
          </div>
        </div>
        <span
          aria-hidden="true"
          style={{ width: 2, height: 76, background: CARD_COLORS.line }}
        />
        <div>
          <CardLabel style={{ letterSpacing: 3 }}>{data.duration.label}</CardLabel>
          <div style={{ marginTop: 6 }}>
            <MetricValue metric={data.duration} valueSize={48} unitSize={22} />
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 14,
          marginTop: 30,
        }}
      >
        <StatChip stat={data.hr} />
        <StatChip stat={data.elevation} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 24,
            fontWeight: 800,
            color: CARD_COLORS.ink,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: 12, height: 12, borderRadius: 999, background: CARD_COLORS.yellow }}
          />
          TrainLab
        </span>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------------- */
/* Card                                                                       */
/* ------------------------------------------------------------------------- */

export interface ActivityShareCardProps {
  layout: ShareLayoutId
  data: ActivityCardData
}

/**
 * Card 9:16 (1080 × 1920 px) com fundo transparente: apenas o bloco de
 * conteúdo é desenhado, o restante do canvas fica com alfa zero para ser
 * colado sobre uma foto no story.
 */
export function ActivityShareCard({ layout, data }: ActivityShareCardProps) {
  function renderCard() {
    switch (layout) {
      case 'complete':
        return <CompleteCard data={data} />
      case 'bigNumbers':
        return <BigNumbersCard data={data} />
      case 'list':
        return <ListCard data={data} />
      case 'minimalDate':
        return <MinimalDateCard data={data} />
    }
  }

  return (
    <div
      data-testid={`share-card-${layout}`}
      data-share-layout={layout}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 80px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'transparent',
        fontFamily: CARD_FONT_FAMILY,
        color: CARD_COLORS.ink,
      }}
    >
      {renderCard()}
    </div>
  )
}
