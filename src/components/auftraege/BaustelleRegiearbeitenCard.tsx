'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useTransition } from '@/components/ui/action-busy'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { DateInput } from '@/components/ui/DateInput'
import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import {
  createAuftragRegiearbeit,
  deleteAuftragRegiearbeit,
  updateAuftragRegiearbeit,
} from '@/app/(dashboard)/auftraege/baustelle-actions'
import type { AuftragRegiearbeit } from '@/lib/auftraege/baustelle-types'
import { formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'
import { TOAST } from '@/lib/copy'

function emptyForm() {
  return {
    datum: heuteYmd(),
    bezeichnung: '',
    beschreibung: '',
    personen_anzahl: 1,
    stunden: 0,
    material: '',
  }
}

export function BaustelleRegiearbeitenCard({
  auftragId,
  regiearbeiten,
  onChanged,
}: {
  auftragId: string
  regiearbeiten: AuftragRegiearbeit[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(r: AuftragRegiearbeit) {
    setEditId(r.id)
    setForm({
      datum: r.datum,
      bezeichnung: r.bezeichnung,
      beschreibung: r.beschreibung ?? '',
      personen_anzahl: r.personen_anzahl,
      stunden: r.stunden,
      material: r.material ?? '',
    })
    setShowForm(true)
  }

  function save() {
    if (!form.bezeichnung.trim()) {
      toast.error(TOAST.bezeichnung_erforderlich)
      return
    }
    startTransition(async () => {
      const payload = {
        datum: form.datum,
        bezeichnung: form.bezeichnung,
        beschreibung: form.beschreibung || null,
        personen_anzahl: form.personen_anzahl,
        stunden: form.stunden,
        material: form.material || null,
      }
      const r = editId
        ? await updateAuftragRegiearbeit(editId, auftragId, payload)
        : await createAuftragRegiearbeit({ auftrag_id: auftragId, ...payload })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(editId ? 'Regiearbeit aktualisiert' : 'Regiearbeit angelegt')
      setShowForm(false)
      onChanged()
    })
  }

  function remove(id: string) {
    openDeleteConfirm('Regiearbeit löschen?', async () => {
      const r = await deleteAuftragRegiearbeit(id, auftragId)
      if (!r.ok) {
        toast.systemError(r)
        throw new Error(r.message)
      }
      toast.success(TOAST.regiearbeit_geloescht)
      onChanged()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          {regiearbeiten.length} Regiearbeit{regiearbeiten.length === 1 ? '' : 'en'}
        </p>
        <MockBtn type="button" kind="primary" sm className="gap-1" onClick={openCreate}>
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
          Hinzufügen
        </MockBtn>
      </div>

      {showForm ? (
        <div className="rounded-button border border-bw-border bg-bw-bg/40 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <MockField label="Datum"><DateInput value={form.datum} onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))} /></MockField>
            <MockField label="Personal"><MockInput type="number" min={1} value={form.personen_anzahl} onChange={(e) => setForm((f) => ({ ...f, personen_anzahl: Number(e.target.value) || 1 }))} /></MockField>
            <MockField label="Stunden"><MockInput type="number" min={0} step={0.5} value={form.stunden} onChange={(e) => setForm((f) => ({ ...f, stunden: Number(e.target.value) || 0 }))} /></MockField>
          </div>
          <MockField label="Leistung"><MockInput value={form.bezeichnung} onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))} /></MockField>
          <MockField label="Beschreibung"><RichTextEditor value={typeof (form.beschreibung) === 'string' ? (form.beschreibung) : ''} onChange={(__v) => setForm((f) => ({ ...f, beschreibung: __v }))} minHeight={120} aria-label="Beschreibung" /></MockField>
          <MockField label="Material"><MockInput value={form.material} onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))} /></MockField>
          <div className="flex justify-between gap-2">
            <MockBtn type="button" kind="secondary" sm onClick={() => setShowForm(false)}>
              Abbrechen
            </MockBtn>
            <MockBtn type="button" kind="primary" sm disabled={pending} onClick={save}>
              Speichern
            </MockBtn>
          </div>
        </div>
      ) : null}

      {regiearbeiten.length ? (
        <div className="divide-y divide-bw-border rounded-card border border-bw-border">
          {regiearbeiten.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--fs-text)] font-medium text-bw-text">{r.bezeichnung}</p>
                <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  {formatDatum(r.datum)} · {r.personen_anzahl} Pers. · {r.stunden} Std.
                </p>
                {r.beschreibung?.trim() ? (
                  <p className="mt-1 text-[length:var(--fs-meta)] text-bw-text-muted">{r.beschreibung}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <MockBtn type="button" kind="ghost" sm onClick={() => openEdit(r)}>
                  <MockIcon n="pencil" ctx="default" className="h-3.5 w-3.5" />
                </MockBtn>
                <MockBtn type="button" kind="ghost" sm onClick={() => remove(r.id)}>
                  <MockIcon n="trash" ctx="default" className="h-3.5 w-3.5" />
                </MockBtn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Regiearbeiten erfasst.</p>
      )}
    </div>
  )
}
