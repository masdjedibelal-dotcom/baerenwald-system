'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { PositionModal } from '@/components/posboard/PositionModal'
import {
  PosTable,
  type PosTableBadge,
  type PosTableGroup,
} from '@/components/posboard/PosTable'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  neuePosBoardLine,
  posBoardLineNetto,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type { EntityMenuItem } from '@/lib/entity-menu'

export type PosBoardBadge = PosTableBadge

export type PosBoardBulkAction = {
  icon?: string
  label: string
  onClick: () => void
}

export type PosBoardProps = {
  positionen: PosBoardLine[]
  onChange?: (next: PosBoardLine[]) => void
  showUst?: boolean
  title?: string
  renderEditor?: (
    position: PosBoardLine,
    helpers: {
      onChange: (patch: Partial<PosBoardLine>) => void
      onClose: () => void
      onRemove: () => void
    }
  ) => ReactNode
  lineOf?: (p: PosBoardLine) => number
  preisLabelOf?: (p: PosBoardLine) => string
  mengeLabelOf?: (p: PosBoardLine) => string
  badgeOf?: (p: PosBoardLine) => PosBoardBadge | null
  makeNew?: (gewerk: string) => Omit<PosBoardLine, 'id'>
  itemExtraActions?: (
    group: PosTableGroup,
    item: { id: string }
  ) => EntityMenuItem[]
  groupExtraActions?: (group: PosTableGroup) => EntityMenuItem[]
  selectable?: boolean
  bulkActions?: (selected: PosBoardLine[], clearSel: () => void) => PosBoardBulkAction[]
  hideAddGewerk?: boolean
  gewerke?: string[]
  headerAction?: ReactNode
  className?: string
}

function gewerkOf(p: PosBoardLine): string {
  return p.gewerk?.trim() || 'Allgemein'
}

function defaultMengeLabel(p: PosBoardLine): string {
  return `${p.menge != null ? p.menge + ' ' : ''}${p.einheit || ''}`.trim()
}

