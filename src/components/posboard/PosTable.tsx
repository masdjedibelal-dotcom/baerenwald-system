'use client'

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { PosAddRow, type PosAddKind } from '@/components/posboard/PosAddRow'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'

export type PosTableBadge = {
  kind?: string
  icon?: string
  label: string
}

export type PosTableItem = {
  id: string
  name: string
  beschreibung?: string
  mengeLabel?: string
  /** Rohwert für Inline-Edit */
  menge?: number
  einheit?: string
  preisLabel?: string
  badge?: PosTableBadge | null
}

export type PosTableGroup = {
  id: string
  gewerk: string
  titel?: string
  items: PosTableItem[]
}

function PosTableMenu({ items }: { items: EntityMenuItem[] }) {
  return <MockEntityRowMenu items={items} title="Position" />
}

function SelectBox({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 17,
        height: 17,
        flexShrink: 0,
        borderRadius: 4,
        border: `1.5px solid ${on ? 'var(--green)' : 'var(--border-strong)'}`,
        background: on ? 'var(--green)' : 'transparent',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        cursor: 'pointer',
      }}
    >
      {on ? <MockIcon ctx="default" n="check" size={11} /> : null}
    </span>
  )
}

function groupSortId(gewerk: string) {
  return `group:${gewerk}`
}

function parseGroupSortId(id: string): string | null {
  return id.startsWith('group:') ? id.slice(6) : null
}

function SortableGroupHeader({
  g,
  dnd,
  selectable,
  allSel,
  onToggleGroup,
  groupActions,
  onAddKind,
  unifiedAdd,
  addOpen,
  setAddOpenFor,
  children,
}: {
  g: PosTableGroup
  dnd: boolean
  selectable?: boolean
  allSel: boolean
  onToggleGroup?: (items: { id: string }[], allSel: boolean) => void
  groupActions?: (group: PosTableGroup) => EntityMenuItem[]
  onAddKind?: (kind: PosAddKind, gewerk?: string) => void
  unifiedAdd: boolean
  addOpen: boolean
  setAddOpenFor: (id: string | null) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: groupSortId(g.gewerk),
    disabled: !dnd,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }
  const items = g.items ?? []

  return (
    <div ref={setNodeRef} style={style}>
      <div className="pt2-sub" style={{ cursor: dnd ? 'grab' : undefined }}>
        {dnd ? (
          <span
            className="drag touch-none"
            title="Gewerk ziehen zum Sortieren"
            {...attributes}
            {...listeners}
          >
            <MockIcon ctx="default" n="grip-vertical" size={15} />
          </span>
        ) : null}
        {selectable ? (
          <span
            onClick={() => onToggleGroup?.(items, allSel)}
            style={{ display: 'inline-flex' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onToggleGroup?.(items, allSel)
            }}
          >
            <SelectBox on={allSel} />
          </span>
        ) : null}
        <span className="g">{g.gewerk || 'Ohne Gewerk'}</span>
        {g.titel ? <span className="gt">· {g.titel}</span> : null}
        <div style={{ flex: 1 }} />
        {onAddKind && !unifiedAdd ? (
          <button
            type="button"
            className={cn('pt2-gewerk-add', addOpen && 'is-open')}
            title="Position hinzufügen"
            aria-label="Position hinzufügen"
            aria-expanded={addOpen}
            onClick={() => setAddOpenFor(addOpen ? null : g.id)}
          >
            <MockIcon ctx="default" n="plus" size={14} />
          </button>
        ) : null}
        {groupActions ? <PosTableMenu items={groupActions(g)} /> : null}
      </div>
      {children}
    </div>
  )
}

