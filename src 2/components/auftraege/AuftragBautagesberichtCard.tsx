'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ChevronDown, Download, Pencil, Plus, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  createAuftragBautagesbericht,
  deleteAuftragBautagesbericht,
  listAuftragBautagesberichte,
  updateAuftragBautagesbericht,
} from '@/app/(dashboard)/auftraege/bautagesbericht-actions'
import {
  BAUTAGESBERICHT_MAX_FOTOS,
  DEFAULT_BAUTAGESBERICHT_RISIKEN,
  type AuftragBautagesbericht,
  type BautagesberichtFoto,
} from '@/lib/auftraege/bautagesbericht-types'
import type { AuftragHandwerkerRow } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

function fotosAnzeige(b: AuftragBautagesbericht): BautagesberichtFoto[] {
  return b.foto_display_urls?.length ? b.foto_display_urls : b.fotos
}

function emptyForm(defaults?: Partial<AuftragBautagesbericht>) {
  return {
    datum: defaults?.datum ?? heuteYmd(),
    arbeitszeit_von: defaults?.arbeitszeit_von ?? '07:00',
    arbeitszeit_bis: defaults?.arbeitszeit_bis ?? '17:00',
    wetter: defaults?.wetter ?? '',
    auftraggeber_name: defaults?.auftraggeber_name ?? '',
    auftraggeber_adresse: defaults?.auftraggeber_adresse ?? '',
    nachunternehmer_name: defaults?.nachunternehmer_name ?? '',
    nachunternehmer_firma: defaults?.nachunternehmer_firma ?? '',
    leistungen: defaults?.leistungen?.length ? [...defaults.leistungen] : [''],
    behinderungen: defaults?.behinderungen ?? '',
    qualitaetssicherung: defaults?.qualitaetssicherung ?? '',
    risiken: defaults?.risiken?.length ? [...defaults.risiken] : [...DEFAULT_BAUTAGESBERICHT_RISIKEN],
    zusammenfassung: defaults?.zusammenfassung ?? '',
    personal_namen: defaults?.personal_namen?.length ? [...defaults.personal_namen] : [''],
    fotos: defaults?.fotos?.length ? [...defaults.fotos] : ([] as BautagesberichtFoto[]),
    handwerker_id: defaults?.handwerker_id ?? '',
  }
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  return (
    <div className="form-field">
      <label className="form-field-label">{label}</label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const next = [...items]
                next[i] = e.target.value
                onChange(next)
              }}
              placeholder={placeholder}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Zeile entfernen"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => onChange([...items, ''])}
        >
          <Plus className="h-3.5 w-3.5" />
          Zeile hinzufügen
        </Button>
      </div>
    </div>
  )
}

