'use client'

import { useMemo, useState, useTransition } from 'react'
import { List } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import {
  addAuftragPosition,
  deleteAuftragPosition,
  updateAuftragPosition,
} from '@/app/(dashboard)/auftraege/actions'
import { toast } from '@/components/ui/app-toast'
import type { AuftragHandwerkerRow, AuftragPosition, Preisliste } from '@/lib/types'
import { formatPreis } from '@/lib/utils'

type GewerkOpt = { id: string; name: string; slug: string }

const EINHEIT_OPTIONS = [
  { value: 'pauschal', label: 'pauschal' },
  { value: 'pro m²', label: 'pro m²' },
  { value: 'pro Stück', label: 'pro Stück' },
  { value: 'pro lfd. m', label: 'pro lfd. m' },
  { value: 'pro Punkt', label: 'pro Punkt' },
  { value: 'Stunden', label: 'Stunden' },
]

function emptyForm(): {
  gewerk_slug: string
  oberkategorie: string
  leistung_name: string
  beschreibung: string
  preis_fix: string
  einheit: string
  handwerker_id: string
} {
  return {
    gewerk_slug: '',
    oberkategorie: '',
    leistung_name: '',
    beschreibung: '',
    preis_fix: '',
    einheit: 'pauschal',
    handwerker_id: '',
  }
}

