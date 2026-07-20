'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  createAuftragRegiearbeit,
  deleteAuftragRegiearbeit,
  updateAuftragRegiearbeit,
} from '@/app/(dashboard)/auftraege/baustelle-actions'
import type { AuftragRegiearbeit } from '@/lib/auftraege/baustelle-types'
import { formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

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
      toast.error('Bezeichnung erforderlich')
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
        toast.error(r.message)
        return
      }
      toast.success(editId ? 'Regiearbeit aktualisiert' : 'Regiearbeit angelegt')
      setShowForm(false)
      onChanged()
    })
  }

  function remove(id: string) {
    if (!confirm('Regiearbeit löschen?')) return
    startTransition(async () => {
      const r = await deleteAuftragRegiearbeit(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-bw-text-muted">
          {regiearbeiten.length} Regiearbeit{regiearbeiten.length === 1 ? '' : 'en'}
        </p>
        <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Hinzufügen
        </Button>
      </div>

      {showForm ? (
        <div className="rounded-lg border border-bw-border bg-bw-bg/40 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Datum"
              type="date"
              value={form.datum}
              onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
            />
            <Input
              label="Personal"
              type="number"
              min={1}
              value={form.personen_anzahl}
              onChange={(e) => setForm((f) => ({ ...f, personen_anzahl: Number(e.target.value) || 1 }))}
            />
            <Input
              label="Stunden"
              type="number"
              min={0}
              step={0.5}
              value={form.stunden}
              onChange={(e) => setForm((f) => ({ ...f, stunden: Number(e.target.value) || 0 }))}
            />
          </div>
          <Input
            label="Leistung"
            value={form.bezeichnung}
            onChange={(e) => setForm((f) => ({ ...f, bezeichnung: e.target.value }))}
          />
          <Textarea
            label="Beschreibung"
            value={form.beschreibung}
            onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
            rows={2}
          />
          <Input
            label="Material"
            value={form.material}
            onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button type="button" variant="primary" size="sm" disabled={pending} onClick={save}>
              Speichern
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      {regiearbeiten.length ? (
        <div className="divide-y divide-bw-border rounded-lg border border-bw-border">
          {regiearbeiten.map((r) => (
            <div key={r.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-bw-text">{r.bezeichnung}</p>
                <p className="text-xs text-bw-text-muted">
                  {formatDatum(r.datum)} · {r.personen_anzahl} Pers. · {r.stunden} Std.
                </p>
                {r.beschreibung?.trim() ? (
                  <p className="mt-1 text-xs text-bw-text-muted">{r.beschreibung}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-bw-text-muted">Noch keine Regiearbeiten erfasst.</p>
      )}
    </div>
  )
}