function PosRowContent({
  g,
  it,
  dnd,
  dragHandleProps,
  selectable,
  sel,
  onToggleItem,
  onItemOpen,
  onMengeChange,
  itemActions,
  rowRef,
  rowStyle,
}: {
  g: PosTableGroup
  it: PosTableItem
  dnd: boolean
  dragHandleProps?: Record<string, unknown>
  selectable?: boolean
  sel: Record<string, boolean>
  onToggleItem?: (id: string) => void
  onItemOpen?: (it: PosTableItem, g: PosTableGroup) => void
  onMengeChange?: (id: string, menge: number) => void
  itemActions?: (group: PosTableGroup, item: PosTableItem) => EntityMenuItem[]
  rowRef?: (node: HTMLElement | null) => void
  rowStyle?: CSSProperties
}) {
  return (
    <div
      ref={rowRef}
      style={rowStyle}
      className={`pt2-row${sel[it.id] ? ' sel' : ''}${onItemOpen ? ' pt2-row--tap' : ''}`}
      role={onItemOpen ? 'button' : undefined}
      tabIndex={onItemOpen ? 0 : undefined}
      onClick={
        onItemOpen
          ? (e) => {
              const t = e.target as HTMLElement
              if (t.closest('button, a, .pt2-ctrl, .pt2-act, .row-actions, input, select, .drag')) {
                return
              }
              onItemOpen(it, g)
            }
          : undefined
      }
      onKeyDown={
        onItemOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onItemOpen(it, g)
              }
            }
          : undefined
      }
    >
      <div className="pt2-ctrl">
        {dnd ? (
          <span className="drag touch-none" title="Ziehen zum Sortieren" {...dragHandleProps}>
            <MockIcon ctx="default" n="grip-vertical" size={15} />
          </span>
        ) : null}
        {selectable ? (
          <span
            onClick={() => onToggleItem?.(it.id)}
            style={{ display: 'inline-flex' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onToggleItem?.(it.id)
            }}
          >
            <SelectBox on={!!sel[it.id]} />
          </span>
        ) : null}
      </div>
      <div className="pt2-main">
        {it.badge ? (
          <div className="pt2-status-row">
            <MockBadge kind={it.badge.kind}>
              {it.badge.icon ? <MockIcon ctx="default" n={it.badge.icon} size={10} /> : null}
              {it.badge.label}
            </MockBadge>
          </div>
        ) : null}
        <span className="pt-name">{it.name}</span>
        {it.beschreibung ? (
          <div className="pt-desc pt-desc--clamp2">{it.beschreibung}</div>
        ) : null}
        <div className="pt2-meta" aria-hidden={!it.mengeLabel && !it.preisLabel && !onMengeChange}>
          {onMengeChange ? (
            <span className="pt2-menge pt2-menge--inline" onClick={(e) => e.stopPropagation()}>
              <ClearableNumberInput
                className="pt2-menge-input"
                min={0.01}
                aria-label="Menge"
                value={it.menge ?? 0}
                blurEmptyValue={0.01}
                onValueChange={(n) => onMengeChange(it.id, n)}
              />
              {it.einheit ? <span className="pt2-menge-unit">{it.einheit}</span> : null}
            </span>
          ) : it.mengeLabel ? (
            <span className="pt2-menge">{it.mengeLabel}</span>
          ) : null}
          {it.preisLabel ? <span className="pt2-preis">{it.preisLabel}</span> : null}
        </div>
      </div>
      <div className="pt2-menge pt2-menge--desk">
        {onMengeChange ? (
          <span className="pt2-menge--inline" onClick={(e) => e.stopPropagation()}>
            <ClearableNumberInput
              className="pt2-menge-input"
              min={0.01}
              aria-label="Menge"
              value={it.menge ?? 0}
              blurEmptyValue={0.01}
              onValueChange={(n) => onMengeChange(it.id, n)}
            />
            {it.einheit ? <span className="pt2-menge-unit">{it.einheit}</span> : null}
          </span>
        ) : (
          (it.mengeLabel ?? '')
        )}
      </div>
      <div className="pt2-preis pt2-preis--desk">{it.preisLabel ?? ''}</div>
      <div className="pt2-act">
        {itemActions ? <PosTableMenu items={itemActions(g, it)} /> : null}
      </div>
    </div>
  )
}

function withSwipe(
  swipeEnabled: boolean,
  onCopyItem: ((id: string) => void) | undefined,
  onDeleteItem: ((id: string) => void) | undefined,
  itemId: string,
  row: ReactNode
) {
  if (!swipeEnabled) return row
  return (
    <SwipeRow
      leftActions={
        onDeleteItem
          ? [{ icon: 'trash', label: 'Löschen', onClick: () => onDeleteItem(itemId), tone: 'danger' }]
          : undefined
      }
      rightActions={
        onCopyItem
          ? [{ icon: 'copy', label: 'Kopieren', onClick: () => onCopyItem(itemId), tone: 'accent' }]
          : undefined
      }
    >
      {row}
    </SwipeRow>
  )
}

