import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from '../api/client'
import { athletesApi, integrationsApi, plannedApi } from '../api/endpoints'
import type { PlannedWorkout } from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Field, Input, Select } from '../components/ui/Field'

function iso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

/**
 * Dispositivos e canais de entrega.
 *
 * O Intervals.icu e' a ponte ate o relogio: o atleta conecta a conta dele la' (Settings ->
 * Garmin) e, ao enviarmos o treino planejado, ele desce no aparelho no proximo sincronismo.
 */
export function DevicesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAthlete = user?.role === 'ATHLETE'

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('')
  const [apiKey, setApiKey] = useState('')
  const [externalId, setExternalId] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<Record<string, string>>({})

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
    enabled: !isAthlete,
  })

  useEffect(() => {
    if (!isAthlete && !selectedAthleteId && athletesQuery.data?.length) {
      setSelectedAthleteId(athletesQuery.data[0].id)
    }
  }, [athletesQuery.data, isAthlete, selectedAthleteId])

  const athleteId = isAthlete ? undefined : selectedAthleteId || undefined

  const connectionsQuery = useQuery({
    queryKey: ['integrations', athleteId ?? 'me'],
    queryFn: () => integrationsApi.list(athleteId),
    enabled: isAthlete || Boolean(athleteId),
  })

  const connection = connectionsQuery.data?.[0] ?? null

  const upcomingQuery = useQuery({
    queryKey: ['planned-upcoming', athleteId ?? 'me'],
    queryFn: () =>
      plannedApi.list({
        athleteId,
        from: iso(new Date()),
        to: iso(new Date(Date.now() + 21 * 24 * 3600 * 1000)),
      }),
    enabled: (isAthlete || Boolean(athleteId)) && Boolean(connection),
  })

  const upcoming = useMemo<PlannedWorkout[]>(
    () =>
      [...(upcomingQuery.data ?? [])].sort((a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate),
      ),
    [upcomingQuery.data],
  )

  const connectMutation = useMutation({
    mutationFn: () =>
      integrationsApi.connectIntervals(
        { apiKey: apiKey.trim(), externalAthleteId: externalId.trim() },
        athleteId,
      ),
    onSuccess: (data) => {
      setError(null)
      setApiKey('')
      setFeedback(`Conectado como ${data.externalAthleteName ?? data.externalAthleteId}.`)
      void queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err))
    },
  })

  const testMutation = useMutation({
    mutationFn: () => integrationsApi.testIntervals(athleteId),
    onSuccess: (data) => {
      setError(null)
      setFeedback(`Conexao valida: ${data.externalAthleteName ?? data.externalAthleteId}.`)
      void queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err))
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnectIntervals(athleteId),
    onSuccess: () => {
      setError(null)
      setFeedback('Intervals.icu desconectado.')
      void queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const deliverMutation = useMutation({
    mutationFn: (plannedWorkoutId: string) =>
      integrationsApi.deliver(plannedWorkoutId, athleteId),
    onSuccess: (data, plannedWorkoutId) => {
      setError(null)
      setSent((current) => ({ ...current, [plannedWorkoutId]: data.externalId }))
      setFeedback(`Treino enviado (evento ${data.externalId}). Desce no relogio no proximo sync.`)
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err))
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dispositivos"
        title="Canais de entrega"
        description="Conecte sua conta do Intervals.icu para que os treinos planejados cheguem ao relogio."
      />

      {!isAthlete ? (
        <Card className="p-5">
          <Field label="Atleta" htmlFor="athlete">
            <Select
              id="athlete"
              value={selectedAthleteId}
              onChange={(event) => setSelectedAthleteId(event.target.value)}
            >
              {(athletesQuery.data ?? []).map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.displayName}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Intervals.icu"
          description="Ponte ate o Garmin, COROS e Suunto."
          actions={
            connection ? (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                Conectado
              </span>
            ) : (
              <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
                Nao conectado
              </span>
            )
          }
        />
        <div className="space-y-4 p-5">
          <ol className="space-y-1 text-sm text-ink-600">
            <li>
              1. Crie uma conta em{' '}
              <a
                className="font-semibold text-brand-600 hover:underline"
                href="https://intervals.icu"
                target="_blank"
                rel="noreferrer"
              >
                intervals.icu
              </a>{' '}
              e conecte seu Garmin em Settings → Connections.
            </li>
            <li>2. Em Settings, copie sua <strong>API Key</strong> e o seu <strong>Athlete ID</strong>.</li>
            <li>3. Cole aqui. O treino que voce enviar aparece no calendario deles e no relogio.</li>
          </ol>

          {connection?.externalAthleteId ? (
            <p className="text-sm text-ink-500">
              Conta vinculada: <strong>{connection.externalAthleteName ?? connection.externalAthleteId}</strong>{' '}
              ({connection.externalAthleteId})
              {connection.lastSyncAt
                ? ` · ultimo envio ${new Date(connection.lastSyncAt).toLocaleString('pt-BR')}`
                : null}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="API Key" htmlFor="api-key" hint="Fica cifrada no banco.">
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                placeholder="sua chave"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </Field>
            <Field label="Athlete ID" htmlFor="athlete-id" hint="Formato i123456.">
              <Input
                id="athlete-id"
                placeholder="i123456"
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || !apiKey.trim() || !externalId.trim()}
            >
              {connectMutation.isPending ? 'Validando…' : connection ? 'Atualizar conexao' : 'Conectar'}
            </Button>
            {connection ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                >
                  Testar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  Desconectar
                </Button>
              </>
            ) : null}
          </div>

          {feedback ? <p className="text-sm font-medium text-brand-700">{feedback}</p> : null}
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Proximos treinos"
          description="Envie para o calendario do Intervals.icu — de la' desce para o relogio."
        />
        <div className="p-5">
          {!connection ? (
            <p className="text-sm text-ink-500">Conecte o Intervals.icu para enviar treinos.</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">
              Nenhum treino planejado nos proximos 21 dias. Monte um no calendario.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((planned) => (
                <li key={planned.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {planned.workout?.name ?? 'Treino'}
                    </p>
                    <p className="text-xs text-ink-500">
                      {formatDay(planned.scheduledDate)} · {planned.workout?.sport ?? ''}
                    </p>
                  </div>
                  {sent[planned.id] ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                      Enviado
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deliverMutation.mutate(planned.id)}
                      disabled={deliverMutation.isPending}
                    >
                      Enviar para o relogio
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  )
}