export function AuftragPositionenTab({
  auftragId,
  positionen,
  gewerke,
  preislisten,
  handwerkerRows,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  preislisten: Preisliste[]
  handwerkerRows: AuftragHandwerkerRow[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [neuOpen, setNeuOpen] = useState(false)
  const [edit, setEdit] = useState<AuftragPosition | null>(null)
  const [form, setForm] = useState(emptyForm())

  const sorted = useMemo(
    () => [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )

  const gewerkNameBySlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of gewerke) m.set(g.slug, g.name)
    return m
  }, [gewerke])

  const kategorienFuerGewerk = useMemo(() => {
    const g = gewerke.find((x) => x.slug === form.gewerk_slug)
    if (!g) return [] as string[]
    const set = new Set<string>()
    for (const p of preislisten) {
      if (p.gewerk_id !== g.id) continue
      const k = (p.kategorie ?? '').trim()
      if (k) set.add(k)
    }
    return Array.from(set).sort()
  }, [form.gewerk_slug, gewerke, preislisten])

  const preislisteFiltered = useMemo(() => {
    const g = gewerke.find((x) => x.slug === form.gewerk_slug)
    if (!g) return preislisten
    return preislisten.filter((p) => p.gewerk_id === g.id)
  }, [form.gewerk_slug, gewerke, preislisten])

  const hwOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const z of handwerkerRows) {
      const id = z.handwerker_id
      const n = z.handwerker?.name
      if (id && n) m.set(id, n)
    }
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }))
  }, [handwerkerRows])

  function openNeu() {
    setEdit(null)
    setForm(emptyForm())
    setNeuOpen(true)
  }

  function openEdit(p: AuftragPosition) {
    setEdit(p)
    setNeuOpen(false)
    setForm({
      gewerk_slug: p.gewerk_slug ?? gewerke.find((g) => g.name === p.gewerk_name)?.slug ?? '',
      oberkategorie: p.oberkategorie ?? '',
      leistung_name: p.leistung_name,
      beschreibung: p.beschreibung ?? '',
      preis_fix: p.preis_fix != null ? String(p.preis_fix) : '',
      einheit: p.einheit ?? 'pauschal',
      handwerker_id: p.handwerker_id ?? '',
    })
  }

  function closeModal() {
    setNeuOpen(false)
    setEdit(null)
  }

  function applyLeistungFromDatalist(value: string) {
    setForm((f) => {
      const next = { ...f, leistung_name: value }
      const match = preislisteFiltered.find((p) => p.leistung === value)
      if (match) {
        const mid =
          match.preis_min > 0 && match.preis_max > 0
            ? Math.round(((match.preis_min + match.preis_max) / 2) * 100) / 100
            : match.preis_min || match.preis_max || 0
        next.preis_fix = mid > 0 ? String(mid) : f.preis_fix
        next.einheit = match.einheit || f.einheit
      }
      return next
    })
  }

  function handleSave() {
    const gname = gewerkNameBySlug.get(form.gewerk_slug) ?? gewerke.find((x) => x.slug === form.gewerk_slug)?.name
    if (!form.gewerk_slug || !gname) {
      toast.error('Bitte Gewerk wählen.')
      return
    }
    if (!form.leistung_name.trim()) {
      toast.error('Leistung angeben.')
      return
    }
    const preisN = form.preis_fix.trim() === '' || Number.isNaN(Number(form.preis_fix)) ? null : Number(form.preis_fix)
    if (preisN == null || preisN < 0) {
      toast.error('Bitte gültigen Preis angeben.')
      return
    }

    startTransition(async () => {
      const payload = {
        gewerk_slug: form.gewerk_slug,
        gewerk_name: gname,
        oberkategorie: form.oberkategorie.trim() || null,
        unterkategorie: null as string | null,
        leistung_name: form.leistung_name.trim(),
        beschreibung: form.beschreibung.trim() || null,
        einheit: form.einheit,
        menge: 1,
        preis_fix: preisN,
        handwerker_id: form.handwerker_id.trim() || null,
      }
      const r = edit
        ? await updateAuftragPosition(edit.id, auftragId, payload)
        : await addAuftragPosition(auftragId, payload)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      closeModal()
      onChanged()
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Position wirklich löschen?')) return
    startTransition(async () => {
      const r = await deleteAuftragPosition(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gelöscht')
        onChanged()
      }
    })
  }

  const gesamt = sorted.reduce((s, p) => s + (p.preis_fix ?? 0), 0)

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-bw-text">Positionen</h3>
        <button type="button" onClick={openNeu} className="btn btn-primary btn-sm">
          + Position
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={List}
          title="Keine Positionen"
          description="Füge Gewerke und Leistungen hinzu."
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={openNeu}>
              + Position
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((pos) => (
            <div
              key={pos.id}
              className="flex items-start justify-between rounded-lg bg-bw-hover p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-bw-primary/10 px-2 py-0.5 text-xs text-bw-primary">
                    {pos.gewerk_name}
                  </span>
                  {pos.oberkategorie ? (
                    <span className="text-xs text-bw-text-muted">
                      {pos.oberkategorie}
                      {pos.unterkategorie ? ` › ${pos.unterkategorie}` : ''}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm font-medium text-bw-text">{pos.leistung_name}</div>
                {pos.handwerker?.name ? (
                  <div className="mt-1 text-xs text-bw-text-muted">👷 {pos.handwerker.name}</div>
                ) : null}
                <div className="mt-1 text-sm font-medium text-bw-primary">
                  {formatPreis(pos.preis_fix ?? null, null, null)}
                  {pos.einheit && pos.einheit !== 'pauschal' ? ` / ${pos.einheit}` : ''}
                </div>
              </div>
              <div className="ml-2 flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(pos)}
                  className="rounded p-1.5 text-bw-text-muted hover:text-bw-text"
                  aria-label="Bearbeiten"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pos.id)}
                  className="rounded p-1.5 text-bw-text-muted hover:text-status-cancel-text"
                  aria-label="Löschen"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sorted.length > 0 ? (
        <div className="mt-4 flex items-center justify-between border-t border-bw-border pt-3">
          <span className="text-sm font-medium text-bw-text">Gesamt</span>
          <span className="text-lg font-semibold text-bw-primary">{formatPreis(gesamt, null, null)}</span>
        </div>
      ) : null}

      <Modal
        open={neuOpen || !!edit}
        onClose={closeModal}
        title={edit ? 'Position bearbeiten' : 'Position hinzufügen'}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={handleSave}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Gewerk *"
            name="gewerk"
            value={form.gewerk_slug}
            onChange={(e) => setForm((f) => ({ ...f, gewerk_slug: e.target.value, oberkategorie: '' }))}
            options={[
              { value: '', label: 'Bitte wählen…' },
              ...gewerke.map((g) => ({ value: g.slug, label: g.name })),
            ]}
          />

          <Select
            label="Oberkategorie"
            name="kat"
            value={form.oberkategorie}
            onChange={(e) => setForm((f) => ({ ...f, oberkategorie: e.target.value }))}
            options={[{ value: '', label: 'Keine' }, ...kategorienFuerGewerk.map((k) => ({ value: k, label: k }))]}
          />

          <div>
            <label className="input-label">Leistung *</label>
            <input
              list="leistungen-list-auftrag"
              className="input"
              placeholder="Aus Preisliste oder freie Eingabe…"
              value={form.leistung_name}
              onChange={(e) => applyLeistungFromDatalist(e.target.value)}
            />
            <datalist id="leistungen-list-auftrag">
              {preislisteFiltered.map((p) => (
                <option key={p.id} value={p.leistung}>
                  {p.leistung} — {formatPreis(null, p.preis_min, p.preis_max)}
                </option>
              ))}
            </datalist>
          </div>

          <Input
            label="Beschreibung (optional)"
            value={form.beschreibung}
            onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))}
          />

          <div className="form-grid-2 grid gap-3 md:grid-cols-2">
            <div>
              <label className="input-label">Preis *</label>
              <div className="relative">
                <input
                  type="number"
                  className="input pr-8"
                  value={form.preis_fix}
                  onChange={(e) => setForm((f) => ({ ...f, preis_fix: e.target.value }))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bw-text-muted">
                  €
                </span>
              </div>
            </div>
            <Select
              label="Einheit"
              name="einheit"
              value={form.einheit}
              onChange={(e) => setForm((f) => ({ ...f, einheit: e.target.value }))}
              options={EINHEIT_OPTIONS}
            />
          </div>

          <Select
            label="Handwerker (optional)"
            name="hw"
            value={form.handwerker_id}
            onChange={(e) => setForm((f) => ({ ...f, handwerker_id: e.target.value }))}
            options={[
              { value: '', label: 'Nicht zugewiesen' },
              ...hwOptions.map((h) => ({
                value: h.id,
                label: h.name,
              })),
            ]}
          />
        </div>
      </Modal>
    </div>
  )
}
