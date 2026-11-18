import type {
  AbsoluteUnit,
  DurationType,
  Sport,
  StepRole,
  Target,
  TargetType,
  Workout,
  WorkoutPayload,
  WorkoutType,
  ZoneType,
} from '../api/types'
import { ABSOLUTE_UNITS } from '../api/types'
import { maxZoneForTarget, targetTypesForSport, zoneTypeForTarget } from './labels'

export interface BuilderTarget {
  type: TargetType
  zone: number | null
  minValue: number | null
  maxValue: number | null
  display: string
  absoluteMin: number | null
  absoluteMax: number | null
  absoluteUnit: AbsoluteUnit | ''
}

export interface BuilderStep {
  key: string
  role: StepRole
  durationType: DurationType
  durationSec: number | null
  distanceM: number | null
  notes: string
  target: BuilderTarget
}

export interface BuilderBlock {
  key: string
  repeatCount: number
  title: string
  notes: string
  steps: BuilderStep[]
}

export interface BuilderState {
  name: string
  sport: Sport
  type: WorkoutType
  description: string
  tags: string[]
  difficulty: number
  blocks: BuilderBlock[]
  selectedStepKey: string | null
  dirty: boolean
  savedAt: string | null
  loadedWorkoutId: string | null
  /** TSS calculado pelo backend no último load/save (null quando ainda não existe). */
  estimatedTss: number | null
}

export interface BuilderInitialState {
  sport?: Sport
  name?: string
  type?: WorkoutType
}

export type BuilderAction =
  | { type: 'LOAD'; workout: Workout }
  | { type: 'RESET_NEW'; initial?: BuilderInitialState }
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_TYPE'; value: WorkoutType }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_DIFFICULTY'; value: number }
  | { type: 'SET_TAGS'; value: string[] }
  | { type: 'SET_SPORT'; value: Sport }
  | { type: 'ADD_BLOCK' }
  | { type: 'REMOVE_BLOCK'; blockKey: string }
  | { type: 'UPDATE_BLOCK'; blockKey: string; patch: Partial<Pick<BuilderBlock, 'title' | 'repeatCount' | 'notes'>> }
  | { type: 'MOVE_BLOCK'; activeKey: string; overKey: string }
  | { type: 'ADD_STEP'; blockKey: string }
  | { type: 'REMOVE_STEP'; blockKey: string; stepKey: string }
  | { type: 'DUPLICATE_STEP'; blockKey: string; stepKey: string }
  | {
      type: 'UPDATE_STEP'
      blockKey: string
      stepKey: string
      patch: Partial<Pick<BuilderStep, 'role' | 'durationType' | 'durationSec' | 'distanceM' | 'notes'>>
    }
  | { type: 'UPDATE_TARGET'; blockKey: string; stepKey: string; patch: Partial<BuilderTarget> }
  | { type: 'SELECT_STEP'; blockKey: string; stepKey: string }
  | { type: 'MOVE_STEP'; activeKey: string; targetBlockKey: string; targetStepKey: string | null }
  | {
      type: 'MARK_SAVED'
      savedAt: string
      workoutId: string
      estimatedTss?: number | null
    }

function createKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function isAbsoluteUnit(value: unknown): value is AbsoluteUnit {
  return typeof value === 'string' && (ABSOLUTE_UNITS as readonly string[]).includes(value)
}

export function createDefaultTarget(sport: Sport, role: StepRole = 'ACTIVE'): BuilderTarget {
  const type: TargetType = sport === 'BIKE' ? 'POWER_ZONE' : 'HR_ZONE'
  const zone = role === 'WARMUP' || role === 'COOLDOWN' || role === 'RECOVERY' ? 1 : 2
  return {
    type,
    zone,
    minValue: type.endsWith('_PERCENT') ? 84 : null,
    maxValue: type.endsWith('_PERCENT') ? 94 : null,
    display: '',
    absoluteMin: null,
    absoluteMax: null,
    absoluteUnit: '',
  }
}

export function createStep(sport: Sport, role: StepRole = 'ACTIVE', durationSec = 600): BuilderStep {
  return {
    key: createKey(),
    role,
    durationType: 'TIME',
    durationSec,
    distanceM: null,
    notes: '',
    target: createDefaultTarget(sport, role),
  }
}

export function createBlock(sport: Sport, title: string, withStep = false): BuilderBlock {
  return {
    key: createKey(),
    repeatCount: 1,
    title,
    notes: '',
    steps: withStep ? [createStep(sport)] : [],
  }
}

