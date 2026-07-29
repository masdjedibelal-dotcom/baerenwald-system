'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  deleteKalenderTermin,
  saveKalenderTermin,
} from '@/app/(dashboard)/kalender/actions'
import type { KalenderTermin } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Mock-Farben: green / blue / yellow */
type MockKat = 'green' | 'blue' | 'yellow'

const KAT_OPTIONS: { value: MockKat; label: string; typ: KalenderTermin['typ'] }[] = [
  { value: 'green', label: 'Vor-Ort / Arbeit', typ: 'besichtigung' },
  { value: 'blue', label: 'Kontakt / Kickoff', typ: 'sonstiges' },
  { value: 'yellow', label: 'Abnahme', typ: 'abnahme' },
]

export function typToKat(typ: KalenderTermin['typ']): MockKat {
  if (typ === 'abnahme') return 'yellow'
  if (typ === 'sonstiges' || typ === 'intern') return 'blue'
  return 'green'
}

function katToTyp(kat: MockKat): KalenderTermin['typ'] {
  return KAT_OPTIONS.find((k) => k.value === kat)?.typ ?? 'besichtigung'
}

export function katLabel(kat: MockKat): string {
  return KAT_OPTIONS.find((k) => k.value === kat)?.label ?? 'Vor-Ort / Arbeit'
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatHm(t: string | null | undefined): string {
  if (!t?.trim()) return ''
  return t.trim().slice(0, 5)
}

function normalizeTimeInput(t: string): string | null {
  const v = t.trim()
  if (!v) return null
  if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v
  return v
}

export type KalenderTerminEditorPrefill = {
  day?: Date
  startHour?: number
}

/**
 * Slideover / Bottom-Sheet: neuen Kalender-Termin anlegen oder bestehenden bearbeiten.
 */
export function KalenderTerminEditorSheet({
  open,
  termin,
  prefill,
  onClose,
  onSaved,
}: {
  open: boolean
  /** `null` = neu */
  termin: KalenderTermin | null
  prefill?: KalenderTerminEditorPrefill | null
  onClose: () => void
  onSaved: () => void
}) {
  const formId = useId()
  const [pending, startTransition] = useTransition()
  const [titel, setTitel] = useState('')
  const [kat, setKat] = useState<MockKat>('green')
  const [datum, setDatum] = useState('')
  const [von, setVon] = useState('09:00')
  const [bis, setBis] = useState('10:00')
  const [ort, setOrt] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    if (!open) return
    if (termin) {
      setTitel(termin.titel)
      setKat(typToKat(termin.typ))
      setDatum(termin.datum.slice(0, 10))
      setVon(formatHm(termin.uhrzeit_von) || '09:00')
      setBis(formatHm(termin.uhrzeit_bis) || '10:00')
      setOrt(termin.adresse ?? '')
      setDesc(termin.beschreibung ?? '')
      return
    }
    const d = prefill?.day ?? new Date()
    setTitel('')
    setKat('green')
    setDatum(ymd(d))
    const sh = prefill?.startHour
    if (sh != null) {
      const vonStr = `${String(Math.floor(sh)).padStart(2, '0')}:${sh % 1 ? '30' : '00'}`
      const bisH = sh + 1
      const bisStr = `${String(Math.floor(bisH)).padStart(2, '0')}:${bisH % 1 ? '30' : '00'}`
      setVon(vonStr)
      setBis(bisStr)
    } else {
      setVon('09:00')
      setBis('10:00')
    }
    setOrt('')
    setDesc('')
  }, [open, termin, prefill])

  const isNew = !termin

  function save() {
    startTransition(async () => {
      const res = await saveKalenderTermin({
        id: termin?.id,
        titel,
        typ: katToTyp(kat),
        datum,
        uhrzeit_von: normalizeTimeInput(von),
        uhrzeit_bis: normalizeTimeInput(bis),
        adresse: ort.trim() || null,
        beschreibung: desc.trim() || null,
        lead_id: termin?.lead_id ?? null,
        auftrag_id: termin?.auftrag_id ?? null,
        zugewiesen_an: termin?.zugewiesen_an ?? null,
        erledigt: termin?.erledigt ?? false,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        termin ? 'Termin gespeichert' : `Termin „${titel.trim() || 'Neuer Termin'}“ angelegt`
      )
      onClose()
      onSaved()
    })
  }

  function onDelete() {
    if (!termin) return
    if (!confirm('Termin wirklich löschen?')) return
    startTransition(async () => {
      const res = await deleteKalenderTermin(termin.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Termin gelöscht')
      onClose()
      onSaved()
    })
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault()
    save()
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isNew ? 'Neuer Termin' : 'Termin bearbeiten'}
      context="detail"
      size="md"
      confirmBusy={pending}
      onConfirm={() => {
        const form = document.getElementById(formId) as HTMLFormElement | null
        if (form?.reportValidity()) save()
      }}
    >
      <form id={formId} onSubmit={submitForm} className="form-grid">
        <div className="full">
          <Input
            label="Titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z.B. Vor-Ort Termin Koch"
            required
          />
        </div>
        <div className="full">
          <div className="mb-1 text-[length:var(--fs-meta)] font-medium text-[var(--text-3)]">
            Kategorie
          </div>
          <div className="seg">
            {KAT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={cn(kat === o.value && 'on')}
                onClick={() => setKat(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <Input
          type="date"
          label="Datum"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          required
        />
        <div />
        <Input type="time" label="Von" value={von} onChange={(e) => setVon(e.target.value)} />
        <Input type="time" label="Bis" value={bis} onChange={(e) => setBis(e.target.value)} />
        <div className="full">
          <Input
            label="Ort"
            value={ort}
            onChange={(e) => setOrt(e.target.value)}
            placeholder="Stadtteil / Adresse"
          />
        </div>
        {!isNew ? (
          <div className="full">
            <Textarea
              label="Beschreibung"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
            />
          </div>
        ) : null}
        {!isNew ? (
          <div className="full pt-2">
            <MockBtn sm kind="danger" icon="trash" onClick={() => void onDelete()}>
              Termin löschen
            </MockBtn>
          </div>
        ) : null}
      </form>
    </EditorSheet>
  )
}
