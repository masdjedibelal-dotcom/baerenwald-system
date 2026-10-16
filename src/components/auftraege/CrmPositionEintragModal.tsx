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
import { sendeBautagebuchWhatsApp, tagebuchWhatsAppEmpfaenger } from '@/app/(dashboard)/whatsapp/actions'
import type { TagebuchEmpfaenger } from '@/lib/whatsapp/dienst'
import { waNummerAnzeige } from '@/lib/whatsapp/telefon'
import { safeAction } from '@/lib/actions/safe-action'
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
  /** WhatsApp-Empfänger (Kunde, Ansprechpartner, Objekt-Kontakte) — geladen beim Ankreuzen */
  const [empfaenger, setEmpfaenger] = useState<TagebuchEmpfaenger[] | null>(null)
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set())

  async function waUmschalten(an: boolean) {
    setPerWhatsApp(an)
    if (!an || empfaenger) return
    const r = await safeAction(tagebuchWhatsAppEmpfaenger(auftragId))
    const liste = r.ok ? r.liste : []
    setEmpfaenger(liste)
    setGewaehlt(new Set(liste.filter((e) => e.vor).map((e) => e.id)))
  }

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
          // Nur an die angekreuzten Empfänger (alle abgewählt = keine WhatsApp)
          if (!isEdit && perWhatsApp && wa?.sichtbar && gewaehlt.size > 0) {
            const w = await sendeBautagebuchWhatsApp({
              auftragId,
              titel: titel.trim(),
              text: beschreibung.trim(),
              empfaenger: Array.from(gewaehlt),
            })
            if (w.ok) toast.success(gewaehlt.size === 1 ? 'Per WhatsApp informiert' : `${gewaehlt.size} Empfänger per WhatsApp informiert`)
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
          <>
            <label className="wa-check">
              <MockCheckbox checked={perWhatsApp} onChange={(e) => waUmschalten(e.target.checked)} />
              <span>
                Kunde per WhatsApp informieren
                <span className="wa-check__sub">Kurzer Text mit Link zur Projektseite (Fotos, Details).</span>
              </span>
            </label>
            {perWhatsApp ? (
              <div className="wa-empfaenger" role="group" aria-label="An">
                <span className="lt-field-lbl">An</span>
                {empfaenger == null ? (
                  <span className="wa-check__sub">Wird geladen …</span>
                ) : empfaenger.length === 0 ? (
                  <span className="wa-check__sub">Keine Handynummer beim Kunden oder seinen Ansprechpartnern hinterlegt.</span>
                ) : (
                  empfaenger.map((e) => (
                    <label key={e.id} className="wa-check">
                      <MockCheckbox
                        checked={gewaehlt.has(e.id)}
                        onChange={() =>
                          setGewaehlt((prev) => {
                            const next = new Set(prev)
                            if (next.has(e.id)) next.delete(e.id)
                            else next.add(e.id)
                            return next
                          })
                        }
                      />
                      <span>
                        {e.name}
                        <span className="wa-check__sub">
                          {e.info} · {waNummerAnzeige(e.nummer)}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </EditorSheet>
  )
}