export function createInitialState(initial: BuilderInitialState = {}): BuilderState {
  const sport: Sport = initial.sport ?? 'RUN'
  const block = createBlock(sport, 'Bloco principal')
  const warmup = createStep(sport, 'WARMUP', 600)
  const active = createStep(sport, 'ACTIVE', 1200)
  const cooldown = createStep(sport, 'COOLDOWN', 300)
  block.steps = [warmup, active, cooldown]

  return {
    name: initial.name ?? '',
    sport,
    type: initial.type ?? 'ENDURANCE',
    description: '',
    tags: [],
    difficulty: 3,
    blocks: [block],
    selectedStepKey: warmup.key,
    dirty: false,
    savedAt: null,
    loadedWorkoutId: null,
    estimatedTss: null,
  }
}

export function toBuilderTarget(target: Target | undefined, sport: Sport): BuilderTarget {
  const fallback = createDefaultTarget(sport)
  if (!target) return fallback
  const allowed = targetTypesForSport(sport)
  const type = allowed.includes(target.type) ? target.type : fallback.type
  return {
    type,
    zone: target.zone ?? null,
    minValue: target.minValue ?? null,
    maxValue: target.maxValue ?? null,
    display: target.display ?? '',
    absoluteMin: target.absoluteMin ?? null,
    absoluteMax: target.absoluteMax ?? null,
    absoluteUnit: isAbsoluteUnit(target.absoluteUnit) ? target.absoluteUnit : '',
  }
}

