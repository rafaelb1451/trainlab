import type {
  ActivityAnalysis,
  ActivityLap,
  ActivitySeriesPoint,
  ActivitySplit,
  Sport,
} from '../../api/types'

/** Quantidade máxima de barras do mini-gráfico do treino. */
const MAX_BARS = 26
const MIN_HEIGHT = 0.22
const MAX_HEIGHT = 1

function positive(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

/** Intensidade de uma volta/parcial: quanto maior, mais alta a barra. */
function splitIntensity(split: ActivitySplit, sport: Sport): number | null {
  if (sport === 'BIKE') {
    const power = positive(split.avgPower)
    if (power !== null) return power
  }
  const pace = positive(split.paceSecPerKm)
  if (pace !== null) return 1000 / pace
  return positive(split.avgHr)
}

function lapIntensity(lap: ActivityLap, sport: Sport): number | null {
  if (sport === 'BIKE') {
    const power = positive(lap.avgPower)
    if (power !== null) return power
  }
  const pace = positive(lap.paceSecPerKm)
  if (pace !== null) return 1000 / pace
  return positive(lap.avgHr)
}

function seriesIntensity(point: ActivitySeriesPoint, sport: Sport): number | null {
  const power = positive(point.power)
  if (sport === 'BIKE' && power !== null) return power
  const pace = positive(point.paceSecPerKm)
  if (pace !== null) return 1000 / pace
  return positive(point.hr)
}

/** Reduz a série para no máximo `MAX_BARS` barras, tirando a média de cada faixa. */
function bucketAverage(values: number[]): number[] {
  if (values.length <= MAX_BARS) return values
  const result: number[] = []
  const size = values.length / MAX_BARS
  for (let index = 0; index < MAX_BARS; index += 1) {
    const start = Math.floor(index * size)
    const end = Math.max(start + 1, Math.floor((index + 1) * size))
    const slice = values.slice(start, end)
    if (slice.length === 0) continue
    result.push(slice.reduce((sum, value) => sum + value, 0) / slice.length)
  }
  return result
}

/** Normaliza para a faixa 0.22–1.0 para que todas as barras fiquem visíveis. */
function normalize(values: number[]): number[] {
  if (values.length < 2) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (max - min < 1e-6) return values.map(() => 0.62)
  return values.map((value) => {
    const ratio = (value - min) / (max - min)
    const clamped = Math.min(1, Math.max(0, ratio))
    return MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * clamped
  })
}

function fromSplits(splits: ActivitySplit[], sport: Sport): number[] {
  const intensities = splits
    .map((split) => splitIntensity(split, sport))
    .filter((value): value is number => value !== null)
  return normalize(bucketAverage(intensities))
}

function fromLaps(laps: ActivityLap[], sport: Sport): number[] {
  const intensities = laps
    .map((lap) => lapIntensity(lap, sport))
    .filter((value): value is number => value !== null)
  return normalize(bucketAverage(intensities))
}

function fromSeries(points: ActivitySeriesPoint[], sport: Sport): number[] {
  const intensities = points
    .map((point) => seriesIntensity(point, sport))
    .filter((value): value is number => value !== null)
  return normalize(bucketAverage(intensities))
}

/**
 * Extrai o perfil de intensidade do treino para o mini-gráfico do card.
 * Prefere as parciais (leitura mais limpa), depois voltas e por fim amostras.
 * Retorna vazio quando a análise ainda não está disponível — o card esconde o
 * gráfico em vez de inventar dados.
 */
export function barsFromAnalysis(analysis: ActivityAnalysis | null | undefined): number[] {
  if (!analysis) return []
  const sport = analysis.activity.sport
  const splits = analysis.splits ?? []
  if (splits.length >= 2) {
    const bars = fromSplits(splits, sport)
    if (bars.length >= 2) return bars
  }
  const laps = analysis.laps ?? []
  if (laps.length >= 2) {
    const bars = fromLaps(laps, sport)
    if (bars.length >= 2) return bars
  }
  const series = analysis.series ?? []
  if (series.length >= 2) {
    const bars = fromSeries(series, sport)
    if (bars.length >= 2) return bars
  }
  return []
}
