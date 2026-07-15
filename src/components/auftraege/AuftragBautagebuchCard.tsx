'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { Input } from '@/components/ui/Input'
import { MobileListFilterSheet } from '@/components/ui/MobileListFilterSheet'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  gewerkOptionenAusPositionen,
  gewerkSelectionFromEintrag,
  type GewerkOpt,
} from '@/lib/auftraege/auftrag-position-blocks'
import { BautagebuchKundeSendModal } from '@/components/auftraege/BautagebuchKundeSendModal'
import {
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
import { formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

const BAUTAGEBUCH_POLL_MS = 20_000

function eintragFotosAnzeige(e: AuftragBautagebuchEintrag): string[] {
  if (e.foto_display_urls?.length) return e.foto_display_urls
  return e.foto_urls ?? []
}

function istPartnerEntwurf(e: AuftragBautagebuchEintrag): boolean {
  return Boolean(e.handwerker_id) && !e.fuer_kunde_freigegeben
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function eintragStatusBadge(e: AuftragBautagebuchEintrag) {
  if (e.fuer_kunde_freigegeben) {
    return (
      <MockBadge kind="aktiv">
        <MockIcon n="check" size={10} /> Aktiv
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="fertig">
      <MockIcon n="file-pencil" size={10} /> Entwurf
    </MockBadge>
  )
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
  const [sel, setSel] = useState<Record<string, boolean>>({})
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
        for (const e of list.filter((x) => istPartnerEntwurf(x) && !seenPartnerIds.current.has(x.id))) {
          seenPartnerIds.current.add(e.id)
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
    return [...rows].sort((a, b) => {
      const d = new Date(b.datum).getTime() - new Date(a.datum).getTime()
      if (d !== 0) return d
      return (b.sort_order ?? 0) - (a.sort_order ?? 0)
    })
  }, [rows])

  const selIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel])

  function toggleSel(id: string) {
    setSel((s) => ({ ...s, [id]: !s[id] }))
  }

  function importFotoEntry(files: FileList | null) {
    if (!files?.length) return
    void uploadFiles(files, 'neu')
    setAddOpen(true)
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

  const addFormFields = (
    <>
      <div className="form-grid">
        <Input label="Titel" value={neuTitel} onChange={(e) => setNeuTitel(e.target.value)} placeholder="z. B. Rohbau abgeschlossen" />
        <Input label="Datum" type="date" value={neuDatum} onChange={(e) => setNeuDatum(e.target.value)} />
        {gewerkOptionen.length > 0 ? (
          <Select
            label="Gewerk (optional)"
            value={neuGewerk || (gewerkOptionen.length === 1 ? gewerkOptionen[0]!.id : '')}
            onChange={(e) => setNeuGewerk(e.target.value)}
            options={gewerkSelectOptions}
          />
        ) : null}
        <Textarea
          label="Beschreibung"
          value={neuBeschreibung}
          onChange={(e) => setNeuBeschreibung(e.target.value)}
          placeholder="Was wurde heute gemacht…"
          rows={4}
        />
      </div>
      {neuFotos.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {neuFotos.map((url) => (
            <div key={url} style={{ width: 88, height: 66, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => setNeuFotos((p) => p.filter((u) => u !== url))}
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  border: 'none',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <MockIcon n="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <MockBtn
          sm
          kind="ghost"
          icon="photo-plus"
          disabled={uploading || neuFotos.length >= BAUTAGEBUCH_MAX_FOTOS}
          onClick={() => fileRef.current?.click()}
        >
          Fotos
        </MockBtn>
        <MockBtn sm kind="primary" icon="check" disabled={pending} onClick={createEintrag}>
          Eintrag speichern
        </MockBtn>
      </div>
    </>
  )

  const editFormFields = editId ? (
    <>
      <div className="form-grid">
        <Input label="Titel" value={editTitel} onChange={(e) => setEditTitel(e.target.value)} />
        <Input label="Datum" type="date" value={editDatum} onChange={(e) => setEditDatum(e.target.value)} />
        {gewerkOptionen.length > 0 ? (
          <Select label="Gewerk (optional)" value={editGewerk} onChange={(e) => setEditGewerk(e.target.value)} options={gewerkSelectOptions} />
        ) : null}
        <Textarea label="Beschreibung" value={editBeschreibung} onChange={(e) => setEditBeschreibung(e.target.value)} rows={4} />
      </div>
      {editFotoDisplay.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {editFotoDisplay.map((url, i) => (
            <div key={`${url}-${i}`} style={{ width: 88, height: 66, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => {
                  setEditFotos((p) => p.filter((_, idx) => idx !== i))
                  setEditFotoDisplay((p) => p.filter((_, idx) => idx !== i))
                }}
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 20,
                  height: 20,
                  borderRadius: 20,
                  border: 'none',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <MockIcon n="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <MockBtn
          sm
          kind="ghost"
          icon="photo-plus"
          disabled={uploading || editFotos.length >= BAUTAGEBUCH_MAX_FOTOS}
          onClick={() => editFileRef.current?.click()}
        >
          Fotos
        </MockBtn>
      </div>
    </>
  ) : null

  const checkBox = (on: boolean) => (
    <span className={'bt-check' + (on ? ' on' : '')}>{on ? <MockIcon n="check" size={11} /> : null}</span>
  )

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) importFotoEntry(e.target.files)
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

      <MockCard
        title={`Bautagebuch · ${sorted.length}`}
        icon="clipboard-list"
        actions={
          <>
            <MockBtn sm kind="ghost" icon="photo-plus" onClick={() => fileRef.current?.click()}>
              Foto
            </MockBtn>
            <MockBtn sm kind="primary" icon="plus" onClick={openAdd}>
              Eintrag
            </MockBtn>
          </>
        }
      >
        {selIds.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              marginBottom: 12,
              background: 'var(--green-dark)',
              color: '#fff',
              borderRadius: 10,
            }}
          >
            <MockIcon n="checks" size={16} />
            <span style={{ fontWeight: 600, fontSize: 13 }}>{selIds.length} ausgewählt</span>
            <div style={{ flex: 1 }} />
            <MockBtn
              sm
              kind="ghost"
              icon="mail-forward"
              onClick={() => {
                const first = sorted.find((e) => sel[e.id])
                if (first) setSendEintrag(first)
              }}
            >
              An Kunde versenden
            </MockBtn>
            <button
              type="button"
              onClick={() => setSel({})}
              title="Auswahl aufheben"
              style={{
                display: 'inline-flex',
                padding: 6,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
              }}
            >
              <MockIcon n="x" size={16} />
            </button>
          </div>
        ) : null}

        {sorted.length === 0 ? (
          <MockEmpty
            icon="clipboard-list"
            title="Noch keine Einträge"
            hint="Dokumentiere den Baufortschritt mit Titel, Beschreibung und Fotos."
          />
        ) : (
          <div className="bt-list">
            {sorted.map((e) => {
              const fotos = eintragFotosAnzeige(e)
              const desc = e.beschreibung?.trim() ? stripHtml(e.beschreibung) : ''
              return (
                <div key={e.id} className={'bt-entry' + (sel[e.id] ? ' sel' : '')}>
                  <span role="button" tabIndex={0} onClick={() => toggleSel(e.id)} onKeyDown={() => {}}>
                    {checkBox(!!sel[e.id])}
                  </span>
                  <div className="bt-thumb">
                    {fotos[0] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={fotos[0]} alt="" />
                        {fotos.length > 1 ? <span className="count">+{fotos.length - 1}</span> : null}
                      </>
                    ) : (
                      <MockIcon n="photo" size={22} style={{ color: 'var(--text-4)' }} />
                    )}
                  </div>
                  <div className="bt-main" role="button" tabIndex={0} onClick={() => startEdit(e)} style={{ cursor: 'pointer' }}>
                    <div className="bt-title">
                      {e.titel || '(ohne Titel)'} {eintragStatusBadge(e)}
                    </div>
                    {desc ? <div className="bt-desc">{desc}</div> : null}
                    <div className="bt-meta">
                      {formatDatum(e.datum)}
                      {fotos.length ? ` · ${fotos.length} Foto${fotos.length === 1 ? '' : 's'}` : ''}
                    </div>
                  </div>
                  <div className="bt-act">
                    <MockEntityRowMenu
                      title="Eintrag"
                      items={[
                        { label: 'Bearbeiten', icon: 'pencil', onClick: () => startEdit(e) },
                        { label: 'An Kunde versenden', icon: 'mail-forward', onClick: () => setSendEintrag(e) },
                        'sep',
                        { label: 'Löschen', icon: 'trash', danger: true, onClick: () => removeEintrag(e) },
                      ]}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

      <MockModal
        open={addOpen}
        onClose={closeAdd}
        icon="clipboard-list"
        title="Neuer Eintrag"
        sub="Bautagebuch-Eintrag"
        footer={
          <>
            <MockBtn kind="ghost" onClick={closeAdd}>
              Abbrechen
            </MockBtn>
            <MockBtn kind="primary" icon="check" disabled={pending} onClick={createEintrag}>
              Speichern
            </MockBtn>
          </>
        }
      >
        {addFormFields}
      </MockModal>

      <MockModal
        open={!!editId}
        onClose={() => setEditId(null)}
        icon="clipboard-list"
        title={editTitel || 'Eintrag bearbeiten'}
        sub="Bautagebuch-Eintrag"
        footer={
          <>
            <MockBtn
              sm
              kind="danger"
              icon="trash"
              onClick={() => {
                const row = sorted.find((x) => x.id === editId)
                if (row) removeEintrag(row)
                setEditId(null)
              }}
            >
              Entfernen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn kind="ghost" onClick={() => setEditId(null)}>
              Abbrechen
            </MockBtn>
            <MockBtn kind="primary" icon="check" disabled={pending} onClick={saveEdit}>
              Fertig
            </MockBtn>
          </>
        }
      >
        {editFormFields}
      </MockModal>

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
    </>
  )
}
