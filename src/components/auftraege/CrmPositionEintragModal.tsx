'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'

import { MockBtn } from '@/components/mock-ui'
import { useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { FotoDropZone } from '@/components/ui/FotoDropZone'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import {
  createCrmTagebuchEintrag,
  updateCrmTagebuchEintrag,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { optimizeImageForUpload } from '@/lib/media/optimize-image-for-upload'
import { splitTagebuchBeschreibung } from '@/lib/auftraege/tagebuch-text'
import type { AuftragPosition } from '@/lib/types'
import { TOAST } from '@/lib/copy'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { sendeBautagebuchWhatsApp } from '@/app/(dashboard)/whatsapp/actions'
import { useWhatsAppStatus } from '@/components/whatsapp/useWhatsAppStatus'

const MAX_FOTOS = 12

export type CrmTagebuchEditSeed = {
  id: string
  positionIds: string[]
  beschreibungRaw: string | null
  fotoPaths: string[]
}

/** Bautagebuch-Eintrag: anlegen oder bearbeiten. */
export function CrmPositionEintragModal({
  open,
  onClose,
  auftragId,
  editEintrag = null,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  /** @deprecated Tagebuch ohne Leistungsbezug */
  positionen?: AuftragPosition[]
  /** @deprecated Tagebuch ohne Leistungsbezug */
  initialPositionId?: string | null
  /** Vorhandener Eintrag — öffnet im Bearbeiten-Modus */
  editEintrag?: CrmTagebuchEditSeed | null
  onSaved?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Tagebuch: nur Titel, Text, Fotos — keine Leistungs-Verknüpfung mehr (bestehende bleiben erhalten)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotoPaths, setFotoPaths] = useState<string[]>([])
  const wa = useWhatsAppStatus()
  /** Neuer Eintrag: Kunden zusätzlich per WhatsApp informieren (Link zur Projektseite) */
  const [perWhatsApp, setPerWhatsApp] = useState(false)

  const isEdit = Boolean(editEintrag?.id)

  useEffect(() => {
    if (!open) return
    if (editEintrag?.id) {
      const split = splitTagebuchBeschreibung(editEintrag.beschreibungRaw)
      setSelectedIds(editEintrag.positionIds.filter(Boolean))
      setTitel(split.titel)
      setBeschreibung(split.beschreibung)
      setFotoPaths(editEintrag.fotoPaths.filter(Boolean))
      return
    }
    setSelectedIds([])
    setTitel('')
    setBeschreibung('')
    setFotoPaths([])
    setPerWhatsApp(false)
  }, [open, editEintrag])

  async function uploadFotos(files: File[]) {
    if (!files.length || uploading) return
    const room = MAX_FOTOS - fotoPaths.length
    if (room <= 0) {
      toast.error(`Maximal ${MAX_FOTOS} Fotos pro Eintrag.`)
      return
    }
    const batch = files.slice(0, room)

    setUploading(true)
    const failedRaw: File[] = []
    try {
      const results = await Promise.all(
        batch.map(async (file) => {
          let uploadFile = file
          try {
            uploadFile = await optimizeImageForUpload(file, { maxEdge: 2000 })
          } catch {
            uploadFile = file
          }
          const fd = new FormData()
          fd.append('file', uploadFile)
          fd.append('filename', uploadFile.name)
          try {
            const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
              method: 'POST',
              body: fd,
            })
            const json = (await res.json()) as { url?: string; error?: string }
            if (!res.ok || !json.url) {
              failedRaw.push(file)
              return {
                ok: false as const,
                name: file.name,
                error: json.error || 'Upload fehlgeschlagen',
              }
            }
            return { ok: true as const, url: json.url }
          } catch {
            failedRaw.push(file)
            return {
              ok: false as const,
              name: file.name,
              error: 'Keine Verbindung',
            }
          }
        })
      )
      const added = results.filter((r): r is { ok: true; url: string } => r.ok).map((r) => r.url)
      const failed = results.filter((r): r is { ok: false; name: string; error: string } => !r.ok)
      for (const f of failed) {
        if (f.error === 'Keine Verbindung') {
          toast.offlineRetry(() => void uploadFotos(failedRaw))
        } else {
          toast.error(`${f.name}: ${f.error}`)
        }
      }
      if (added.length) {
        setFotoPaths((prev) => [...prev, ...added])
        toast.success(
          added.length === 1 ? 'Foto hochgeladen' : `${added.length} Fotos hochgeladen`
        )
      }
    } finally {
      setUploading(false)
    }
  }

  function removeFoto(url: string) {
    setFotoPaths((prev) => prev.filter((u) => u !== url))
  }

  function speichern() {
    if (!titel.trim() && !beschreibung.trim() && !fotoPaths.length) {
      toast.error(TOAST.titel_text_oder_foto_angeben)
      return
    }

    setPending(true)
    void actionBusy
      .run(
        isEdit ? 'Tagebuch-Eintrag wird aktualisiert…' : 'Tagebuch-Eintrag wird gespeichert…',
        async () => {
          const payload = {
            auftragId,
            positionIds: selectedIds,
            erledigtPositionIds: [],
            titel: titel.trim() || null,
            beschreibung: beschreibung.trim() || null,
            quelle: 'vor_ort' as const,
            fotoStoragePaths: fotoPaths,
          }
          const r = isEdit
            ? await updateCrmTagebuchEintrag({ ...payload, eintragId: editEintrag!.id })
            : await createCrmTagebuchEintrag(payload)
          if (!r.ok) {
            toast.systemError(r)
            throw new Error(r.message)
          }
          toast.success(isEdit ? 'Eintrag aktualisiert' : 'Eintrag gespeichert')
          if (!isEdit && perWhatsApp && wa?.sichtbar) {
            const w = await sendeBautagebuchWhatsApp({ auftragId, titel: titel.trim(), text: beschreibung.trim() })
            if (w.ok) toast.success('Kunde per WhatsApp informiert')
            else toast.error(`WhatsApp an den Kunden ging nicht raus: ${w.message}`)
          }
          onSaved?.()
          onClose()
        }
      )
      .finally(() => setPending(false))
  }

  const busy = pending || uploading
  const dirty = Boolean(
    beschreibung.trim() ||
      titel.trim() ||
      fotoPaths.length
  )

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Eintrag bearbeiten' : 'Tagebuch-Eintrag'}
      size="lg"
      dirty={dirty && !busy}
      secondary={{ label: 'Abbrechen', disabled: busy }}
      primary={{ label: 'Speichern', busy: pending, onClick: speichern }}
    >
      <div className="space-y-4">
        <SheetEditableField
          label="Titel"
          value={titel}
          onSave={setTitel}
          kiExtraHint="Bautagebuch-Eintrag — Kurztitel fürs Portal."
          placeholder="Kurzer Titel fürs Portal"
          sheetContext="detail"
        />

        <SheetEditableField
          label="Beschreibung"
          value={beschreibung}
          onSave={setBeschreibung}
          multiline
          rows={14}
          kiExtraHint="Bautagebuch-Eintrag — Was ist auf der Baustelle passiert?"
          placeholder="Was ist auf der Baustelle passiert?"
          sheetContext="detail"
        />

        <div>
          <span className="lt-field-lbl">Fotos</span>
          {fotoPaths.length < MAX_FOTOS ? (
            <FotoDropZone
              disabled={busy}
              multiple
              label={
                uploading
                  ? 'Lädt…'
                  : fotoPaths.length
                    ? 'Weitere Fotos hinzufügen'
                    : 'Fotos tippen oder ablegen'
              }
              labelDragging="Fotos hier ablegen"
              onFiles={(files) => void uploadFotos(files)}
            />
          ) : null}
          {fotoPaths.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotoPaths.map((url, i) => (
                <div key={`${url}-${i}`} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full rounded-field border border-bw-border object-cover"
                  />
                  <MockBtn className="absolute right-1 top-1 rounded-pill bg-black/55 p-1 text-white" type="button" disabled={busy} onClick={() => removeFoto(url)} aria-label={`Foto ${i + 1} löschen`}>
                    <MockIcon n="x" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                  </MockBtn>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-1.5 text-xs text-muted">
            Bis zu {MAX_FOTOS} Fotos — Drag & Drop oder Tippen.
          </p>
        </div>

        {!isEdit && wa?.sichtbar ? (
          <label className="wa-check">
            <MockCheckbox checked={perWhatsApp} onChange={(e) => setPerWhatsApp(e.target.checked)} />
            <span>
              Kunde per WhatsApp informieren
              <span className="wa-check__sub">Kurzer Text mit Link zur Projektseite (Fotos, Details).</span>
            </span>
          </label>
        ) : null}
      </div>
    </EditorSheet>
  )
}
