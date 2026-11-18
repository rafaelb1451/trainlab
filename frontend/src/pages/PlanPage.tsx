import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiErrorMessage } from '../api/client'
import { athletesApi, calendarApi, plannedApi } from '../api/endpoints'
import type {
  CalendarData,
  CalendarSession,
  PlannedPatchInput,
  PlannedStatus,
} from '../api/types'
import { useAuth } from '../auth/AuthProvider'
import { EmptyState } from '../components/EmptyState'
import { ErrorAlert } from '../components/ErrorAlert'
import { ConfirmDialog, Skeleton } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { ToastStack, useToasts } from '../components/Toast'
import { AddSessionModal } from '../components/calendar/AddSessionModal'
import { DayCell } from '../components/calendar/DayCell'
import { MobileMonthList } from '../components/calendar/MobileMonthList'
import { SessionDragOverlay } from '../components/calendar/DraggableSessionCard'
import { SessionMenuModal } from '../components/calendar/SessionMenuModal'
import { WeekSummary } from '../components/calendar/WeekSummary'
import { SPORT_BAR } from '../components/calendar/sportStyles'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import { formatDateShort, toISODate } from '../lib/format'
import {
  WEEKDAY_LABELS,
  currentMonthCursor,
  isSameMonth,
  isoDay,
  monthGrid,
  monthLabel,
  shiftMonth,
  weekStartIso,
} from '../lib/calendar'
import { SPORT_LABELS } from '../lib/labels'
import { SPORTS } from '../api/types'
import { cn } from '../lib/cn'

function findSession(data: CalendarData | undefined, sessionId: string): CalendarSession | null {
  if (!data) return null
  for (const day of data.days) {
    const session = day.sessions.find((item) => item.id === sessionId)
    if (session) return session
  }
  return null
}

/**
 * Move a sessão entre dias no cache, ajustando também os totais da semana de
 * origem e de destino. CTL/ATL/TSB são recalculados pelo backend no refetch.
 */
function moveSessionInCalendar(
  data: CalendarData,
  sessionId: string,
  targetDate: string,
): CalendarData {
  const session = findSession(data, sessionId)
  if (!session) return data
  const previousDate = session.scheduledDate.slice(0, 10)
  if (previousDate === targetDate) return data
  if (!data.days.some((day) => day.date === targetDate)) return data

  const days = data.days.map((day) => {
    if (day.date === previousDate) {
      return { ...day, sessions: day.sessions.filter((item) => item.id !== sessionId) }
    }
    if (day.date === targetDate) {
      return { ...day, sessions: [...day.sessions, { ...session, scheduledDate: targetDate }] }
    }
    return day
  })

  const durationMinutes = Math.round((session.workout?.estimatedDurationSec ?? 0) / 60)
  const tss = session.workout?.estimatedTss ?? 0
  const oldWeek = weekStartIso(previousDate)
  const newWeek = weekStartIso(targetDate)
  let weeks = data.weeks
  if (oldWeek && newWeek && oldWeek !== newWeek) {
    weeks = data.weeks.map((week) => {
      if (week.weekStart === oldWeek) {
        return {
          ...week,
          plannedMinutes: Math.max(0, week.plannedMinutes - durationMinutes),
          plannedTss: Math.max(0, week.plannedTss - tss),
          plannedSessions: Math.max(0, week.plannedSessions - 1),
        }
      }
      if (week.weekStart === newWeek) {
        return {
          ...week,
          plannedMinutes: week.plannedMinutes + durationMinutes,
          plannedTss: week.plannedTss + tss,
          plannedSessions: week.plannedSessions + 1,
        }
      }
      return week
    })
  }

  return { ...data, days, weeks }
}

