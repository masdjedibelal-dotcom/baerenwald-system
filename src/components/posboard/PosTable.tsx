'use client'

import { useRef, useState, type ReactNode } from 'react'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
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
      {on ? <MockIcon n="check" size={11} /> : null}
    </span>
  )
}

export function PosTable({
  groups,
  onAddItem,
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
  showTotals,
  netto,
  ust,
  brutto,
}: {
  groups: PosTableGroup[]
  onAddItem?: (group: PosTableGroup) => void
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
  showTotals?: boolean
  netto?: number
  ust?: number
  brutto?: number
}) {
  const sel = selected ?? {}
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const dragRef = useRef<string | null>(null)

  return (
    <div className="postable2">
      {(groups ?? []).map((g) => {
        const items = g.items ?? []
        const allSel = Boolean(selectable && items.length > 0 && items.every((it) => sel[it.id]))
        return (
          <div key={g.id}>
            <div
              className="pt2-sub"
              onDragOver={dnd ? (e) => e.preventDefault() : undefined}
              onDrop={
                dnd
                  ? (e) => {
                      e.preventDefault()
                      const d = dragRef.current
                      if (d && onDropToGroup) onDropToGroup(d, g.gewerk)
                      dragRef.current = null
                      setDragId(null)
                      setOverId(null)
                    }
                  : undefined
              }
            >
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
              {groupActions ? <PosTableMenu items={groupActions(g)} /> : null}
            </div>
            {items.length === 0 ? (
              <div
                style={{
                  padding: '12px 14px',
                  fontSize: 12.5,
                  color: 'var(--text-4)',
                  borderBottom: '0.5px solid var(--border)',
                }}
              >
                Keine Positionen
              </div>
            ) : null}
            {items.map((it) => {
              const isOver = Boolean(dnd && overId === it.id && dragId && dragId !== it.id)
              return (
                <div
                  key={it.id}
                  className={`pt2-row${sel[it.id] ? ' sel' : ''}`}
                  draggable={dnd || undefined}
                  onDragStart={
                    dnd
                      ? (e) => {
                          dragRef.current = it.id
                          setDragId(it.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }
                      : undefined
                  }
                  onDragOver={
                    dnd
                      ? (e) => {
                          e.preventDefault()
                          if (overId !== it.id) setOverId(it.id)
                        }
                      : undefined
                  }
                  onDragEnd={
                    dnd
                      ? () => {
                          dragRef.current = null
                          setDragId(null)
                          setOverId(null)
                        }
                      : undefined
                  }
                  onDrop={
                    dnd
                      ? (e) => {
                          e.preventDefault()
                          const d = dragRef.current
                          if (d && d !== it.id && onReorder) onReorder(d, it.id)
                          dragRef.current = null
                          setDragId(null)
                          setOverId(null)
                        }
                      : undefined
                  }
                  style={{
                    boxShadow: isOver ? 'inset 0 2px 0 var(--green)' : 'none',
                    opacity: dragId === it.id ? 0.4 : 1,
                  }}
                >
                  <div className="pt2-ctrl">
                    {dnd ? (
                      <span className="drag" title="Ziehen zum Sortieren">
                        <MockIcon n="grip-vertical" size={15} />
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
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="pt-name">{it.name}</span>
                      {it.badge ? (
                        <MockBadge kind={it.badge.kind}>
                          {it.badge.icon ? <MockIcon n={it.badge.icon} size={10} /> : null}
                          {it.badge.label}
                        </MockBadge>
                      ) : null}
                    </div>
                    {it.beschreibung ? <div className="pt-desc">{it.beschreibung}</div> : null}
                  </div>
                  <div className="pt2-menge">{it.mengeLabel ?? ''}</div>
                  <div className="pt2-preis">{it.preisLabel ?? ''}</div>
                  <div className="pt2-act">
                    {itemActions ? <PosTableMenu items={itemActions(g, it)} /> : null}
                  </div>
                </div>
              )
            })}
            {onAddItem ? (
              <button
                type="button"
                className="pt-add"
                onClick={() => onAddItem(g)}
                style={{ borderBottom: '0.5px solid var(--border)' }}
              >
                <MockIcon n="plus" size={13} /> Position hinzufügen
              </button>
            ) : null}
          </div>
        )
      })}
      {onAddGroup ? (
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
          <MockIcon n="plus" size={14} /> Gewerk hinzufügen
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
  return <MockIcon n={icon} size={15} />
}
