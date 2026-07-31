'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { saveFormularTemplate } from '@/app/(dashboard)/formulare/actions'
import type { FormularFeld, FormularTemplate } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'

const TYP_OPTS: { value: NonNullable<FormularTemplate['phase']>; label: string }[] = [
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'update', label: 'Update' },
  { value: 'vorab', label: 'Vorab' },
]

const FELD_TYP_OPTS: { value: FormularFeld['typ']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Langer Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'date', label: 'Datum' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Auswahl' },
  { value: 'foto', label: 'Foto' },
]

type DraftFeld = {
  key: string
  label: string
  typ: FormularFeld['typ']
}

function newKey() {
  return globalThis.crypto?.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function phaseToSubtyp(phase: NonNullable<FormularTemplate['phase']>): string {
  if (phase === 'abnahme') return 'abnahme'
  if (phase === 'update') return 'bautagebuch'
  return 'checkliste'
}

/** Mock: Formular anlegen — Drawer mit Feldern. */
export function FormularCreateSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<NonNullable<FormularTemplate['phase']>>('abnahme')
  const [felder, setFelder] = useState<DraftFeld[]>([
    { key: newKey(), label: '', typ: 'text' },
    { key: newKey(), label: '', typ: 'text' },
    { key: newKey(), label: '', typ: 'text' },
  ])
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setPhase('abnahme')
    setFelder([
      { key: newKey(), label: '', typ: 'text' },
      { key: newKey(), label: '', typ: 'text' },
      { key: newKey(), label: '', typ: 'text' },
    ])
    setErr(null)
    setDirty(false)
  }, [open])

  function markDirty() {
    setDirty(true)
  }

  function addFeld() {
    setFelder((prev) => [...prev, { key: newKey(), label: '', typ: 'text' }])
    markDirty()
  }

  function removeFeld(key: string) {
    setFelder((prev) => (prev.length <= 1 ? prev : prev.filter((f) => f.key !== key)))
    markDirty()
  }

  function patchFeld(key: string, patch: Partial<DraftFeld>) {
    setFelder((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
    markDirty()
  }

  function speichern() {
    if (!name.trim()) {
      setErr('Formularname ist Pflicht.')
      return
    }
    const mapped: FormularFeld[] = felder
      .filter((f) => f.label.trim())
      .map((f) => ({
        id: f.key,
        label: f.label.trim(),
        typ: f.typ,
        pflicht: false,
      }))
    if (mapped.length === 0) {
      setErr('Mindestens ein Feld mit Bezeichnung anlegen.')
      return
    }

    setErr(null)
    startTransition(async () => {
      const res = await saveFormularTemplate({
        name: name.trim(),
        gewerk_id: null,
        typ: 'handwerker',
        subtyp: phaseToSubtyp(phase),
        phase,
        felder: mapped,
        aktiv: true,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      toast.success('Formular angelegt')
      setDirty(false)
      onClose()
      router.push(`/formulare/${res.id}/bearbeiten`)
      router.refresh()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Formular anlegen"
      crumb="Neues Formular >"
      context="detail"
      dirty={dirty}
      size="lg"
      onConfirm={speichern}
      confirmBusy={pending}
      confirmDisabled={pending}
    >
      <div className="kunde-create">
        {err ? <p className="kunde-create__err">{err}</p> : null}

        <MockFormSection>
          <MockField label="Formularname" required full>
            <input
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                markDirty()
              }}
              placeholder="Abnahmeprotokoll Standard"
            />
          </MockField>
          <MockField label="Typ" full>
            <select
              className="input"
              value={phase}
              onChange={(e) => {
                setPhase(e.target.value as NonNullable<FormularTemplate['phase']>)
                markDirty()
              }}
            >
              {TYP_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </MockField>
        </MockFormSection>

        <div className="form-section">
          <div className="form-section-h">
            <MockIcon ctx="default" n="layout-dashboard" size={13} />
            Felder
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {felder.map((f, i) => (
              <div
                key={f.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 140px 36px',
                  gap: 8,
                  alignItems: 'end',
                }}
              >
                <div
                  style={{
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--text-4)',
                    paddingBottom: 10,
                    textAlign: 'center',
                  }}
                >
                  {i + 1}
                </div>
                <MockField label="Feldbezeichnung">
                  <input
                    className="input"
                    value={f.label}
                    onChange={(e) => patchFeld(f.key, { label: e.target.value })}
                    placeholder="Bezeichnung"
                  />
                </MockField>
                <MockField label="Typ">
                  <select
                    className="input"
                    value={f.typ}
                    onChange={(e) =>
                      patchFeld(f.key, { typ: e.target.value as FormularFeld['typ'] })
                    }
                  >
                    {FELD_TYP_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </MockField>
                <button
                  type="button"
                  className="qa-btn"
                  title="Entfernen"
                  aria-label="Feld entfernen"
                  onClick={() => removeFeld(f.key)}
                >
                  <MockIcon ctx="default" n="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn ghost sm" style={{ marginTop: 12 }} onClick={addFeld}>
            + Feld hinzufügen
          </button>
        </div>
      </div>
    </EditorSheet>
  )
}
