'use client'

import { useRef, useState, useTransition } from 'react'
import { Download, FileUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/app-toast'
import { deleteBaustellenDokument } from '@/app/(dashboard)/auftraege/baustelle-actions'
import {
  BAUSTELLEN_DOKUMENT_TYP_LABELS,
  type AuftragBaustellenDokument,
  type BaustellenDokumentTyp,
} from '@/lib/auftraege/baustelle-types'
import { formatDatum } from '@/lib/utils'

const TYPEN: BaustellenDokumentTyp[] = ['tagesbericht', 'wochenbericht', 'regiebericht', 'sonstiges']

export function BaustelleBerichteDokumenteCard({
  auftragId,
  dokumente,
  onChanged,
}: {
  auftragId: string
  dokumente: AuftragBaustellenDokument[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [typ, setTyp] = useState<BaustellenDokumentTyp>('sonstiges')
  const [titel, setTitel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('typ', typ)
      fd.append('titel', titel.trim() || file.name.replace(/\.pdf$/i, ''))
      fd.append('filename', file.name)
      const res = await fetch(`/api/auftraege/${auftragId}/baustellen-dokument/upload`, {
        method: 'POST',
        body: fd,
      })
      const json = (await res.json()) as { error?: string; url?: string }
      if (!res.ok) {
        toast.error(json.error ?? 'Upload fehlgeschlagen')
        return
      }
      toast.success('Dokument hochgeladen')
      setTitel('')
      onChanged()
    } catch {
      toast.error('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function remove(id: string) {
    if (!confirm('Dokument löschen?')) return
    startTransition(async () => {
      const r = await deleteBaustellenDokument(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-bw-border bg-bw-bg/30 p-4 space-y-3">
        <p className="text-sm font-medium text-bw-text">Fertiges PDF hochladen</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="form-field">
            <label className="form-field-label">Typ</label>
            <select
              className="input"
              value={typ}
              onChange={(e) => setTyp(e.target.value as BaustellenDokumentTyp)}
            >
              {TYPEN.map((t) => (
                <option key={t} value={t}>
                  {BAUSTELLEN_DOKUMENT_TYP_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Titel"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z. B. Wochenbericht KW 25"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-1"
          disabled={uploading || pending}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="h-3.5 w-3.5" />
          {uploading ? 'Wird hochgeladen…' : 'PDF auswählen'}
        </Button>
      </div>

      {dokumente.length ? (
        <div className="divide-y divide-bw-border rounded-lg border border-bw-border">
          {dokumente.map((d) => (
            <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-bw-text">{d.titel}</p>
                <p className="text-xs text-bw-text-muted">
                  {BAUSTELLEN_DOKUMENT_TYP_LABELS[d.typ]}
                  {d.kalenderwoche ? ` · KW ${d.kalenderwoche}` : ''}
                  {d.quelle === 'generiert' ? ' · generiert' : ' · Upload'}
                  {' · '}
                  {formatDatum(d.created_at)}
                </p>
              </div>
              <a
                href={d.datei_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                aria-label="PDF öffnen"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(d.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-bw-text-muted">Noch keine Baustellen-Dokumente.</p>
      )}
    </div>
  )
}
