'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
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
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { FormularVorschauModal } from '@/components/formulare/FormularVorschauModal'
import { saveFormularTemplate } from '@/app/(dashboard)/formulare/actions'
import type { FormularFeld, FormularTemplate } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Calendar,
  Camera,
  ChevronDown,
  Hash,
  Pencil,
  Pilcrow,
  Square,
  Type,
  type LucideIcon,
} from 'lucide-react'

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

function feldTypIconComponent(typ: FormularFeld['typ']): LucideIcon {
  switch (typ) {
    case 'checkbox':
      return Square
    case 'foto':
      return Camera
    case 'date':
      return Calendar
    case 'number':
      return Hash
    case 'select':
      return ChevronDown
    case 'textarea':
      return Pilcrow
    default:
      return Type
  }
}

function FeldTypIcon({ typ }: { typ: FormularFeld['typ'] }) {
  const Icon = feldTypIconComponent(typ)
  return <Icon className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
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
      className="flex items-center gap-2 rounded-lg bg-bw-hover p-3"
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
      <button
        type="button"
        onClick={onEdit}
        className="rounded p-1 text-bw-text-muted hover:text-bw-text"
        aria-label="Bearbeiten"
      ><Pencil className="h-4 w-4" aria-hidden /></button>
      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 text-bw-text-muted hover:text-status-cancel-text"
        aria-label="Entfernen"
      >
        ×
      </button>
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
        <button
          type="button"
          onClick={() => setTab('felder')}
          className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            tab === 'felder' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )}
        >
          Felder
        </button>
        <button
          type="button"
          onClick={() => setTab('einstellungen')}
          className={cn(
            'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            tab === 'einstellungen' ? 'border-bw-primary text-bw-primary' : 'border-transparent text-bw-text-muted'
          )}
        >
          Einstellungen
        </button>
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
              <button
                type="button"
                onClick={() => setAddFeldOpen((o) => !o)}
                className="btn btn-secondary btn-sm w-full"
              >
                + Feld hinzufügen
              </button>
              {addFeldOpen ? (
                <div className="absolute bottom-full left-0 right-0 z-10 mb-1 rounded-lg border border-bw-border bg-bw-card p-2 shadow-lg">
                  {FELD_TYPEN.map((typ) => (
                    <button
                      key={typ.value}
                      type="button"
                      onClick={() => addFeld(typ.value)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-bw-text hover:bg-bw-hover"
                    >
                      <FeldTypIcon typ={typ.value} />
                      {typ.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="button" onClick={() => setVorschauOpen(true)} className="btn btn-ghost btn-sm w-full">
              Vorschau ansehen
            </button>

            <button type="button" onClick={handleSave} disabled={pending} className="btn btn-primary btn-sm w-full">
              Speichern
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
            <Select
              label="Typ"
              name="subtyp"
              value={form.subtyp}
              onChange={(e) => setForm((s) => ({ ...s, subtyp: e.target.value }))}
              options={subtypOptions}
            />
            <Select
              label="Phase"
              name="phase"
              value={form.phase || ''}
              onChange={(e) => setForm((s) => ({ ...s, phase: e.target.value }))}
              options={phaseOptions}
            />
            <Toggle
              label="Aktiv"
              hint="Inaktive Templates können nicht gesendet werden"
              checked={form.aktiv}
              onChange={(v) => setForm((s) => ({ ...s, aktiv: v }))}
            />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
                Abbrechen
              </button>
              <button type="button" onClick={handleSave} disabled={pending} className="btn btn-primary flex-1">
                Speichern
              </button>
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

      <Modal open={!!editFeld} onClose={() => setEditFeld(null)} title="Feld bearbeiten" size="md">
        {editFeld ? (
          <div className="space-y-4">
            <Input label="Label *" value={flLabel} onChange={(e) => setFlLabel(e.target.value)} required />
            <Select
              label="Typ"
              name="fl-typ"
              value={flTyp}
              onChange={(e) => setFlTyp(e.target.value as FormularFeld['typ'])}
              options={typSelectOptions}
            />
            <label className="flex items-center gap-2 text-sm text-bw-text">
              <input type="checkbox" checked={flPflicht} onChange={(e) => setFlPflicht(e.target.checked)} />
              Pflichtfeld
            </label>
            {flTyp === 'select' ? (
              <Textarea
                label="Optionen (eine pro Zeile)"
                value={flOpts}
                onChange={(e) => setFlOpts(e.target.value)}
                rows={4}
              />
            ) : null}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditFeld(null)} className="btn btn-secondary flex-1">
                Abbrechen
              </button>
              <button type="button" onClick={saveEditFeld} className="btn btn-primary flex-1">
                Übernehmen
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
