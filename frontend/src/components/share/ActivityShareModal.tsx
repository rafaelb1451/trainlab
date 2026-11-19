import { useQuery } from '@tanstack/react-query'
import { Check, Download, Share2, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { activitiesApi } from '../../api/endpoints'
import type { ActivitySummary } from '../../api/types'
import { useAuth } from '../../auth/AuthProvider'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { ActivityShareCard } from './ActivityShareCard'
import { barsFromAnalysis } from './cardBars'
import { buildCardData } from './cardData'
import { CARD_HEIGHT, CARD_WIDTH, TRANSPARENCY_BACKGROUND } from './cardTheme'
import { cardFileName, downloadCardImage, renderCardPng, shareCardImage } from './exportCardImage'
import { DEFAULT_SHARE_LAYOUT, SHARE_LAYOUTS, type ShareLayoutId } from './shareLayouts'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface CardFrameProps {
  captureRef?: Ref<HTMLDivElement>
  children: ReactNode
  className?: string
}

/**
 * Mostra o card de 1080 x 1920 reduzido por `transform: scale()`.
 * O nó capturado pelo html-to-image continua no tamanho real.
 */
function CardFrame({ captureRef, children, className }: CardFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const update = () => {
      const width = frame.clientWidth
      if (width > 0) setScale(width / CARD_WIDTH)
    }
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={frameRef}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: '9 / 16' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          ref={captureRef}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT, background: 'transparent' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

interface ShareFeedback {
  tone: 'success' | 'info' | 'error'
  message: string
}

export interface ActivityShareModalProps {
  open: boolean
  activity: ActivitySummary | null
  onClose: () => void
}

/**
 * Galeria de modelos do card de atividade.
 *
 * Acessibilidade: diálogo modal com título/descrição, foco inicial no painel,
 * Tab preso dentro do modal, Esc fecha e foco devolvido ao gatilho ao fechar.
 */
export function ActivityShareModal({ open, activity, onClose }: ActivityShareModalProps) {
  const { user } = useAuth()
  const titleId = useId()
  const descriptionId = useId()
  const layoutGroupId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const captureRef = useRef<HTMLDivElement>(null)
  const layoutButtonsRef = useRef<Array<HTMLButtonElement | null>>([])
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const [layout, setLayout] = useState<ShareLayoutId>(DEFAULT_SHARE_LAYOUT)
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)
  const [feedback, setFeedback] = useState<ShareFeedback | null>(null)
  const busyRef = useRef(false)

  // Reaproveita a análise já carregada pela tela de análise e, quando o card é
  // aberto direto da lista, busca as amostras para desenhar o mini-gráfico.
  const analysisQuery = useQuery({
    queryKey: ['activity-analysis', activity?.id ?? ''],
    queryFn: () => activitiesApi.analysis(activity?.id ?? ''),
    enabled: open && Boolean(activity?.id),
    retry: false,
    staleTime: 60_000,
  })

  const bars = useMemo(() => barsFromAnalysis(analysisQuery.data), [analysisQuery.data])
  const athleteName = activity?.athleteName?.trim() || user?.name || 'Atleta'
  const data = useMemo(
    () => (activity ? buildCardData(activity, athleteName, bars) : null),
    [activity, athleteName, bars],
  )
  const selectedLayout = SHARE_LAYOUTS.find((item) => item.id === layout) ?? SHARE_LAYOUTS[0]

  useEffect(() => {
    if (!open) return
    setLayout(DEFAULT_SHARE_LAYOUT)
    setFeedback(null)
  }, [open, activity?.id])

  // Foco preso no diálogo, Esc e bloqueio do scroll da página.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const dialog: HTMLDivElement = panel

    const previousActive =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getAttribute('aria-hidden') !== 'true',
      )

    const timer = window.setTimeout(() => {
      dialog.focus()
    }, 0)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = focusableElements()
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && dialog.contains(active)

      if (event.shiftKey) {
        if (!inside || active === first || active === dialog) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      if (previousActive && previousActive.isConnected) previousActive.focus()
    }
  }, [open])

  function handleLayoutKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const total = SHARE_LAYOUTS.length
    let nextIndex: number | null = null
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % total
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = total - 1
    if (nextIndex === null) return
    event.preventDefault()
    setLayout(SHARE_LAYOUTS[nextIndex].id)
    layoutButtonsRef.current[nextIndex]?.focus()
  }

  async function handleExport(mode: 'download' | 'share') {
    if (busyRef.current) return
    const node = captureRef.current
    if (!node || !data || !activity) {
      setFeedback({ tone: 'error', message: 'Não foi possível identificar o card para exportar.' })
      return
    }
    busyRef.current = true
    setBusy(mode)
    setFeedback(null)
    try {
      const blob = await renderCardPng(node)
      const fileName = cardFileName(layout, activity.startTime)
      if (mode === 'download') {
        downloadCardImage(blob, fileName)
        setFeedback({
          tone: 'success',
          message: 'Imagem baixada: PNG 1080 x 1920 com fundo transparente.',
        })
      } else {
        const result = await shareCardImage(blob, fileName, data.activityName)
        if (result === 'shared') {
          setFeedback({ tone: 'success', message: 'Card pronto para publicar no seu story.' })
        } else if (result === 'downloaded') {
          setFeedback({
            tone: 'info',
            message:
              'Este navegador não compartilha arquivos direto. A imagem foi baixada no seu dispositivo.',
          })
        } else {
          setFeedback({ tone: 'info', message: 'Compartilhamento cancelado.' })
        }
      }
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Não foi possível gerar a imagem. Tente novamente.',
      })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  if (!open || !activity || !data) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-900/60 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={() => onCloseRef.current()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-testid="activity-share-modal"
        className="animate-in relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-ink-100 bg-white shadow-pop outline-none sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-700">
              Card de atividade
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-bold text-ink-900">
              Compartilhar atividade
            </h2>
            <p id={descriptionId} className="mt-1 max-w-2xl text-sm text-ink-500">
              Escolha um modelo e baixe a imagem 9:16 com fundo transparente para colar no story.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Fechar galeria de modelos"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto">
          <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,290px)_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[290px] lg:mx-0">
              <div
                aria-hidden="true"
                className="overflow-hidden rounded-2xl border border-ink-100 shadow-card"
                style={TRANSPARENCY_BACKGROUND}
              >
                <CardFrame captureRef={captureRef}>
                  <ActivityShareCard layout={layout} data={data} />
                </CardFrame>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
                <span className="inline-flex items-center rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600">
                  PNG 1080 x 1920
                </span>
                <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                  Fundo transparente
                </span>
                <span className="text-[10px] text-ink-500">{selectedLayout.label}</span>
              </div>
            </div>

            <div className="min-w-0">
              <p
                id={layoutGroupId}
                className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500"
              >
                Modelo do card
              </p>
              <div role="radiogroup" aria-labelledby={layoutGroupId} className="mt-2 space-y-2">
                {SHARE_LAYOUTS.map((item, index) => {
                  const isSelected = item.id === layout
                  return (
                    <button
                      key={item.id}
                      ref={(element) => {
                        layoutButtonsRef.current[index] = element
                      }}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`Modelo ${item.label}: ${item.description}`}
                      tabIndex={isSelected ? 0 : -1}
                      data-testid={`share-layout-${item.id}`}
                      onClick={() => setLayout(item.id)}
                      onKeyDown={(event) => handleLayoutKeyDown(event, index)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border-2 p-2.5 text-left transition',
                        isSelected
                          ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-200'
                          : 'border-ink-100 bg-white hover:border-brand-300 hover:bg-ink-50',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="block w-16 shrink-0 overflow-hidden rounded-lg border border-ink-100"
                        style={TRANSPARENCY_BACKGROUND}
                      >
                        <CardFrame>
                          <ActivityShareCard layout={item.id} data={data} />
                        </CardFrame>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-bold text-ink-900">{item.label}</span>
                          {isSelected ? (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                              <Check className="h-3 w-3" aria-hidden="true" />
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-ink-500">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-ink-600">
                A prévia é reduzida; a imagem final sai em 1080 x 1920 com o fundo transparente, pronta
                para colar sobre a sua foto no story.
              </p>

              {feedback ? (
                <p
                  role={feedback.tone === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                  className={cn(
                    'mt-3 rounded-xl border px-3 py-2 text-xs font-medium',
                    feedback.tone === 'success'
                      ? 'border-brand-200 bg-brand-50 text-brand-800'
                      : feedback.tone === 'error'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-ink-200 bg-ink-50 text-ink-700',
                  )}
                >
                  {feedback.message}
                </p>
              ) : null}

              <p className="sr-only">
                Prévia do card selecionado: {selectedLayout.label}. Distância{' '}
                {data.distance.value} {data.distance.unit}, {data.pace.label.toLowerCase()}{' '}
                {data.pace.value} {data.pace.unit}, tempo {data.duration.value}, frequência cardíaca
                média {data.hr.value} {data.hr.unit}, elevação {data.elevation.value}{' '}
                {data.elevation.unit}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-ink-50/70 px-5 py-4 sm:px-6">
          <p className="text-[11px] text-ink-500">
            {busy ? 'Gerando imagem...' : 'A imagem preserva a transparência do fundo.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => onCloseRef.current()}>
              Fechar
            </Button>
            <Button
              variant="secondary"
              onClick={() => void handleExport('share')}
              loading={busy === 'share'}
              disabled={busy !== null}
              aria-label="Compartilhar card da atividade"
              data-testid="share-card-action"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartilhar
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleExport('download')}
              loading={busy === 'download'}
              disabled={busy !== null}
              aria-label="Baixar card em PNG"
              data-testid="download-card-action"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar PNG
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
