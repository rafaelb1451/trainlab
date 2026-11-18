import type {
  DurationType,
  PlannedStatus,
  Sex,
  Sport,
  StepRole,
  TargetType,
  WorkoutType,
  ZoneType,
} from '../api/types'

export const SPORT_LABELS: Record<Sport, string> = {
  RUN: 'Corrida',
  BIKE: 'Ciclismo',
  SWIM: 'Natação',
}

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  ENDURANCE: 'Endurance',
  TEMPO: 'Tempo',
  INTERVAL: 'Intervalado',
  RECOVERY: 'Recuperação',
  RACE: 'Prova',
  SKILL: 'Técnica',
  OTHER: 'Outro',
}

export const ROLE_LABELS: Record<StepRole, string> = {
  WARMUP: 'Aquecimento',
  ACTIVE: 'Ativo',
  RECOVERY: 'Recuperação',
  COOLDOWN: 'Esfriamento',
  REST: 'Descanso',
  OTHER: 'Outro',
}

export const DURATION_TYPE_LABELS: Record<DurationType, string> = {
  TIME: 'Tempo',
  DISTANCE: 'Distância',
  OPEN: 'Aberta',
}

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  HR_ZONE: 'FC por zona',
  HR_PERCENT: 'FC por % do LTHR',
  PACE_ZONE: 'Pace por zona',
  PACE_PERCENT: 'Pace por % do limiar',
  POWER_ZONE: 'Potência por zona',
  POWER_PERCENT: 'Potência por % do FTP',
  RPE: 'RPE (esforço percebido)',
  FREE: 'Livre',
}

export const SEX_LABELS: Record<Sex, string> = {
  M: 'Masculino',
  F: 'Feminino',
  OTHER: 'Outro',
}

export const PLANNED_STATUS_LABELS: Record<PlannedStatus, string> = {
  PLANNED: 'Planejado',
  COMPLETED: 'Concluído',
  SKIPPED: 'Pulado',
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Muito fácil',
  2: 'Fácil',
  3: 'Moderado',
  4: 'Difícil',
  5: 'Muito difícil',
}

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  HR: 'Frequência cardíaca',
  PACE: 'Pace',
  POWER: 'Potência',
}

export function targetTypesForSport(sport: Sport): TargetType[] {
  switch (sport) {
    case 'RUN':
      return ['HR_ZONE', 'PACE_ZONE', 'HR_PERCENT', 'PACE_PERCENT', 'RPE', 'FREE']
    case 'BIKE':
      return ['HR_ZONE', 'POWER_ZONE', 'HR_PERCENT', 'POWER_PERCENT', 'RPE', 'FREE']
    case 'SWIM':
      return ['HR_ZONE', 'PACE_ZONE', 'HR_PERCENT', 'PACE_PERCENT', 'RPE', 'FREE']
  }
}

export function zoneTypeForTarget(type: TargetType): ZoneType | null {
  if (type === 'HR_ZONE' || type === 'HR_PERCENT') return 'HR'
  if (type === 'PACE_ZONE' || type === 'PACE_PERCENT') return 'PACE'
  if (type === 'POWER_ZONE' || type === 'POWER_PERCENT') return 'POWER'
  return null
}

export function maxZoneForTarget(type: TargetType): number {
  return type === 'POWER_ZONE' ? 7 : 5
}

export function targetTypeLabelForSport(type: TargetType, sport: Sport): string {
  if (type === 'PACE_PERCENT' && sport === 'SWIM') return 'Pace por % do CSS'
  return TARGET_TYPE_LABELS[type]
}