export function workoutToState(workout: Workout): BuilderState {
  const blocks = [...(workout.blocks ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((block) => ({
      key: createKey(),
      repeatCount: Math.max(1, block.repeatCount || 1),
      title: block.title ?? '',
      notes: block.notes ?? '',
      steps: [...(block.steps ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((step) => ({
          key: createKey(),
          role: step.role,
          durationType: step.durationType,
          durationSec: step.durationSec ?? null,
          distanceM: step.distanceM ?? null,
          notes: step.notes ?? '',
          target: toBuilderTarget(step.target, workout.sport),
        })),
    }))

  const firstStep = blocks.find((block) => block.steps.length > 0)?.steps[0]

  return {
    name: workout.name,
    sport: workout.sport,
    type: workout.type,
    description: workout.description ?? '',
    tags: workout.tags ?? [],
    difficulty: Math.min(5, Math.max(1, workout.difficulty || 3)),
    blocks,
    selectedStepKey: firstStep?.key ?? null,
    dirty: false,
    savedAt: null,
    loadedWorkoutId: workout.id,
    estimatedTss: workout.estimatedTss ?? null,
  }
}

function findStep(
  state: BuilderState,
  stepKey: string,
): { block: BuilderBlock; step: BuilderStep; blockIndex: number; stepIndex: number } | null {
  for (let blockIndex = 0; blockIndex < state.blocks.length; blockIndex += 1) {
    const block = state.blocks[blockIndex]
    const stepIndex = block.steps.findIndex((step) => step.key === stepKey)
    if (stepIndex >= 0) {
      return { block, step: block.steps[stepIndex], blockIndex, stepIndex }
    }
  }
  return null
}

function firstStepKey(blocks: BuilderBlock[]): string | null {
  for (const block of blocks) {
    if (block.steps.length > 0) return block.steps[0].key
  }
  return null
}

function withDirty(state: BuilderState, patch: Partial<BuilderState>): BuilderState {
  return { ...state, ...patch, dirty: true }
}

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'LOAD':
      return workoutToState(action.workout)

    case 'RESET_NEW':
      return createInitialState(action.initial)

    case 'SET_NAME':
      return withDirty(state, { name: action.value })

    case 'SET_TYPE':
      return withDirty(state, { type: action.value })

    case 'SET_DESCRIPTION':
      return withDirty(state, { description: action.value })

    case 'SET_DIFFICULTY':
      return withDirty(state, { difficulty: Math.min(5, Math.max(1, action.value)) })

    case 'SET_TAGS':
      return withDirty(state, { tags: action.value })

    case 'SET_SPORT': {
      const allowed = targetTypesForSport(action.value)
      const blocks = state.blocks.map((block) => ({
        ...block,
        steps: block.steps.map((step) => {
          if (allowed.includes(step.target.type)) {
            const maxZone = maxZoneForTarget(step.target.type)
            const zone =
              step.target.zone !== null
                ? Math.min(maxZone, Math.max(1, step.target.zone))
                : step.target.type.endsWith('_ZONE')
                  ? 2
                  : null
            return { ...step, target: { ...step.target, zone } }
          }
          const target = createDefaultTarget(action.value, step.role)
          return { ...step, target: { ...target, display: step.target.display } }
        }),
      }))
      return withDirty(state, { sport: action.value, blocks })
    }

    case 'ADD_BLOCK': {
      const block = createBlock(state.sport, `Bloco ${state.blocks.length + 1}`)
      return withDirty(state, { blocks: [...state.blocks, block] })
    }

    case 'REMOVE_BLOCK': {
      const blocks = state.blocks.filter((block) => block.key !== action.blockKey)
      const selectedStillExists =
        state.selectedStepKey !== null &&
        blocks.some((block) => block.steps.some((step) => step.key === state.selectedStepKey))
      return withDirty(state, {
        blocks,
        selectedStepKey: selectedStillExists ? state.selectedStepKey : firstStepKey(blocks),
      })
    }

    case 'UPDATE_BLOCK':
      return withDirty(state, {
        blocks: state.blocks.map((block) =>
          block.key === action.blockKey ? { ...block, ...action.patch } : block,
        ),
      })

    case 'MOVE_BLOCK': {
      const fromIndex = state.blocks.findIndex((block) => block.key === action.activeKey)
      const toIndex = state.blocks.findIndex((block) => block.key === action.overKey)
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return state
      const blocks = [...state.blocks]
      const [moved] = blocks.splice(fromIndex, 1)
      blocks.splice(toIndex, 0, moved)
      return withDirty(state, { blocks })
    }

    case 'ADD_STEP': {
      const step = createStep(state.sport, 'ACTIVE', 600)
      return withDirty(state, {
        blocks: state.blocks.map((block) =>
          block.key === action.blockKey ? { ...block, steps: [...block.steps, step] } : block,
        ),
        selectedStepKey: step.key,
      })
    }

    case 'REMOVE_STEP': {
      const blocks = state.blocks.map((block) =>
        block.key === action.blockKey
          ? { ...block, steps: block.steps.filter((step) => step.key !== action.stepKey) }
          : block,
      )
      return withDirty(state, {
        blocks,
        selectedStepKey:
          state.selectedStepKey === action.stepKey ? firstStepKey(blocks) : state.selectedStepKey,
      })
    }

    case 'DUPLICATE_STEP': {
      let duplicatedKey: string | null = null
      const blocks = state.blocks.map((block) => {
        if (block.key !== action.blockKey) return block
        const index = block.steps.findIndex((step) => step.key === action.stepKey)
        if (index < 0) return block
        const source = block.steps[index]
        const duplicate: BuilderStep = {
          ...source,
          key: createKey(),
          target: { ...source.target },
        }
        duplicatedKey = duplicate.key
        const steps = [...block.steps]
        steps.splice(index + 1, 0, duplicate)
        return { ...block, steps }
      })
      return withDirty(state, {
        blocks,
        selectedStepKey: duplicatedKey ?? state.selectedStepKey,
      })
    }

    case 'UPDATE_STEP':
      return withDirty(state, {
        blocks: state.blocks.map((block) =>
          block.key === action.blockKey
            ? {
                ...block,
                steps: block.steps.map((step) =>
                  step.key === action.stepKey ? { ...step, ...action.patch } : step,
                ),
              }
            : block,
        ),
      })

    case 'UPDATE_TARGET':
      return withDirty(state, {
        blocks: state.blocks.map((block) =>
          block.key === action.blockKey
            ? {
                ...block,
                steps: block.steps.map((step) =>
                  step.key === action.stepKey
                    ? { ...step, target: { ...step.target, ...action.patch } }
                    : step,
                ),
              }
            : block,
        ),
      })

    case 'SELECT_STEP':
      return { ...state, selectedStepKey: action.stepKey }

    case 'MOVE_STEP': {
      const source = findStep(state, action.activeKey)
      if (!source) return state
      if (
        source.block.key === action.targetBlockKey &&
        action.targetStepKey === action.activeKey
      ) {
        return state
      }

      const targetBlock = state.blocks.find((block) => block.key === action.targetBlockKey)
      if (!targetBlock) return state

      if (source.block.key === action.targetBlockKey) {
        if (action.targetStepKey === null) return state
        const steps = [...source.block.steps]
        const fromIndex = steps.findIndex((step) => step.key === action.activeKey)
        const toIndex = steps.findIndex((step) => step.key === action.targetStepKey)
        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return state
        const [moved] = steps.splice(fromIndex, 1)
        steps.splice(toIndex, 0, moved)
        return withDirty(state, {
          blocks: state.blocks.map((block) =>
            block.key === source.block.key ? { ...block, steps } : block,
          ),
        })
      }

      const movedStep = source.step
      const blocks = state.blocks.map((block) => {
        if (block.key === source.block.key) {
          return { ...block, steps: block.steps.filter((step) => step.key !== movedStep.key) }
        }
        if (block.key === action.targetBlockKey) {
          const steps = [...block.steps]
          const foundIndex =
            action.targetStepKey === null
              ? -1
              : steps.findIndex((step) => step.key === action.targetStepKey)
          const insertIndex = foundIndex < 0 ? steps.length : foundIndex
          steps.splice(insertIndex, 0, movedStep)
          return { ...block, steps }
        }
        return block
      })
      return withDirty(state, { blocks })
    }

    case 'MARK_SAVED':
      return {
        ...state,
        dirty: false,
        savedAt: action.savedAt,
        loadedWorkoutId: action.workoutId,
        estimatedTss: action.estimatedTss ?? state.estimatedTss,
      }

    default:
      return state
  }
}

export function getSelectedStep(
  state: BuilderState,
): { block: BuilderBlock; step: BuilderStep } | null {
  if (!state.selectedStepKey) return null
  const found = findStep(state, state.selectedStepKey)
  return found ? { block: found.block, step: found.step } : null
}

export function getTotalDuration(blocks: BuilderBlock[]): number {
  return blocks.reduce((blockTotal, block) => {
    const repeat = Math.max(1, Math.round(block.repeatCount) || 1)
    const blockSeconds = block.steps.reduce(
      (stepTotal, step) =>
        stepTotal + (step.durationType === 'TIME' ? Math.max(0, step.durationSec ?? 0) : 0),
      0,
    )
    return blockTotal + blockSeconds * repeat
  }, 0)
}

export function getTotalStepCount(blocks: BuilderBlock[]): number {
  return blocks.reduce((total, block) => {
    const repeat = Math.max(1, Math.round(block.repeatCount) || 1)
    return total + block.steps.length * repeat
  }, 0)
}

export function getStructuralStepCount(blocks: BuilderBlock[]): number {
  return blocks.reduce((total, block) => total + block.steps.length, 0)
}

export function getTotalDistance(blocks: BuilderBlock[]): number {
  return blocks.reduce((blockTotal, block) => {
    const repeat = Math.max(1, Math.round(block.repeatCount) || 1)
    return (
      blockTotal +
      block.steps.reduce(
        (stepTotal, step) =>
          stepTotal + (step.durationType === 'DISTANCE' ? (step.distanceM ?? 0) : 0),
        0,
      ) *
        repeat
    )
  }, 0)
}

export function parseTags(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of value.split(',')) {
    const tag = raw.trim().replace(/^#/, '')
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

function normalizeTarget(step: BuilderStep): WorkoutPayload['blocks'][number]['steps'][number]['target'] {
  const target = step.target
  const isZone = target.type.endsWith('_ZONE')
  const isPercent = target.type.endsWith('_PERCENT')
  const isRpe = target.type === 'RPE'
  const zone = isZone ? Math.min(maxZoneForTarget(target.type), Math.max(1, target.zone ?? 2)) : null
  const minValue = isPercent || isRpe ? target.minValue : null
  const maxValue = isPercent || isRpe ? target.maxValue : null
  const hasAbsolute =
    target.absoluteUnit !== '' &&
    (target.absoluteMin !== null || target.absoluteMax !== null)
  return {
    type: target.type,
    zone,
    minValue,
    maxValue,
    display: target.display.trim() || null,
    absoluteMin: hasAbsolute ? target.absoluteMin : null,
    absoluteMax: hasAbsolute ? target.absoluteMax : null,
    absoluteUnit: hasAbsolute ? target.absoluteUnit : null,
  }
}

export function toWorkoutPayload(state: BuilderState): WorkoutPayload {
  return {
    name: state.name.trim(),
    sport: state.sport,
    type: state.type,
    description: state.description.trim() || null,
    tags: state.tags,
    difficulty: state.difficulty,
    blocks: state.blocks.map((block) => ({
      repeatCount: Math.max(1, Math.round(block.repeatCount) || 1),
      title: block.title.trim() || null,
      notes: block.notes.trim() || null,
      steps: block.steps.map((step) => ({
        role: step.role,
        durationType: step.durationType,
        durationSec: step.durationType === 'TIME' ? step.durationSec : null,
        distanceM: step.durationType === 'DISTANCE' ? step.distanceM : null,
        notes: step.notes.trim() || null,
        target: normalizeTarget(step),
      })),
    })),
  }
}

export function validateBuilder(state: BuilderState): string[] {
  const errors: string[] = []
  if (!state.name.trim()) errors.push('Informe um nome para o treino.')
  if (state.blocks.length === 0) errors.push('Adicione pelo menos um bloco ao treino.')
  for (const [blockIndex, block] of state.blocks.entries()) {
    if (!Number.isFinite(block.repeatCount) || block.repeatCount < 1) {
      errors.push(`Bloco ${blockIndex + 1}: a repetição deve ser no mínimo 1.`)
    }
    for (const [stepIndex, step] of block.steps.entries()) {
      const label = `Bloco ${blockIndex + 1}, step ${stepIndex + 1}`
      if (step.durationType === 'TIME' && (!step.durationSec || step.durationSec <= 0)) {
        errors.push(`${label}: informe uma duração em tempo maior que zero.`)
      }
      if (step.durationType === 'DISTANCE' && (!step.distanceM || step.distanceM <= 0)) {
        errors.push(`${label}: informe uma distância maior que zero.`)
      }
    }
  }
  return errors
}

export interface ZoneBucket {
  zone: number
  seconds: number
}

export interface DistributionGroup {
  type: ZoneType
  label: string
  zones: ZoneBucket[]
}

const DISTRIBUTION_LABELS: Record<ZoneType, string> = {
  HR: 'FC',
  PACE: 'Pace',
  POWER: 'Potência',
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min !== null && max !== null) return (min + max) / 2
  return min ?? max
}

function zoneFromThresholds(value: number | null, thresholds: number[]): number | null {
  if (value === null) return null
  for (let index = 0; index < thresholds.length; index += 1) {
    const threshold = thresholds[index]
    if (value <= threshold) return index + 1
  }
  return thresholds.length + 1
}

function resolveStepZone(step: BuilderStep, sport: Sport): { type: ZoneType; zone: number } | null {
  const type = zoneTypeForTarget(step.target.type)
  if (!type) return null
  if (step.target.type.endsWith('_ZONE')) {
    if (!step.target.zone) return null
    const maxZone = maxZoneForTarget(step.target.type)
    if (step.target.zone < 1 || step.target.zone > maxZone) return null
    return { type, zone: step.target.zone }
  }

  const value = midpoint(step.target.minValue, step.target.maxValue)
  if (value === null) return null
  let zone: number | null = null
  if (step.target.type === 'HR_PERCENT') {
    zone = zoneFromThresholds(value, [68, 83, 94, 105])
  } else if (step.target.type === 'POWER_PERCENT') {
    zone = zoneFromThresholds(value, [55, 75, 90, 105, 120, 150])
  } else if (step.target.type === 'PACE_PERCENT') {
    zone =
      sport === 'SWIM'
        ? zoneFromThresholds(value, [90, 97, 104, 112])
        : zoneFromThresholds(value, [75, 88, 95, 103])
  }
  if (!zone) return null
  return { type, zone: Math.min(type === 'POWER' ? 7 : 5, zone) }
}

export function estimateDistribution(blocks: BuilderBlock[], sport: Sport): DistributionGroup[] {
  const groups = new Map<ZoneType, number[]>()

  function ensureGroup(type: ZoneType): number[] {
    const existing = groups.get(type)
    if (existing) return existing
    const zones = Array.from({ length: type === 'POWER' ? 7 : 5 }, () => 0)
    groups.set(type, zones)
    return zones
  }

  for (const block of blocks) {
    const repeat = Math.max(1, Math.round(block.repeatCount) || 1)
    for (const step of block.steps) {
      if (step.durationType !== 'TIME') continue
      const seconds = Math.max(0, step.durationSec ?? 0) * repeat
      if (seconds <= 0) continue
      const resolution = resolveStepZone(step, sport)
      const stepType = zoneTypeForTarget(step.target.type)
      if (!stepType) continue
      const buckets = ensureGroup(stepType)
      if (!resolution) continue
      buckets[resolution.zone - 1] += seconds
    }
  }

  return [...groups.entries()]
    .map(([type, buckets]) => ({
      type,
      label: DISTRIBUTION_LABELS[type],
      zones: buckets.map((seconds, index) => ({ zone: index + 1, seconds })),
    }))
    .filter((group) => group.zones.some((bucket) => bucket.seconds > 0))
}
