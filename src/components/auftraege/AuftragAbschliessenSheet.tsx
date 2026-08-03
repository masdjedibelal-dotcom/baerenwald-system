'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  AbnahmeBegehListe,
  AbnahmeMaengelCheckliste,
  AbnahmeProgressBar,
  countAbgenommeneLeistungen,
} from '@/components/auftraege/AbnahmeBegehListe'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  getGesamtabnahmeGate,
  saveAbnahmeAndAbschliessen,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import { updateAuftragStatusFromUi } from '@/app/(dashboard)/auftraege/actions'
import { emptyAbnahmeProtokollMeta } from '@/lib/auftraege/abnahme-protokoll-meta'
import {
  maengelFromCheckItems,
  type AbnahmeMangelCheckItem,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { heuteYmd } from '@/lib/angebot-einfach'
import type { AuftragPosition } from '@/lib/types'

type Step = 'frage' | 'checkliste'

/**
 * Auftrag abschließen: optionale Abnahme-Checkliste (frei hinzufügbare Leistungen + Mängel).
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
  const [pendingKind, setPendingKind] = useState<'save' | 'send' | null>(null)
  const [step, setStep] = useState<Step>('frage')
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>([])
  const [maengelItems, setMaengelItems] = useState<AbnahmeMangelCheckItem[]>([])
  const [notizen, setNotizen] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('frage')
    setPunkte([])
    setMaengelItems([])
    setNotizen('')
    setPendingKind(null)
  }, [open])

  const progress = useMemo(() => countAbgenommeneLeistungen(punkte), [punkte])

  function abschliessenOhneAbnahme() {
    startTransition(async () => {
      const gate = await getGesamtabnahmeGate(auftragId)
      if (gate.zeilen.length > 0 && !gate.ok) {
        toast.error(
          gate.message ||
            'Mit zugewiesenen Partnern: zuerst alle Teilabnahmen freigeben, dann Gesamtabnahme.'
        )
        return
      }
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

  function speichernMitAbnahme(sendToKunde: boolean) {
    setPendingKind(sendToKunde ? 'send' : 'save')
    startTransition(async () => {
      const maengel = maengelFromCheckItems(maengelItems)
      const hatMaengel = maengel.length > 0
      const meta = emptyAbnahmeProtokollMeta({
        abnahme_ergebnis: hatMaengel ? 'mit_vorbehalt' : 'abgenommen',
      })
      const r = await saveAbnahmeAndAbschliessen({
        auftragId,
        abnahmeDatum: heuteYmd(),
        punkte,
        maengel,
        notizen: notizen.trim() || null,
        meta,
        sendToKunde,
      })
      setPendingKind(null)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (r.sendWarning) {
        toast.error(
          `Gespeichert und abgeschlossen, Versand fehlgeschlagen: ${r.sendWarning}`
        )
      } else {
        toast.success(
          r.sentToKunde
            ? 'Abnahmeprotokoll gespeichert und an den Kunden gesendet — Auftrag abgeschlossen'
            : 'Gesamtabnahme gespeichert — Auftrag abgeschlossen'
        )
      }
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
          <div className="sheet-footer-actions zahlplan-editor-footer">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={abschliessenOhneAbnahme}
            >
              Speichern
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={pending}
              loading={pending}
              onClick={() => setStep('checkliste')}
            >
              Erstellen
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
        <div className="sheet-footer-actions zahlplan-editor-footer">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            loading={pending && pendingKind === 'save'}
            onClick={() => speichernMitAbnahme(false)}
          >
            Speichern
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={pending}
            loading={pending && pendingKind === 'send'}
            onClick={() => speichernMitAbnahme(true)}
          >
            Speichern und senden
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
          <AbnahmeBegehListe
            punkte={punkte}
            onChange={setPunkte}
            katalogPositionen={positionen}
          />
        </div>
        <div>
          <h3 className="m-0 mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-[var(--text-3)]">
            Mängel (optional)
          </h3>
          <AbnahmeMaengelCheckliste items={maengelItems} onChange={setMaengelItems} />
        </div>
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
