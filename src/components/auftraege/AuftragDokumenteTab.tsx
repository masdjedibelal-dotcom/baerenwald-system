'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { FileText, Pencil, Trash2, Upload } from 'lucide-react'
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
import { cn, formatDatum } from '@/lib/utils'

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
    <div className="auftrag-dok-panel space-y-3 pb-4">
      <p className="text-sm text-bw-text-muted">
        Projekt-Dokumente (Angebot, Rechnungen, interne Uploads). Partner-Compliance-Nachweise finden
        Sie im Tab <span className="font-medium text-bw-text">Compliance</span>.
      </p>

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
        className={cn(
          'dok-upload-zone',
          dragOver && 'dok-upload-zone-active',
          (uploading || pending) && 'pointer-events-none opacity-60'
        )}
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
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click()
        }}
      >
        <Upload className="mx-auto h-6 w-6 text-bw-text-muted" aria-hidden />
        <p className="mt-2 text-sm text-bw-text">
          {uploading
            ? 'Wird hochgeladen…'
            : (
                <>
                  Datei hierher ziehen oder <span className="font-medium text-bw-link">Datei auswählen</span>
                </>
              )}
        </p>
        <p className="mt-1 text-xs text-bw-text-muted">PDF, JPG, PNG · max. 10 MB</p>
      </div>

      {zeilen.length === 0 ? (
        <p className="py-6 text-center text-sm text-bw-text-muted">Noch keine Dokumente.</p>
      ) : (
        <div className="dok-table-wrap">
          <table className="dok-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Dateiname</th>
                <th>Freigabe</th>
                <th className="text-right w-14" aria-label="PDF öffnen" />
                <th className="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((row) => {
                const ev = row.timelineId ? timelineById.get(row.timelineId) : null
                const readOnly = row.quelle !== 'timeline' || !row.timelineId
                const href =
                  row.storagePath && hwSignedUrls[row.storagePath]
                    ? hwSignedUrls[row.storagePath]!
                    : row.href
                const pdfReady = !row.storagePath || Boolean(hwSignedUrls[row.storagePath])
                return (
                  <tr key={row.id}>
                    <td className="tabular-nums whitespace-nowrap text-bw-text-muted">
                      {row.datum ? formatDatum(row.datum) : '—'}
                    </td>
                    <td className="max-w-[min(100%,20rem)] font-medium text-bw-text">
                      <span className="line-clamp-2">{row.name}</span>
                      {row.beschreibung && row.beschreibung !== '—' ? (
                        <span className="mt-0.5 block truncate text-xs font-normal text-bw-text-muted">
                          {row.beschreibung}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      {readOnly ? (
        <span className="dok-freigabe-pill dok-freigabe-kunde">
          {row.fuerKunde
            ? 'Kunde'
            : row.quelle === 'vertrag' || row.quelle === 'handwerker'
              ? 'Partner'
              : 'Intern'}
        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className={cn(
                              'dok-freigabe-pill',
                              row.fuerKunde ? 'dok-freigabe-kunde' : 'dok-freigabe-inaktiv'
                            )}
                            onClick={() => ev && toggleFreigabe(ev, true)}
                            disabled={pending}
                          >
                            Kunde
                          </button>
                          <button
                            type="button"
                            className={cn(
                              'dok-freigabe-pill',
                              !row.fuerKunde ? 'dok-freigabe-intern' : 'dok-freigabe-inaktiv'
                            )}
                            onClick={() => ev && toggleFreigabe(ev, false)}
                            disabled={pending}
                          >
                            intern
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      {pdfReady ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bw-border bg-bw-card text-[#c62828] transition-colors hover:bg-red-50"
                          aria-label={`${row.name} öffnen`}
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                        </a>
                      ) : (
                        <span
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bw-border bg-bw-card text-bw-text-muted opacity-50"
                          aria-hidden
                        >
                          <FileText className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="inline-flex justify-end gap-1">
                        {!readOnly ? (
                          <>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Bearbeiten"
                              onClick={() => {
                                setEditRow(row)
                                setEditName(row.name)
                                setEditDesc(row.beschreibung === '—' ? '' : row.beschreibung)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="icon-btn text-status-cancel-text"
                              title="Löschen"
                              onClick={() => removeRow(row)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
    </div>
  )
}
