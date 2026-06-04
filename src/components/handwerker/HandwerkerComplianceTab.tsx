'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Trash2, Upload } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import type { PartnerDokument } from '@/lib/types'
import {
  deletePartnerDokument,
  insertPartnerDokument,
  signPartnerDokumentUrl,
} from '@/app/(dashboard)/handwerker/actions'
import { createClient } from '@/lib/supabase'
import { cn, formatDatum } from '@/lib/utils'

const BUCKET = 'partner-dokumente'
/** Einheitlicher Typ für frei hochgeladene Nachweise (kein Katalog). */
const DOKUMENT_TYP = 'dokument'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function titelAusDateiname(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim()
  return base || name
}

export function HandwerkerComplianceTab({
  handwerkerId,
  dokumente,
}: {
  handwerkerId: string
  dokumente: PartnerDokument[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [naechsterTitel, setNaechsterTitel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const zeilen = useMemo(() => {
    return [...dokumente]
      .filter((d) => d.datei_url?.trim())
      .sort(
        (a, b) =>
          new Date(b.hochgeladen_am ?? 0).getTime() - new Date(a.hochgeladen_am ?? 0).getTime()
      )
  }, [dokumente])

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, 10)
    if (!list.length) return
    setUploading(true)
    const supabase = createClient()
    try {
      for (const file of list) {
        const path = `${handwerkerId}/${Date.now()}-${safeFileName(file.name)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        })
        if (upErr) throw new Error(upErr.message)

        const titel =
          (list.length === 1 ? naechsterTitel.trim() : '') ||
          titelAusDateiname(file.name)

        const ins = await insertPartnerDokument({
          handwerker_id: handwerkerId,
          typ: DOKUMENT_TYP,
          bezeichnung: titel,
          gueltig_bis: null,
          datei_url: path,
          notizen: null,
        })
        if (!ins.ok) {
          await supabase.storage.from(BUCKET).remove([path])
          throw new Error(ins.message)
        }
      }
      setNaechsterTitel('')
      toast.success(list.length === 1 ? 'Dokument hochgeladen' : `${list.length} Dokumente hochgeladen`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function removeDoc(docId: string, titel: string) {
    if (!confirm(`„${titel}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deletePartnerDokument(docId, handwerkerId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gelöscht')
      router.refresh()
    })
  }

  const busy = pending || uploading

  return (
    <div className="pb-4">
      <input
        ref={fileRef}
        type="file"
        className="sr-only"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="mb-4 max-w-md">
        <label className="input-label" htmlFor="hw-dok-titel">
          Titel (optional, für die nächste Datei)
        </label>
        <input
          id="hw-dok-titel"
          type="text"
          className="input w-full"
          value={naechsterTitel}
          onChange={(e) => setNaechsterTitel(e.target.value)}
          placeholder="z. B. Betriebshaftpflicht, Gewerbeanmeldung…"
          disabled={busy}
        />
      </div>

      <div
        className={cn(
          'dok-upload-zone',
          dragOver && 'dok-upload-zone-active',
          busy && 'pointer-events-none opacity-60'
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
        <p className="mt-1 text-xs text-bw-text-muted">PDF, JPG, PNG, DOC · mehrere Dateien möglich</p>
      </div>

      {zeilen.length === 0 ? (
        <p className="py-6 text-center text-sm text-bw-text-muted">Noch keine Dokumente.</p>
      ) : (
        <div className="dok-table-wrap mt-4">
          <table className="dok-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Titel</th>
                <th className="text-right w-14" aria-label="Vorschau" />
                <th className="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((d) => (
                <tr key={d.id}>
                  <td className="tabular-nums whitespace-nowrap text-bw-text-muted">
                    {d.hochgeladen_am ? formatDatum(d.hochgeladen_am) : '—'}
                  </td>
                  <td className="max-w-[min(100%,24rem)] font-medium text-bw-text">
                    <span className="line-clamp-2">{d.bezeichnung?.trim() || '—'}</span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bw-border bg-bw-card text-[#c62828] transition-colors hover:bg-red-50 disabled:opacity-50"
                      aria-label={`${d.bezeichnung} öffnen`}
                      disabled={busy}
                      onClick={() => void openDatei(d.datei_url)}
                    >
                      <FileText className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="icon-btn text-status-cancel-text hover:bg-red-500/10"
                      title="Löschen"
                      disabled={busy}
                      onClick={() => removeDoc(d.id, d.bezeichnung?.trim() || 'Dokument')}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
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
