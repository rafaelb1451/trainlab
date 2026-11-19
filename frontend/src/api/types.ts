export const SPORTS = ['RUN', 'BIKE', 'SWIM'] as const
export type Sport = (typeof SPORTS)[number]

export const WORKOUT_TYPES = [
  'ENDURANCE',
  'TEMPO',
  'INTERVAL',
  'RECOVERY',
  'RACE',
  'SKILL',
  'OTHER',
] as const
export type WorkoutType = (typeof WORKOUT_TYPES)[number]

export const STEP_ROLES = ['WARMUP', 'ACTIVE', 'RECOVERY', 'COOLDOWN', 'REST', 'OTHER'] as const
export type StepRole = (typeof STEP_ROLES)[number]

export const DURATION_TYPES = ['TIME', 'DISTANCE', 'OPEN'] as const
export type DurationType = (typeof DURATION_TYPES)[number]

export const TARGET_TYPES = [
  'HR_ZONE',
  'HR_PERCENT',
  'PACE_ZONE',
  'PACE_PERCENT',
  'POWER_ZONE',
  'POWER_PERCENT',
  'RPE',
  'FREE',
] as const
export type TargetType = (typeof TARGET_TYPES)[number]

export const ZONE_TYPES = ['HR', 'PACE', 'POWER'] as const
export type ZoneType = (typeof ZONE_TYPES)[number]

export const ABSOLUTE_UNITS = ['bpm', 'w', 's_per_km', 's_per_100m'] as const
export type AbsoluteUnit = (typeof ABSOLUTE_UNITS)[number]

export type UserRole = 'COACH' | 'ATHLETE'
export type Sex = 'M' | 'F' | 'OTHER'
export type PlannedStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED'

/** Origem dos treinos na listagem (v5): biblioteca, individuais ou ambos. */
export const WORKOUT_SCOPES = ['all', 'library', 'individual'] as const
export type WorkoutScope = (typeof WORKOUT_SCOPES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  athleteId?: string | null
  /** Falso ate' o usuario clicar no link de confirmacao enviado por e-mail. */
  emailVerified?: boolean
}

export interface AuthResponse {
  /** O token nao vem no corpo: a sessao viaja num cookie HttpOnly. */
  user: User
}

/** Conexao com um servico externo (ex.: Intervals.icu). */
export interface IntegrationConnection {
  id: string
  provider: string
  providerLabel: string
  externalAthleteId?: string | null
  externalAthleteName?: string | null
  active: boolean
  lastSyncAt?: string | null
  status: 'CONNECTED' | 'DISCONNECTED' | string
}

