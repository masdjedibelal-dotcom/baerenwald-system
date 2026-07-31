'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { Camera } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { createCrmPositionEintrag } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import type { AuftragPosition } from '@/lib/types'

/** Portal-first Bautagebuch-Eintrag: Titel · Text · Fotos · Leistung. */
export function CrmPositionEintragModal({
  open,
  onClose,
  auftragId,
  positionen,
  initialPositionId = null,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionen: AuftragPosition[]
  initialPositionId?: string | null
  onSaved?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [positionId, setPositionId] = useState('')
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotoPath, setFotoPath] = useState('')

  const sortedPos = useMemo(
    () =>
      [...positionen]
        .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt')
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            (a.leistung_name ?? '').localeCompare(b.leistung_name ?? '', 'de')
        ),
    [positionen]
  )

  useEffect(() => {
    if (!open) return
    setPositionId(initialPositionId?.trim() || '')
    setTitel('')
    setBeschreibung('')
    setFotoPath('')
  }, [open, initialPositionId])

  async function uploadFoto(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('filename', file.name)
    const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
      method: 'POST',
      body: fd,
    })
    const json = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !json.url) {
      toast.error(json.error || 'Upload fehlgeschlagen')
      return
    }
    setFotoPath(json.url)
    toast.success('Foto hochgeladen')
  }

  function speichern() {
    if (!titel.trim() && !beschreibung.trim() && !fotoPath) {
      toast.error('Titel, Text oder Foto angeben.')
      return
    }
    const targetPos = positionId || sortedPos[0]?.id || ''
    if (!targetPos) {
      toast.error('Keine Leistung am Auftrag — Eintrag nicht möglich.')
      return
    }
    const text = [titel.trim(), beschreibung.trim()].filter(Boolean).join('\n\n')

    startTransition(async () => {
      const r = await createCrmPositionEintrag({
        positionId: targetPos,
        typ: 'weitere_arbeit',
        beschreibung: text || (fotoPath ? 'Foto-Update' : null),
        quelle: 'vor_ort',
        rueckdatiertGrund: null,
        ereignisZeit: null,
        zeitStd: null,
        zeitMin: null,
        fotoStoragePath: fotoPath.trim() || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Eintrag gespeichert')
      onSaved?.()
      onClose()
    })
  }

  const dirty = Boolean(beschreibung.trim() || titel.trim() || fotoPath)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Tagebuch-Eintrag"
      size="lg"
      dirty={dirty && !pending}
      footer={
        <div className="sheet-footer-actions ldr-cta">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="lt-field-lbl">Fotos</span>
          <label className="lt-foto-zone">
            <Camera className="h-5 w-5" aria-hidden />
            <span>{fotoPath ? 'Foto gesetzt — tippen zum Ändern' : 'Foto hinzufügen'}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadFoto(f)
              }}
            />
          </label>
        </div>

        <KiAssistFieldLabel
          label="Titel"
          value={titel}
          onApply={setTitel}
          extraHint="Bautagebuch-Eintrag — Kurztitel fürs Portal."
          multiline={false}
        >
          <input
            className="input"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Kurzer Titel fürs Portal"
          />
        </KiAssistFieldLabel>

        <KiAssistFieldLabel
          label="Beschreibung"
          value={beschreibung}
          onApply={setBeschreibung}
          extraHint="Bautagebuch-Eintrag — Was ist auf der Baustelle passiert?"
        >
          <Textarea
            rows={4}
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
            placeholder="Was ist auf der Baustelle passiert?"
          />
        </KiAssistFieldLabel>

        <label className="block">
          <span className="lt-field-lbl">Leistung</span>
          <select
            className="input"
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
          >
            <option value="">Ohne Bezug</option>
            {sortedPos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.leistung_name?.trim() || 'Leistung'}
              </option>
            ))}
          </select>
        </label>
      </div>
    </EditorSheet>
  )
}
