import { Activity, CalendarDays, Target, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-900 p-10 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-400/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-400 text-ink-900">
            <Activity className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">TrainLab</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-300">
              Treinamento esportivo
            </p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
            Corrida · Ciclismo · Natação
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-white">
            Treine com intenção.
            <br />
            Acompanhe com clareza.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-200">
            Estruture treinos por blocos e steps, individualize zonas por atleta e planeje a semana
            inteira em um só lugar.
          </p>

          <ul className="mt-10 space-y-4 text-sm text-ink-300">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-accent-400">
                <Target className="h-4 w-4" aria-hidden="true" />
              </span>
              Zonas de FC, pace e potência calculadas por limiares
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-accent-400">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
              </span>
              Construtor visual com distribuição de zonas em tempo real
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-accent-400">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
              </span>
              Planejamento semanal e biblioteca de treinos reutilizáveis
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-ink-400">
          TrainLab © {new Date().getFullYear()} — plataforma de treinamento personalizado.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-900 text-accent-400">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-bold text-ink-900">TrainLab</p>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500">
                Treinamento esportivo
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-ink-900">{title}</h2>
              <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
            </div>
            {children}
          </div>

          {footer ? <div className="mt-5 text-center text-sm text-ink-500">{footer}</div> : null}
        </div>
      </div>
    </div>
  )
}
