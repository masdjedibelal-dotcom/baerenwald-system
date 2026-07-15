'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  createAuftragDokumentEintrag,
  deleteAuftragDokumentEintrag,
  signHandwerkerDokumentStoragePaths,
  updateAuftragDokumentMeta,
} from '@/app/(dashboard)/auftraege/dokumente-actions'
import { setTimelineKundenfreigabe } from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  abschlussdokumentZeile,
  angebotAusAuftragDetail,
  angebotDokumentZeile,
  angebotHandwerkerAusAuftragDetail,
  handwerkerDokumentZeilen,
  rechnungDokumentZeilen,
  sortDokumentZeilenNachDatum,
  timelineDokumentZeilen,
  vertragDokumentZeilen,
  type AuftragDokumentZeile,
} from '@/lib/auftraege/auftrag-dokumente-helpers'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import type { AuftragDetail, AuftragTimelineEvent } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

export type { AuftragDokumentZeile }
export { zaehleAuftragDokumente } from '@/lib/auftraege/auftrag-dokumente-helpers'

export function AuftragDokumenteTab({
  detail,
  rechnungen = [],
  vertraege = [],
  onChanged,
}: {
  detail: AuftragDetail
  rechnungen?: RechnungAuswahlZeile[]
  vertraege?: HandwerkerVertragRow[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editRow, setEditRow] = useState<AuftragDokumentZeile | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [hwSignedUrls, setHwSignedUrls] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const handwerkerZeilen = useMemo(
    () => handwerkerDokumentZeilen(angebotHandwerkerAusAuftragDetail(detail)),
    [detail]
  )

  useEffect(() => {
    const paths = handwerkerZeilen.map((z) => z.storagePath).filter(Boolean) as string[]
    if (!paths.length) {
      setHwSignedUrls({})
      return
    }
    let cancelled = false
    void signHandwerkerDokumentStoragePaths(paths).then((res) => {
      if (cancelled) return
      if (res.ok) setHwSignedUrls(res.urls)
    })
    return () => {
      cancelled = true
    }
  }, [handwerkerZeilen])

  const zeilen = useMemo(() => {
    const rows = [
      ...timelineDokumentZeilen(detail),
      ...rechnungDokumentZeilen(rechnungen),
      ...vertragDokumentZeilen(vertraege),
      ...handwerkerZeilen,
    ]
    const ang = angebotAusAuftragDetail(detail)
    const angebotZeile = ang ? angebotDokumentZeile(detail, ang) : null
    if (angebotZeile) rows.unshift(angebotZeile)
    if (detail.abnahme_protokoll_url) {
      rows.push({
        id: 'abnahme-pdf',
        name: 'Abnahmeprotokoll',
        beschreibung: 'Abnahme',
        datum: detail.updated_at ?? detail.created_at,
        fuerKunde: true,
        href: detail.abnahme_protokoll_url,
        quelle: 'protokoll',
      })
    }
    const abschluss = abschlussdokumentZeile(detail)
    if (abschluss) rows.push(abschluss)
    return sortDokumentZeilenNachDatum(rows)
  }, [detail, rechnungen, vertraege, handwerkerZeilen])

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 5)
    if (!list.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/auftraege/${detail.id}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      const name = list.length === 1 ? list[0]!.name : `${list.length} Dateien`
      startTransition(async () => {
        const r = await createAuftragDokumentEintrag({
          auftragId: detail.id,
          titel: name,
          beschreibung: null,
          foto_urls: urls,
          fuerKunde: false,
        })
        if (!r.ok) toast.error(r.message)
        else {
          toast.success('Dokument hochgeladen')
          onChanged()
        }
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function toggleFreigabe(ev: AuftragTimelineEvent, fuerKunde: boolean) {
    startTransition(async () => {
      const r = await setTimelineKundenfreigabe({
        auftragId: detail.id,
        timelineId: ev.id,
        fuerKunde,
        kundeBenachrichtigen: false,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function saveEdit() {
    if (!editRow?.timelineId) return
    startTransition(async () => {
      const r = await updateAuftragDokumentMeta({
        auftragId: detail.id,
        timelineId: editRow.timelineId!,
        titel: editName,
        beschreibung: editDesc,
      })
      if (!r.ok) toast.error(r.message)
      else {
        setEditRow(null)
        onChanged()
      }
    })
  }

  function removeRow(row: AuftragDokumentZeile) {
    if (!row.timelineId || !confirm(`„${row.name}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deleteAuftragDokumentEintrag({
        auftragId: detail.id,
        timelineId: row.timelineId!,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  const timelineById = useMemo(() => {
    const m = new Map<string, AuftragTimelineEvent>()
    for (const ev of detail.auftrag_timeline ?? []) {
      if (ev?.id) m.set(ev.id, ev)
    }
    return m
  }, [detail.auftrag_timeline])

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files)
        }}
        style={{
          padding: 16,
          marginBottom: zeilen.length ? 12 : 0,
          borderRadius: 8,
          textAlign: 'center',
          cursor: 'pointer',
          border: `1px dashed ${dragOver ? 'var(--green)' : 'var(--border-strong)'}`,
          background: dragOver ? 'var(--green-50)' : 'var(--bg-soft)',
          color: dragOver ? 'var(--green)' : 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 12.5,
          fontWeight: 500,
          pointerEvents: uploading || pending ? 'none' : undefined,
          opacity: uploading || pending ? 0.6 : 1,
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
        }}
      >
        <MockIcon n="cloud-upload" size={18} />
        {uploading ? 'Wird hochgeladen…' : 'Dateien hier ablegen oder klicken'}
      </div>

      {zeilen.length > 0 ? (
        <div style={{ margin: '0 -16px -14px' }}>
          <div
            className="list-row head"
            style={{ gridTemplateColumns: '28px 1.6fr 1fr 120px 110px 70px' }}
          >
            <div />
            <div>Name</div>
            <div>Beschreibung</div>
            <div>Datum</div>
            <div>Freigabe</div>
            <div />
          </div>
          {zeilen.map((row) => {
            const ev = row.timelineId ? timelineById.get(row.timelineId) : null
            const readOnly = row.quelle !== 'timeline' || !row.timelineId
            const editing = editRow?.id === row.id
            const href =
              row.storagePath && hwSignedUrls[row.storagePath]
                ? hwSignedUrls[row.storagePath]!
                : row.href
            const pdfReady = !row.storagePath || Boolean(hwSignedUrls[row.storagePath])
            return (
              <div
                key={row.id}
                className="list-row"
                style={{
                  gridTemplateColumns: '28px 1.6fr 1fr 120px 110px 70px',
                  cursor: 'default',
                  alignItems: editing ? 'start' : 'center',
                }}
              >
                <MockIcon n={row.quelle === 'timeline' ? 'photo' : 'file-text'} size={18} style={{ color: 'var(--text-3)' }} />
                {editing ? (
                  <input
                    className="txt"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ height: 30 }}
                    autoFocus
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.name}
                  </div>
                )}
                {editing ? (
                  <input
                    className="txt"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Beschreibung..."
                    style={{ height: 30 }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-3)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.beschreibung && row.beschreibung !== '—' ? row.beschreibung : '—'}
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {row.datum ? formatDatum(row.datum) : '—'}
                </div>
                {readOnly ? (
                  <span style={{ fontSize: 11.5, color: row.fuerKunde ? 'var(--green)' : 'var(--text-3)' }}>
                    {row.fuerKunde ? 'Kunde' : 'intern'}
                  </span>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 11.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={row.fuerKunde}
                      onChange={(e) => ev && toggleFreigabe(ev, e.target.checked)}
                      disabled={pending}
                      style={{ accentColor: 'var(--green)', margin: 0 }}
                    />
                    <span style={{ color: row.fuerKunde ? 'var(--green)' : 'var(--text-3)' }}>
                      {row.fuerKunde ? 'Kunde' : 'intern'}
                    </span>
                  </label>
                )}
                <div style={{ display: 'flex', gap: 0, justifyContent: 'flex-end' }}>
                  {pdfReady && href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn ghost sm icon"
                      title="Ansehen"
                      aria-label={`${row.name} öffnen`}
                    >
                      <MockIcon n="eye" size={15} />
                    </a>
                  ) : null}
                  {!readOnly ? (
                    <>
                      <button
                        type="button"
                        className="btn ghost sm icon"
                        title="Bearbeiten"
                        onClick={() => {
                          setEditRow(row)
                          setEditName(row.name)
                          setEditDesc(row.beschreibung === '—' ? '' : row.beschreibung)
                        }}
                      >
                        <MockIcon n="pencil" size={15} />
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm icon"
                        title="Löschen"
                        onClick={() => removeRow(row)}
                      >
                        <MockIcon n="trash" size={15} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title="Dokument bearbeiten" size="sm">
        <div className="space-y-3">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Textarea label="Beschreibung" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => setEditRow(null)}>
            Abbrechen
          </Button>
          <Button variant="primary" loading={pending} onClick={saveEdit}>
            Speichern
          </Button>
        </div>
      </Modal>
    </>
  )
}
