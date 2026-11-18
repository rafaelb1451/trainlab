import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Circle,
  Flame,
  GripVertical,
  Pause,
  Plus,
  RotateCcw,
  Snowflake,
  Trash2,
  Zap,
} from 'lucide-react'
import type { CSSProperties, KeyboardEvent, ComponentType } from 'react'
import type { Sport, StepRole } from '../api/types'
import type { BuilderBlock, BuilderStep } from '../lib/workoutBuilder'
import { cn } from '../lib/cn'
import {
  describeTarget,
  formatClock,
  formatDistance,
} from '../lib/format'
import { ROLE_LABELS } from '../lib/labels'
import { Button } from './ui/Button'
import { Input } from './ui/Field'

interface RoleStyle {
  icon: ComponentType<{ className?: string }>
  badge: string
  iconBg: string
}

const roleStyles: Record<StepRole, RoleStyle> = {
  WARMUP: { icon: Flame, badge: 'bg-accent-50 text-accent-700', iconBg: 'bg-accent-100 text-accent-700' },
  ACTIVE: { icon: Zap, badge: 'bg-brand-50 text-brand-800', iconBg: 'bg-brand-100 text-brand-700' },
  RECOVERY: { icon: RotateCcw, badge: 'bg-brand-50 text-brand-600', iconBg: 'bg-brand-100 text-brand-700' },
  COOLDOWN: {
    icon: Snowflake,
    badge: 'bg-ink-50 text-ink-700',
    iconBg: 'bg-ink-100 text-ink-700',
  },
  REST: { icon: Pause, badge: 'bg-ink-100 text-ink-600', iconBg: 'bg-ink-200 text-ink-600' },
  OTHER: {
    icon: Circle,
    badge: 'bg-accent-50 text-accent-700',
    iconBg: 'bg-accent-100 text-accent-700',
  },
}

interface DragData {
  type?: 'block' | 'step'
  blockKey?: string
}

