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

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  athleteId?: string | null
}

export interface AuthResponse {
  token: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  role: UserRole
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
  stepCount: number
  updatedAt?: string
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

export interface WorkoutFilters {
  sport?: Sport
  q?: string
  tag?: string
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
}

export interface PlannedCreateInput {
  athleteId: string
  workoutId: string
  scheduledDate: string
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

export interface ApiErrorBody {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  path?: string
}