export function AuftragBautagesberichtCard({
  auftragId,
  berichte: initial,
  kundeName,
  kundeAdresse,
  handwerker = [],
  onChanged,
}: {
  auftragId: string
  berichte: AuftragBautagesbericht[]
  kundeName: string
  kundeAdresse?: string
  handwerker?: AuftragHandwerkerRow[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState(initial)
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(() =>
    emptyForm({
      auftraggeber_name: kundeName,
      auftraggeber_adresse: kundeAdresse,
      nachunternehmer_firma: handwerker[0]?.handwerker?.firma ?? '',
      nachunternehmer_name: handwerker[0]?.handwerker?.name ?? '',
      handwerker_id: handwerker[0]?.handwerker_id ?? '',
    })
  )
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRows(initial)
  }, [initial])

  const naechsterTag = useMemo(() => {
    const max = rows.reduce((m, r) => Math.max(m, r.tag_nummer), 0)
    return max + 1
  }, [rows])

  function resetNeu() {
    setForm(
      emptyForm({
        auftraggeber_name: kundeName,
        auftraggeber_adresse: kundeAdresse,
        nachunternehmer_firma: handwerker[0]?.handwerker?.firma ?? '',
        nachunternehmer_name: handwerker[0]?.handwerker?.name ?? '',
        handwerker_id: handwerker[0]?.handwerker_id ?? '',
      })
    )
    setEditId(null)
  }

  function startEdit(b: AuftragBautagesbericht) {
    setEditId(b.id)
    setAddOpen(false)
    setForm(emptyForm(b))
  }

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true)
    try {
      const list = Array.from(files)
      const added: BautagesberichtFoto[] = []
      for (const file of list) {
        if (form.fotos.length + added.length >= BAUTAGESBERICHT_MAX_FOTOS) break
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; message?: string }
        if (!res.ok || !json.url) {
          toast.error(json.message ?? 'Upload fehlgeschlagen')
          continue
        }
        added.push({ url: json.url, caption: '' })
      }
      if (added.length) {
        setForm((f) => ({ ...f, fotos: [...f.fotos, ...added] }))
      }
    } finally {
      setUploading(false)
    }
  }

  function payloadFromForm() {
    return {
      datum: form.datum,
      arbeitszeit_von: form.arbeitszeit_von,
      arbeitszeit_bis: form.arbeitszeit_bis,
      wetter: form.wetter,
      auftraggeber_name: form.auftraggeber_name,
      auftraggeber_adresse: form.auftraggeber_adresse,
      nachunternehmer_name: form.nachunternehmer_name,
      nachunternehmer_firma: form.nachunternehmer_firma,
      leistungen: form.leistungen.filter((x) => x.trim()),
      behinderungen: form.behinderungen,
      qualitaetssicherung: form.qualitaetssicherung,
      risiken: form.risiken.filter((x) => x.trim()),
      zusammenfassung: form.zusammenfassung,
      personal_namen: form.personal_namen.filter((x) => x.trim()),
      fotos: form.fotos,
      handwerker_id: form.handwerker_id || null,
    }
  }

  function save() {
    startTransition(async () => {
      const payload = payloadFromForm()
      if (!payload.leistungen.length) {
        toast.error('Bitte mindestens eine ausgeführte Leistung eintragen.')
        return
      }
      if (editId) {
        const r = await updateAuftragBautagesbericht(editId, payload)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success('Bautagesbericht gespeichert')
        setEditId(null)
      } else {
        const r = await createAuftragBautagesbericht({ auftrag_id: auftragId, ...payload })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success(`Bautagesbericht Tag ${String(naechsterTag).padStart(2, '0')} angelegt`)
        setAddOpen(false)
        resetNeu()
      }
      const list = await listAuftragBautagesberichte(auftragId)
      setRows(list)
      onChanged()
    })
  }

  function removeBericht(id: string) {
    if (!confirm('Bautagesbericht wirklich löschen?')) return
    startTransition(async () => {
      const r = await deleteAuftragBautagesbericht(id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gelöscht')
      setRows((prev) => prev.filter((b) => b.id !== id))
      onChanged()
    })
  }

  const formOpen = addOpen || editId != null

  return (
    <div className="space-y-4">
      <p className="text-sm text-bw-text-muted">
        Ausführlicher Bautagesbericht für Bauprojekte — PDF im Bärenwald-Standardlayout (wie
        Abschlussdokumentation).
      </p>

      {rows.length === 0 && !formOpen ? (
        <p className="text-sm text-bw-text-muted">Noch keine Bautagesberichte.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((b) => {
            const open = openIds.has(b.id)
            const tag = String(b.tag_nummer).padStart(2, '0')
            return (
              <li key={b.id} className="rounded-lg border border-bw-border bg-bw-surface">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() =>
                      setOpenIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(b.id)) next.delete(b.id)
                        else next.add(b.id)
                        return next
                      })
                    }
                  >
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 transition', open && 'rotate-180')}
                    />
                    <span className="font-medium text-bw-text">
                      Tag {tag} · {formatDatum(b.datum)}
                    </span>
                    {b.personal_namen.length > 0 ? (
                      <span className="text-xs text-bw-text-muted">
                        {b.personal_namen.length} MA
                      </span>
                    ) : null}
                  </button>
                  <a
                    href={`/api/auftraege/${auftragId}/bautagesbericht/${b.id}`}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-bw-primary hover:bg-bw-primary/10"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(b)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBericht(b.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-status-cancel-text" />
                  </Button>
                </div>
                {open ? (
                  <div className="border-t border-bw-border px-3 py-3 text-sm text-bw-text-muted space-y-2">
                    {b.zusammenfassung ? <p>{b.zusammenfassung}</p> : null}
                    {b.leistungen.length > 0 ? (
                      <ul className="list-disc pl-5">
                        {b.leistungen.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    ) : null}
                    {fotosAnzeige(b).length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {fotosAnzeige(b).map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={f.url}
                              alt={f.caption ?? `Foto ${i + 1}`}
                              className="h-16 w-24 rounded object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {formOpen ? (
        <div className="rounded-lg border border-bw-border bg-bw-surface p-4 space-y-4">
          <h3 className="text-sm font-semibold text-bw-text">
            {editId ? 'Bautagesbericht bearbeiten' : `Neuer Bautagesbericht — Tag ${String(naechsterTag).padStart(2, '0')}`}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="form-field">
              <label className="form-field-label">Datum</label>
              <Input
                type="date"
                value={form.datum}
                onChange={(e) => setForm((f) => ({ ...f, datum: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Wetter</label>
              <Input
                value={form.wetter}
                onChange={(e) => setForm((f) => ({ ...f, wetter: e.target.value }))}
                placeholder="z. B. Sonnig, trocken"
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Arbeitszeit von</label>
              <Input
                type="time"
                value={form.arbeitszeit_von}
                onChange={(e) => setForm((f) => ({ ...f, arbeitszeit_von: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Arbeitszeit bis</label>
              <Input
                type="time"
                value={form.arbeitszeit_bis}
                onChange={(e) => setForm((f) => ({ ...f, arbeitszeit_bis: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Auftraggeber</label>
              <Input
                value={form.auftraggeber_name}
                onChange={(e) => setForm((f) => ({ ...f, auftraggeber_name: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="form-field-label">Nachunternehmer (Firma)</label>
              <Input
                value={form.nachunternehmer_firma}
                onChange={(e) => setForm((f) => ({ ...f, nachunternehmer_firma: e.target.value }))}
              />
            </div>
          </div>
          <StringListEditor
            label="Ausgeführte Leistungen"
            items={form.leistungen}
            onChange={(leistungen) => setForm((f) => ({ ...f, leistungen }))}
            placeholder="Leistung beschreiben…"
          />
          <div className="form-field">
            <label className="form-field-label">Behinderungen und Besonderheiten</label>
            <Textarea
              rows={3}
              value={form.behinderungen}
              onChange={(e) => setForm((f) => ({ ...f, behinderungen: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label className="form-field-label">Qualitätssicherung und Dokumentation</label>
            <Textarea
              rows={3}
              value={form.qualitaetssicherung}
              onChange={(e) => setForm((f) => ({ ...f, qualitaetssicherung: e.target.value }))}
            />
          </div>
          <StringListEditor
            label="Risiken & Hinweise"
            items={form.risiken}
            onChange={(risiken) => setForm((f) => ({ ...f, risiken }))}
          />
          <div className="form-field">
            <label className="form-field-label">Zusammenfassung</label>
            <Textarea
              rows={3}
              value={form.zusammenfassung}
              onChange={(e) => setForm((f) => ({ ...f, zusammenfassung: e.target.value }))}
            />
          </div>
          <StringListEditor
            label="Personalnachweis (Namen)"
            items={form.personal_namen}
            onChange={(personal_namen) => setForm((f) => ({ ...f, personal_namen }))}
            placeholder="Mitarbeitername"
          />
          <div className="form-field">
            <label className="form-field-label">
              Fotodokumentation ({form.fotos.length}/{BAUTAGESBERICHT_MAX_FOTOS})
            </label>
            <div className="flex flex-wrap gap-2">
              {form.fotos.map((f, i) => (
                <div key={i} className="w-36 space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="h-20 w-full rounded object-cover" />
                  <Input
                    value={f.caption ?? ''}
                    placeholder="Bildbeschriftung"
                    onChange={(e) => {
                      const fotos = [...form.fotos]
                      fotos[i] = { ...fotos[i], caption: e.target.value }
                      setForm((prev) => ({ ...prev, fotos }))
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        fotos: prev.fotos.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    Entfernen
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 gap-1"
              disabled={uploading || form.fotos.length >= BAUTAGESBERICHT_MAX_FOTOS}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Fotos hochladen
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void uploadFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddOpen(false)
                setEditId(null)
                resetNeu()
              }}
            >
              Abbrechen
            </Button>
            <Button type="button" variant="primary" size="sm" loading={pending} onClick={save}>
              Speichern
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1"
          onClick={() => {
            resetNeu()
            setAddOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Bautagesbericht Tag {String(naechsterTag).padStart(2, '0')}
        </Button>
      )}
    </div>
  )
}
