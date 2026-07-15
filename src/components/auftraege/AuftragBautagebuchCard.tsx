'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ChevronDown, Eye, Pencil, Plus, Send, Trash2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MobileListFilterSheet } from '@/components/ui/MobileListFilterSheet'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { toast } from '@/components/ui/app-toast'
import {
  gewerkOptionenAusPositionen,
  gewerkSelectionFromEintrag,
  type GewerkOpt,
} from '@/lib/auftraege/auftrag-position-blocks'
import { BautagebuchKundeSendModal } from '@/components/auftraege/BautagebuchKundeSendModal'
import {
  anfrageHandwerkerBautagebuchEintrag,
  createAuftragBautagebuchEintrag,
  deleteAuftragBautagebuchEintrag,
  freigebenBautagebuchEintrag,
  listAuftragBautagebuch,
  updateAuftragBautagebuchEintrag,
} from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import {
  BAUTAGEBUCH_MAX_FOTOS,
  mergeBautagebuchFotoUrls,
} from '@/lib/auftraege/bautagebuch-fotos'
import type { AuftragBautagebuchEintrag, AuftragPosition } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

const BAUTAGEBUCH_POLL_MS = 20_000

function eintragFotosAnzeige(e: AuftragBautagebuchEintrag): string[] {
  if (e.foto_display_urls?.length) return e.foto_display_urls
  return e.foto_urls ?? []
}

function istPartnerEntwurf(e: AuftragBautagebuchEintrag): boolean {
  return Boolean(e.handwerker_id) && !e.fuer_kunde_freigegeben
}