/** Resultado do envio de um treino planejado para o canal externo. */
export interface DeliveryResult {
  externalId: string
  deliveredAt: string
  /** Texto do treino no formato do Intervals.icu — util para conferir a traducao. */
  text: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface Threshold {
  sport: Sport
  maxHr: number | null
  restingHr: number | null
  lthr: number | null
  ftpWatts: number | null
  thresholdPaceSecPerKm: number | null
  cssSecPer100m: number | null
  updatedAt?: string | null
}

export interface AthleteSummary {
  id: string
  displayName: string
  email: string
  sex: Sex
  birthDate: string | null
  sports: Sport[]
  goal?: string | null
  eventDate?: string | null
  weeklyHoursAvailable?: number | null
  thresholdSummary?: unknown
}

export interface AthleteDetail extends AthleteSummary {
  heightCm: number | null
  weightKg: number | null
  notes: string | null
  coachId?: string | null
  thresholds?: Threshold[]
}

export interface AthleteCreateInput {
  displayName: string
  email: string
  password: string
  birthDate: string | null
  sex: Sex
  heightCm: number | null
  weightKg: number | null
  notes: string | null
  goal?: string | null
  eventDate?: string | null
  weeklyHoursAvailable?: number | null
}

export interface AthleteUpdateInput {
  displayName: string
  birthDate: string | null
  sex: Sex
  heightCm: number | null
  weightKg: number | null
  notes: string | null
  goal?: string | null
  eventDate?: string | null
  weeklyHoursAvailable?: number | null
}

export interface Zone {
  id?: string
  sport: Sport
  type: ZoneType
  zoneNumber: number
  name: string
  minValue: number | null
  maxValue: number | null
  unit: string
}

export interface ZoneInput {
  zoneNumber: number
  name: string
  minValue: number | null
  maxValue: number | null
  unit: string
}

export interface Target {
  type: TargetType
  zone?: number | null
  minValue?: number | null
  maxValue?: number | null
  display?: string | null
  absoluteMin?: number | null
  absoluteMax?: number | null
  absoluteUnit?: string | null
}

export interface WorkoutStep {
  id?: string
  position: number
  role: StepRole
  durationType: DurationType
  durationSec: number | null
  distanceM: number | null
  notes: string | null
  target: Target
}

export interface WorkoutBlock {
  id?: string
  position: number
  repeatCount: number
  title: string | null
  notes: string | null
  steps: WorkoutStep[]
}

export interface WorkoutSummary {
  id: string
  name: string
  sport: Sport
  type: WorkoutType
  difficulty: number
  tags: string[]
  estimatedDurationSec: number
  /** Estresse estimado do treino (v3). */
  estimatedTss?: number | null
  /** Distância estimada em metros (v3). */
  estimatedDistanceM?: number | null
  stepCount: number
  updatedAt?: string
  /** Atleta dono do treino individual (v5); nulo para treinos de biblioteca. */
  athleteId?: string | null
  /** Nome do atleta dono do treino individual (v5), quando aplicável. */
  athleteName?: string | null
}

export interface Workout extends WorkoutSummary {
  description: string | null
  blocks: WorkoutBlock[]
}

export interface WorkoutTargetPayload {
  type: TargetType
  zone: number | null
  minValue: number | null
  maxValue: number | null
  display: string | null
  absoluteMin: number | null
  absoluteMax: number | null
  absoluteUnit: string | null
}

export interface WorkoutStepPayload {
  role: StepRole
  durationType: DurationType
  durationSec: number | null
  distanceM: number | null
  notes: string | null
  target: WorkoutTargetPayload
}

export interface WorkoutBlockPayload {
  repeatCount: number
  title: string | null
  notes: string | null
  steps: WorkoutStepPayload[]
}

export interface WorkoutMetaInput {
  name: string
  sport: Sport
  type: WorkoutType
  description: string | null
  tags: string[]
  difficulty: number
}

export interface WorkoutPayload extends WorkoutMetaInput {
  blocks: WorkoutBlockPayload[]
}

/**
 * Corpo do POST /api/workouts na v5: além da estrutura completa, aceita o
 * `athleteId` que transforma o treino em individual (nulo = biblioteca).
 */
export interface WorkoutCreateInput extends WorkoutPayload {
  athleteId?: string | null
}

/** Corpo do POST /api/workouts/assign (SPEC 11.1.4). */
export interface AssignWorkoutInput {
  athleteId: string
  scheduledDate: string
  workout: WorkoutPayload
}

/** Resposta do POST /api/workouts/assign. */
export interface AssignWorkoutResponse {
  workoutId: string
  plannedId: string
  estimatedTss: number
  estimatedDurationSec: number
}

export interface WorkoutFilters {
  sport?: Sport
  q?: string
  tag?: string
  athleteId?: string
  scope?: WorkoutScope
}

export interface PreviewTarget {
  type: TargetType
  zone?: number | null
  unit?: string | null
  min?: number | null
  max?: number | null
  display?: string | null
  zoneName?: string | null
}

export interface PreviewStep {
  role: StepRole
  durationType: DurationType
  durationSec: number | null
  distanceM: number | null
  target: PreviewTarget
}

export interface PreviewBlock {
  repeatCount: number
  title: string | null
  steps: PreviewStep[]
}

export interface WorkoutPreview {
  workoutId: string
  athleteId: string
  sport: Sport
  athleteName: string
  totals: {
    durationSec: number
    distanceM: number
    zoneDistribution: Record<string, Record<string, number>>
  }
  blocks: PreviewBlock[]
}

export interface PlannedWorkout {
  id: string
  athleteId: string
  workoutId: string
  scheduledDate: string
  status: PlannedStatus
  notes?: string | null
  athleteName?: string | null
  workout?: WorkoutSummary | null
  /** Atividade importada vinculada à sessão (v6), quando o backend já envia. */
  activityId?: string | null
}

export interface PlannedCreateInput {
  athleteId: string
  workoutId: string
  scheduledDate: string
}

export interface PlannedPatchInput {
  scheduledDate?: string
  status?: PlannedStatus
}

/** Treino resumido como o calendário mensal o devolve (v3). */
export interface CalendarWorkout {
  id: string
  name: string
  sport: Sport
  type: WorkoutType
  description: string | null
  estimatedDurationSec: number
  estimatedTss: number
  estimatedDistanceM: number
}

/** Métricas de recuperação do dia exibidas na célula do calendário (subconjunto). */
export interface CalendarMetric {
  sleepHours: number | null
  hrv: number | null
  restingHr: number | null
  bodyBatteryLow: number | null
  bodyBatteryHigh: number | null
  stressLevel: number | null
  mood: number | null
  rpe: number | null
}

export interface CalendarSession {
  id: string
  scheduledDate: string
  status: PlannedStatus
  workout: CalendarWorkout | null
  /** Atividade importada vinculada à sessão (v6), quando o backend já envia. */
  activityId?: string | null
}

export interface CalendarDay {
  date: string
  metrics: CalendarMetric | null
  sessions: CalendarSession[]
}

export interface CalendarWeek {
  weekStart: string
  plannedMinutes: number
  plannedTss: number
  plannedSessions: number
  ctl: number
  atl: number
  tsb: number
}

/** Resposta de GET /api/calendar (v3). */
export interface CalendarData {
  athleteId: string
  from: string
  to: string
  days: CalendarDay[]
  weeks: CalendarWeek[]
}

export interface CalendarFilters {
  athleteId: string
  from: string
  to: string
}

/** Registro diário de saúde/recuperação do atleta (v2). */
export interface DailyMetric {
  id: string
  athleteId: string
  date: string
  sleepHours: number | null
  deepSleepHours: number | null
  remSleepHours: number | null
  lightSleepHours: number | null
  awakeHours: number | null
  hrv: number | null
  restingHr: number | null
  bodyBatteryLow: number | null
  bodyBatteryHigh: number | null
  stressLevel: number | null
  mood: number | null
  rpe: number | null
  weightKg: number | null
  notes: string | null
}

export type DailyMetricInput = Omit<DailyMetric, 'id' | 'athleteId'>

export interface MetricFilters {
  from?: string
  to?: string
}

export interface OverviewUpcoming {
  id: string
  scheduledDate: string
  status: PlannedStatus
  workout: {
    id: string
    name: string
    sport: Sport
    type: WorkoutType
    estimatedDurationSec: number
  } | null
  activityId?: string | null
}

export interface AthleteWeeklyLoad {
  plannedMinutes: number
  plannedSessions: number
}

/** Ficha 360 do atleta (GET /api/athletes/{id}/overview). */
export interface AthleteOverview {
  athlete: AthleteDetail
  thresholds: Threshold[]
  zones: Zone[]
  upcoming: OverviewUpcoming[]
  weeklyLoad: AthleteWeeklyLoad
  latestMetric: DailyMetric | null
  last7Metrics: DailyMetric[]
}

export interface DashboardRosterEntry {
  athleteId: string
  displayName: string
  sports: Sport[]
  plannedMinutes7d: number
  nextSessionDate: string | null
  nextWorkoutName: string | null
  latestMetric: DailyMetric | null
}

/** Painel do treinador (GET /api/dashboard). */
export interface DashboardData {
  athleteCount: number
  workoutCount: number
  plannedSessions7d: number
  plannedMinutes7d: number
  roster: DashboardRosterEntry[]
}

/* ------------------------------------------------------------------------- */
/* v6 — atividades executadas, importação e análise                          */
/* ------------------------------------------------------------------------- */

export const ACTIVITY_SOURCES = ['MANUAL', 'TCX', 'GPX', 'FIT'] as const
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number]

