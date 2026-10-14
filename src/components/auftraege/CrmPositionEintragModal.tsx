'use client'

import { useEffect,useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { FotoUploadFeld } from '@/components/ui/FotoUploadFeld'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import {
createCrmTagebuchEintrag,
updateCrmTagebuchEintrag,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
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
  vorbelegung = null,
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
  /** Neuer Eintrag vorausgefüllt (z. B. aus WhatsApp-Nachrichten) */
  vorbelegung?: { titel?: string; beschreibung?: string; fotoPaths?: string[] } | null
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
    setTitel(vorbelegung?.titel ?? '')
    setBeschreibung(vorbelegung?.beschreibung ?? '')
    setFotoPaths((vorbelegung?.fotoPaths ?? []).slice(0, MAX_FOTOS))
    setPerWhatsApp(false)
  }, [open, editEintrag, vorbelegung])



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
          formatierbar
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
          <FotoUploadFeld
            auftragId={auftragId}
            value={fotoPaths}
            onChange={setFotoPaths}
            max={MAX_FOTOS}
            disabled={pending}
            onBusyChange={setUploading}
          />
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
