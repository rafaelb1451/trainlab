import type { Sport } from '../../api/types'

/**
 * Barra lateral e pontos de legenda por esporte.
 *
 * Cores da paleta: pedal em azul (a modalidade principal do app), corrida em amarelo,
 * natação no azul claro. Mantém os tres esportes distinguiveis sem sair do azul/amarelo.
 */
export const SPORT_BAR: Record<Sport, string> = {
  RUN: 'bg-accent-500',
  BIKE: 'bg-brand-600',
  SWIM: 'bg-brand-400',
}

export const SPORT_DOT: Record<Sport, string> = {
  RUN: 'bg-accent-500',
  BIKE: 'bg-brand-600',
  SWIM: 'bg-brand-400',
}
