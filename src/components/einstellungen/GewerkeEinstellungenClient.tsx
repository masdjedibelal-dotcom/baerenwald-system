'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn, MockDragHandle } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useLocalTransition } from '@/components/ui/action-busy'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
<<<<<<< Updated upstream
=======
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
import { toast } from '@/components/ui/app-toast'
import {
  createGewerk,
  setGewerkAktiv,
  updateGewerk,
} from '@/app/(dashboard)/preislisten/actions'
import {
  deleteGewerkIfEmpty,
  loadGewerkeEinstellungen,
  reorderGewerke,
  updateGewerkAusfuehrung,
  type GewerkMitCount,
} from '@/app/(dashboard)/einstellungen/gewerke/actions'
import {
  normalizeGewerkAusfuehrung,
  type GewerkAusfuehrung,
} from '@/lib/gewerke-ausfuehrung'
import { TOAST } from '@/lib/copy'

function SortRow({
  g,
  onToggle,
  onRename,
  onAusfuehrung,
  onDelete,
}: {
  g: GewerkMitCount
  onToggle: (aktiv: boolean) => void
  onRename: (name: string) => void
  onAusfuehrung: (patch: { ausfuehrung: GewerkAusfuehrung; fachbetrieb_hinweis: string | null }) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(g.name)
  const [hinweisDraft, setHinweisDraft] = useState(g.fachbetrieb_hinweis ?? '')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: g.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center gap-2 rounded-card border border-bw-border bg-surface px-3 py-2"
    >
      <MockDragHandle
        className="touch-none text-bw-text-muted hover:text-bw-text"
        aria-label="Verschieben"
        {...attributes}
        {...listeners}
      />
      <div className="min-w-0 flex-1">
        {editing ? (
          <MockInput value={name} autoFocus onChange={(e) => setName(e.target.value)} onBlur={() => {
              setEditing(false)
              if (name.trim() && name.trim() !== g.name) onRename(name.trim())
              else setName(g.name)
            }} onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setName(g.name)
                setEditing(false)
              }
            }} />
        ) : (
          <MockBtn className="text-left font-medium text-bw-text hover:underline" type="button" onClick={() => setEditing(true)}>
            {g.name}
          </MockBtn>
        )}
        <p className="text-xs text-bw-text-muted">{g.anzahl_leistungen} Leistungen</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:max-w-md">
          <div className="form-field">
            <span className="form-field-label">Ausführung</span>
            <MockSelect className="w-full" value={g.ausfuehrung} onChange={(e) => {
                const ausfuehrung = normalizeGewerkAusfuehrung(e.target.value)
                onAusfuehrung({
                  ausfuehrung,
                  fachbetrieb_hinweis: ausfuehrung === 'eigen' ? null : g.fachbetrieb_hinweis,
                })
              }}>
              <option value="eigen">Eigenleistung</option>
              <option value="fachbetrieb">Immer Fachbetrieb</option>
              <option value="beides">Eigen + Fachbetrieb</option>
            </MockSelect>
          </div>
          {g.ausfuehrung !== 'eigen' ? (
            <div className="form-field">
              <span className="form-field-label">Fachbetrieb-Hinweis</span>
              <RichTextEditor value={typeof (hinweisDraft) === 'string' ? (hinweisDraft) : ''} onChange={(__v) => setHinweisDraft(__v)} placeholder="Ausführung durch zugelassenen Fachbetrieb…" minHeight={120} aria-label="Ausführung durch zugelassenen Fachbetrieb…" />
            </div>
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <MockCheckbox
          checked={g.aktiv}
          onChange={(e) => onToggle(e.target.checked)}
        />
        aktiv
      </label>
      <MockBtn type="button" kind="ghost" sm onClick={() => setEditing(true)}>
<<<<<<< Updated upstream
        <MockIcon n="pencil" ctx="default" className="h-4 w-4" aria-hidden />
=======
        <Pencil className="h-4 w-4" aria-hidden />
>>>>>>> Stashed changes
      </MockBtn>
      <MockBtn
        type="button"
        kind="ghost" sm
        disabled={g.anzahl_leistungen > 0}
        title={g.anzahl_leistungen > 0 ? 'Zuerst Leistungen entfernen' : 'Löschen'}
        onClick={onDelete}
      >
<<<<<<< Updated upstream
        <MockIcon n="trash" ctx="default" className="h-4 w-4 text-status-cancel-text" aria-hidden />
=======
        <Trash2 className="h-4 w-4 text-status-cancel-text" aria-hidden />
>>>>>>> Stashed changes
      </MockBtn>
    </li>
  )
}

