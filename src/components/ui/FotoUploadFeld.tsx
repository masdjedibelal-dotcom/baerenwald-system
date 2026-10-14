'use client'

import { useState } from 'react'

import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { FotoDropZone } from '@/components/ui/FotoDropZone'
import { optimizeImageForUpload } from '@/lib/media/optimize-image-for-upload'

/**
 * Fotos zu einem Auftrag hochladen (Tagebuch, Einsatz-Anweisung): sofort verkleinert hochladen,
 * Vorschau-Raster mit ✕, Antippen öffnet groß. Ergebnis = öffentliche Bild-URLs.
 */
export function FotoUploadFeld({
  auftragId,
  value,
  onChange,
  max = 12,
  ordner = 'timeline',
  disabled = false,
  onBusyChange,
}: {
  auftragId: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  ordner?: 'timeline' | 'einsatz'
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const [uploading, setUploading] = useState(false)

  function setBusy(b: boolean) {
    setUploading(b)
    onBusyChange?.(b)
  }

  async function hochladen(files: File[]) {
    if (!files.length || uploading) return
    const platz = max - value.length
    if (platz <= 0) {
      toast.error(`Maximal ${max} Fotos.`)
      return
    }
    setBusy(true)
    const fehlgeschlagen: File[] = []
    try {
      const results = await Promise.all(
        files.slice(0, platz).map(async (file) => {
          let datei = file
          try {
            datei = await optimizeImageForUpload(file, { maxEdge: 2000 })
          } catch {
            datei = file
          }
          const fd = new FormData()
          fd.append('file', datei)
          fd.append('filename', datei.name)
          fd.append('ordner', ordner)
          try {
            const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, { method: 'POST', body: fd })
            const json = (await res.json()) as { url?: string; error?: string }
            if (!res.ok || !json.url) {
              fehlgeschlagen.push(file)
              return { ok: false as const, name: file.name, error: json.error || 'Upload fehlgeschlagen' }
            }
            return { ok: true as const, url: json.url }
          } catch {
            fehlgeschlagen.push(file)
            return { ok: false as const, name: file.name, error: 'Keine Verbindung' }
          }
        })
      )
      const neu = results.filter((r): r is { ok: true; url: string } => r.ok).map((r) => r.url)
      for (const f of results.filter((r): r is { ok: false; name: string; error: string } => !r.ok)) {
        if (f.error === 'Keine Verbindung') toast.offlineRetry(() => void hochladen(fehlgeschlagen))
        else toast.error(`${f.name}: ${f.error}`)
      }
      if (neu.length) {
        onChange([...value, ...neu])
        toast.success(neu.length === 1 ? 'Foto hochgeladen' : `${neu.length} Fotos hochgeladen`)
      }
    } finally {
      setBusy(false)
    }
  }

  const busy = disabled || uploading
  return (
    <div>
      {value.length < max ? (
        <FotoDropZone
          disabled={busy}
          multiple
          label={uploading ? 'Lädt…' : value.length ? 'Weitere Fotos hinzufügen' : 'Fotos tippen oder ablegen'}
          labelDragging="Fotos hier ablegen"
          hinweis="JPG, PNG oder HEIC — wird automatisch verkleinert"
          onFiles={(files) => void hochladen(files)}
        />
      ) : null}
      {value.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url, i) => (
            <div key={`${url}-${i}`} className="relative aspect-square">
              <a href={url} target="_blank" rel="noopener noreferrer" title="Groß ansehen">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full rounded-field border border-bw-border object-cover"
                />
              </a>
              <MockBtn
                className="absolute right-1 top-1 rounded-pill bg-black/55 p-1 text-white"
                type="button"
                disabled={busy}
                onClick={() => onChange(value.filter((u) => u !== url))}
                aria-label={`Foto ${i + 1} entfernen`}
              >
                <MockIcon n="x" ctx="default" className="h-3.5 w-3.5" aria-hidden />
              </MockBtn>
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-1.5 text-xs text-muted">Bis zu {max} Fotos — Drag & Drop oder Tippen. Antippen der Vorschau öffnet das Foto groß.</p>
    </div>
  )
}
