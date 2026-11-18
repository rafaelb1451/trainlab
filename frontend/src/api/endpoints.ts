import { api } from './client'
import type {
  AthleteCreateInput,
  AthleteDetail,
  AthleteOverview,
  AthleteSummary,
  AthleteUpdateInput,
  AuthResponse,
  DailyMetric,
  DailyMetricInput,
  DashboardData,
  LoginInput,
  MetricFilters,
  PlannedCreateInput,
  PlannedWorkout,
  RegisterInput,
  Sport,
  Threshold,
  User,
  Workout,
  WorkoutFilters,
  WorkoutMetaInput,
  WorkoutPayload,
  WorkoutPreview,
  WorkoutSummary,
  Zone,
  ZoneInput,
  ZoneType,
} from './types'

async function getData<T>(promise: Promise<{ data: T }>): Promise<T> {
  const response = await promise
  return response.data
}

export const authApi = {
  login: (input: LoginInput): Promise<AuthResponse> =>
    getData(api.post<AuthResponse>('/auth/login', input)),

  register: (input: RegisterInput): Promise<AuthResponse> =>
    getData(api.post<AuthResponse>('/auth/register', input)),

  me: (): Promise<User> => getData(api.get<User>('/auth/me')),
}

export const athletesApi = {
  list: (): Promise<AthleteSummary[]> => getData(api.get<AthleteSummary[]>('/athletes')),

  get: (id: string): Promise<AthleteDetail> =>
    getData(api.get<AthleteDetail>(`/athletes/${id}`)),

  create: (input: AthleteCreateInput): Promise<AthleteDetail> =>
    getData(api.post<AthleteDetail>('/athletes', input)),

  update: (id: string, input: AthleteUpdateInput): Promise<AthleteDetail> =>
    getData(api.put<AthleteDetail>(`/athletes/${id}`, input)),

  remove: (id: string): Promise<void> => getData(api.delete<void>(`/athletes/${id}`)),

  getThresholds: (id: string): Promise<Threshold[]> =>
    getData(api.get<Threshold[]>(`/athletes/${id}/thresholds`)),

  putThreshold: (
    athleteId: string,
    sport: Sport,
    body: Omit<Threshold, 'updatedAt'>,
  ): Promise<Threshold> =>
    getData(api.put<Threshold>(`/athletes/${athleteId}/thresholds/${sport}`, body)),

  getZones: (id: string): Promise<Zone[]> => getData(api.get<Zone[]>(`/athletes/${id}/zones`)),

  putZones: (athleteId: string, sport: Sport, type: ZoneType, zones: ZoneInput[]): Promise<Zone[]> =>
    getData(api.put<Zone[]>(`/athletes/${athleteId}/zones/${sport}/${type}`, zones)),

  overview: (id: string): Promise<AthleteOverview> =>
    getData(api.get<AthleteOverview>(`/athletes/${id}/overview`)),

  metrics: (id: string, filters: MetricFilters = {}): Promise<DailyMetric[]> => {
    const params: Record<string, string> = {}
    if (filters.from) params['from'] = filters.from
    if (filters.to) params['to'] = filters.to
    return getData(api.get<DailyMetric[]>(`/athletes/${id}/metrics`, { params }))
  },

  createMetric: (id: string, input: DailyMetricInput): Promise<DailyMetric> =>
    getData(api.post<DailyMetric>(`/athletes/${id}/metrics`, input)),

  deleteMetric: (id: string, metricId: string): Promise<void> =>
    getData(api.delete<void>(`/athletes/${id}/metrics/${metricId}`)),
}

export const dashboardApi = {
  get: (): Promise<DashboardData> => getData(api.get<DashboardData>('/dashboard')),
}

function buildWorkoutParams(filters: WorkoutFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.sport) params['sport'] = filters.sport
  if (filters.q && filters.q.trim().length > 0) params['q'] = filters.q.trim()
  if (filters.tag && filters.tag.length > 0) params['tag'] = filters.tag
  return params
}

export const workoutsApi = {
  list: (filters: WorkoutFilters = {}): Promise<WorkoutSummary[]> =>
    getData(api.get<WorkoutSummary[]>('/workouts', { params: buildWorkoutParams(filters) })),

  tags: (): Promise<string[]> => getData(api.get<string[]>('/workouts/tags')),

  get: (id: string): Promise<Workout> => getData(api.get<Workout>(`/workouts/${id}`)),

  create: (input: WorkoutMetaInput): Promise<Workout> =>
    getData(api.post<Workout>('/workouts', input)),

  update: (id: string, input: WorkoutPayload): Promise<Workout> =>
    getData(api.put<Workout>(`/workouts/${id}`, input)),

  remove: (id: string): Promise<void> => getData(api.delete<void>(`/workouts/${id}`)),

  duplicate: (id: string): Promise<Workout> =>
    getData(api.post<Workout>(`/workouts/${id}/duplicate`)),

  preview: (id: string, athleteId: string): Promise<WorkoutPreview> =>
    getData(
      api.get<WorkoutPreview>(`/workouts/${id}/preview`, {
        params: { athleteId },
      }),
    ),
}

export interface PlannedFilters {
  athleteId?: string
  from?: string
  to?: string
}

export const plannedApi = {
  list: (filters: PlannedFilters = {}): Promise<PlannedWorkout[]> => {
    const params: Record<string, string> = {}
    if (filters.athleteId) params['athleteId'] = filters.athleteId
    if (filters.from) params['from'] = filters.from
    if (filters.to) params['to'] = filters.to
    return getData(api.get<PlannedWorkout[]>('/planned', { params }))
  },

  create: (input: PlannedCreateInput): Promise<PlannedWorkout> =>
    getData(api.post<PlannedWorkout>('/planned', input)),

  remove: (id: string): Promise<void> => getData(api.delete<void>(`/planned/${id}`)),
}
