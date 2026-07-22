'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { PositionModal } from '@/components/posboard/PositionModal'
import type { PosAddKind } from '@/components/posboard/PosAddRow'
import {
  PosTable,
  type PosTableBadge,
  type PosTableGroup,
} from '@/components/posboard/PosTable'
import { KatalogPickModal } from '@/components/posboard/KatalogPickModal'
import {
  PosBoardKiSuggestions,
  type PosBoardSuggestContext,
} from '@/components/posboard/PosBoardKiSuggestions'
import { preislisteEinheitspreisNetto } from '@/lib/angebote/angebot-positionen-from-lead'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  neuePosBoardLine,
  posBoardLineNetto,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { richTextToPlain } from '@/lib/rich-text'
import type { Preisliste } from '@/lib/types'

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
  /** Für „Aus Preisliste“ — ohne Liste wird die Option deaktiviert */
  preislisten?: Preisliste[]
  headerAction?: ReactNode
  /** Anfrage-/Projekttext für Katalog-KI-Vorschläge */
  suggestContext?: PosBoardSuggestContext | null
  className?: string
}

function gewerkOf(p: PosBoardLine): string {
  return p.gewerk?.trim() || 'Allgemein'
}

function defaultMengeLabel(p: PosBoardLine): string {
  if (p.kind === 'freitext') return '—'
  if (p.kind === 'nachlass') {
    return p.nachlassModus === 'betrag' ? 'Betrag' : `${p.preis || 0} %`
  }
  return `${p.menge != null ? p.menge + ' ' : ''}${p.einheit || ''}`.trim()
}

function defaultPreisLabel(p: PosBoardLine, lineNetto: number): string {
  if (p.kind === 'freitext') return '—'
  if (p.kind === 'nachlass') {
    if (p.nachlassModus === 'betrag') return `−${formatEurBetrag(p.preis || 0)}`
    return `−${p.preis || 0} %`
  }
  return formatEurBetrag(lineNetto)
}

function defaultBadge(p: PosBoardLine): PosBoardBadge | null {
  if (p.kind === 'freitext') return { kind: 'neutral', icon: 'align-left', label: 'Freitext' }
  if (p.kind === 'nachlass') return { kind: 'warn', icon: 'percent', label: 'Nachlass' }
  return null
}