export function GewerkeEinstellungenClient({ initial }: { initial: GewerkMitCount[] }) {
  const [rows, setRows] = useState(initial)
  const [neuOpen, setNeuOpen] = useState(false)
  const [neuName, setNeuName] = useState('')
  const [pending, startTransition] = useLocalTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((x) => x.id === active.id)
    const newIndex = rows.findIndex((x) => x.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(rows, oldIndex, newIndex)
    const r = await reorderGewerke(next.map((x) => x.id))
    if (!r.ok) {
      toast.systemError(r)
      return
    }
    setRows(next)
  }

  async function toggle(id: string, aktiv: boolean) {
    const r = await setGewerkAktiv(id, aktiv)
    if (!r.ok) {
      toast.systemError(r)
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, aktiv } : x)))
  }

  async function rename(id: string, name: string) {
    const r = await updateGewerk(id, { name })
    if (!r.ok) {
      toast.systemError(r)
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, name } : x)))
  }

  async function patchAusfuehrung(
    id: string,
    patch: { ausfuehrung: GewerkAusfuehrung; fachbetrieb_hinweis: string | null }
  ) {
    const r = await updateGewerkAusfuehrung(id, patch)
    if (!r.ok) {
      toast.systemError(r)
      return
    }
    setRows((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              ausfuehrung: patch.ausfuehrung,
              fachbetrieb_hinweis: patch.fachbetrieb_hinweis,
            }
          : x
      )
    )
  }

  function remove(g: GewerkMitCount) {
    openDeleteConfirm(
      `Gewerk „${g.name}“ löschen?`,
      async () => {
        const r = await deleteGewerkIfEmpty(g.id)
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(TOAST.geloescht)
        setRows((prev) => prev.filter((x) => x.id !== g.id))
        
      }
    )
  }

  function saveNeu() {
    const n = neuName.trim()
    if (!n) {
      toast.error(TOAST.name_eingeben)
      return
    }
    startTransition(async () => {
      const r = await createGewerk(n)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.gewerk_angelegt)
      setNeuName('')
      const fresh = await loadGewerkeEinstellungen()
      setRows(fresh)
      
    })
  }

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {rows.map((g) => (
              <SortRow
                key={g.id}
                g={g}
                onToggle={(aktiv) => void toggle(g.id, aktiv)}
                onRename={(name) => void rename(g.id, name)}
                onAusfuehrung={(patch) => void patchAusfuehrung(g.id, patch)}
                onDelete={() => void remove(g)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {neuOpen ? (
<<<<<<< Updated upstream
        <div className="flex flex-wrap items-end gap-2 rounded-field border border-bw-border bg-surface p-3">
          <MockField label="Neues Gewerk"><MockInput value={neuName} onChange={(e) => setNeuName(e.target.value)} /></MockField>
=======
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-bw-border bg-bw-card p-3">
          <Input label="Neues Gewerk" value={neuName} onChange={(e) => setNeuName(e.target.value)} />
>>>>>>> Stashed changes
          <MockBtn type="button" kind="ghost" onClick={() => setNeuOpen(false)}>
            Abbrechen
          </MockBtn>
          <MockBtn type="button" kind="primary" loading={pending} onClick={() => saveNeu()}>
            Speichern
          </MockBtn>
        </div>
      ) : (
        <MockBtn type="button" kind="secondary" onClick={() => setNeuOpen(true)}>
          + Neues Gewerk
        </MockBtn>
      )}
    </div>
  )
}
