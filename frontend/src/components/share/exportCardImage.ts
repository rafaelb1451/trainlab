import { toBlob } from 'html-to-image'
import { CARD_HEIGHT, CARD_WIDTH } from './cardTheme'
import type { ShareLayoutId } from './shareLayouts'

export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled'

function isoDatePart(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'atividade'
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function cardFileName(layout: ShareLayoutId, startTime: string): string {
  return `trainlab-card-${layout}-${isoDatePart(startTime)}.png`
}

/**
 * Gera o PNG do card em 1080 × 1920.
 *
 * Repare que `backgroundColor` é omitido de propósito: o canvas nasce
 * transparente e só o bloco de conteúdo é pintado, preservando o alfa zero
 * do restante da imagem. `pixelRatio: 1` evita exportar em 2x em telas
 * retina, mantendo as dimensões exatas do story.
 */
export async function renderCardPng(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    canvasWidth: CARD_WIDTH,
    canvasHeight: CARD_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    // O card usa apenas fontes de sistema: não é preciso embutir CSS no SVG,
    // o que deixa a exportação mais rápida e imune a folhas de estilo externas.
    skipFonts: true,
  })
  if (!blob) throw new Error('Não foi possível gerar a imagem do card.')
  return blob
}

export function downloadCardImage(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Tenta o compartilhamento nativo de arquivos (Web Share API). Quando o
 * navegador não suporta, cai no download do PNG — o fluxo nunca deixa o
 * atleta sem a imagem.
 */
export async function shareCardImage(
  blob: Blob,
  fileName: string,
  title: string,
): Promise<ShareImageResult> {
  const file = new File([blob], fileName, { type: 'image/png' })
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })

  if (!canShareFiles) {
    downloadCardImage(blob, fileName)
    return 'downloaded'
  }

  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    downloadCardImage(blob, fileName)
    return 'downloaded'
  }
}
