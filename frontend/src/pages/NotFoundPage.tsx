import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Erro 404</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        O endereço acessado não existe ou foi movido. Volte para o dashboard para continuar.
      </p>
      <Link to="/" className="mt-6">
        <Button>Voltar ao dashboard</Button>
      </Link>
    </div>
  )
}
