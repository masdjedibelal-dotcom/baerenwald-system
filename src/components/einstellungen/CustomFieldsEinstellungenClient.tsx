'use client'

import { useMemo, useState, useTransition } from 'react'
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
import { FilterChips } from '@/components/ui/FilterChips'
import { EinstellungenListMeta } from '@/components/einstellungen/EinstellungenUi'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import {
  loadAllCustomFieldDefinitions,
  reorderCustomFields,
  saveCustomFieldDefinition,
  softDeleteCustomField,
} from '@/app/(dashboard)/einstellungen/felder/actions'
import { useRouter } from 'next/navigation'

const TABS: { key: string; label: string }[] = [
  { key: 'lead', label: 'Anfragen' },
  { key: 'auftrag', label: 'Aufträge' },
  { key: 'kunde', label: 'Kunden' },
]

const TYPEN: { value: string; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Langer Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'boolean', label: 'Ja/Nein' },
  { value: 'select', label: 'Auswahl' },
]

function labelFeldtyp(ft: string): string {
  return TYPEN.find((t) => t.value === ft)?.label ?? ft
}

function SortRow({
  f,
  onEdit,
  onDelete,
}: {
  f: CustomFieldDefinition
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-bw-border bg-bw-card px-3 py-2"
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
        <p className="font-medium text-bw-text">
          {f.label}
          {f.pflicht ? <span className="text-bw-accent"> *</span> : null}
        </p>
        <EinstellungenListMeta>{labelFeldtyp(f.feld_typ)}</EinstellungenListMeta>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4" aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-status-cancel-text" aria-hidden />
      </Button>
    </li>
  )
}

export function CustomFieldsEinstellungenClient({ initial }: { initial: CustomFieldDefinition[] }) {
  const router = useRouter()
  const [tab, setTab] = useState(TABS[0].key)
  const [rows, setRows] = useState(initial)
  const [modal, setModal] = useState<CustomFieldDefinition | 'new' | null>(null)
  const [label, setLabel] = useState('')
  const [feldTyp, setFeldTyp] = useState('text')
  const [optionenText, setOptionenText] = useState('')
  const [pflicht, setPflicht] = useState(false)
  const [pending, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const filtered = useMemo(
    () => rows.filter((r) => r.objekt_typ === tab && r.aktiv),
    [rows, tab]
  )

  function openNew() {
    setModal('new')
    setLabel('')
    setFeldTyp('text')
    setOptionenText('')
    setPflicht(false)
  }

  function openEdit(f: CustomFieldDefinition) {
    setModal(f)
    setLabel(f.label)
    setFeldTyp(f.feld_typ)
    setOptionenText(
      f.feld_typ === 'select' && Array.isArray(f.optionen)
        ? (f.optionen as string[]).join('\n')
        : ''
    )
    setPflicht(f.pflicht)
  }

  function saveModal() {
    if (!label.trim()) {
      toast.error('Label erforderlich')
      return
    }
    let optionen: unknown = null
    if (feldTyp === 'select') {
      optionen = optionenText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    }
    startTransition(async () => {
      const r = await saveCustomFieldDefinition({
        id: modal !== 'new' && modal ? modal.id : undefined,
        objekt_typ: tab,
        label: label.trim(),
        feld_typ: feldTyp,
        optionen,
        pflicht,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setModal(null)
      const fresh = await loadAllCustomFieldDefinitions()
      setRows(fresh)
      router.refresh()
    })
  }

  async function remove(f: CustomFieldDefinition) {
    if (!confirm(`Feld „${f.label}“ deaktivieren?`)) return
    const r = await softDeleteCustomField(f.id)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success('Feld deaktiviert')
    setRows((prev) => prev.map((x) => (x.id === f.id ? { ...x, aktiv: false } : x)))
    router.refresh()
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const list = filtered
    const oldIndex = list.findIndex((x) => x.id === active.id)
    const newIndex = list.findIndex((x) => x.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(list, oldIndex, newIndex)
    const r = await reorderCustomFields(
      tab,
      next.map((x) => x.id)
    )
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    const fresh = await loadAllCustomFieldDefinitions()
    setRows(fresh)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <FilterChips
        options={TABS.map((t) => ({ label: t.label, value: t.key }))}
        selected={[tab]}
        onChange={(v) => setTab(v[0] ?? TABS[0].key)}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={filtered.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {filtered.map((f) => (
              <SortRow key={f.id} f={f} onEdit={() => openEdit(f)} onDelete={() => void remove(f)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="secondary" onClick={openNew}>
        + Feld hinzufügen
      </Button>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal !== 'new' && modal ? 'Feld bearbeiten' : 'Neues Feld'}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => saveModal()}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Label" required value={label} onChange={(e) => setLabel(e.target.value)} />
          <div>
            <label className="input-label" htmlFor="ftyp">
              Typ
            </label>
            <select
              id="ftyp"
              className="input w-full max-w-md"
              value={feldTyp}
              onChange={(e) => setFeldTyp(e.target.value)}
            >
              {TYPEN.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {feldTyp === 'select' ? (
            <div>
              <label className="input-label">Optionen (eine pro Zeile)</label>
              <Textarea
                plain
                className="font-mono text-sm"
                rows={4}
                value={optionenText}
                onChange={(e) => setOptionenText(e.target.value)}
              />
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={pflicht} onChange={(e) => setPflicht(e.target.checked)} />
            Pflichtfeld
          </label>
        </div>
      </Modal>
    </div>
  )
}
