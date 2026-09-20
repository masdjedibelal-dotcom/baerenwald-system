'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { MockIconName } from '@/lib/mock-icons'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useTransition } from '@/components/ui/action-busy'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Toggle } from '@/components/ui/Toggle'
import { FormularVorschauModal } from '@/components/formulare/FormularVorschauModal'
import { saveFormularTemplate } from '@/app/(dashboard)/formulare/actions'
import type { FormularFeld, FormularTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'
const FELD_TYPEN: { value: FormularFeld['typ']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Langer Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Auswahl' },
  { value: 'foto', label: 'Foto' },
]

function newFieldId() {
  return globalThis.crypto?.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function feldTypIconName(typ: FormularFeld['typ']): MockIconName {
  switch (typ) {
    case 'checkbox':
      return 'circle'
    case 'foto':
      return 'photo'
    case 'date':
      return 'calendar'
    case 'number':
      return 'tag'
    case 'select':
      return 'chevron-down'
    case 'textarea':
      return 'text-caption'
    default:
      return 'text-caption'
  }
}

function FeldTypIcon({ typ }: { typ: FormularFeld['typ'] }) {
  return <MockIcon n={feldTypIconName(typ)} ctx="default" size={16} className="text-bw-text-muted" />
}

function BearbeitenSortableRow({
  feld,
  idx,
  onEdit,
  onDelete,
}: {
  feld: FormularFeld
  idx: number
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: feld.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-field bg-bw-hover p-3"
    >
      <span
        className="cursor-grab select-none text-lg text-bw-border touch-none"
        aria-label="Verschieben"
        {...attributes}
        {...listeners}
      >
        ≡
      </span>
      <FeldTypIcon typ={feld.typ} />
      <span className="min-w-0 flex-1 truncate text-sm text-bw-text">
        {feld.label || `Feld ${idx + 1}`}
        {feld.pflicht ? <span className="ml-0.5 text-bw-accent">*</span> : null}
      </span>
      <MockBtn className="rounded-button p-1 text-bw-text-muted hover:text-bw-text" type="button" onClick={onEdit} aria-label="Bearbeiten"><MockIcon n="pencil" ctx="default" className="h-4 w-4" aria-hidden /></MockBtn>
      <MockBtn className="rounded-button p-1 text-bw-text-muted hover:text-status-cancel-text" type="button" onClick={onDelete} aria-label="Löschen">
        ×
      </MockBtn>
    </div>
  )
}

type PanelForm = {
  name: string
  subtyp: string
  phase: string
  aktiv: boolean
}

export function FormularBearbeitenPanel({
  formular,
  onSave,
  onClose,
}: {
  formular: FormularTemplate
  onSave: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'felder' | 'einstellungen'>('felder')
  const [form, setForm] = useState<PanelForm>({
    name: formular.name,
    subtyp: formular.subtyp ?? '',
    phase: formular.phase ?? '',
    aktiv: formular.aktiv ?? true,
  })
  const [felder, setFelder] = useState<FormularFeld[]>(formular.felder ?? [])
  const [addFeldOpen, setAddFeldOpen] = useState(false)
  const [vorschauOpen, setVorschauOpen] = useState(false)
  const [editFeld, setEditFeld] = useState<FormularFeld | null>(null)
  const [flLabel, setFlLabel] = useState('')
  const [flTyp, setFlTyp] = useState<FormularFeld['typ']>('text')
  const [flPflicht, setFlPflicht] = useState(false)
  const [flOpts, setFlOpts] = useState('')
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const addWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setForm({
      name: formular.name,
      subtyp: formular.subtyp ?? '',
      phase: formular.phase ?? '',
      aktiv: formular.aktiv ?? true,
    })
    setFelder(formular.felder ?? [])
    setTab('felder')
    setEditFeld(null)
    setAddFeldOpen(false)
    setVorschauOpen(false)
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Parent nutzt key={formular.id} für Reset bei Template-Wechsel
  }, [])

  useEffect(() => {
    if (!addFeldOpen) return
    const onDoc = (e: MouseEvent) => {
      if (addWrapRef.current && !addWrapRef.current.contains(e.target as Node)) setAddFeldOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [addFeldOpen])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setFelder((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return items
      return arrayMove(items, oldIndex, newIndex)
    })
  }, [])

  function openEditFeld(f: FormularFeld) {
    setEditFeld(f)
    setFlLabel(f.label)
    setFlTyp(f.typ)
    setFlPflicht(f.pflicht)
    setFlOpts((f.optionen ?? []).join('\n'))
  }

  function saveEditFeld() {
    if (!editFeld) return
    if (!flLabel.trim()) {
      setErr('Label ist Pflicht.')
      return
    }
    const optionen =
      flTyp === 'select'
        ? flOpts
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined
    if (flTyp === 'select' && (!optionen || optionen.length === 0)) {
      setErr('Mindestens eine Auswahl-Option angeben.')
      return
    }
    setErr(null)
    setFelder((prev) =>
      prev.map((x) =>
        x.id === editFeld.id
          ? { ...x, label: flLabel.trim(), typ: flTyp, pflicht: flPflicht, ...(optionen ? { optionen } : {}) }
          : x
      )
    )
    setEditFeld(null)
  }

  function deleteFeld(id: string, idx: number) {
    setFelder((prev) => {
      const i = prev.findIndex((x) => x.id === id)
      if (i >= 0) return prev.filter((_, j) => j !== i)
      return prev.filter((_, j) => j !== idx)
    })
  }

  function addFeld(typ: FormularFeld['typ']) {
    const id = newFieldId()
    const nf: FormularFeld = {
      id,
      label: '',
      typ,
      pflicht: false,
      ...(typ === 'select' ? { optionen: ['Option 1', 'Option 2'] } : {}),
    }
    setFelder((p) => [...p, nf])
    setAddFeldOpen(false)
    openEditFeld(nf)
  }

  function handleSave() {
    if (!form.name.trim()) {
      setErr('Name ist Pflicht.')
      return
    }
    const subtypNorm = form.subtyp.trim() || null
    const phaseNorm = (form.phase.trim() || null) as FormularTemplate['phase']

    startTransition(async () => {
      const res = await saveFormularTemplate({
        id: formular.id,
        name: form.name.trim(),
        gewerk_id: formular.gewerk_id,
        typ: formular.typ,
        subtyp: subtypNorm,
        phase: phaseNorm,
        felder,
        aktiv: form.aktiv,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      setErr(null)
      onSave()
    })
  }

  const subtypOptions = [
    { value: '', label: 'Sonstiges' },
    { value: 'bautagebuch', label: 'Bautagebuch' },
    { value: 'checkliste', label: 'Checkliste' },
    { value: 'pruefprotokoll', label: 'Prüfprotokoll' },
    { value: 'abnahme', label: 'Abnahme' },
  ]

  const phaseOptions = [
    { value: '', label: 'Alle Phasen' },
    { value: 'vorab', label: 'Vorab' },
    { value: 'update', label: 'Update' },
    { value: 'abnahme', label: 'Abnahme' },
  ]

  const typSelectOptions = FELD_TYPEN.map((t) => ({ value: t.value, label: t.label }))

  return (
    <div className="flex max-h-[calc(100vh-6rem)] flex-col">
      <div className="flex shrink-0 border-b border-bw-border px-4 pt-2">
        <MockBtn className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            tab === 'felder' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )} type="button" onClick={() => setTab('felder')}>
          Felder
        </MockBtn>
        <MockBtn className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            tab === 'einstellungen' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )} type="button" onClick={() => setTab('einstellungen')}>
          Einstellungen
        </MockBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {err ? <p className="px-4 pt-3 text-sm text-status-cancel-text">{err}</p> : null}

        {tab === 'felder' ? (
          <div className="space-y-3 p-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={felder.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {felder.map((feld, idx) => (
                    <BearbeitenSortableRow
                      key={feld.id}
                      feld={feld}
                      idx={idx}
                      onEdit={() => openEditFeld(feld)}
                      onDelete={() => deleteFeld(feld.id, idx)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="relative" ref={addWrapRef}>
              <MockBtn kind="ghost" sm fullWidth type="button" onClick={() => setAddFeldOpen((o) => !o)}>
                + Feld hinzufügen
              </MockBtn>
              {addFeldOpen ? (
                <div className="absolute bottom-full left-0 right-0 z-10 mb-1 rounded-card border border-bw-border bg-surface p-2 shadow-lg">
                  {FELD_TYPEN.map((typ) => (
                    <MockBtn fullWidth className="flex items-center gap-2 rounded-button px-3 py-2 text-left text-sm text-bw-text hover:bg-bw-hover" key={typ.value} type="button" onClick={() => addFeld(typ.value)}>
                      <FeldTypIcon typ={typ.value} />
                      {typ.label}
                    </MockBtn>
                  ))}
                </div>
              ) : null}
            </div>

            <MockBtn kind="ghost" sm fullWidth type="button" onClick={() => setVorschauOpen(true)}>
              Vorschau ansehen
            </MockBtn>

            <MockBtn kind="primary" sm fullWidth type="button" onClick={handleSave} disabled={pending}>
              Speichern
            </MockBtn>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <MockField label="Name *" required><MockInput value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required /></MockField>
            <Combobox label="Typ" id="subtyp" name="subtyp" options={subtypOptions} value={form.subtyp == null ? '' : String(form.subtyp)} placeholder="Auswählen…" onChange={(next) => { setForm((s) => ({ ...s, subtyp: next })); }} />
            <Combobox label="Phase" id="phase" name="phase" options={phaseOptions} value={form.phase || '' == null ? '' : String(form.phase || '')} placeholder="Auswählen…" onChange={(next) => { setForm((s) => ({ ...s, phase: next })); }} />
            <Toggle
              label="Aktiv"
              hint="Inaktive Templates können nicht gesendet werden"
              checked={form.aktiv}
              onChange={(v) => setForm((s) => ({ ...s, aktiv: v }))}
            />
            <div className="flex gap-2 pt-2">
              <MockBtn kind="ghost" className="flex-1" type="button" onClick={onClose}>
                Abbrechen
              </MockBtn>
              <MockBtn kind="primary" className="flex-1" type="button" onClick={handleSave} disabled={pending}>
                Speichern
              </MockBtn>
            </div>
          </div>
        )}
      </div>

      <FormularVorschauModal
        open={vorschauOpen}
        onClose={() => setVorschauOpen(false)}
        name={form.name || formular.name}
        felder={felder}
      />

      <EditorSheet open={!!editFeld} onClose={() => setEditFeld(null)} title="Feld bearbeiten" size="md">
        {editFeld ? (
          <div className="space-y-4">
            <MockField label="Label *" required><MockInput value={flLabel} onChange={(e) => setFlLabel(e.target.value)} required /></MockField>
            <Combobox label="Typ" id="fl-typ" name="fl-typ" options={typSelectOptions} value={flTyp == null ? '' : String(flTyp)} placeholder="Auswählen…" onChange={(next) => { setFlTyp(next as FormularFeld['typ']); }} />
            <label className="flex items-center gap-2 text-sm text-bw-text">
              <MockCheckbox checked={flPflicht} onChange={(e) => setFlPflicht(e.target.checked)} />
              Pflichtfeld
            </label>
            {flTyp === 'select' ? (
              <MockField label="Optionen (eine pro Zeile)"><RichTextEditor value={typeof (flOpts) === 'string' ? (flOpts) : ''} onChange={(__v) => setFlOpts(__v)} minHeight={120} aria-label="Optionen (eine pro Zeile)" /></MockField>
            ) : null}
            <div className="flex gap-2 pt-2">
              <MockBtn kind="ghost" className="flex-1" type="button" onClick={() => setEditFeld(null)}>
                Abbrechen
              </MockBtn>
              <MockBtn kind="primary" className="flex-1" type="button" onClick={saveEditFeld}>
                Speichern
              </MockBtn>
            </div>
          </div>
        ) : null}
      </EditorSheet>
    </div>
  )
}
