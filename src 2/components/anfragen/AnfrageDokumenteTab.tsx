'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import {
  deleteLeadDokument,
  insertLeadDokument,
} from '@/app/(dashboard)/anfragen/dokumente-actions'
import { toast } from '@/components/ui/app-toast'
import type { LeadDokumentRow } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

type AngebotKurz = {
  id: string
  created_at: string
  angebotsnr?: string | null
  pdf_url?: string | null
}

type DokumentZeile = {
  id: string
  datum: string
  name: string
  href: string
  quelle: 'upload' | 'angebot'
  dokumentId?: string
}

export function AnfrageDokumenteTab({
  leadId,
  dokumente,
  angebote,
  onReload,
}: {
  leadId: string
  dokumente: LeadDokumentRow[]
  angebote: AngebotKurz[]
  onReload: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const zeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = dokumente.map((d) => ({
      id: `upload-${d.id}`,
      datum: d.created_at,
      name: d.name.trim() || 'Dokument',
      href: d.datei_url,
      quelle: 'upload',
      dokumentId: d.id,
    }))

    for (const a of angebote) {
      rows.push({
        id: `angebot-${a.id}`,
        datum: a.created_at,
        name: a.angebotsnr?.trim()
          ? `Angebot ${a.angebotsnr.trim()}`
          : `Angebot ${a.id.slice(0, 8).toUpperCase()}`,
        href: a.pdf_url?.trim() || `/api/angebote/${a.id}/pdf`,
        quelle: 'angebot',
      })
    }

    return rows.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
  }, [dokumente, angebote])

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 5)
    if (!list.length) return
    setUploading(true)
    try {
      for (const file of list) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/anfragen/${leadId}/dokument/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as {
          url?: string
          groesse_bytes?: number
          error?: string
        }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')

        const ins = await insertLeadDokument({
          leadId,
          name: file.name,
          datei_url: json.url,
          groesse_bytes: json.groesse_bytes ?? file.size,
        })
        if (!ins.ok) throw new Error(ins.message)
      }

      toast.success(list.length === 1 ? 'Dokument hochgeladen' : `${list.length} Dokumente hochgeladen`)
      startTransition(() => onReload())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function removeDoc(row: DokumentZeile) {
    if (row.quelle !== 'upload' || !row.dokumentId) return
    if (!confirm(`„${row.name}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deleteLeadDokument(row.dokumentId!, leadId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Dokument gelöscht')
        onReload()
      }
    })
  }

  return (
    <div className="lead-dok-panel pb-4">
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
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
          {uploading ? (
            'Wird hochgeladen…'
          ) : (
            <>
              Datei hierher ziehen oder{' '}
              <span className="font-medium text-bw-link">Datei auswählen</span>
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-bw-text-muted">PDF, JPG, PNG · max. 10 MB</p>
      </div>

      {zeilen.length === 0 ? (
        <p className="py-6 text-center text-sm text-bw-text-muted">
          Noch keine Dokumente. Angebots-PDFs erscheinen hier automatisch.
        </p>
      ) : (
        <div className="dok-table-wrap mt-4">
          <table className="dok-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Dateiname</th>
                <th className="text-right w-14" aria-label="PDF öffnen" />
                <th className="text-right w-14">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap tabular-nums text-bw-text-muted">
                    {row.datum ? formatDatum(row.datum) : '—'}
                  </td>
                  <td className="max-w-[min(100%,20rem)] font-medium text-bw-text">
                    <span className="line-clamp-2">{row.name}</span>
                    {row.quelle === 'angebot' ? (
                      <span className="mt-0.5 block text-xs font-normal text-bw-text-muted">
                        Angebot
                      </span>
                    ) : null}
                  </td>
                  <td className="text-right">
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bw-border bg-bw-card text-[#c62828] transition-colors hover:bg-red-50"
                      aria-label={`${row.name} öffnen`}
                    >
                      <FileText className="h-4 w-4" aria-hidden />
                    </a>
                  </td>
                  <td className="text-right">
                    {row.quelle === 'upload' ? (
                      <button
                        type="button"
                        className="icon-btn text-status-cancel-text"
                        title="Löschen"
                        disabled={pending}
                        onClick={() => removeDoc(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