export const ACTIVITY_COMPLIANCES = ['CONFORME', 'PARCIAL', 'NAO_PLANEJADO'] as const
export type ActivityCompliance = (typeof ACTIVITY_COMPLIANCES)[number]

/** Resumo de atividade devolvido por GET /api/activities. */
export interface ActivitySummary {
  id: string
  athleteId: string
  athleteName?: string | null
  plannedWorkoutId?: string | null
  name: string
  sport: Sport
  startTime: string
  durationSec: number
  movingTimeSec?: number | null
  /** Tempo parado, quando o backend calcular explicitamente. */
  stoppedTimeSec?: number | null
  distanceM: number | null
  avgHr?: number | null
  maxHr?: number | null
  minHr?: number | null
  avgPower?: number | null
  maxPower?: number | null
  normalizedPower?: number | null
  avgPaceSecPerKm?: number | null
  maxPaceSecPerKm?: number | null
  minPaceSecPerKm?: number | null
  ngpSecPerKm?: number | null
  elevationGainM?: number | null
  elevationLossM?: number | null
  maxAltitudeM?: number | null
  avgAltitudeM?: number | null
  minAltitudeM?: number | null
  avgCadence?: number | null
  maxCadence?: number | null
  minCadence?: number | null
  calories?: number | null
  tss?: number | null
  /** Tipo de TSS do esporte (rTSS, sTSS, TSS…). */
  tssType?: string | null
  intensityFactor?: number | null
  /** Índice de variabilidade (NP/AP). */
  variabilityIndex?: number | null
  /** Fator de eficiência. */
  efficiencyFactor?: number | null
  /** Potência relativa (W/kg). */
  wattsPerKg?: number | null
  /** Contagem de voltas por origem na análise. */
  deviceLaps?: number | null
  userLaps?: number | null
  climbLaps?: number | null
  intervalLaps?: number | null
  /** Desacoplamento potência × FC (%). */
  pwHr?: number | null
  /** Desacoplamento pace × FC (%). */
  paHr?: number | null
  source: ActivitySource
  fileName?: string | null
  notes?: string | null
  createdAt?: string | null
}

