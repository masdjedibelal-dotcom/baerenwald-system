'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn, MockChip, MockDragHandle } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect, MockTextarea } from '@/components/mock-ui/MockForm'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
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
import { EinstellungenListMeta } from '@/components/einstellungen/EinstellungenUi'
import { toast } from '@/components/ui/app-toast'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import {
  loadAllCustomFieldDefinitions,
  reorderCustomFields,
  saveCustomFieldDefinition,
  softDeleteCustomField,
} from '@/app/(dashboard)/einstellungen/felder/actions'
import { TOAST } from '@/lib/copy'

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
      className="flex items-center gap-2 rounded-card border border-bw-border bg-surface px-3 py-2"
    >
      <MockDragHandle
        className="touch-none text-bw-text-muted hover:text-bw-text"
        aria-label="Verschieben"
        {...attributes}
        {...listeners}
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-bw-text">
          {f.label}
          {f.pflicht ? <span className="text-bw-accent"> *</span> : null}
        </p>
        <EinstellungenListMeta>{labelFeldtyp(f.feld_typ)}</EinstellungenListMeta>
      </div>
      <MockBtn type="button" kind="ghost" sm onClick={onEdit}>
        <MockIcon n="pencil" ctx="default" className="h-4 w-4" aria-hidden />
      </MockBtn>
      <MockBtn type="button" kind="ghost" sm onClick={onDelete}>
        <MockIcon n="trash" ctx="default" className="h-4 w-4 text-status-cancel-text" aria-hidden />
      </MockBtn>
    </li>
  )
}

export function CustomFieldsEinstellungenClient({ initial }: { initial: CustomFieldDefinition[] }) {
  const [tab, setTab] = useState(TABS[0].key)
  const [rows, setRows] = useState(initial)
  const [modal, setModal] = useState<CustomFieldDefinition | 'new' | null>(null)
  const [label, setLabel] = useState('')
  const [feldTyp, setFeldTyp] = useState('text')
  const [optionenText, setOptionenText] = useState('')
  const [pflicht, setPflicht] = useState(false)
  const [pending, startTransition] = useLocalTransition()

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
      toast.error(TOAST.label_erforderlich)
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
        toast.systemError(r)
        return
      }
      toast.success(TOAST.gespeichert)
      setModal(null)
      const fresh = await loadAllCustomFieldDefinitions()
      setRows(fresh)
      // revalidatePath in felder/actions — lokaler State schon aktualisiert
    })
  }

  function remove(f: CustomFieldDefinition) {
    openDeleteConfirm(
      `Feld „${f.label}“ deaktivieren?`,
      async () => {
        const r = await softDeleteCustomField(f.id)
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(TOAST.feld_deaktiviert)
        setRows((prev) => prev.map((x) => (x.id === f.id ? { ...x, aktiv: false } : x)))
      }
    )
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
      toast.systemError(r)
      return
    }
    const fresh = await loadAllCustomFieldDefinitions()
    setRows(fresh)
  }

  return (
    <div className="space-y-4">
      <div className="chiprow">
        {TABS.map((t) => (
          <MockChip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </MockChip>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={filtered.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {filtered.map((f) => (
              <SortRow key={f.id} f={f} onEdit={() => openEdit(f)} onDelete={() => void remove(f)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <MockBtn type="button" kind="secondary" onClick={openNew}>
        + Feld hinzufügen
      </MockBtn>

      <EditorSheet
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal !== 'new' && modal ? 'Feld bearbeiten' : 'Neues Feld'}
        secondary={{ label: 'Abbrechen', onClick: () => setModal(null), kind: 'ghost' }}
        primary={{
          label: 'Speichern',
          onClick: () => saveModal(),
          busy: pending,
        }}
      >
        <div className="space-y-4">
          <MockField label="Label" required><MockInput required value={label} onChange={(e) => setLabel(e.target.value)} /></MockField>
          <div>
            <label className="input-label" htmlFor="ftyp">
              Typ
            </label>
            <MockSelect id="ftyp" className="w-full max-w-md" value={feldTyp} onChange={(e) => setFeldTyp(e.target.value)}>
              {TYPEN.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </MockSelect>
          </div>
          {feldTyp === 'select' ? (
            <div>
              <label className="input-label">Optionen (eine pro Zeile)</label>
              <MockTextarea rows={4} value={optionenText} onChange={(e) => setOptionenText(e.target.value)} className="resize-y py-2 min-h-[120px] font-mono text-sm" />
            </div>
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <MockCheckbox checked={pflicht} onChange={(e) => setPflicht(e.target.checked)} />
            Pflichtfeld
          </label>
        </div>
      </EditorSheet>
    </div>
  )
}
