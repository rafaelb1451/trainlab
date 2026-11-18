/**
 * Gradiente das zonas: brand-200 (Z1) → accent-500 (zona máxima).
 * Usa paradas intermediárias para evitar o cinza que a interpolação direta
 * entre azul-claro e amarelo produz, mantendo a leitura azul → amarelo.
 */
const FIVE_ZONES = ['#bfdbfe', '#93c5fd', '#60a5fa', '#fcd34d', '#f59e0b'] // brand-200 → accent-500
const SEVEN_ZONES = [
  '#bfdbfe', // brand-200
  '#93c5fd', // brand-300
  '#60a5fa', // brand-400
  '#3b82f6', // brand-500
  '#fde68a', // accent-200
  '#fbbf24', // accent-400
  '#f59e0b', // accent-500
]

export function zoneColor(zoneNumber: number, maxZone = 7): string {
  const max = Math.max(1, Math.round(maxZone))
  const zone = Math.min(max, Math.max(1, Math.round(zoneNumber)))
  const palette = max >= 7 ? SEVEN_ZONES : FIVE_ZONES
  const index =
    palette.length === 1 ? 0 : Math.round(((zone - 1) / (max - 1)) * (palette.length - 1))
  return palette[Math.min(palette.length - 1, Math.max(0, index))]
}