/** Amostra de uma atividade (GET /api/activities/{id}). */
export interface ActivitySample {
  offsetSec: number
  distanceM?: number | null
  hr?: number | null
  speedMps?: number | null
  power?: number | null
  cadence?: number | null
  elevationM?: number | null
  lat?: number | null
  lon?: number | null
}

/** Volta da atividade (GET /api/activities/{id} e /analysis). */
export interface ActivityLap {
  lapIndex: number
  durationSec: number
  distanceM: number | null
  avgHr?: number | null
  maxHr?: number | null
  avgPower?: number | null
  paceSecPerKm?: number | null
}

/** Atividade completa com amostras e voltas. */
export interface ActivityDetail extends ActivitySummary {
  samples?: ActivitySample[]
  laps?: ActivityLap[]
}

/** Ponto da série temporal da análise (≤ 400 pontos). */
export interface ActivitySeriesPoint {
  tSec: number
  hr?: number | null
  paceSecPerKm?: number | null
  power?: number | null
  cadence?: number | null
  elevationM?: number | null
  distanceM?: number | null
}

export interface ActivityZone {
  type: ZoneType
  zoneNumber: number
  seconds: number
  pct: number
}

export interface ActivitySplit {
  km: number
  durationSec: number
  paceSecPerKm?: number | null
  avgHr?: number | null
  elevationM?: number | null
  avgPower?: number | null
}

/** Treino planejado vinculado à atividade, quando existir. */
export interface ActivityPlanned {
  workoutName: string
  blocks?: unknown[]
  estimatedTss?: number | null
  plannedDurationSec?: number | null
}

export interface ActivityComparison {
  durationDeltaSec?: number | null
  distanceDeltaM?: number | null
  tssDelta?: number | null
  ifActual?: number | null
  compliance: ActivityCompliance
}

/** Resposta de GET /api/activities/{id}/analysis. */
export interface ActivityAnalysis {
  activity: ActivitySummary
  series: ActivitySeriesPoint[]
  zones: ActivityZone[]
  laps: ActivityLap[]
  splits: ActivitySplit[]
  planned: ActivityPlanned | null
  comparison?: ActivityComparison | null
}

export interface ActivityFilters {
  athleteId?: string
  from?: string
  to?: string
}

export interface ApiErrorBody {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  path?: string
}