export function PosBoard({
  positionen: positionenProp,
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
  preislisten = [],
  headerAction,
  suggestContext = null,
  className,
}: PosBoardProps) {
  const positionen = Array.isArray(positionenProp) ? positionenProp : []
  const editable = Boolean(onChange)
  const [editId, setEditId] = useState<string | null>(null)
  const [gEdit, setGEdit] = useState<string | null>(null)
  const [gName, setGName] = useState('')
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [preislisteOpen, setPreislisteOpen] = useState(false)
  const [katalogOpen, setKatalogOpen] = useState(false)
  const [preislistePick, setPreislistePick] = useState('')
  const [preislisteTargetGewerk, setPreislisteTargetGewerk] = useState<string | null>(null)
  const [gewerkAddOpen, setGewerkAddOpen] = useState(false)
  const [gewerkAddPick, setGewerkAddPick] = useState('')
  const [gewerkAddCustom, setGewerkAddCustom] = useState('')

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
    if (src.kind === 'nachlass') return
    const copy: PosBoardLine = {
      ...src,
      id: neuePosBoardLine().id,
      name: `${src.name || 'Position'} (Kopie)`,
    }
    const arr = [...positionen]
    arr.splice(i + 1, 0, copy)
    onChange(arr)
  }

  const defaultGewerk = (): string => {
    if (positionen.length === 0) return gewerke[0] || 'Allgemein'
    return gewerkOf(positionen[positionen.length - 1])
  }

  const addPosition = (gewerk: string) => {
    if (!onChange) return
    const id = neuePosBoardLine().id
    const np: PosBoardLine = makeNew
      ? {
          ...makeNew(gewerk),
          id,
          kind: 'position',
          position_quelle: 'frei',
          variante_id: null,
          preisliste_id: null,
        }
      : neuePosBoardLine({
          gewerk: gewerk || '',
          id,
          kind: 'position',
          name: '',
          position_quelle: 'frei',
          variante_id: null,
          preisliste_id: null,
        })
    onChange([...positionen, np])
    setEditId(id)
  }

  const addFreitext = (gewerk?: string) => {
    if (!onChange) return
    const id = neuePosBoardLine().id
    const np = neuePosBoardLine({
      id,
      gewerk: gewerk?.trim() || defaultGewerk(),
      name: '',
      beschreibung: '',
      menge: 0,
      einheit: '',
      preis: 0,
      ust: 0,
      kind: 'freitext',
    })
    onChange([...positionen, np])
    setEditId(id)
  }

  const addNachlass = () => {
    if (!onChange) return
    const existing = positionen.find((p) => p.kind === 'nachlass')
    if (existing) {
      setEditId(existing.id)
      return
    }
    const id = neuePosBoardLine().id
    const np = neuePosBoardLine({
      id,
      gewerk: 'Allgemein',
      name: 'Nachlass',
      menge: 1,
      einheit: '%',
      preis: 0,
      ust: 0,
      kind: 'nachlass',
      nachlassModus: 'prozent',
    })
    onChange([...positionen, np])
    setEditId(id)
  }

  const addFromPreisliste = (pl: Preisliste) => {
    if (!onChange) return
    const id = neuePosBoardLine().id
    const gewerkName =
      preislisteTargetGewerk?.trim() || pl.gewerke?.name?.trim() || defaultGewerk()
    const np = neuePosBoardLine({
      id,
      gewerk: gewerkName,
      name: pl.leistung,
      beschreibung: '',
      menge: 1,
      einheit: pl.einheit || 'Stück',
      preis: preislisteEinheitspreisNetto(pl),
      ust: 19,
      kind: 'position',
      preisliste_id: pl.id,
      variante_id: pl.id,
      position_quelle: 'katalog',
    })
    onChange([...positionen, np])
    setPreislisteOpen(false)
    setPreislistePick('')
    setPreislisteTargetGewerk(null)
    setEditId(id)
  }

  const addFromKatalog = (r: {
    position: { titel: string; gewerk_name?: string | null }
    variante: {
      id: string
      beschreibung: string
      einheit: string
      preis: number
    }
    menge: number
    beschreibung: string
  }) => {
    if (!onChange) return
    const id = neuePosBoardLine().id
    const gewerkName =
      preislisteTargetGewerk?.trim() ||
      r.position.gewerk_name?.trim() ||
      defaultGewerk()
    const np = neuePosBoardLine({
      id,
      gewerk: gewerkName,
      name: r.position.titel,
      beschreibung: r.beschreibung,
      menge: r.menge,
      einheit: r.variante.einheit || 'Stück',
      preis: Number(r.variante.preis) || 0,
      ust: 19,
      kind: 'position',
      preisliste_id: r.variante.id,
      variante_id: r.variante.id,
      position_quelle: 'katalog',
    })
    onChange([...positionen, np])
    setEditId(id)
  }

  const onAddKind = (kind: PosAddKind, gewerk?: string) => {
    const target = gewerk?.trim() || defaultGewerk()
    if (kind === 'position') addPosition(target)
    else if (kind === 'freitext') addFreitext(target)
    else if (kind === 'nachlass') addNachlass()
    else if (kind === 'preisliste') {
      setPreislisteTargetGewerk(target)
      setKatalogOpen(true)
    }
  }

  const addGewerk = () => {
    setGewerkAddPick('')
    setGewerkAddCustom('')
    setGewerkAddOpen(true)
  }

  const confirmAddGewerk = () => {
    const used = new Set(positionen.map(gewerkOf))
    const fromSelect = gewerkAddPick.trim()
    const fromCustom = gewerkAddCustom.trim()
    let name = fromCustom || fromSelect
    if (!name) return
    if (used.has(name)) {
      let n = 2
      const base = name
      while (used.has(`${base} ${n}`)) n += 1
      name = `${base} ${n}`
    }
    setGewerkAddOpen(false)
    setGewerkAddPick('')
    setGewerkAddCustom('')
    addPosition(name)
  }

  const renameGewerk = (from: string, to: string) => {
    if (!onChange) return
    onChange(positionen.map((p) => (gewerkOf(p) === from ? { ...p, gewerk: to } : p)))
  }

  const copyGewerk = (gewerk: string) => {
    if (!onChange) return
    const src = positionen.filter((p) => gewerkOf(p) === gewerk && p.kind !== 'nachlass')
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

  /** Gewerk-Abschnitte als Blöcke umsortieren (Flat-Array-Reihenfolge). */
  const reorderGroups = (draggedGewerk: string, targetGewerk: string) => {
    if (!onChange || draggedGewerk === targetGewerk) return
    const map = new Map<string, PosBoardLine[]>()
    const order: string[] = []
    for (const p of positionen) {
      const g = gewerkOf(p)
      if (!map.has(g)) {
        map.set(g, [])
        order.push(g)
      }
      map.get(g)!.push(p)
    }
    const fromIdx = order.indexOf(draggedGewerk)
    if (fromIdx < 0 || !order.includes(targetGewerk)) return
    order.splice(fromIdx, 1)
    const insertAt = order.indexOf(targetGewerk)
    if (insertAt < 0) return
    order.splice(insertAt, 0, draggedGewerk)
    onChange(order.flatMap((g) => map.get(g) ?? []))
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
      items: arr.map((p: PosBoardLine) => {
        const namePlain = richTextToPlain(p.name)
        const beschPlain = richTextToPlain(p.beschreibung)
        const lineNetto = _line(p)
        return {
          id: p.id,
          name: namePlain || beschPlain || '(ohne Bezeichnung)',
          beschreibung: namePlain ? beschPlain : '',
          mengeLabel: mengeLabelOf ? mengeLabelOf(p) : defaultMengeLabel(p),
          preisLabel: preisLabelOf ? preisLabelOf(p) : defaultPreisLabel(p, lineNetto),
          badge: badgeOf ? badgeOf(p) : defaultBadge(p),
        }
      }),
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

  const gewerkeZumHinzufuegen = useMemo(() => {
    const used = new Set(positionen.map(gewerkOf))
    return gewerke.filter((g) => g.trim() && !used.has(g.trim()))
  }, [gewerke, positionen])

  const aktivePreislisten = useMemo(
    () => preislisten.filter((p) => p.aktiv !== false),
    [preislisten]
  )

  const existingVarianteIds = useMemo(
    () =>
      new Set(
        positionen
          .map((p) => p.variante_id || p.preisliste_id)
          .filter((id): id is string => Boolean(id))
      ),
    [positionen]
  )

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
          <MockIcon ctx="default" n="checks" size={16} />
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
              {a.icon ? <MockIcon ctx="default" n={a.icon} size={15} /> : null}
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
            <MockIcon ctx="default" n="x" size={16} />
          </button>
        </div>
      ) : null}
      {editable && suggestContext?.text?.trim() ? (
        <PosBoardKiSuggestions
          context={suggestContext}
          existingVarianteIds={existingVarianteIds}
          onAccept={(item) =>
            addFromKatalog({
              position: { titel: item.titel, gewerk_name: item.gewerk_name },
              variante: {
                id: item.variante_id,
                beschreibung: item.beschreibung,
                einheit: item.einheit,
                preis: item.preis,
              },
              menge: 1,
              beschreibung: item.beschreibung,
            })
          }
        />
      ) : null}
      <PosTable
        groups={groups}
        onAddKind={editable ? onAddKind : undefined}
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
        onReorderGroup={reorderGroups}
        showTotals={showUst !== false}
        netto={netto}
        ust={ust}
        brutto={brutto}
        disabledAddKinds={{
          preisliste: false,
        }}
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
          icon="folder-open"
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
      {gewerkAddOpen ? (
        <MockModal
          open
          onClose={() => {
            setGewerkAddOpen(false)
            setGewerkAddPick('')
            setGewerkAddCustom('')
          }}
          icon="folder"
          title="Gewerk hinzufügen"
          sub="Abschnitt aus Stammdaten oder freier Bezeichnung"
          footer={
            <>
              <div style={{ flex: 1 }} />
              <MockBtn
                sm
                kind="primary"
                icon="check"
                disabled={!gewerkAddCustom.trim() && !gewerkAddPick.trim()}
                onClick={confirmAddGewerk}
              >
                Hinzufügen
              </MockBtn>
            </>
          }
        >
          {gewerkeZumHinzufuegen.length > 0 ? (
            <div className="field">
              <div className="field-label">Aus Stammdaten</div>
              <select
                className="sel"
                value={gewerkAddPick}
                onChange={(e) => {
                  setGewerkAddPick(e.target.value)
                  if (e.target.value) setGewerkAddCustom('')
                }}
                autoFocus
              >
                <option value="">Gewerk wählen…</option>
                {gewerkeZumHinzufuegen.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 10 }}>
              {gewerke.length === 0
                ? 'Keine Gewerke in den Stammdaten — bitte freie Bezeichnung nutzen.'
                : 'Alle Stammdaten-Gewerke sind bereits als Abschnitt vorhanden.'}
            </div>
          )}
          <div className="field" style={{ marginTop: gewerkeZumHinzufuegen.length ? 12 : 0 }}>
            <div className="field-label">Oder freie Bezeichnung</div>
            <input
              className="txt"
              value={gewerkAddCustom}
              onChange={(e) => {
                setGewerkAddCustom(e.target.value)
                if (e.target.value.trim()) setGewerkAddPick('')
              }}
              placeholder="z.B. Trockenbau · 1. OG"
            />
          </div>
        </MockModal>
      ) : null}
      {katalogOpen ? (
        <KatalogPickModal
          open
          preferredGewerkName={preislisteTargetGewerk}
          onClose={() => {
            setKatalogOpen(false)
            setPreislisteTargetGewerk(null)
          }}
          onPick={addFromKatalog}
        />
      ) : null}
      {preislisteOpen ? (
        <MockModal
          open
          onClose={() => {
            setPreislisteOpen(false)
            setPreislistePick('')
            setPreislisteTargetGewerk(null)
          }}
          icon="list-filter"
          title="Aus Preisliste (Legacy)"
          sub="Fallback bis Katalog importiert ist"
          footer={
            <>
              <div style={{ flex: 1 }} />
              <MockBtn
                sm
                kind="primary"
                icon="check"
                disabled={!preislistePick}
                onClick={() => {
                  const pl = aktivePreislisten.find((p) => p.id === preislistePick)
                  if (pl) addFromPreisliste(pl)
                }}
              >
                Übernehmen
              </MockBtn>
            </>
          }
        >
          <div className="field">
            <div className="field-label">Preisliste</div>
            <select
              className="sel"
              value={preislistePick}
              onChange={(e) => setPreislistePick(e.target.value)}
              autoFocus
            >
              <option value="">Leistung wählen…</option>
              {aktivePreislisten.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.leistung}
                  {pl.gewerke?.name ? ` · ${pl.gewerke.name}` : ''} ·{' '}
                  {formatEurBetrag(preislisteEinheitspreisNetto(pl))}
                </option>
              ))}
            </select>
          </div>
        </MockModal>
      ) : null}
    </div>
  )
}
