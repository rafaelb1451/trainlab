/** Modelos de card oferecidos na galeria de compartilhamento. */
export type ShareLayoutId = 'complete' | 'bigNumbers' | 'list' | 'minimalDate'

export interface ShareLayout {
  id: ShareLayoutId
  label: string
  description: string
}

export const SHARE_LAYOUTS: ShareLayout[] = [
  {
    id: 'complete',
    label: 'Completo',
    description: 'Estatísticas com mini-gráfico do treino',
  },
  {
    id: 'bigNumbers',
    label: 'Números grandes',
    description: 'Distância, ritmo e tempo empilhados',
  },
  {
    id: 'list',
    label: 'Lista',
    description: 'Rótulo e valor em linhas',
  },
  {
    id: 'minimalDate',
    label: 'Data minimalista',
    description: 'Data em destaque com ícone do esporte',
  },
]

export const DEFAULT_SHARE_LAYOUT: ShareLayoutId = 'complete'
