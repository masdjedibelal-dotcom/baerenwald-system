'use client'

import { useRef, useState, type ReactNode } from 'react'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { PosAddRow, type PosAddKind } from '@/components/posboard/PosAddRow'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatEurBetrag } from '@/lib/dokument-zeilen'

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

type DragPayload =
  | { type: 'item'; id: string }
  | { type: 'group'; gewerk: string }

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
  showTotals,
  netto,
  ust,
  brutto,
  disabledAddKinds,
  /** Mobil: keine Inline-Add-Row/Gewerk-+ — ein zentraler Plus-Button außen */
  unifiedAdd = false,
}: {
  groups: PosTableGroup[]
  /** @deprecated Prefer onAddKind — kept for per-group fallback */
  onAddItem?: (group: PosTableGroup) => void
  /** 4 Optionen; optional mit Ziel-Gewerk (bei Plus pro Gruppe) */
  onAddKind?: (kind: PosAddKind, gewerk?: string) => void
  onAddGroup?: () => void
  groupActions?: (group: PosTableGroup) => EntityMenuItem[]
  itemActions?: (group: PosTableGroup, item: PosTableItem) => EntityMenuItem[]
  selectable?: boolean
  selected?: Record<string, boolean>
  onToggleItem?: (id: string) => void
  onToggleGroup?: (items: PosTableItem[], allSel: boolean) => void
  dnd?: boolean
  onReorder?: (draggedId: string, targetId: string) => void
  onDropToGroup?: (draggedId: string, gewerk: string) => void
  /** Gewerk-Abschnitte per Drag umsortieren */
  onReorderGroup?: (draggedGewerk: string, targetGewerk: string) => void
  /** Tip auf Zeile (mobil: Karte öffnen) */
  onItemOpen?: (item: PosTableItem, group: PosTableGroup) => void
  /** Inline Menge — feste Zellbreite, kein Layout-Shift */
  onMengeChange?: (id: string, menge: number) => void
  showTotals?: boolean
  netto?: number
  ust?: number
  brutto?: number
  disabledAddKinds?: Partial<Record<PosAddKind, boolean>>
  unifiedAdd?: boolean
}) {
  const sel = selected ?? {}
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overGroup, setOverGroup] = useState<string | null>(null)
  const [addOpenFor, setAddOpenFor] = useState<string | null>(null)
  const dragRef = useRef<DragPayload | null>(null)
  const hasGroups = (groups ?? []).length > 0
  const groupDnd = Boolean(dnd && onReorderGroup)

  const clearDrag = () => {
    dragRef.current = null
    setDragPayload(null)
    setOverId(null)
    setOverGroup(null)
  }

  return (
    <div className={unifiedAdd ? 'postable2 postable2--unified-add' : 'postable2'}>
      {(groups ?? []).map((g) => {
        const items = g.items ?? []
        const allSel = Boolean(selectable && items.length > 0 && items.every((it) => sel[it.id]))
        const addOpen = Boolean(onAddKind && addOpenFor === g.id)
        const isGroupOver = Boolean(
          groupDnd &&
            overGroup === g.gewerk &&
            dragPayload?.type === 'group' &&
            dragPayload.gewerk !== g.gewerk
        )
        const isGroupDragging = Boolean(
          dragPayload?.type === 'group' && dragPayload.gewerk === g.gewerk
        )
        return (
          <div key={g.id} style={{ opacity: isGroupDragging ? 0.45 : 1 }}>
            <div
              className={`pt2-sub${isGroupOver ? ' is-drag-over' : ''}`}
              draggable={groupDnd || undefined}
              onDragStart={
                groupDnd
                  ? (e) => {
                      const t = e.target as HTMLElement
                      if (t.closest('button, a, [role="button"], .row-actions, input, select')) {
                        e.preventDefault()
                        return
                      }
                      const payload: DragPayload = { type: 'group', gewerk: g.gewerk }
                      dragRef.current = payload
                      setDragPayload(payload)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', `group:${g.gewerk}`)
                    }
                  : undefined
              }
              onDragEnd={groupDnd ? clearDrag : undefined}
              onDragOver={
                dnd
                  ? (e) => {
                      e.preventDefault()
                      const drag = dragRef.current
                      if (drag?.type === 'group' && drag.gewerk !== g.gewerk) {
                        if (overGroup !== g.gewerk) setOverGroup(g.gewerk)
                      } else if (drag?.type === 'item') {
                        if (overGroup !== g.gewerk) setOverGroup(g.gewerk)
                      }
                    }
                  : undefined
              }
              onDragLeave={
                dnd
                  ? () => {
                      setOverGroup((cur) => (cur === g.gewerk ? null : cur))
                    }
                  : undefined
              }
              onDrop={
                dnd
                  ? (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const drag = dragRef.current
                      if (drag?.type === 'group' && onReorderGroup && drag.gewerk !== g.gewerk) {
                        onReorderGroup(drag.gewerk, g.gewerk)
                      } else if (drag?.type === 'item' && onDropToGroup) {
                        onDropToGroup(drag.id, g.gewerk)
                      }
                      clearDrag()
                    }
                  : undefined
              }
              style={{
                boxShadow: isGroupOver ? 'inset 0 2px 0 var(--green)' : undefined,
                cursor: groupDnd ? 'grab' : undefined,
              }}
            >
              {groupDnd ? (
                <span className="drag" title="Gewerk ziehen zum Sortieren">
                  <MockIcon ctx="default" n="grip-vertical" size={15} />
                </span>
              ) : null}
              {selectable ? (
                <span
                  onClick={() => onToggleGroup?.(items, allSel)}
                  title="Gewerk auswählen"
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
                  className={`pt2-gewerk-add${addOpen ? ' is-open' : ''}`}
                  title={addOpen ? 'Schließen' : 'Position zu diesem Gewerk hinzufügen'}
                  aria-expanded={addOpen}
                  aria-label={
                    addOpen
                      ? 'Hinzufügen schließen'
                      : `Position zu ${g.gewerk || 'Gewerk'} hinzufügen`
                  }
                  onClick={() => setAddOpenFor(addOpen ? null : g.id)}
                >
                  <MockIcon ctx="default" n={addOpen ? 'x' : 'plus'} size={14} />
                </button>
              ) : null}
              {groupActions ? <PosTableMenu items={groupActions(g)} /> : null}
            </div>
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
            {items.map((it) => {
              const isOver = Boolean(
                dnd &&
                  overId === it.id &&
                  dragPayload?.type === 'item' &&
                  dragPayload.id !== it.id
              )
              return (
                <div
                  key={it.id}
                  className={`pt2-row${sel[it.id] ? ' sel' : ''}${onItemOpen ? ' pt2-row--tap' : ''}`}
                  role={onItemOpen ? 'button' : undefined}
                  tabIndex={onItemOpen ? 0 : undefined}
                  onClick={
                    onItemOpen
                      ? (e) => {
                          const t = e.target as HTMLElement
                          if (t.closest('button, a, .pt2-ctrl, .pt2-act, .row-actions, input, select')) {
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
                  draggable={dnd || undefined}
                  onDragStart={
                    dnd
                      ? (e) => {
                          e.stopPropagation()
                          const payload: DragPayload = { type: 'item', id: it.id }
                          dragRef.current = payload
                          setDragPayload(payload)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', `item:${it.id}`)
                        }
                      : undefined
                  }
                  onDragOver={
                    dnd
                      ? (e) => {
                          if (dragRef.current?.type !== 'item') return
                          e.preventDefault()
                          e.stopPropagation()
                          if (overId !== it.id) setOverId(it.id)
                        }
                      : undefined
                  }
                  onDragEnd={dnd ? clearDrag : undefined}
                  onDrop={
                    dnd
                      ? (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const drag = dragRef.current
                          if (drag?.type === 'item' && drag.id !== it.id && onReorder) {
                            onReorder(drag.id, it.id)
                          }
                          clearDrag()
                        }
                      : undefined
                  }
                  style={{
                    boxShadow: isOver ? 'inset 0 2px 0 var(--green)' : 'none',
                    opacity: dragPayload?.type === 'item' && dragPayload.id === it.id ? 0.4 : 1,
                  }}
                >
                  <div className="pt2-ctrl">
                    {dnd ? (
                      <span className="drag" title="Ziehen zum Sortieren">
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
            })}
            {addOpen && !unifiedAdd ? (
              <div className="pt2-gewerk-add-panel">
                <PosAddRow
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
          </div>
        )
      })}
      {onAddKind && !hasGroups && !unifiedAdd ? (
        <div style={{ padding: '12px 0 4px' }}>
          <PosAddRow onAdd={(kind) => onAddKind(kind)} disabledKinds={disabledAddKinds} />
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
    </div>
  )
}

export type PosTableActionItem = EntityMenuItem

export function posTableMenuIcon(icon: string): ReactNode {
  return <MockIcon ctx="default" n={icon} size={15} />
}
