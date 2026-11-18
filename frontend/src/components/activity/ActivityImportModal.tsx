import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { FileText, UploadCloud, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { getApiErrorMessage } from '../../api/client'
import { activitiesApi } from '../../api/endpoints'
import type { ActivitySummary } from '../../api/types'
import { formatDecimal } from '../../lib/format'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const MAX_FILE_BYTES = 25 * 1024 * 1024

function fileExtension(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : ''
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${formatDecimal(bytes / (1024 * 1024), 1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function importErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 404) {
      return 'A importação de atividades ainda não está disponível no servidor. Tente novamente em instantes.'
    }
    if (status === 415) {
      return 'Formato não suportado pelo servidor. Envie um arquivo .tcx ou .gpx (ou converta o FIT).'
    }
    if (status === 413) {
      return 'O arquivo é grande demais para o servidor. Envie um TCX/GPX de até 25 MB.'
    }
    if (status === 400) {
      return getApiErrorMessage(
        error,
        'Não foi possível ler o arquivo. Verifique se o TCX/GPX é válido e tente novamente.',
      )
    }
  }
  return getApiErrorMessage(
    error,
    'Não foi possível importar a atividade. Verifique o arquivo e tente novamente.',
  )
}

interface ActivityImportModalProps {
  open: boolean
  athleteId: string
  athleteName: string
  onClose: () => void
  onImported: (activity: ActivitySummary) => void
}

/** Modal de importação de TCX/GPX com drag & drop e progresso de upload. */
export function ActivityImportModal({
  open,
  athleteId,
  athleteName,
  onClose,
  onImported,
}: ActivityImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const mutation = useMutation({
    mutationFn: (selected: File) =>
      activitiesApi.import(athleteId, selected, (percent) => setProgress(percent)),
    onSuccess: (activity) => {
      setProgress(null)
      setFile(null)
      onImported(activity)
      onClose()
    },
    onError: (importError) => {
      setProgress(null)
      setError(importErrorMessage(importError))
    },
  })

  useEffect(() => {
    if (!open) return
    setFile(null)
    setError(null)
    setProgress(null)
    setDragging(false)
    mutation.reset()
    // Recriar o formulário a cada abertura; a mutation é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, athleteId])

  function selectFile(candidate: File | null | undefined) {
    if (!candidate) return
    setError(null)
    mutation.reset()
    setProgress(null)
    const extension = fileExtension(candidate.name)
    if (extension !== 'tcx' && extension !== 'gpx') {
      setFile(null)
      setError('Formato não suportado. Selecione um arquivo .tcx ou .gpx.')
      return
    }
    if (candidate.size > MAX_FILE_BYTES) {
      setFile(null)
      setError('O arquivo passa de 25 MB. Envie um TCX/GPX menor.')
      return
    }
    setFile(candidate)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (mutation.isPending) return
    selectFile(event.dataTransfer.files?.[0])
  }

  const pending = mutation.isPending

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!pending) onClose()
      }}
      title="Importar atividade"
      description={`${athleteName} · arquivos .tcx ou .gpx`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (file) mutation.mutate(file)
            }}
            loading={pending}
            disabled={!file}
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Importar atividade
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          data-testid="activity-import-dropzone"
          onDragOver={(event) => {
            event.preventDefault()
            if (!pending) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'rounded-2xl border-2 border-dashed px-5 py-7 text-center transition',
            dragging
              ? 'border-brand-400 bg-brand-50'
              : 'border-ink-200 bg-ink-50/60',
            pending && 'opacity-70',
          )}
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm">
            <UploadCloud className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink-900">
            Arraste o arquivo para cá
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Aceita TCX e GPX exportados do relógio ou da plataforma de treino.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Selecionar arquivo
          </Button>
          <input
            ref={inputRef}
            data-testid="activity-import-file"
            type="file"
            accept=".tcx,.gpx"
            className="sr-only"
            disabled={pending}
            onChange={(event) => {
              selectFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>

        {file ? (
          <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3.5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">{file.name}</p>
              <p className="text-[11px] text-ink-500">
                {formatFileSize(file.size)} · {fileExtension(file.name).toUpperCase()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null)
                setError(null)
                mutation.reset()
                setProgress(null)
              }}
              disabled={pending}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800 disabled:opacity-50"
              aria-label="Remover arquivo selecionado"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {pending ? (
          <div role="status" className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-ink-600">
              <span>
                {progress === 100 ? 'Processando atividade…' : 'Enviando arquivo…'}
              </span>
              {progress !== null ? <span className="tabular-nums">{progress}%</span> : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
                style={{
                  width: progress === null ? '35%' : `${Math.max(4, progress)}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}

        <div className="rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
          O servidor extrai amostras, voltas, zonas e compara com o treino planejado do dia. A
          atividade importada aparece na aba <strong>Atividades</strong> e em{' '}
          <strong>Análises</strong>.
        </div>
      </div>
    </Modal>
  )
}
