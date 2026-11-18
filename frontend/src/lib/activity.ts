import type { ActivitySummary, PlannedStatus, Sport } from '../api/types'

/** Sessão/planejamento com os campos necessários para achar a atividade. */
export interface SessionActivitySource {
  id: string
  scheduledDate: string
  status: PlannedStatus
  activityId?: string | null
  workout?: { sport: Sport } | null
}

function activityDay(activity: ActivitySummary): string {
  return activity.startTime.slice(0, 10)
}

/**
 * Resolve o vínculo entre uma sessão concluída e uma atividade.
 *
 * Ordem: campo `activityId` enviado pelo backend → `plannedWorkoutId` igual ao
 * id da sessão → mesma data + mesmo esporte → mesma data. Quando o backend
 * ainda não envia `activityId`, a lista de atividades do período funciona como
 * fallback; sem correspondência, a ação "Analisar treino" fica oculta.
 */
export function activityIdForSession(
  session: SessionActivitySource,
  activities: ActivitySummary[] | undefined,
): string | null {
  if (!session || session.status !== 'COMPLETED') return null
  if (session.activityId) return session.activityId

  const list = activities ?? []
  if (list.length === 0) return null

  const linked = list.find((activity) => activity.plannedWorkoutId === session.id)
  if (linked) return linked.id

  const day = session.scheduledDate.slice(0, 10)
  const sameDay = list.filter((activity) => activityDay(activity) === day)
  if (sameDay.length === 0) return null

  const sport = session.workout?.sport
  const match = sport ? sameDay.find((activity) => activity.sport === sport) : undefined
  return (match ?? sameDay[0]).id
}

/** Atividades mais recentes primeiro (por data de início). */
export function sortActivitiesDesc(activities: ActivitySummary[]): ActivitySummary[] {
  return [...activities].sort((a, b) => b.startTime.localeCompare(a.startTime))
}
