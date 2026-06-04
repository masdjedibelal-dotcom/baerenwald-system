'use client'

import { useState, useTransition } from 'react'
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
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
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
import { useRouter } from 'next/navigation'

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
      className="flex flex-wrap items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 py-2"
    >
      <button
        type="button"
        className="touch-none text-bw-text-muted hover:text-bw-text"
        aria-label="Verschieben"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setEditing(false)
              if (name.trim() && name.trim() !== g.name) onRename(name.trim())
              else setName(g.name)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setName(g.name)
                setEditing(false)
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="text-left font-medium text-bw-text hover:underline"
            onClick={() => setEditing(true)}
          >
            {g.name}
          </button>
        )}
        <p className="text-xs text-bw-text-muted">{g.anzahl_leistungen} Leistungen</p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:max-w-md">
          <div className="form-field">
            <span className="form-field-label">Ausführung</span>
            <select
              className="input w-full"
              value={g.ausfuehrung}
              onChange={(e) => {
                const ausfuehrung = normalizeGewerkAusfuehrung(e.target.value)
                onAusfuehrung({
                  ausfuehrung,
                  fachbetrieb_hinweis: ausfuehrung === 'eigen' ? null : g.fachbetrieb_hinweis,
                })
              }}
            >
              <option value="eigen">Eigenleistung</option>
              <option value="fachbetrieb">Immer Fachbetrieb</option>
              <option value="beides">Eigen + Fachbetrieb</option>
            </select>
          </div>
          {g.ausfuehrung !== 'eigen' ? (
            <div className="form-field">
              <span className="form-field-label">Fachbetrieb-Hinweis</span>
              <Textarea
                rows={2}
                value={hinweisDraft}
                placeholder="Ausführung durch zugelassenen Fachbetrieb…"
                onChange={(e) => setHinweisDraft(e.target.value)}
                onBlur={() => {
                  const trimmed = hinweisDraft.trim() || null
                  if (trimmed === (g.fachbetrieb_hinweis?.trim() || null)) return
                  onAusfuehrung({ ausfuehrung: g.ausfuehrung, fachbetrieb_hinweis: trimmed })
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={g.aktiv}
          onChange={(e) => onToggle(e.target.checked)}
        />
        aktiv
      </label>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
        <Pencil className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={g.anzahl_leistungen > 0}
        title={g.anzahl_leistungen > 0 ? 'Zuerst Leistungen entfernen' : 'Löschen'}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 text-status-cancel-text" aria-hidden />
      </Button>
    </li>
  )
}

export function GewerkeEinstellungenClient({ initial }: { initial: GewerkMitCount[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [neuOpen, setNeuOpen] = useState(false)
  const [neuName, setNeuName] = useState('')
  const [pending, startTransition] = useTransition()
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
      toast.error(r.message)
      return
    }
    setRows(next)
    router.refresh()
  }

  async function toggle(id: string, aktiv: boolean) {
    const r = await setGewerkAktiv(id, aktiv)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, aktiv } : x)))
    router.refresh()
  }

  async function rename(id: string, name: string) {
    const r = await updateGewerk(id, { name })
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, name } : x)))
    router.refresh()
  }

  async function patchAusfuehrung(
    id: string,
    patch: { ausfuehrung: GewerkAusfuehrung; fachbetrieb_hinweis: string | null }
  ) {
    const r = await updateGewerkAusfuehrung(id, patch)
    if (!r.ok) {
      toast.error(r.message)
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

  async function remove(g: GewerkMitCount) {
    if (!confirm(`Gewerk „${g.name}“ löschen?`)) return
    const r = await deleteGewerkIfEmpty(g.id)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Gelöscht')
    setRows((prev) => prev.filter((x) => x.id !== g.id))
    router.refresh()
  }

  function saveNeu() {
    const n = neuName.trim()
    if (!n) {
      toast.error('Name eingeben')
      return
    }
    startTransition(async () => {
      const r = await createGewerk(n)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gewerk angelegt')
      setNeuName('')
      const fresh = await loadGewerkeEinstellungen()
      setRows(fresh)
      router.refresh()
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
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-bw-border bg-bw-card p-3">
          <Input label="Neues Gewerk" value={neuName} onChange={(e) => setNeuName(e.target.value)} />
          <Button type="button" variant="primary" loading={pending} onClick={() => saveNeu()}>
            Speichern
          </Button>
          <Button type="button" variant="ghost" onClick={() => setNeuOpen(false)}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setNeuOpen(true)}>
          + Neues Gewerk
        </Button>
      )}
    </div>
  )
}
