/**
 * Tokens visuais do card de compartilhamento.
 *
 * O card é desenhado em tamanho real (1080 × 1920 px) e só é reduzido por
 * `transform: scale()` nas prévias. Isso garante que a exportação saia
 * exatamente no formato de story, sem depender do zoom do navegador.
 */
export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1920

/** Pilha de fontes de sistema: não exige download e funciona no SVG gerado. */
export const CARD_FONT_FAMILY = [
  '"Segoe UI"',
  'system-ui',
  '-apple-system',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  '"Noto Sans"',
  'sans-serif',
].join(', ')

export const CARD_COLORS = {
  blue: '#2563eb',
  blueDark: '#1d4ed8',
  blueSoft: '#dbeafe',
  yellow: '#f5b301',
  yellowSoft: '#fef3c7',
  ink: '#0f172a',
  muted: '#475569',
  line: '#e2e8f0',
  white: '#ffffff',
  panel: 'rgba(255, 255, 255, 0.93)',
  panelSoft: 'rgba(255, 255, 255, 0.86)',
} as const

/** Xadrez que indica transparência atrás da prévia (não faz parte do card). */
export const TRANSPARENCY_BACKGROUND = {
  backgroundColor: '#f8fafc',
  backgroundImage:
    'repeating-conic-gradient(#e2e8f0 0% 25%, transparent 0% 50%)',
  backgroundSize: '22px 22px',
} as const