function CalendarSkeleton() {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-card min-[900px]:block">
        <div className="grid min-w-[880px] grid-cols-[repeat(7,minmax(0,1fr))_136px]">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={`head-${index}`}
              className="border-r border-b border-ink-800 bg-ink-900 px-2 py-2.5 last:border-r-0"
            >
              <Skeleton className="mx-auto h-2.5 w-10 bg-white/20" />
            </div>
          ))}
          {Array.from({ length: 5 }, (_, weekIndex) => (
            <div key={`week-${weekIndex}`} className="contents">
              {Array.from({ length: 7 }, (_, dayIndex) => (
                <div key={`cell-${dayIndex}`} className="min-h-[116px] border-r border-b border-ink-100 p-2">
                  <Skeleton className="h-3 w-4" />
                  <Skeleton className="mt-2 h-2 w-16" />
                  <Skeleton className="mt-2 h-9 w-full" />
                </div>
              ))}
              <div className="min-h-[116px] border-b border-l border-ink-100 bg-ink-50/60 p-2">
                <Skeleton className="h-2 w-12" />
                <Skeleton className="mt-2 h-2 w-full" />
                <Skeleton className="mt-1.5 h-2 w-full" />
                <Skeleton className="mt-1.5 h-2 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3 min-[900px]:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
    </>
  )
}

export function PlanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toasts, push, dismiss } = useToasts()

  const isCoach = user?.role !== 'ATHLETE'
  const canManage = isCoach
  const todayIso = toISODate(new Date())

  const [cursor, setCursor] = useState(() => currentMonthCursor())
  const [athleteId, setAthleteId] = useState(() =>
    user?.role === 'ATHLETE' ? (user.athleteId ?? '') : '',
  )
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [addState, setAddState] = useState<{ open: boolean; date: string }>({
    open: false,
    date: todayIso,
  })
  const [removeTarget, setRemoveTarget] = useState<CalendarSession | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<CalendarSession | null>(null)
  const lastDragEndAt = useRef(0)

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: athletesApi.list,
    enabled: isCoach,
  })

  const athletes = useMemo(() => athletesQuery.data ?? [], [athletesQuery.data])

  useEffect(() => {
    if (!isCoach) return
    if (athletes.length === 0) return
    if (athleteId && athletes.some((athlete) => athlete.id === athleteId)) return
    setAthleteId(athletes[0].id)
  }, [isCoach, athleteId, athletes])

  const grid = useMemo(() => monthGrid(cursor), [cursor])
  const from = isoDay(grid.start)
  const to = isoDay(grid.end)
  const monthPrefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`

  const calendarQuery = useQuery({
    queryKey: ['calendar', athleteId, from, to],
    queryFn: () => calendarApi.get({ athleteId, from, to }),
    enabled: Boolean(athleteId),
    placeholderData: keepPreviousData,
  })

  const data = calendarQuery.data
  const dayMap = useMemo(
    () => new Map((data?.days ?? []).map((day) => [day.date, day])),
    [data],
  )
  const weekMap = useMemo(
    () => new Map((data?.weeks ?? []).map((week) => [week.weekStart, week])),
    [data],
  )
  const weekGroups = useMemo(
    () =>
      grid.weeks.map((dates) => {
        const weekStart = isoDay(dates[0])
        return {
          dates,
          weekStart,
          week: weekMap.get(weekStart),
          sessions: dates.flatMap((date) => dayMap.get(isoDay(date))?.sessions ?? []),
        }
      }),
    [grid, dayMap, weekMap],
  )

  const monthSessions =
    data?.days
      .filter((day) => day.date.startsWith(monthPrefix))
      .reduce((total, day) => total + day.sessions.length, 0) ?? 0

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null
    return findSession(data, selectedSessionId)
  }, [data, selectedSessionId])

  const selectedAthlete = athletes.find((athlete) => athlete.id === athleteId) ?? null
  const athleteName =
    (isCoach ? selectedAthlete?.displayName : user?.name) ?? 'Atleta'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function defaultAddDate(): string {
    return isSameMonth(new Date(), cursor)
      ? todayIso
      : isoDay(new Date(cursor.year, cursor.month - 1, 1))
  }

  function openAdd(date: string) {
    setAddState({ open: true, date })
  }

  function handleCreated() {
    setAddState((current) => ({ ...current, open: false }))
    push('success', 'Sessão adicionada ao calendário.')
    void queryClient.invalidateQueries({ queryKey: ['calendar'] })
  }

  function openSession(session: CalendarSession) {
    if (Date.now() - lastDragEndAt.current < 300) return
    setActionError(null)
    setSelectedSessionId(session.id)
  }

  async function patchSession(patch: PlannedPatchInput, successMessage: string) {
    if (!selectedSession) return
    setBusy(true)
    setActionError(null)
    try {
      await plannedApi.update(selectedSession.id, patch)
      setSelectedSessionId(null)
      push('success', successMessage)
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    } catch (error) {
      const message = getApiErrorMessage(error)
      setActionError(message)
      push('error', message)
    } finally {
      setBusy(false)
    }
  }

  async function duplicateSession() {
    if (!selectedSession?.workout) return
    setBusy(true)
    setActionError(null)
    try {
      await plannedApi.create({
        athleteId,
        workoutId: selectedSession.workout.id,
        scheduledDate: selectedSession.scheduledDate.slice(0, 10),
      })
      setSelectedSessionId(null)
      push('success', 'Sessão duplicada no mesmo dia.')
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    } catch (error) {
      const message = getApiErrorMessage(error)
      setActionError(message)
      push('error', message)
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await plannedApi.remove(removeTarget.id)
      setRemoveTarget(null)
      setSelectedSessionId(null)
      push('success', 'Sessão removida do calendário.')
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    } catch (error) {
      push('error', getApiErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id).replace('session:', '')
    const session = findSession(data, id)
    setSelectedSessionId(null)
    setActionError(null)
    setActiveSession(session)
  }

  async function handleDragEnd(event: DragEndEvent) {
    lastDragEndAt.current = Date.now()
    const session = activeSession
    setActiveSession(null)
    if (!session || !event.over) return
    const overId = String(event.over.id)
    if (!overId.startsWith('day:')) return
    const targetDate = overId.slice(4)
    if (targetDate === session.scheduledDate.slice(0, 10)) return

    const key = ['calendar', athleteId, from, to]
    const previous = queryClient.getQueryData<CalendarData>(key)
    queryClient.setQueryData<CalendarData>(key, (current) =>
      current ? moveSessionInCalendar(current, session.id, targetDate) : current,
    )
    try {
      await plannedApi.update(session.id, { scheduledDate: targetDate })
      push('success', `Sessão movida para ${formatDateShort(targetDate)}`)
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
    } catch (error) {
      queryClient.setQueryData(key, previous)
      push('error', getApiErrorMessage(error))
    }
  }

  function handleDragCancel() {
    lastDragEndAt.current = Date.now()
    setActiveSession(null)
  }

  const showCalendar = Boolean(athleteId) && !(isCoach && athletes.length === 0)
  const athletesLoading = isCoach && athletesQuery.isLoading
  const calendarLoading = calendarQuery.isLoading || (!data && calendarQuery.isFetching)

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Planejamento"
        title="Calendário"
        description={
          isCoach
            ? 'Monte o mês do plantel, arraste sessões entre os dias e acompanhe a carga semanal.'
            : 'Acompanhe o seu mês de treinos, com carga e métricas diárias.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isCoach ? (
              <div className="flex items-center gap-2">
                <label htmlFor="calendar-athlete" className="sr-only">
                  Atleta
                </label>
                <Select
                  id="calendar-athlete"
                  value={athleteId}
                  onChange={(event) => {
                    setAthleteId(event.target.value)
                    setSelectedSessionId(null)
                    setActionError(null)
                  }}
                  className="w-48"
                  disabled={athletesLoading || athletes.length === 0}
                >
                  {athletes.length === 0 ? <option value="">Sem atletas</option> : null}
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.displayName}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
                {user?.name ?? 'Meu calendário'}
              </span>
            )}
            {canManage ? (
              <Button onClick={() => openAdd(defaultAddDate())} disabled={!athleteId}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Adicionar sessão
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200/80 bg-white px-3 py-2.5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Mês anterior"
            title="Mês anterior"
            onClick={() => setCursor(shiftMonth(cursor, -1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="min-w-[8.5rem] text-center" data-month={monthPrefix} aria-live="polite">
            <p className="text-sm font-bold leading-tight text-ink-900">{monthLabel(cursor)}</p>
            <p className="text-[10px] text-ink-500">
              {formatDateShort(from)} – {formatDateShort(to)}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo mês"
            title="Próximo mês"
            onClick={() => setCursor(shiftMonth(cursor, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(currentMonthCursor())}
            title="Voltar ao mês atual"
          >
            Hoje
          </Button>
          {calendarQuery.isFetching && data ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-500"
              role="status"
            >
              <LoaderCircle className="h-3 w-3 animate-spin text-brand-600" aria-hidden="true" />
              Atualizando…
            </span>
          ) : null}
        </div>

        <ul className="flex flex-wrap items-center gap-3" aria-label="Legenda de esportes">
          {SPORTS.map((sport) => (
            <li key={sport} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
              <span className={cn('h-3 w-1 rounded-full', SPORT_BAR[sport])} aria-hidden="true" />
              {SPORT_LABELS[sport]}
            </li>
          ))}
        </ul>
      </div>

      {isCoach && athletesQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar os atletas"
          message={getApiErrorMessage(athletesQuery.error)}
          onRetry={() => void athletesQuery.refetch()}
        />
      ) : null}

      {isCoach && !athletesLoading && athletes.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum atleta cadastrado"
          description="Cadastre um atleta para começar a montar o calendário mensal."
          action={
            <Link to="/athletes">
              <Button size="sm">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ir para atletas
              </Button>
            </Link>
          }
        />
      ) : null}

      {!isCoach && !athleteId ? (
        <ErrorAlert
          title="Perfil de atleta não vinculado"
          message="Sua conta não está vinculada a um perfil de atleta. Fale com seu treinador."
        />
      ) : null}

      {calendarQuery.isError ? (
        <ErrorAlert
          title="Não foi possível carregar o calendário"
          message={getApiErrorMessage(calendarQuery.error)}
          onRetry={() => void calendarQuery.refetch()}
        />
      ) : null}

      {showCalendar && data && monthSessions === 0 && !calendarQuery.isError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Nenhuma sessão em {monthLabel(cursor)}
              </p>
              <p className="text-xs text-ink-600">
                {canManage
                  ? 'Comece adicionando um treino da biblioteca a qualquer dia do mês.'
                  : 'Seu treinador ainda não planejou sessões para este mês.'}
              </p>
            </div>
          </div>
          {canManage ? (
            <Button size="sm" onClick={() => openAdd(defaultAddDate())} disabled={!athleteId}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Adicionar sessão
            </Button>
          ) : null}
        </div>
      ) : null}

      {athletesLoading || (showCalendar && calendarLoading) ? <CalendarSkeleton /> : null}

      {!athletesLoading && showCalendar && data ? (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={(event) => void handleDragEnd(event)}
          onDragCancel={handleDragCancel}
        >
          <div className="hidden overflow-x-auto rounded-2xl border border-ink-200/80 bg-white shadow-card min-[900px]:block">
            <div
              role="grid"
              aria-label={`Calendário de ${monthLabel(cursor)}`}
              className="grid min-w-[880px] grid-cols-[repeat(7,minmax(0,1fr))_136px]"
            >
              <div role="row" className="contents">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    role="columnheader"
                    className="border-r border-b border-ink-800 bg-ink-900 px-1 py-2 text-center text-[9px] font-bold tracking-[0.12em] text-white last:border-r-0"
                  >
                    {label}
                  </div>
                ))}
                <div
                  role="columnheader"
                  className="border-b border-ink-800 bg-ink-900 px-2 py-2 text-center text-[9px] font-bold tracking-[0.12em] text-accent-400"
                >
                  RESUMO
                </div>
              </div>

              {weekGroups.map(({ dates, weekStart, week, sessions }) => (
                <div role="row" key={weekStart} className="contents">
                  {dates.map((date) => {
                    const iso = isoDay(date)
                    const day = dayMap.get(iso)
                    return (
                      <DayCell
                        key={iso}
                        date={date}
                        iso={iso}
                        inMonth={isSameMonth(date, cursor)}
                        isToday={iso === todayIso}
                        sessions={day?.sessions ?? []}
                        metrics={day?.metrics ?? null}
                        canManage={canManage}
                        todayIso={todayIso}
                        highlighted={Boolean(activeSession)}
                        onAdd={openAdd}
                        onSelectSession={openSession}
                      />
                    )
                  })}
                  <div role="gridcell" className="min-w-0">
                    <WeekSummary week={week} weekStart={dates[0]} weekSessions={sessions} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <MobileMonthList
            weeks={grid.weeks}
            cursor={cursor}
            dayMap={dayMap}
            weekMap={weekMap}
            todayIso={todayIso}
            canManage={canManage}
            onAdd={openAdd}
            onSelectSession={openSession}
          />

          <DragOverlay dropAnimation={null}>
            {activeSession ? (
              <SessionDragOverlay session={activeSession} today={todayIso} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {canManage && athleteId ? (
        <AddSessionModal
          open={addState.open}
          athleteId={athleteId}
          athleteName={athleteName}
          initialDate={addState.date}
          onClose={() => setAddState((current) => ({ ...current, open: false }))}
          onCreated={handleCreated}
        />
      ) : null}

      <SessionMenuModal
        open={Boolean(selectedSession)}
        session={selectedSession}
        manage={canManage}
        busy={busy}
        error={actionError}
        onClose={() => {
          if (!busy) {
            setSelectedSessionId(null)
            setActionError(null)
          }
        }}
        onOpenWorkout={(workoutId) => {
          setSelectedSessionId(null)
          navigate(`/workouts/${workoutId}`)
        }}
        onChangeStatus={(status: PlannedStatus) =>
          void patchSession(
            { status },
            status === 'COMPLETED' ? 'Sessão marcada como concluída.' : 'Sessão reaberta.',
          )
        }
        onMove={(date) => void patchSession({ scheduledDate: date }, `Sessão movida para ${formatDateShort(date)}`)}
        onDuplicate={() => void duplicateSession()}
        onRemove={() => {
          if (!selectedSession) return
          setRemoveTarget(selectedSession)
          setSelectedSessionId(null)
          setActionError(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remover sessão"
        description={
          removeTarget
            ? `A sessão de ${formatDateShort(removeTarget.scheduledDate)} será removida do calendário.`
            : ''
        }
        confirmLabel="Remover sessão"
        loading={busy}
        onClose={() => {
          if (!busy) setRemoveTarget(null)
        }}
        onConfirm={() => void confirmRemove()}
      />

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
