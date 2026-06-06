'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
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
import {
  AlignLeft,
  Calendar,
  Camera,
  CheckSquare,
  GripVertical,
  Hash,
  List,
  Monitor,
  Pencil,
  Smartphone,
  Trash2,
  Type,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormularFelderRenderer } from '@/components/formulare/FormularFelderRenderer'
import { FormularVorschauModal } from '@/components/formulare/FormularVorschauModal'
import { FORMULAR_SUBTYP_OPTIONS } from '@/lib/formular-constants'
import type { FormularFeld, FormularTemplate, Gewerk } from '@/lib/types'
import { FORMULAR_PHASE_LABELS, cn } from '@/lib/utils'
import { saveFormularTemplate, deleteFormularTemplate } from '@/app/(dashboard)/formulare/actions'

const TYP_OPTIONS: { value: FormularFeld['typ']; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'text', label: 'T Text' },
  { value: 'textarea', label: '¶ Langer Text' },
  { value: 'number', label: '# Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'select', label: '▼ Auswahl' },
  { value: 'foto', label: 'Foto' },
]

function newFieldId() {
  return globalThis.crypto?.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function feldIcon(typ: FormularFeld['typ']) {
  const c = 'h-4 w-4 shrink-0 text-bw-mid'
  const map = {
    text: <Type className={c} aria-hidden />,
    textarea: <AlignLeft className={c} aria-hidden />,
    number: <Hash className={c} aria-hidden />,
    date: <Calendar className={c} aria-hidden />,
    checkbox: <CheckSquare className={c} aria-hidden />,
    select: <List className={c} aria-hidden />,
    foto: <Camera className={c} aria-hidden />,
  }
  return map[typ]
}

function SortableFeldRow({
  f,
  index,
  expanded,
  onToggleExpand,
  onRemove,
  childrenInline,
}: {
  f: FormularFeld
  index: number
  expanded: boolean
  onToggleExpand: () => void
  onRemove: () => void
  childrenInline: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: f.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <div className="rounded-xl border border-bw-border bg-bw-card">
        <div className="flex flex-wrap items-start gap-2 p-3">
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-bw-light hover:text-bw-text"
            aria-label="Verschieben"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {feldIcon(f.typ)}
              <span className="font-medium text-bw-text">{f.label || `Feld ${index + 1}`}</span>
            </div>
            <p className="mt-1 text-xs text-bw-light">
              {TYP_OPTIONS.find((t) => t.value === f.typ)?.label?.replace(/^[^\s]+\s/, '') ?? f.typ} · Pflicht:{' '}
              {f.pflicht ? 'Ja' : 'Nein'}
            </p>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-bw-border text-bw-mid hover:bg-bw-hover"
              onClick={onToggleExpand}
              aria-label="Bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-bw-border text-status-cancel-text hover:bg-bw-hover"
              onClick={onRemove}
              aria-label="Entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {expanded ? <div className="border-t border-bw-border bg-bw-canvas/40 p-4">{childrenInline}</div> : null}
      </div>
    </li>
  )
}

export function FormularTemplateForm({
  initial,
  gewerke,
  embedded = false,
  onClose,
  onSaved,
}: {
  initial: FormularTemplate | null
  gewerke: Gewerk[]
  embedded?: boolean
  onClose?: () => void
  onSaved?: () => void
}) {
  const router = useRouter()
  const isNew = !initial
  const [panelTab, setPanelTab] = useState<'felder' | 'einstellungen'>('felder')
  const [name, setName] = useState(initial?.name ?? '')
  const [gewerkId, setGewerkId] = useState(initial?.gewerk_id ?? '')
  const [typ, setTyp] = useState<FormularTemplate['typ']>(initial?.typ ?? 'handwerker')
  const [subtyp, setSubtyp] = useState<string>(initial?.subtyp ?? 'sonstiges')
  const [phase, setPhase] = useState<NonNullable<FormularTemplate['phase']>>(
    (initial?.phase ?? 'vorab') as NonNullable<FormularTemplate['phase']>
  )
  const [aktiv, setAktiv] = useState(initial?.aktiv ?? true)
  const [felder, setFelder] = useState<FormularFeld[]>(initial?.felder ?? [])
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [vorschauView, setVorschauView] = useState<'phone' | 'desktop'>('phone')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [flLabel, setFlLabel] = useState('')
  const [flTyp, setFlTyp] = useState<FormularFeld['typ']>('text')
  const [flPflicht, setFlPflicht] = useState(false)
  const [flOpts, setFlOpts] = useState('')

  const labelInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!embedded || !initial) return
    setName(initial.name)
    setGewerkId(initial.gewerk_id ?? '')
    setTyp(initial.typ ?? 'handwerker')
    setSubtyp(initial.subtyp ?? 'sonstiges')
    setPhase((initial.phase ?? 'vorab') as NonNullable<FormularTemplate['phase']>)
    setAktiv(initial.aktiv ?? true)
    setFelder(initial.felder ?? [])
    setExpandedId(null)
    setErr(null)
  }, [embedded, initial])

  const previewDaten = useMemo(() => {
    const o: Record<string, unknown> = {}
    for (const f of felder) {
      if (f.typ === 'checkbox') o[f.id] = false
      else o[f.id] = ''
    }
    return o
  }, [felder])

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

  function syncInlineState(f: FormularFeld) {
    setFlLabel(f.label)
    setFlTyp(f.typ)
    setFlPflicht(f.pflicht)
    setFlOpts((f.optionen ?? []).join('\n'))
  }

  function addFieldOfType(t: FormularFeld['typ']) {
    const id = newFieldId()
    const nf: FormularFeld = {
      id,
      label: '',
      typ: t,
      pflicht: false,
      ...(t === 'select' ? { optionen: ['Option 1', 'Option 2'] } : {}),
    }
    setFelder((p) => [...p, nf])
    setExpandedId(id)
    setFlLabel('')
    setFlTyp(t)
    setFlPflicht(false)
    setFlOpts(t === 'select' ? 'Option 1\nOption 2' : '')
    requestAnimationFrame(() => labelInputRef.current?.focus())
  }

  function saveInline(fId: string) {
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
        x.id === fId
          ? { ...x, label: flLabel.trim(), typ: flTyp, pflicht: flPflicht, ...(optionen ? { optionen } : {}) }
          : x
      )
    )
    setExpandedId(null)
  }

  function saveAll() {
    if (!name.trim()) {
      setErr('Name ist Pflicht.')
      return
    }
    startTransition(async () => {
      const res = await saveFormularTemplate({
        id: initial?.id,
        name,
        gewerk_id: gewerkId || null,
        typ,
        subtyp: subtyp || null,
        phase,
        felder,
        aktiv,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      if (isNew) router.replace(`/formulare/${res.id}/bearbeiten`)
      else {
        router.refresh()
        onSaved?.()
      }
    })
  }

  function onDelete() {
    if (!initial?.id) return
    if (!confirm('Template deaktivieren? Es wird in der Liste ausgeblendet.')) return
    startTransition(async () => {
      const res = await deleteFormularTemplate(initial.id)
      if (!res.ok) {
        setErr(res.message)
        return
      }
      router.replace('/formulare')
    })
  }

  const grundinfoCard = (
    <Card className="space-y-4 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Grundinfo</p>
      <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
      <Select
        label="Subtyp"
        name="subtyp"
        value={subtyp}
        onChange={(e) => setSubtyp(e.target.value)}
        options={FORMULAR_SUBTYP_OPTIONS.map((o) => ({ value: o.value as string, label: o.label }))}
      />
      <Select
        label="Phase"
        name="phase"
        value={phase}
        onChange={(e) => setPhase(e.target.value as NonNullable<FormularTemplate['phase']>)}
        options={[
          { value: 'vorab', label: FORMULAR_PHASE_LABELS.vorab },
          { value: 'update', label: FORMULAR_PHASE_LABELS.update },
          { value: 'abnahme', label: FORMULAR_PHASE_LABELS.abnahme },
        ]}
      />
      <Select
        label="Zielgruppe"
        name="typ"
        value={typ}
        onChange={(e) => setTyp(e.target.value as FormularTemplate['typ'])}
        options={[
          { value: 'handwerker', label: 'Handwerker' },
          { value: 'betreuer', label: 'Betreuer (Vor-Ort)' },
        ]}
      />
      <Select
        label="Gewerk (optional)"
        name="gewerk"
        value={gewerkId}
        onChange={(e) => setGewerkId(e.target.value)}
        options={[
          { value: '', label: 'Alle Gewerke' },
          ...gewerke.filter((g) => g.aktiv).map((g) => ({ value: g.id, label: g.name })),
        ]}
      />
      <label className="flex items-center gap-2 text-sm text-bw-text">
        <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} />
        Aktiv
      </label>
    </Card>
  )

  const felderCard = (
    <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-bw-text">Felder</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-bw-border bg-bw-canvas px-3 py-2 text-sm text-bw-text"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value as FormularFeld['typ']
                    if (v) addFieldOfType(v)
                    e.target.value = ''
                  }}
                >
                  <option value="">+ Feld hinzufügen…</option>
                  {TYP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={felder.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {felder.length === 0 ? (
                  <p className="text-sm text-bw-light">Noch keine Felder — unten einen Typ wählen.</p>
                ) : (
                  <ul className="space-y-3">
                    {felder.map((f, i) => (
                      <SortableFeldRow
                        key={f.id}
                        f={f}
                        index={i}
                        expanded={expandedId === f.id}
                        onToggleExpand={() => {
                          if (expandedId === f.id) {
                            setExpandedId(null)
                          } else {
                            setExpandedId(f.id)
                            syncInlineState(f)
                          }
                        }}
                        onRemove={() => {
                          setFelder((p) => p.filter((x) => x.id !== f.id))
                          if (expandedId === f.id) setExpandedId(null)
                        }}
                        childrenInline={
                          <div className="space-y-3">
                            <Input
                              ref={expandedId === f.id ? labelInputRef : undefined}
                              label="Label"
                              value={expandedId === f.id ? flLabel : f.label}
                              onChange={(e) => setFlLabel(e.target.value)}
                            />
                            <Select
                              label="Typ"
                              name={`ft-${f.id}`}
                              value={expandedId === f.id ? flTyp : f.typ}
                              onChange={(e) => setFlTyp(e.target.value as FormularFeld['typ'])}
                              options={TYP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                            />
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={expandedId === f.id ? flPflicht : f.pflicht}
                                onChange={(e) => setFlPflicht(e.target.checked)}
                              />
                              Pflichtfeld
                            </label>
                            {(expandedId === f.id ? flTyp : f.typ) === 'select' ? (
                              <Textarea
                                label="Optionen (eine pro Zeile)"
                                value={expandedId === f.id ? flOpts : (f.optionen ?? []).join('\n')}
                                onChange={(e) => setFlOpts(e.target.value)}
                                rows={4}
                              />
                            ) : null}
                            <Button type="button" variant="primary" size="sm" onClick={() => saveInline(f.id)}>
                              Fertig
                            </Button>
                          </div>
                        }
                      />
                    ))}
                  </ul>
                )}
              </SortableContext>
            </DndContext>
    </Card>
  )

  const pageActionBar = !embedded ? (
    <div className="flex flex-wrap gap-2">
      <Link href="/formulare" className="btn btn-secondary inline-flex items-center justify-center">
        Abbrechen
      </Link>
      <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
        Vorschau
      </Button>
      <Button type="button" variant="primary" onClick={saveAll} loading={pending}>
        Speichern
      </Button>
      {!isNew ? (
        <Button type="button" variant="danger" onClick={onDelete} disabled={pending}>
          Deaktivieren
        </Button>
      ) : null}
    </div>
  ) : null

  const previewAside = !embedded ? (
        <aside className="w-full shrink-0 space-y-3 xl:sticky xl:top-20 xl:w-[340px]">
          <p className="text-xs font-medium uppercase tracking-wide text-bw-light">Live-Vorschau</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVorschauView('phone')}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs',
                vorschauView === 'phone'
                  ? 'border-bw-accent bg-bw-accent text-white'
                  : 'border-bw-border bg-bw-card text-bw-text'
              )}
            >
              <Smartphone className="h-4 w-4" />
              Handy
            </button>
            <button
              type="button"
              onClick={() => setVorschauView('desktop')}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs',
                vorschauView === 'desktop'
                  ? 'border-bw-accent bg-bw-accent text-white'
                  : 'border-bw-border bg-bw-card text-bw-text'
              )}
            >
              <Monitor className="h-4 w-4" />
              Desktop
            </button>
          </div>
          <p className="text-xs text-bw-light">Vorschau — nichts wird gespeichert.</p>
          {vorschauView === 'phone' ? (
            <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border-[10px] border-zinc-900 bg-zinc-900 p-1 shadow-lg">
              <div className="max-h-[min(70vh,520px)] overflow-y-auto rounded-[1.35rem] bg-white p-3">
                <FormularFelderRenderer felder={felder} daten={previewDaten} vorschauModus />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-bw-border bg-bw-canvas/30 p-3">
              <FormularFelderRenderer felder={felder} daten={previewDaten} vorschauModus />
            </div>
          )}
        </aside>
  ) : null

  const embeddedFooter = embedded ? (
    <div className="flex flex-wrap gap-2 border-t border-bw-border pt-4">
      <Button type="button" variant="secondary" onClick={() => onClose?.()}>
        Abbrechen
      </Button>
      <Button type="button" variant="secondary" onClick={() => setPreviewOpen(true)}>
        Vorschau
      </Button>
      <Button type="button" variant="primary" onClick={saveAll} loading={pending}>
        Speichern
      </Button>
      {!isNew ? (
        <Button type="button" variant="danger" onClick={onDelete} disabled={pending}>
          Deaktivieren
        </Button>
      ) : null}
    </div>
  ) : null

  return (
    <div className={cn('pb-8', embedded && 'pb-2')}>
      {!embedded ? (
        <PageHeader
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                Vorschau
              </Button>
              <Link href="/formulare" className="text-sm font-medium text-bw-link">
                Zur Liste
              </Link>
            </div>
          }
        />
      ) : (
        <div className="mb-4 flex flex-wrap gap-1 border-b border-bw-border">
          <button
            type="button"
            className={cn('tab', panelTab === 'felder' && 'active')}
            onClick={() => setPanelTab('felder')}
          >
            Felder
          </button>
          <button
            type="button"
            className={cn('tab', panelTab === 'einstellungen' && 'active')}
            onClick={() => setPanelTab('einstellungen')}
          >
            Einstellungen
          </button>
        </div>
      )}

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{err}</p>
      ) : null}

      <div className={cn('flex flex-col gap-6', !embedded && 'xl:flex-row xl:items-start')}>
        <div className="min-w-0 flex-1 space-y-6">
          {!embedded || panelTab === 'einstellungen' ? grundinfoCard : null}
          {!embedded || panelTab === 'felder' ? felderCard : null}
          {pageActionBar}
          {embeddedFooter}
        </div>
        {previewAside}
      </div>

      <FormularVorschauModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        name={name.trim() || 'Template'}
        felder={felder}
      />
    </div>
  )
}
