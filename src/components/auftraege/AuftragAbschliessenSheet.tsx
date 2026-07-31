'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import {
  AbnahmeBegehListe,
  AbnahmeProgressBar,
  countAbgenommeneLeistungen,
} from '@/components/auftraege/AbnahmeBegehListe'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { saveAbnahmeAndAbschliessen } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { updateAuftragStatusFromUi } from '@/app/(dashboard)/auftraege/actions'
import { emptyAbnahmeProtokollMeta } from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  buildAbnahmePunkteInitial,
  maengelAusPunkten,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { heuteYmd } from '@/lib/angebot-einfach'
import type { AuftragPosition } from '@/lib/types'

type Step = 'frage' | 'checkliste'

/**
 * Auftrag abschließen: optional Abnahme-Checkliste (Bottom/Split), sonst direkt abschließen.
 * Signatur entfällt (Portal / vor Ort).
 */
export function AuftragAbschliessenSheet({
  open,
  onClose,
  auftragId,
  positionen,
  onDone,
  onNachRechnung,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionen: AuftragPosition[]
  onDone?: () => void
  /** Nach Abschluss ohne Abnahme — z. B. Rechnung öffnen */
  onNachRechnung?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState<Step>('frage')
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [notizen, setNotizen] = useState('')
  const [maengelFrei, setMaengelFrei] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('frage')
    setPunkte(buildAbnahmePunkteInitial({ positionen, angebotPositionen: null, gewerke: [] }))
    setNotizen('')
    setMaengelFrei('')
  }, [open, positionen])

  const progress = useMemo(() => countAbgenommeneLeistungen(punkte), [punkte])

  function abschliessenOhneAbnahme() {
    startTransition(async () => {
      const r = await updateAuftragStatusFromUi(auftragId, 'abgeschlossen')
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Auftrag abgeschlossen')
      onClose()
      onDone?.()
      onNachRechnung?.()
    })
  }

  function speichernMitAbnahme() {
    startTransition(async () => {
      const ausPunkten = maengelAusPunkten(punkte)
      const hatMaengel = ausPunkten.length > 0 || Boolean(maengelFrei.trim())
      const meta = emptyAbnahmeProtokollMeta({
        abnahme_ergebnis: hatMaengel ? 'mit_vorbehalt' : 'abgenommen',
      })
      const extraNote = [notizen.trim(), maengelFrei.trim() ? `Mängel:\n${maengelFrei.trim()}` : '']
        .filter(Boolean)
        .join('\n\n')
      const r = await saveAbnahmeAndAbschliessen({
        auftragId,
        abnahmeDatum: heuteYmd(),
        punkte,
        maengel: ausPunkten,
        notizen: extraNote || null,
        meta,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Abnahmeprotokoll gespeichert — Auftrag abgeschlossen')
      onClose()
      onDone?.()
    })
  }

  if (step === 'frage') {
    return (
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Auftrag abschließen"
        size="md"
        footer={
          <div className="ldr-cta" style={{ flexDirection: 'column', gap: 8 }}>
            <Button
              type="button"
              variant="primary"
              className="w-full"
              disabled={pending}
              loading={pending}
              onClick={() => setStep('checkliste')}
            >
              Ja — Abnahmeprotokoll erstellen
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Nein — nur abschließen
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
              Abbrechen
            </Button>
          </div>
        }
      >
        <p className="text-[length:var(--fs-text)] text-[var(--text-2)] leading-relaxed m-0">
          Soll ein Abnahmeprotokoll mit Leistungs-Checkliste und Mängeln erstellt und in den
          Dokumenten abgelegt werden? Signatur erfolgt vor Ort / im Portal — nicht hier.
        </p>
      </EditorSheet>
    )
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Abnahmeprotokoll"
      size="lg"
      dirty={!pending}
      footer={
        <div className="sheet-footer-actions ldr-cta">
          <Button type="button" variant="secondary" onClick={() => setStep('frage')} disabled={pending}>
            Zurück
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={pending}
            onClick={speichernMitAbnahme}
          >
            {pending ? 'Protokoll wird erstellt…' : 'Speichern & abschließen'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <AbnahmeProgressBar done={progress.done} total={progress.total} />
        <div>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Leistungen
          </h3>
          <AbnahmeBegehListe punkte={punkte} onChange={setPunkte} />
        </div>
        <KiAssistFieldLabel
          label="Mängel (frei, optional)"
          value={maengelFrei}
          onApply={setMaengelFrei}
          extraHint="Abnahme: freie Mängel ohne Leistungsbezug."
        >
          <Textarea
            rows={3}
            value={maengelFrei}
            onChange={(e) => setMaengelFrei(e.target.value)}
            placeholder="Offene Punkte ohne Leistungsbezug…"
          />
        </KiAssistFieldLabel>
        <label className="block">
          <span className="lt-field-lbl">Notizen</span>
          <Textarea
            rows={2}
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>
    </EditorSheet>
  )
}
