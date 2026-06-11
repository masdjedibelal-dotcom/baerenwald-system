'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
import { AbnahmeprotokollChecklist } from '@/components/auftraege/AbnahmeprotokollChecklist'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { saveAbnahmeprotokollPdfOnly } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import {
  buildAbnahmePunkteInitial,
  maengelAusPunkten,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import type { AngebotPosition, AuftragPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'

const STEP_LABELS = ['Checkliste', 'Abschluss'] as const
const TOTAL_STEPS = STEP_LABELS.length

function WizardStep({
  n,
  label,
  active,
  done,
}: {
  n: number
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div className={cn('step', active && 'active', done && 'done')}>
      <span className="step-n">
        {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : n}
      </span>
      <span>{label}</span>
    </div>
  )
}

export function AbnahmeprotokollCreateWizard({
  auftragId,
  positionen,
  angebotPositionen,
  gewerke = [],
  kundeName,
  auftragsLabel,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  angebotPositionen?: AngebotPosition[] | null
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  kundeName: string
  auftragsLabel?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [pending, startTransition] = useTransition()
  const [punkte, setPunkte] = useState<AbnahmePunkt[]>(() =>
    buildAbnahmePunkteInitial({ positionen, angebotPositionen, gewerke })
  )
  const [abnahmeDatum, setAbnahmeDatum] = useState(heuteYmd())
  const [notizen, setNotizen] = useState('')

  useEffect(() => {
    setPunkte(buildAbnahmePunkteInitial({ positionen, angebotPositionen, gewerke }))
  }, [positionen, angebotPositionen, gewerke])

  const onClose = () => router.push(`/auftraege/${auftragId}`)

  function weiter() {
    if (step === 1) {
      if (punkte.every((p) => !p.beschreibung.trim())) {
        toast.error('Bitte mindestens einen Checkpunkt beschreiben.')
        return
      }
      setStep(2)
    }
  }

  function erstellen() {
    if (!abnahmeDatum.trim()) {
      toast.error('Bitte Abnahmedatum angeben.')
      return
    }
    startTransition(async () => {
      const r = await saveAbnahmeprotokollPdfOnly({
        auftragId,
        abnahmeDatum,
        punkte,
        maengel: maengelAusPunkten(punkte),
        notizen: notizen.trim() || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      downloadPdfFromBase64(r.pdfBase64, r.filename)
      toast.success('Abnahmeprotokoll erstellt')
      router.push(`/auftraege/${auftragId}`)
      router.refresh()
    })
  }

  const mobileActions =
    step === 1 ? (
      <Button type="button" variant="primary" size="sm" className="gap-1" onClick={weiter}>
        Weiter
        <ChevronRight className="h-4 w-4" />
      </Button>
    ) : (
      <Button type="button" variant="primary" size="sm" className="gap-1" loading={pending} onClick={erstellen}>
        <Check className="h-4 w-4" />
        Erstellen
      </Button>
    )

  const header = (
    <>
      <WizardMobileToolbar
        onClose={onClose}
        totalSteps={TOTAL_STEPS}
        currentStep={step}
        stepLabel={`Schritt ${step}: ${STEP_LABELS[step - 1]}`}
        actions={mobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Schließen">
          <X className="h-4 w-4" />
        </button>
        <div className="h-6 w-px bg-bw-border" aria-hidden />
        <div className="title-block min-w-0 flex-1">
          <div className="ttl">Abnahmeprotokoll erstellen</div>
          <div className="sub">
            {auftragsLabel ? `${auftragsLabel} · ` : ''}
            {kundeName}
          </div>
        </div>
        <div className="flex-1" />
        <nav className="stepper" aria-label="Fortschritt">
          <WizardStep n={1} label="Checkliste" active={step === 1} done={step > 1} />
          <ChevronRight className="step-arrow h-3.5 w-3.5" aria-hidden />
          <WizardStep n={2} label="Abschluss" active={step === 2} done={false} />
        </nav>
        <div className="flex-1" />
        {step > 1 ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
        ) : null}
        {step === 1 ? (
          <Button type="button" variant="primary" size="sm" className="gap-1.5" onClick={weiter}>
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" variant="primary" size="sm" className="gap-1.5" loading={pending} onClick={erstellen}>
            <Check className="h-4 w-4" />
            Erstellen
          </Button>
        )}
      </div>
    </>
  )

  return (
    <AppFlowScreen className="wizard-flow" header={header}>
      <div className="wizard-inner">
        {step === 1 ? (
          <div className="wizard-section-gap">
            <p className="text-sm text-bw-text-muted">
              Gewerke und Leistungen vom Auftrag — Checkpunkte anpassen, ergänzen oder entfernen. Status und
              Mängel werden später beim Ausfüllen vor Ort erfasst.
            </p>
            <AbnahmeprotokollChecklist punkte={punkte} onChange={setPunkte} mode="edit" />
          </div>
        ) : (
          <div className="wizard-section-gap max-w-xl space-y-4">
            <p className="text-sm text-bw-text-muted">
              Legen Sie das geplante Abnahmedatum fest und optional interne Notizen. Versand an den Kunden
              erfolgt später gesammelt in der Abschlussdokumentation.
            </p>
            <Input
              label="Datum der Abnahme"
              type="date"
              value={abnahmeDatum}
              onChange={(e) => setAbnahmeDatum(e.target.value)}
            />
            <Textarea
              label="Notizen (intern)"
              plain
              rows={5}
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              placeholder="Zusätzliche Anmerkungen zur geplanten Abnahme…"
            />
          </div>
        )}
      </div>
    </AppFlowScreen>
  )
}