export function PosBoard({
  positionen,
  onChange,
  showUst = true,
  title,
  renderEditor,
  lineOf,
  preisLabelOf,
  mengeLabelOf,
  badgeOf,
  makeNew,
  itemExtraActions,
  groupExtraActions,
  selectable,
  bulkActions,
  hideAddGewerk = false,
  gewerke = [],
  headerAction,
  className,
}: PosBoardProps) {
  const editable = Boolean(onChange)
  const [editId, setEditId] = useState<string | null>(null)
  const [gEdit, setGEdit] = useState<string | null>(null)
  const [gName, setGName] = useState('')
  const [sel, setSel] = useState<Record<string, boolean>>({})

  const _line = lineOf ?? posBoardLineNetto

  const update = (id: string, patch: Partial<PosBoardLine>) => {
    if (!onChange) return
    onChange(positionen.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const remove = (id: string) => {
    if (!onChange) return
    onChange(positionen.filter((p) => p.id !== id))
    if (editId === id) setEditId(null)
    setSel((s) => {
      const n = { ...s }
      delete n[id]
      return n
    })
  }

  const dup = (id: string) => {
    if (!onChange) return
    const i = positionen.findIndex((p) => p.id === id)
    if (i < 0) return
    const src = positionen[i]
    const copy: PosBoardLine = {
      ...src,
      id: neuePosBoardLine().id,
      name: `${src.name || 'Position'} (Kopie)`,
    }
    const arr = [...positionen]
    arr.splice(i + 1, 0, copy)
    onChange(arr)
  }

  const add = (gewerk: string) => {
    if (!onChange) return
    const id = neuePosBoardLine().id
    const np: PosBoardLine = makeNew
      ? { ...makeNew(gewerk), id }
      : neuePosBoardLine({ gewerk: gewerk || '', id })
    onChange([...positionen, np])
    setEditId(id)
  }

  const addGewerk = () => {
    const names = new Set(positionen.map(gewerkOf))
    let n = 1
    let name = 'Neues Gewerk'
    while (names.has(name)) {
      name = `Neues Gewerk ${++n}`
    }
    add(name)
  }

  const renameGewerk = (from: string, to: string) => {
    if (!onChange) return
    onChange(positionen.map((p) => (gewerkOf(p) === from ? { ...p, gewerk: to } : p)))
  }

  const copyGewerk = (gewerk: string) => {
    if (!onChange) return
    const src = positionen.filter((p) => gewerkOf(p) === gewerk)
    const copies = src.map((p, i) => ({
      ...p,
      id: `${neuePosBoardLine().id}-${i}`,
      gewerk: `${gewerk} (Kopie)`,
    }))
    onChange([...positionen, ...copies])
  }

  const deleteGewerk = (gewerk: string) => {
    if (!onChange) return
    onChange(positionen.filter((p) => gewerkOf(p) !== gewerk))
  }

  const reorder = (draggedId: string, targetId: string) => {
    if (!onChange || draggedId === targetId) return
    const from = positionen.findIndex((p) => p.id === draggedId)
    const targetPos = positionen.find((p) => p.id === targetId)
    if (from < 0 || !targetPos) return
    const moved = { ...positionen[from], gewerk: gewerkOf(targetPos) }
    const arr = positionen.filter((p) => p.id !== draggedId)
    const to = arr.findIndex((p) => p.id === targetId)
    arr.splice(to < 0 ? arr.length : to, 0, moved)
    onChange(arr)
  }

  const dropToGroup = (draggedId: string, gewerk: string) => {
    if (!onChange) return
    const from = positionen.findIndex((p) => p.id === draggedId)
    if (from < 0) return
    const moved = { ...positionen[from], gewerk }
    const arr = positionen.filter((p) => p.id !== draggedId)
    let lastIdx = -1
    arr.forEach((p, i) => {
      if (gewerkOf(p) === gewerk) lastIdx = i
    })
    arr.splice(lastIdx + 1, 0, moved)
    onChange(arr)
  }

  const netto = positionen.reduce((s, p) => s + _line(p), 0)
  const ust = positionen.reduce(
    (s, p) => s + _line(p) * ((p.ust != null ? Number(p.ust) : 19) / 100),
    0
  )
  const brutto = netto + ust

  const groups = useMemo((): PosTableGroup[] => {
    const map = new Map<string, PosBoardLine[]>()
    positionen.forEach((p) => {
      const g = gewerkOf(p)
      const arr = map.get(g) ?? []
      arr.push(p)
      map.set(g, arr)
    })
    return Array.from(map.entries()).map(([gewerk, arr], gi) => ({
      id: `g${gi}`,
      gewerk,
      items: arr.map((p: PosBoardLine) => ({
        id: p.id,
        name:
          p.name != null && p.name !== ''
            ? p.name
            : p.beschreibung || '(ohne Bezeichnung)',
        beschreibung: p.name != null && p.name !== '' ? p.beschreibung : '',
        mengeLabel: mengeLabelOf ? mengeLabelOf(p) : defaultMengeLabel(p),
        preisLabel: preisLabelOf ? preisLabelOf(p) : formatEurBetrag(_line(p)),
        badge: badgeOf ? badgeOf(p) : null,
      })),
    }))
  }, [positionen, mengeLabelOf, preisLabelOf, badgeOf, _line])

  const itemActions = editable
    ? (g: PosTableGroup, it: { id: string }) => {
        const items: EntityMenuItem[] = [
          {
            label: 'Bearbeiten',
            icon: 'pencil',
            onClick: () => setEditId(it.id),
          },
          {
            label: 'Kopieren',
            icon: 'copy',
            onClick: () => dup(it.id),
          },
          ...(itemExtraActions?.(g, it) ?? []),
          'sep',
          {
            label: 'Löschen',
            icon: 'trash',
            danger: true,
            onClick: () => remove(it.id),
          },
        ]
        return items
      }
    : undefined

  const groupActions = editable
    ? (g: PosTableGroup) => {
        const items: EntityMenuItem[] = [
          {
            label: 'Position hinzufügen',
            icon: 'plus',
            onClick: () => add(g.gewerk),
          },
          {
            label: 'Gewerk bearbeiten',
            icon: 'pencil',
            onClick: () => {
              setGEdit(g.gewerk)
              setGName(g.gewerk)
            },
          },
          {
            label: 'Gewerk kopieren',
            icon: 'copy',
            onClick: () => copyGewerk(g.gewerk),
          },
          ...(groupExtraActions?.(g) ?? []),
          'sep',
          {
            label: 'Gewerk löschen',
            icon: 'trash',
            danger: true,
            onClick: () => deleteGewerk(g.gewerk),
          },
        ]
        return items
      }
    : undefined

  const toggleItem = (id: string) => setSel((s) => ({ ...s, [id]: !s[id] }))
  const toggleGroup = (items: { id: string }[], allSel: boolean) =>
    setSel((s) => {
      const n = { ...s }
      items.forEach((it) => {
        if (allSel) delete n[it.id]
        else n[it.id] = true
      })
      return n
    })

  const selectedIds = Object.keys(sel).filter((k) => sel[k])
  const selectedPositions = positionen.filter((p) => sel[p.id])
  const clearSel = () => setSel({})

  const editP = positionen.find((p) => p.id === editId)
  const helpers = editP
    ? {
        onChange: (patch: Partial<PosBoardLine>) => update(editP.id, patch),
        onClose: () => setEditId(null),
        onRemove: () => remove(editP.id),
      }
    : null

  const gewerkOptions = useMemo(() => {
    const fromLines = positionen.map((p) => gewerkOf(p))
    return Array.from(new Set([...gewerke, ...fromLines]))
  }, [positionen, gewerke])

  return (
    <div className={className}>
      {title ? (
        <div
          className="section-h"
          style={{
            margin: '2px 2px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span>{title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {headerAction}
            <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12.5 }}>
              {positionen.length} {positionen.length === 1 ? 'Position' : 'Positionen'}
            </span>
          </div>
        </div>
      ) : null}
      {selectable && selectedIds.length > 0 ? (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            marginBottom: 10,
            background: 'var(--green-dark)',
            color: '#fff',
            borderRadius: 10,
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          <MockIcon n="checks" size={16} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{selectedIds.length} ausgewählt</span>
          <div style={{ flex: 1 }} />
          {(bulkActions ? bulkActions(selectedPositions, clearSel) : []).map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={a.onClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'rgba(255,255,255,0.16)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {a.icon ? <MockIcon n={a.icon} size={15} /> : null}
              {a.label}
            </button>
          ))}
          <button
            type="button"
            onClick={clearSel}
            title="Auswahl aufheben"
            style={{
              display: 'inline-flex',
              padding: 6,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
            }}
          >
            <MockIcon n="x" size={16} />
          </button>
        </div>
      ) : null}
      <PosTable
        groups={groups}
        onAddItem={editable ? (g) => add(g.gewerk) : undefined}
        onAddGroup={editable && !hideAddGewerk ? addGewerk : undefined}
        groupActions={groupActions}
        itemActions={itemActions}
        selectable={selectable}
        selected={sel}
        onToggleItem={toggleItem}
        onToggleGroup={toggleGroup}
        dnd={editable}
        onReorder={reorder}
        onDropToGroup={dropToGroup}
        showTotals={showUst !== false}
        netto={netto}
        ust={ust}
        brutto={brutto}
      />
      {editP && helpers
        ? renderEditor
          ? renderEditor(editP, helpers)
          : (
              <PositionModal
                position={editP}
                onChange={helpers.onChange}
                onClose={helpers.onClose}
                onRemove={editable ? helpers.onRemove : undefined}
                showUst={showUst}
                gewerke={gewerkOptions}
              />
            )
        : null}
      {gEdit != null ? (
        <MockModal
          open
          onClose={() => setGEdit(null)}
          icon="folder"
          title="Gewerk bearbeiten"
          sub={gEdit}
          footer={
            <>
              <div style={{ flex: 1 }} />
              <MockBtn
                sm
                kind="primary"
                icon="check"
                onClick={() => {
                  if (gName.trim() && gName.trim() !== gEdit) renameGewerk(gEdit, gName.trim())
                  setGEdit(null)
                }}
              >
                Speichern
              </MockBtn>
            </>
          }
        >
          <div className="field">
            <div className="field-label">Gewerk-Bezeichnung</div>
            <input
              className="txt"
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              placeholder="z.B. Sanitär · Heizung"
              autoFocus
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            Benennt das Gewerk für alle Positionen dieser Gruppe um.
          </div>
        </MockModal>
      ) : null}
    </div>
  )
}