export function AuftragBautagebuchCard({
  auftragId,
  eintraege,
  kundeName,
  positionen = [],
  gewerke = [],
  onChanged,
}: {
  auftragId: string
  eintraege: AuftragBautagebuchEintrag[]
  kundeName: string
  positionen?: AuftragPosition[]
  gewerke?: GewerkOpt[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [sendEintrag, setSendEintrag] = useState<AuftragBautagebuchEintrag | null>(null)

  const [neuTitel, setNeuTitel] = useState('')
  const [neuDatum, setNeuDatum] = useState(heuteYmd())
  const [neuGewerk, setNeuGewerk] = useState('')
  const [neuBeschreibung, setNeuBeschreibung] = useState('')
  const [neuFotos, setNeuFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editTitel, setEditTitel] = useState('')
  const [editDatum, setEditDatum] = useState('')
  const [editGewerk, setEditGewerk] = useState('')
  const [editBeschreibung, setEditBeschreibung] = useState('')
  const [editFotos, setEditFotos] = useState<string[]>([])
  const [editFotoDisplay, setEditFotoDisplay] = useState<string[]>([])
  const [filterPartner, setFilterPartner] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [rows, setRows] = useState(eintraege)
  const seenPartnerIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    setRows(eintraege)
  }, [eintraege])

  useEffect(() => {
    let cancelled = false
    const poll = () => {
      void listAuftragBautagebuch(auftragId).then((list) => {
        if (cancelled) return
        setRows(list)
        const neu = list.filter((e) => istPartnerEntwurf(e) && !seenPartnerIds.current.has(e.id))
        if (neu.length) {
          setOpenIds((prev) => {
            const next = new Set(prev)
            for (const e of neu) next.add(e.id)
            return next
          })
          for (const e of neu) seenPartnerIds.current.add(e.id)
        }
      })
    }
    poll()
    const id = window.setInterval(poll, BAUTAGEBUCH_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [auftragId])

  const gewerkOptionen = useMemo(
    () => gewerkOptionenAusPositionen(positionen, gewerke),
    [positionen, gewerke]
  )

  const gewerkSelectOptions = useMemo(() => {
    if (gewerkOptionen.length === 1) {
      return [{ value: gewerkOptionen[0]!.id, label: gewerkOptionen[0]!.name }]
    }
    return [
      { value: '', label: 'Keine Angabe (automatisch)' },
      ...gewerkOptionen.map((g) => ({ value: g.id, label: g.name })),
    ]
  }, [gewerkOptionen])

  function gewerkLabel(e: AuftragBautagebuchEintrag): string | null {
    const sel = gewerkSelectionFromEintrag(e)
    if (!sel) return null
    return gewerkOptionen.find((g) => g.id === sel)?.name ?? null
  }

  const sorted = useMemo(() => {
    let list = rows
    if (filterPartner) {
      list = list.filter((e) => Boolean(e.handwerker_id))
    }
    return [...list].sort((a, b) => {
      const d = new Date(b.datum).getTime() - new Date(a.datum).getTime()
      if (d !== 0) return d
      return (b.sort_order ?? 0) - (a.sort_order ?? 0)
    })
  }, [rows, filterPartner])

  const pendingPartner = useMemo(
    () =>
      [...rows]
        .filter(istPartnerEntwurf)
        .sort((a, b) => new Date(b.created_at ?? b.datum).getTime() - new Date(a.created_at ?? a.datum).getTime()),
    [rows]
  )

  const partnerCount = useMemo(
    () => rows.filter((e) => Boolean(e.handwerker_id)).length,
    [rows]
  )

  const zugewiesenePartner = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const p of positionen) {
      if (!p.handwerker_id) continue
      map.set(p.handwerker_id, {
        id: p.handwerker_id,
        name: p.handwerker?.name?.trim() || 'Partner',
      })
    }
    return Array.from(map.values())
  }, [positionen])

  function requestPartnerBautagebuch(handwerkerId: string, name: string) {
    startTransition(async () => {
      const res = await anfrageHandwerkerBautagebuchEintrag({ auftragId, handwerkerId })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(`Tagebucheintrag an ${name} angefordert.`)
      onChanged()
    })
  }

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function uploadFiles(files: FileList | File[], target: 'neu' | 'edit') {
    const current = target === 'neu' ? neuFotos : editFotos
    const slots = BAUTAGEBUCH_MAX_FOTOS - current.length
    if (slots <= 0) {
      toast.error(`Maximal ${BAUTAGEBUCH_MAX_FOTOS} Fotos pro Eintrag.`)
      return
    }

    const list = Array.from(files).slice(0, slots)
    if (!list.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      if (target === 'neu') {
        setNeuFotos((prev) => mergeBautagebuchFotoUrls(prev, urls))
      } else {
        setEditFotos((prev) => mergeBautagebuchFotoUrls(prev, urls))
        setEditFotoDisplay((prev) => mergeBautagebuchFotoUrls(prev, urls))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function resetAddForm() {
    setNeuTitel('')
    setNeuBeschreibung('')
    setNeuFotos([])
    setNeuGewerk(gewerkOptionen.length === 1 ? gewerkOptionen[0]!.id : '')
    setNeuDatum(heuteYmd())
  }

  function openAdd() {
    resetAddForm()
    setAddOpen(true)
  }

  function closeAdd() {
    setAddOpen(false)
  }

  function createEintrag() {
    if (!neuTitel.trim()) {
      toast.error('Bitte einen Titel eingeben.')
      return
    }
    const gewerkPhase =
      neuGewerk.trim() || (gewerkOptionen.length === 1 ? gewerkOptionen[0]!.id : null) || null
    startTransition(async () => {
      const r = await createAuftragBautagebuchEintrag({
        auftragId,
        titel: neuTitel,
        beschreibung: neuBeschreibung,
        datum: neuDatum,
        gewerk_phase: gewerkPhase,
        foto_urls: neuFotos,
      })
      if (!r.ok) toast.error(r.message)
      else {
        resetAddForm()
        setAddOpen(false)
        toast.success('Eintrag gespeichert')
        onChanged()
      }
    })
  }

  function startEdit(e: AuftragBautagebuchEintrag) {
    setEditId(e.id)
    setEditTitel(e.titel)
    setEditDatum(e.datum.slice(0, 10))
    setEditGewerk(
      gewerkSelectionFromEintrag(e) || (gewerkOptionen.length === 1 ? gewerkOptionen[0]!.id : '')
    )
    setEditBeschreibung(e.beschreibung ?? '')
    setEditFotos([...(e.foto_urls ?? [])])
    setEditFotoDisplay(eintragFotosAnzeige(e))
    setOpenIds((prev) => new Set(prev).add(e.id))
  }

  function freigebenLive(e: AuftragBautagebuchEintrag) {
    startTransition(async () => {
      const r = await freigebenBautagebuchEintrag({ auftragId, eintragId: e.id })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Eintrag ist auf der Kunden-Projektseite sichtbar.')
        onChanged()
      }
    })
  }

  function saveEdit() {
    if (!editId || !editTitel.trim()) return
    const gewerkPhase =
      editGewerk.trim() || (gewerkOptionen.length === 1 ? gewerkOptionen[0]!.id : null) || null
    startTransition(async () => {
      const r = await updateAuftragBautagebuchEintrag({
        auftragId,
        eintragId: editId,
        titel: editTitel,
        beschreibung: editBeschreibung,
        datum: editDatum,
        gewerk_phase: gewerkPhase,
        foto_urls: editFotos,
      })
      if (!r.ok) toast.error(r.message)
      else {
        setEditId(null)
        toast.success('Gespeichert')
        onChanged()
      }
    })
  }

  function removeEintrag(e: AuftragBautagebuchEintrag) {
    if (!confirm(`„${e.titel}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deleteAuftragBautagebuchEintrag({ auftragId, eintragId: e.id })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  const addTrigger = (
    <button
      type="button"
      className="bt-add-trigger"
      aria-label="Eintrag hinzufügen"
      onClick={openAdd}
    >
      <Plus className="h-4 w-4" aria-hidden />
    </button>
  )

  const addFormFields = (
    <>
      <div className="bt-add-fields">
        <Input label="Titel" value={neuTitel} onChange={(e) => setNeuTitel(e.target.value)} placeholder="z. B. Rohbau abgeschlossen" />
        <Input label="Datum" type="date" value={neuDatum} onChange={(e) => setNeuDatum(e.target.value)} />
        {gewerkOptionen.length > 0 ? (
          <Select
            label="Gewerk (optional, Phase in der Mail)"
            value={neuGewerk || (gewerkOptionen.length === 1 ? gewerkOptionen[0]!.id : '')}
            onChange={(e) => setNeuGewerk(e.target.value)}
            options={gewerkSelectOptions}
            hint={
              gewerkOptionen.length > 1
                ? 'Optional — ohne Auswahl wird in der Kunden-Mail die aktuelle Bauphase automatisch hervorgehoben.'
                : undefined
            }
          />
        ) : null}
        <div className="field-full">
          <Textarea
            label="Beschreibung"
            value={neuBeschreibung}
            onChange={(e) => setNeuBeschreibung(e.target.value)}
            placeholder="Was ist passiert? Was ist als Nächstes geplant?"
            rows={4}
          />
        </div>
      </div>

      {neuFotos.length > 0 ? (
        <div className="bt-foto-grid">
          {neuFotos.map((url) => (
            <div key={url} className="bt-foto-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" />
              <button type="button" className="bt-foto-remove" onClick={() => setNeuFotos((p) => p.filter((u) => u !== url))}>
                <X className="h-3 w-3" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading || neuFotos.length >= BAUTAGEBUCH_MAX_FOTOS}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="mr-1 h-3 w-3" aria-hidden />
          Fotos
        </Button>
        <span className="text-[11px] text-bw-text-muted">
          Bis zu {BAUTAGEBUCH_MAX_FOTOS} Fotos · {neuFotos.length}/{BAUTAGEBUCH_MAX_FOTOS}
        </span>
        <Button type="button" variant="primary" size="sm" loading={pending} onClick={createEintrag}>
          Eintrag speichern
        </Button>
      </div>
    </>
  )

  return (
    <div className="auftrag-bautagebuch auftrag-pos-compact">
      {zugewiesenePartner.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {zugewiesenePartner.map((hw) => (
            <Button
              key={hw.id}
              type="button"
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => requestPartnerBautagebuch(hw.id, hw.name)}
            >
              Tagebuch einfordern · {hw.name}
            </Button>
          ))}
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files, 'neu')
          e.target.value = ''
        }}
      />
      <input
        ref={editFileRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files, 'edit')
          e.target.value = ''
        }}
      />

      {pendingPartner.length > 0 ? (
        <div className="mb-4 space-y-3">
          {pendingPartner.map((e) => {
            const fotos = eintragFotosAnzeige(e)
            return (
              <div
                key={`pending-${e.id}`}
                className="rounded-lg border border-violet-300 bg-violet-50/80 p-4 shadow-sm"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">
                      Neu vom Partner — zur Prüfung
                    </p>
                    <p className="mt-1 text-sm font-semibold text-bw-text">{e.titel}</p>
                    <p className="text-xs text-bw-text-muted">
                      {formatDatum(e.datum)}
                      {e.handwerker?.name ? ` · ${e.handwerker.name}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
                    Entwurf
                  </span>
                </div>

                {e.beschreibung?.trim() ? (
                  <RichTextContent html={e.beschreibung} className="text-[13px] text-bw-text" />
                ) : (
                  <p className="text-sm text-bw-text-muted">Keine Beschreibung.</p>
                )}

                {fotos.length > 0 ? (
                  <div className="bt-foto-grid mt-3">
                    {fotos.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="bt-foto-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" />
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="primary" size="sm" onClick={() => setSendEintrag(e)}>
                    <Send className="mr-1 h-3 w-3" aria-hidden />
                    An Kunden senden
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(e)}>
                    <Pencil className="mr-1 h-3 w-3" aria-hidden />
                    Bearbeiten
                  </Button>
                  <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => freigebenLive(e)}>
                    Live stellen
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSendEintrag(e)}>
                    <Eye className="mr-1 h-3 w-3" aria-hidden />
                    Vorschau
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {(partnerCount > 0 || sorted.length > 0) ? (
        <div className="bt-list-toolbar">
          {partnerCount > 0 ? (
            <button
              type="button"
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filterPartner
                  ? 'bg-bw-primary text-white'
                  : 'bg-bw-bg-soft text-bw-text-muted hover:text-bw-text'
              )}
              onClick={() => setFilterPartner((v) => !v)}
            >
              Nur Partner ({partnerCount})
            </button>
          ) : (
            <span />
          )}
          {addTrigger}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        rows.length === 0 ? (
          <div className="bt-empty-row">
            <p className="text-sm text-bw-text-muted">Noch keine Einträge</p>
            {addTrigger}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-bw-text-muted">Keine Einträge für diesen Filter.</p>
        )
      ) : (
        <div className="bt-list divide-y divide-bw-border rounded-md border border-bw-border bg-bw-card">
          {sorted.map((e) => {
            const open = openIds.has(e.id)
            const editing = editId === e.id
            const phaseName = gewerkLabel(e)
            return (
              <div key={e.id} className={cn('bt-entry', open && 'open')}>
                <button type="button" className="bt-entry-head" onClick={() => toggleOpen(e.id)}>
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 shrink-0 text-bw-text-muted transition-transform', open && 'rotate-180')}
                    aria-hidden
                  />
                  <div className="bt-entry-head-main min-w-0">
                    <p className="bt-entry-title">{e.titel}</p>
                    <p className="bt-entry-meta">
                      {formatDatum(e.datum)}
                      {phaseName ? ` · ${phaseName}` : ''}
                    </p>
                  </div>
                  <div className="bt-entry-badges" onClick={(ev) => ev.stopPropagation()}>
                    {e.handwerker_id ? (
                      <span className="bt-badge bg-violet-100 text-violet-900" title="Vom Partner-Portal">
                        Partner
                        {e.handwerker?.name ? ` · ${e.handwerker.name}` : ''}
                      </span>
                    ) : null}
                    {e.fuer_kunde_freigegeben ? (
                      <span className="bt-badge bt-badge-live">Live</span>
                    ) : (
                      <span className="bt-badge bt-badge-draft">Entwurf</span>
                    )}
                    {e.an_kunde_gesendet_at ? <span className="bt-badge bt-badge-sent">Gesendet</span> : null}
                  </div>
                </button>

                {open ? (
                  <div className="bt-entry-body">
                    {editing ? (
                      <div className="space-y-3">
                        <Input label="Titel" value={editTitel} onChange={(ev) => setEditTitel(ev.target.value)} />
                        <Input label="Datum" type="date" value={editDatum} onChange={(ev) => setEditDatum(ev.target.value)} />
                        {gewerkOptionen.length > 0 ? (
                          <Select
                            label="Gewerk (optional, Phase in der Mail)"
                            value={editGewerk}
                            onChange={(ev) => setEditGewerk(ev.target.value)}
                            options={gewerkSelectOptions}
                          />
                        ) : null}
                        <Textarea label="Beschreibung" value={editBeschreibung} onChange={(ev) => setEditBeschreibung(ev.target.value)} rows={5} />
                        {(e.foto_urls ?? []).length > 0 ? (
                          <div className="bt-foto-grid">
                            {editFotoDisplay.map((url, i) => (
                              <div key={`${url}-${i}`} className="bt-foto-thumb">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" />
                                <button
                                  type="button"
                                  className="bt-foto-remove"
                                  onClick={() => {
                                    setEditFotos((p) => p.filter((_, idx) => idx !== i))
                                    setEditFotoDisplay((p) => p.filter((_, idx) => idx !== i))
                                  }}
                                >
                                  <X className="h-3 w-3" aria-hidden />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={uploading || editFotos.length >= BAUTAGEBUCH_MAX_FOTOS}
                            onClick={() => editFileRef.current?.click()}
                          >
                            <Upload className="mr-1 h-3 w-3" aria-hidden />
                            Fotos hinzufügen
                          </Button>
                          <span className="text-[11px] text-bw-text-muted">
                            {editFotos.length}/{BAUTAGEBUCH_MAX_FOTOS}
                          </span>
                          <Button type="button" variant="primary" size="sm" loading={pending} onClick={saveEdit}>
                            Speichern
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditId(null)}>
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {e.beschreibung?.trim() ? (
                          <RichTextContent html={e.beschreibung} className="text-[13px] text-bw-text" />
                        ) : (
                          <p className="text-sm text-bw-text-muted">Keine Beschreibung.</p>
                        )}
                        {eintragFotosAnzeige(e).length > 0 ? (
                          <div className="bt-foto-grid">
                            {eintragFotosAnzeige(e).map((url) => (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="bt-foto-thumb">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" />
                              </a>
                            ))}
                          </div>
                        ) : null}

                        <div className="bt-entry-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSendEintrag(e)}
                          >
                            <Eye className="mr-1 h-3 w-3" aria-hidden />
                            Kunden-Vorschau
                          </Button>
                          <Button type="button" variant="primary" size="sm" onClick={() => setSendEintrag(e)}>
                            <Send className="mr-1 h-3 w-3" aria-hidden />
                            An Kunden senden
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(e)}>
                            <Pencil className="mr-1 h-3 w-3" aria-hidden />
                            Bearbeiten
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="text-status-cancel-text" onClick={() => removeEintrag(e)}>
                            <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                            Löschen
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {addOpen ? (
        <div className="bt-add-card hidden md:block">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="bt-add-title mb-0">Neuer Eintrag</p>
            <button type="button" className="bt-add-close" aria-label="Schließen" onClick={closeAdd}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {addFormFields}
        </div>
      ) : null}

      <MobileListFilterSheet open={addOpen} onClose={closeAdd} title="Neuer Eintrag">
        {addFormFields}
      </MobileListFilterSheet>

      <BautagebuchKundeSendModal
        open={!!sendEintrag}
        onClose={() => setSendEintrag(null)}
        auftragId={auftragId}
        eintrag={sendEintrag}
        kundeName={kundeName}
        onSent={onChanged}
      />
    </div>
  )
}