function SortableStep({
  step,
  sport,
  blockKey,
  selected,
  onSelect,
}: {
  step: BuilderStep
  sport: Sport
  blockKey: string
  selected: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.key,
    data: { type: 'step', blockKey },
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const roleStyle = roleStyles[step.role]
  const Icon = roleStyle.icon
  const duration =
    step.durationType === 'TIME'
      ? formatClock(step.durationSec)
      : step.durationType === 'DISTANCE'
        ? formatDistance(step.distanceM)
        : 'Aberta'

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/step flex items-stretch gap-1 rounded-xl border bg-white transition',
        selected
          ? 'border-brand-400 shadow-sm ring-2 ring-brand-400/20'
          : 'border-ink-200 hover:border-ink-300',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        className="flex w-7 cursor-grab touch-none items-center justify-center rounded-l-xl text-ink-300 transition hover:bg-ink-50 hover:text-ink-500 active:cursor-grabbing"
        aria-label={`Reordenar step ${ROLE_LABELS[step.role]}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Selecionar step ${ROLE_LABELS[step.role]}`}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 pr-3"
      >
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            roleStyle.iconBg,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs font-semibold text-ink-800">{ROLE_LABELS[step.role]}</span>
            <span className="font-mono text-[11px] text-ink-500">{duration}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', roleStyle.badge)}>
              {describeTarget(step.target, sport)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-500">
            {step.notes || step.target.display || 'Sem observações'}
          </p>
        </div>
      </div>
    </div>
  )
}

function SortableBlock({
  block,
  sport,
  selectedStepKey,
  onSelectStep,
  onAddStep,
  onRemoveBlock,
  onUpdateBlock,
}: {
  block: BuilderBlock
  sport: Sport
  selectedStepKey: string | null
  onSelectStep: (blockKey: string, stepKey: string) => void
  onAddStep: (blockKey: string) => void
  onRemoveBlock: (blockKey: string) => void
  onUpdateBlock: (
    blockKey: string,
    patch: Partial<Pick<BuilderBlock, 'title' | 'repeatCount' | 'notes'>>,
  ) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.key,
    data: { type: 'block' },
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-ink-200 bg-white p-3 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded-lg p-1.5 text-ink-300 transition hover:bg-ink-100 hover:text-ink-600 active:cursor-grabbing"
          aria-label={`Reordenar bloco ${block.title || ''}`}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        <Input
          value={block.title}
          onChange={(event) => onUpdateBlock(block.key, { title: event.target.value })}
          placeholder="Título do bloco"
          aria-label="Título do bloco"
          className="h-8 max-w-[240px] flex-1 border-transparent bg-transparent px-1 text-sm font-bold shadow-none focus:border-ink-200 focus:bg-white"
        />

        <div className="ml-auto flex items-center gap-1.5">
          <label
            htmlFor={`repeat-${block.key}`}
            className="text-[11px] font-medium text-ink-500"
          >
            Repetições
          </label>
          <Input
            id={`repeat-${block.key}`}
            type="number"
            min="1"
            max="99"
            value={block.repeatCount}
            onChange={(event) =>
              onUpdateBlock(block.key, {
                repeatCount: Math.max(1, Math.min(99, Math.floor(Number(event.target.value) || 1))),
              })
            }
            className="h-8 w-16 px-2 text-center text-xs"
          />
          <button
            type="button"
            onClick={() => onRemoveBlock(block.key)}
            className="rounded-lg p-1.5 text-ink-300 transition hover:bg-ink-100 hover:text-ink-800"
            aria-label={`Remover bloco ${block.title || ''}`}
            title="Remover bloco"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <SortableContext
        items={block.steps.map((step) => step.key)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {block.steps.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-300 bg-ink-50 px-3 py-4 text-center text-xs text-ink-500">
              Nenhum step neste bloco. Arraste um step para cá ou adicione um novo.
            </p>
          ) : (
            block.steps.map((step) => (
              <SortableStep
                key={step.key}
                step={step}
                sport={sport}
                blockKey={block.key}
                selected={selectedStepKey === step.key}
                onSelect={() => onSelectStep(block.key, step.key)}
              />
            ))
          )}
        </div>
      </SortableContext>

      <div className="mt-2">
        <Button variant="ghost" size="sm" onClick={() => onAddStep(block.key)} className="w-full border-dashed border-ink-300">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Adicionar step
        </Button>
      </div>
    </div>
  )
}

interface BlockListProps {
  blocks: BuilderBlock[]
  sport: Sport
  selectedStepKey: string | null
  onSelectStep: (blockKey: string, stepKey: string) => void
  onAddStep: (blockKey: string) => void
  onRemoveBlock: (blockKey: string) => void
  onUpdateBlock: (
    blockKey: string,
    patch: Partial<Pick<BuilderBlock, 'title' | 'repeatCount' | 'notes'>>,
  ) => void
  onMoveBlock: (activeKey: string, overKey: string) => void
  onMoveStep: (activeKey: string, targetBlockKey: string, targetStepKey: string | null) => void
}

export function BlockList({
  blocks,
  sport,
  selectedStepKey,
  onSelectStep,
  onAddStep,
  onRemoveBlock,
  onUpdateBlock,
  onMoveBlock,
  onMoveStep,
}: BlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeData = active.data.current as DragData | undefined
    const overData = over.data.current as DragData | undefined
    if (!activeData || !overData) return

    if (activeData.type === 'block') {
      const overBlockKey =
        overData.type === 'block' ? String(over.id) : (overData.blockKey ?? null)
      if (overBlockKey && active.id !== overBlockKey) {
        onMoveBlock(String(active.id), overBlockKey)
      }
      return
    }

    if (activeData.type === 'step') {
      let targetBlockKey = overData.blockKey ?? null
      let targetStepKey: string | null = null
      if (overData.type === 'step') {
        targetStepKey = String(over.id)
      } else if (overData.type === 'block') {
        targetBlockKey = String(over.id)
      }
      if (!targetBlockKey) return
      onMoveStep(String(active.id), targetBlockKey, targetStepKey)
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-white/70 px-6 py-12 text-center">
        <p className="text-sm font-semibold text-ink-800">Nenhum bloco no treino</p>
        <p className="mt-1 text-xs text-ink-500">
          Use “Adicionar bloco” para começar a estruturar o treino.
        </p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((block) => block.key)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {blocks.map((block) => (
            <SortableBlock
              key={block.key}
              block={block}
              sport={sport}
              selectedStepKey={selectedStepKey}
              onSelectStep={onSelectStep}
              onAddStep={onAddStep}
              onRemoveBlock={onRemoveBlock}
              onUpdateBlock={onUpdateBlock}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