function SortablePosRow({
  g,
  it,
  dnd,
  selectable,
  sel,
  onToggleItem,
  onItemOpen,
  onMengeChange,
  itemActions,
  swipeEnabled,
  onCopyItem,
  onDeleteItem,
}: {
  g: PosTableGroup
  it: PosTableItem
  dnd: boolean
  selectable?: boolean
  sel: Record<string, boolean>
  onToggleItem?: (id: string) => void
  onItemOpen?: (it: PosTableItem, g: PosTableGroup) => void
  onMengeChange?: (id: string, menge: number) => void
  itemActions?: (group: PosTableGroup, item: PosTableItem) => EntityMenuItem[]
  swipeEnabled: boolean
  onCopyItem?: (id: string) => void
  onDeleteItem?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: it.id,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const row = (
    <PosRowContent
      g={g}
      it={it}
      dnd={dnd}
      dragHandleProps={{ ...attributes, ...listeners }}
      selectable={selectable}
      sel={sel}
      onToggleItem={onToggleItem}
      onItemOpen={onItemOpen}
      onMengeChange={onMengeChange}
      itemActions={itemActions}
      rowRef={setNodeRef}
      rowStyle={style}
    />
  )

  return withSwipe(swipeEnabled, onCopyItem, onDeleteItem, it.id, row)
}

function PlainPosRow({
  g,
  it,
  selectable,
  sel,
  onToggleItem,
  onItemOpen,
  onMengeChange,
  itemActions,
  swipeEnabled,
  onCopyItem,
  onDeleteItem,
}: {
  g: PosTableGroup
  it: PosTableItem
  selectable?: boolean
  sel: Record<string, boolean>
  onToggleItem?: (id: string) => void
  onItemOpen?: (it: PosTableItem, g: PosTableGroup) => void
  onMengeChange?: (id: string, menge: number) => void
  itemActions?: (group: PosTableGroup, item: PosTableItem) => EntityMenuItem[]
  swipeEnabled: boolean
  onCopyItem?: (id: string) => void
  onDeleteItem?: (id: string) => void
}) {
  const row = (
    <PosRowContent
      g={g}
      it={it}
      dnd={false}
      selectable={selectable}
      sel={sel}
      onToggleItem={onToggleItem}
      onItemOpen={onItemOpen}
      onMengeChange={onMengeChange}
      itemActions={itemActions}
    />
  )
  return withSwipe(swipeEnabled, onCopyItem, onDeleteItem, it.id, row)
}

export function PosTable({
  groups,
  onAddItem,
  onAddKind,
  onAddGroup,
  groupActions,
  itemActions,
  selectable,
  selected,
  onToggleItem,
  onToggleGroup,
  dnd,
  onReorder,
  onDropToGroup,
  onReorderGroup,
  onItemOpen,
  onMengeChange,
  onCopyItem,
  onDeleteItem,
  showTotals,
  netto,
  ust,
  brutto,
  disabledAddKinds,
  /** Unter Gewerk-Plus: nur diese Kinds (Komplex: Freitext + Nachlass) */
  gewerkAddKinds,
  /** Dokument-Toolbar unter den Gruppen (Komplex: Position/Freitext/Nachlass ohne Gewerk) */
  documentAddKinds,
  /** Mobil: keine Inline-Add-Row/Gewerk-+ — ein zentraler Plus-Button außen */
  unifiedAdd = false,
}: {
  groups: PosTableGroup[]
  /** @deprecated Prefer onAddKind — kept for per-group fallback */
  onAddItem?: (group: PosTableGroup) => void
  /** Optionen; optional mit Ziel-Gewerk (bei Plus pro Gruppe) */
  onAddKind?: (kind: PosAddKind, gewerk?: string) => void
  onAddGroup?: () => void
  groupActions?: (group: PosTableGroup) => EntityMenuItem[]
  itemActions?: (group: PosTableGroup, item: PosTableItem) => EntityMenuItem[]
  selectable?: boolean
  selected?: Record<string, boolean>
  onToggleItem?: (id: string) => void
  onToggleGroup?: (items: { id: string }[], allSel: boolean) => void
  dnd?: boolean
  onReorder?: (draggedId: string, targetId: string) => void
  onDropToGroup?: (draggedId: string, gewerk: string) => void
  onReorderGroup?: (draggedGewerk: string, targetGewerk: string) => void
  onItemOpen?: (item: PosTableItem, group: PosTableGroup) => void
  onMengeChange?: (id: string, menge: number) => void
  onCopyItem?: (id: string) => void
  onDeleteItem?: (id: string) => void
  showTotals?: boolean
  netto?: number
  ust?: number
  brutto?: number
  disabledAddKinds?: Partial<Record<PosAddKind, boolean>>
  gewerkAddKinds?: PosAddKind[]
  documentAddKinds?: PosAddKind[]
  unifiedAdd?: boolean
}) {
  const isMobile = useIsMobile()
  const sel = selected ?? {}
  const [addOpenFor, setAddOpenFor] = useState<string | null>(null)
  const hasGroups = (groups ?? []).length > 0
  const enableDnd = Boolean(dnd && (onReorder || onReorderGroup || onDropToGroup))
  const groupDnd = Boolean(enableDnd && onReorderGroup)
  const swipeEnabled = Boolean(isMobile && (onCopyItem || onDeleteItem))

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const itemIds = useMemo(
    () => (groups ?? []).flatMap((g) => (g.items ?? []).map((it) => it.id)),
    [groups]
  )
  const groupIds = useMemo(
    () => (groups ?? []).map((g) => groupSortId(g.gewerk)),
    [groups]
  )
  const sortableIds = useMemo(
    () => (groupDnd ? [...groupIds, ...itemIds] : itemIds),
    [groupDnd, groupIds, itemIds]
  )

  const itemGroupById = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of groups ?? []) {
      for (const it of g.items ?? []) m.set(it.id, g.gewerk)
    }
    return m
  }, [groups])

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const activeGroup = parseGroupSortId(activeId)
    const overGroup = parseGroupSortId(overId)

    if (activeGroup && overGroup && onReorderGroup) {
      onReorderGroup(activeGroup, overGroup)
      return
    }
    if (activeGroup) return

    const overAsGroup = overGroup
    if (overAsGroup && onDropToGroup) {
      onDropToGroup(activeId, overAsGroup)
      return
    }

    if (onReorder && itemIds.includes(overId)) {
      const fromGewerk = itemGroupById.get(activeId)
      const toGewerk = itemGroupById.get(overId)
      if (fromGewerk && toGewerk && fromGewerk !== toGewerk && onDropToGroup) {
        onDropToGroup(activeId, toGewerk)
        queueMicrotask(() => onReorder(activeId, overId))
        return
      }
      onReorder(activeId, overId)
    }
  }

  const body = (
    <>
      {(groups ?? []).map((g) => {
        const items = g.items ?? []
        const allSel = Boolean(selectable && items.length > 0 && items.every((it) => sel[it.id]))
        const addOpen = Boolean(onAddKind && addOpenFor === g.id)

        const itemList = (
          <>
            {items.length === 0 && !addOpen ? (
              <div
                className="pt2-empty"
                style={{
                  padding: '12px 14px',
                  fontSize: 'var(--fs-meta)',
                  color: 'var(--text-4)',
                  borderBottom: '0.5px solid var(--border)',
                }}
              >
                Keine Positionen
              </div>
            ) : null}
            {items.map((it) =>
              enableDnd ? (
                <SortablePosRow
                  key={it.id}
                  g={g}
                  it={it}
                  dnd={enableDnd}
                  selectable={selectable}
                  sel={sel}
                  onToggleItem={onToggleItem}
                  onItemOpen={onItemOpen}
                  onMengeChange={onMengeChange}
                  itemActions={itemActions}
                  swipeEnabled={swipeEnabled}
                  onCopyItem={onCopyItem}
                  onDeleteItem={onDeleteItem}
                />
              ) : (
                <PlainPosRow
                  key={it.id}
                  g={g}
                  it={it}
                  selectable={selectable}
                  sel={sel}
                  onToggleItem={onToggleItem}
                  onItemOpen={onItemOpen}
                  onMengeChange={onMengeChange}
                  itemActions={itemActions}
                  swipeEnabled={swipeEnabled}
                  onCopyItem={onCopyItem}
                  onDeleteItem={onDeleteItem}
                />
              )
            )}
            {addOpen && !unifiedAdd ? (
              <div className="pt2-gewerk-add-panel">
                <PosAddRow
                  kinds={gewerkAddKinds}
                  onAdd={(kind) => {
                    onAddKind?.(kind, g.gewerk)
                    setAddOpenFor(null)
                  }}
                  disabledKinds={disabledAddKinds}
                />
              </div>
            ) : null}
            {!onAddKind && onAddItem && !unifiedAdd ? (
              <button
                type="button"
                className="pt-add"
                onClick={() => onAddItem(g)}
                style={{ borderBottom: '0.5px solid var(--border)' }}
              >
                <MockIcon ctx="default" n="plus" size={13} /> Position hinzufügen
              </button>
            ) : null}
          </>
        )

        if (groupDnd) {
          return (
            <SortableGroupHeader
              key={g.id}
              g={g}
              dnd={groupDnd}
              selectable={selectable}
              allSel={allSel}
              onToggleGroup={onToggleGroup}
              groupActions={groupActions}
              onAddKind={onAddKind}
              unifiedAdd={unifiedAdd}
              addOpen={addOpen}
              setAddOpenFor={setAddOpenFor}
            >
              {itemList}
            </SortableGroupHeader>
          )
        }

        return (
          <div key={g.id}>
            <div className="pt2-sub">
              {selectable ? (
                <span
                  onClick={() => onToggleGroup?.(items, allSel)}
                  style={{ display: 'inline-flex' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onToggleGroup?.(items, allSel)
                  }}
                >
                  <SelectBox on={allSel} />
                </span>
              ) : null}
              <span className="g">{g.gewerk || 'Ohne Gewerk'}</span>
              {g.titel ? <span className="gt">· {g.titel}</span> : null}
              <div style={{ flex: 1 }} />
              {onAddKind && !unifiedAdd ? (
                <button
                  type="button"
                  className={cn('pt2-gewerk-add', addOpen && 'is-open')}
                  title="Position hinzufügen"
                  aria-label="Position hinzufügen"
                  aria-expanded={addOpen}
                  onClick={() => setAddOpenFor(addOpen ? null : g.id)}
                >
                  <MockIcon ctx="default" n="plus" size={14} />
                </button>
              ) : null}
              {groupActions ? <PosTableMenu items={groupActions(g)} /> : null}
            </div>
            {itemList}
          </div>
        )
      })}
      {onAddKind && !hasGroups && !unifiedAdd && !documentAddKinds ? (
        <div style={{ padding: '12px 0 4px' }}>
          <PosAddRow onAdd={(kind) => onAddKind(kind)} disabledKinds={disabledAddKinds} />
        </div>
      ) : null}
      {onAddKind && documentAddKinds && !unifiedAdd ? (
        <div style={{ padding: '12px 0 4px' }}>
          <PosAddRow
            kinds={documentAddKinds}
            onAdd={(kind) => onAddKind(kind)}
            disabledKinds={disabledAddKinds}
          />
        </div>
      ) : null}
      {onAddGroup && !unifiedAdd ? (
        <button
          type="button"
          className="pt-add"
          onClick={onAddGroup}
          style={{
            color: 'var(--green)',
            fontWeight: 600,
            borderBottom: showTotals ? '0.5px solid var(--border)' : 'none',
          }}
        >
          <MockIcon ctx="default" n="plus" size={14} /> Gewerk hinzufügen
        </button>
      ) : null}
      {showTotals ? (
        <div className="pt2-foot">
          <div className="r">
            <span>Netto</span>
            <b>{formatEurBetrag(netto ?? 0)}</b>
          </div>
          <div className="r">
            <span>MwSt 19%</span>
            <b>{formatEurBetrag(ust ?? 0)}</b>
          </div>
          <div className="r grand">
            <span>Brutto</span>
            <b>{formatEurBetrag(brutto ?? 0)}</b>
          </div>
        </div>
      ) : null}
    </>
  )

  return (
    <div className={unifiedAdd ? 'postable2 postable2--unified-add' : 'postable2'}>
      {enableDnd ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {body}
          </SortableContext>
        </DndContext>
      ) : (
        body
      )}
    </div>
  )
}

export type PosTableActionItem = EntityMenuItem

export function posTableMenuIcon(icon: string): ReactNode {
  return <MockIcon ctx="default" n={icon} size={15} />
}

/** @internal test helper */
export function posTableArrayMove<T>(arr: T[], from: number, to: number): T[] {
  return arrayMove(arr, from, to)
}
