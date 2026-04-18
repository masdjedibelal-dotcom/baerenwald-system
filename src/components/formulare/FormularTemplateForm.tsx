'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { FormularFeld, FormularTemplate, Gewerk } from '@/lib/types'
import { FORMULAR_PHASE_LABELS } from '@/lib/utils'
import { saveFormularTemplate, deleteFormularTemplate } from '@/app/(dashboard)/formulare/actions'
import { FormularFelderRenderer, FormularFeldTypBadge } from '@/components/formulare/FormularFelderRenderer'

const TYP_OPTIONS: { value: FormularFeld['typ']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Mehrzeiliger Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'checkbox', label: 'Ja/Nein (Checkbox)' },
  { value: 'select', label: 'Auswahl (Select)' },
  { value: 'foto', label: 'Foto-Upload' },
]

function newFieldId() {
  return globalThis.crypto?.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function FormularTemplateForm({
  initial,
  gewerke,
}: {
  initial: FormularTemplate | null
  gewerke: Gewerk[]
}) {
  const router = useRouter()
  const isNew = !initial
  const [name, setName] = useState(initial?.name ?? '')
  const [gewerkId, setGewerkId] = useState(initial?.gewerk_id ?? '')
  const [typ, setTyp] = useState<FormularTemplate['typ']>(initial?.typ ?? 'handwerker')
  const [phase, setPhase] = useState<NonNullable<FormularTemplate['phase']>>(
    (initial?.phase ?? 'vorab') as NonNullable<FormularTemplate['phase']>
  )
  const [aktiv, setAktiv] = useState(initial?.aktiv ?? true)
  const [felder, setFelder] = useState<FormularFeld[]>(initial?.felder ?? [])
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [feldModal, setFeldModal] = useState(false)
  const [editFeld, setEditFeld] = useState<FormularFeld | null>(null)
  const [flLabel, setFlLabel] = useState('')
  const [flTyp, setFlTyp] = useState<FormularFeld['typ']>('text')
  const [flPflicht, setFlPflicht] = useState(false)
  const [flOpts, setFlOpts] = useState('')

  const previewDaten = useMemo(() => {
    const o: Record<string, unknown> = {}
    for (const f of felder) {
      if (f.typ === 'checkbox') o[f.id] = false
      else if (f.typ === 'number') o[f.id] = ''
      else o[f.id] = ''
    }
    return o
  }, [felder])

  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({})

  function openAddFeld() {
    setEditFeld(null)
    setFlLabel('')
    setFlTyp('text')
    setFlPflicht(false)
    setFlOpts('')
    setFeldModal(true)
  }

  function openEditFeld(f: FormularFeld) {
    setEditFeld(f)
    setFlLabel(f.label)
    setFlTyp(f.typ)
    setFlPflicht(f.pflicht)
    setFlOpts((f.optionen ?? []).join('\n'))
    setFeldModal(true)
  }

  function saveFeldModal() {
    if (!flLabel.trim()) return
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
    if (editFeld) {
      setFelder((prev) =>
        prev.map((x) =>
          x.id === editFeld.id
            ? { ...x, label: flLabel.trim(), typ: flTyp, pflicht: flPflicht, optionen }
            : x
        )
      )
    } else {
      setFelder((prev) => [
        ...prev,
        {
          id: newFieldId(),
          label: flLabel.trim(),
          typ: flTyp,
          pflicht: flPflicht,
          ...(optionen ? { optionen } : {}),
        },
      ])
    }
    setFeldModal(false)
  }

  function removeFeld(id: string) {
    setFelder((prev) => prev.filter((f) => f.id !== id))
  }

  function moveFeld(index: number, delta: number) {
    const j = index + delta
    if (j < 0 || j >= felder.length) return
    setFelder((prev) => {
      const next = [...prev]
      const t = next[index]!
      next[index] = next[j]!
      next[j] = t
      return next
    })
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
        phase,
        felder,
        aktiv,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      if (isNew) router.replace(`/formulare/${res.id}`)
      else router.refresh()
    })
  }

  function onDelete() {
    if (!initial?.id) return
    if (!confirm('Template wirklich löschen?')) return
    startTransition(async () => {
      const res = await deleteFormularTemplate(initial.id)
      if (!res.ok) {
        setErr(res.message)
        return
      }
      router.replace('/formulare')
    })
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'Neues Template' : name || 'Template'}
        action={
          <div className="flex flex-wrap gap-2">
            {!isNew && initial?.id ? (
              <>
                <Link
                  href={`/formulare/${initial.id}/vorschau`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-ink hover:bg-canvas"
                >
                  Vorschau öffnen
                </Link>
                <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                  Vorschau Modal
                </Button>
              </>
            ) : null}
            <Link
              href="/formulare"
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
            >
              Zur Liste
            </Link>
          </div>
        }
      />

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{err}</p>
      ) : null}

      <Card className="mb-6 space-y-4 p-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select
          label="Gewerk (optional)"
          name="gewerk"
          value={gewerkId}
          onChange={(e) => setGewerkId(e.target.value)}
          options={[
            { value: '', label: 'Alle / keins' },
            ...gewerke.filter((g) => g.aktiv).map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
        <Select
          label="Typ"
          name="typ"
          value={typ}
          onChange={(e) => setTyp(e.target.value as FormularTemplate['typ'])}
          options={[
            { value: 'handwerker', label: 'Handwerker' },
            { value: 'betreuer', label: 'Betreuer (Vor-Ort)' },
          ]}
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={aktiv} onChange={(e) => setAktiv(e.target.checked)} />
          Aktiv
        </label>
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Felder</h2>
          <Button type="button" size="sm" variant="secondary" onClick={openAddFeld}>
            <Plus className="h-4 w-4" aria-hidden />
            Feld hinzufügen
          </Button>
        </div>
        <ul className="space-y-2">
          {felder.length === 0 ? (
            <p className="text-sm text-muted">Noch keine Felder.</p>
          ) : (
            felder.map((f, i) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{f.label}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <FormularFeldTypBadge typ={f.typ} />
                    {f.pflicht ? (
                      <span className="text-xs text-danger">Pflicht</span>
                    ) : (
                      <span className="text-xs text-muted">optional</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border"
                    onClick={() => moveFeld(i, -1)}
                    disabled={i === 0}
                    aria-label="Nach oben"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border"
                    onClick={() => moveFeld(i, 1)}
                    disabled={i === felder.length - 1}
                    aria-label="Nach unten"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border"
                    onClick={() => openEditFeld(f)}
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-border text-danger"
                    onClick={() => removeFeld(f.id)}
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={saveAll} loading={pending}>
          Speichern
        </Button>
        {!isNew ? (
          <Button type="button" variant="danger" onClick={onDelete} disabled={pending}>
            Löschen
          </Button>
        ) : null}
      </div>

      {feldModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">{editFeld ? 'Feld bearbeiten' : 'Feld hinzufügen'}</h3>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => setFeldModal(false)}
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-3">
              <Input label="Label" value={flLabel} onChange={(e) => setFlLabel(e.target.value)} required />
              <Select
                label="Feldtyp"
                name="ftyp"
                value={flTyp}
                onChange={(e) => setFlTyp(e.target.value as FormularFeld['typ'])}
                options={TYP_OPTIONS}
              />
              <label className="flex items-center gap-2 text-sm">
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
                <Button type="button" variant="primary" className="flex-1" onClick={saveFeldModal}>
                  Übernehmen
                </Button>
                <Button type="button" variant="secondary" onClick={() => setFeldModal(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">Vorschau</h3>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => setPreviewOpen(false)}
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <FormularFelderRenderer
              felder={felder}
              daten={{ ...previewDaten, ...previewValues }}
              onChange={(id, value) => setPreviewValues((p) => ({ ...p, [id]: value }))}
            />
            <Button type="button" className="mt-4 w-full" variant="secondary" onClick={() => setPreviewOpen(false)}>
              Schließen
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
