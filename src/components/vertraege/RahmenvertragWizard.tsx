'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, Download, FileText, X } from 'lucide-react'
import { AppFlowScreen, WizardMobileToolbar } from '@/components/layout/app'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { finalizeRahmenVertrag } from '@/app/(dashboard)/vertraege/wizard-actions'
import { handwerkerAnzeigename } from '@/lib/vertraege/build-vertrag-texte'
import type { RahmenVertragWizardBootstrap } from '@/lib/vertraege/types'
import { cn } from '@/lib/utils'

function Step({
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

export function RahmenvertragWizard({
  bootstrap,
  onClose,
  onDone,
}: {
  bootstrap: RahmenVertragWizardBootstrap
  onClose: () => void
  onDone?: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [notizen, setNotizen] = useState(bootstrap.notizen)
  const [vertragId, setVertragId] = useState<string | null>(bootstrap.vertrag_id)
  const [vertragsNr, setVertragsNr] = useState(bootstrap.vertrags_nr?.trim() || 'RV-Entwurf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handlePdfErzeugen = useCallback(async () => {
    setSaving(true)
    try {
      const res = await finalizeRahmenVertrag({
        vertrag_id: vertragId,
        handwerker_id: bootstrap.handwerker_id,
        notizen,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setVertragId(res.vertrag_id)
      setVertragsNr(res.vertrags_nr)
      setPdfUrl(res.pdf_url)
      toast.success('Rahmenvertrag als PDF erzeugt und hochgeladen')
      onDone?.()
    } finally {
      setSaving(false)
    }
  }, [bootstrap.handwerker_id, notizen, onDone, vertragId])

  if (!mounted || typeof document === 'undefined') return null

  const hw = bootstrap.handwerker

  const wizardMobileActions =
    step === 1 ? (
      <Button
        size="sm"
        className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
        disabled={saving}
        onClick={() => setStep(2)}
      >
        Weiter
      </Button>
    ) : (
      <Button
        size="sm"
        className="wizard-mobile-toolbar__next shrink-0 gap-1 px-2.5"
        disabled={saving}
        onClick={() => void handlePdfErzeugen()}
      >
        <FileText className="h-4 w-4" />
        PDF erzeugen
      </Button>
    )

  const wizardHeader = (
    <>
      <WizardMobileToolbar
        onClose={onClose}
        totalSteps={2}
        currentStep={step}
        stepLabel={`Schritt ${step}`}
        actions={wizardMobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Schließen">
          <X className="h-4 w-4" />
        </button>
        <div className="h-6 w-px bg-bw-border" aria-hidden />
        <div className="title-block min-w-0">
          <div className="ttl">Partner-Rahmenvertrag</div>
          <div className="sub">
            {handwerkerAnzeigename(hw)}
            {vertragsNr !== 'RV-Entwurf' ? ` · ${vertragsNr}` : ''}
          </div>
        </div>
        <div className="flex-1" />
        <div className="stepper" role="navigation" aria-label="Fortschritt">
          <Step n={1} label="Partner" active={step === 1} done={step > 1} />
          <Step n={2} label="PDF" active={step === 2} done={!!pdfUrl} />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </Button>
          ) : (
            <Button onClick={() => setStep(2)}>Weiter</Button>
          )}
          {step === 2 ? (
            <Button disabled={saving} onClick={() => void handlePdfErzeugen()} className="gap-1.5">
              <FileText className="h-4 w-4" aria-hidden />
              PDF erzeugen & hochladen
            </Button>
          ) : null}
        </div>
      </div>
    </>
  )

  const wizard = (
    <AppFlowScreen className="wizard-flow" header={wizardHeader}>
      <div className="wizard-inner max-w-2xl">
        {step === 1 ? (
          <Card title="Partner">
            <div className="space-y-3 text-sm">
              <p className="font-medium text-bw-text">{handwerkerAnzeigename(hw)}</p>
              {hw.firma ? <p className="text-bw-text-muted">{hw.firma}</p> : null}
              {hw.adresse ? <p>{hw.adresse}</p> : null}
              {hw.telefon ? <p>Tel. {hw.telefon}</p> : null}
              {hw.email ? <p>{hw.email}</p> : null}
              {hw.steuernummer ? <p>St.-Nr. {hw.steuernummer}</p> : null}
              {hw.ustid ? <p>USt-IdNr. {hw.ustid}</p> : null}
              <Textarea
                label="Interne Notizen (optional)"
                rows={3}
                value={notizen}
                onChange={(e) => setNotizen(e.target.value)}
                className="mt-4"
              />
              <p className="text-xs text-bw-text-muted">
                Der Rahmenvertrag regelt die allgemeinen Partnerschaftsbedingungen. Projektbezogene
                Leistungen werden in separaten Nachunternehmerverträgen festgelegt.
              </p>
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card title="PDF erzeugen">
            <div className="space-y-4 text-sm">
              <p className="text-bw-text-muted">
                Der Rahmenvertrag wird im Bärenwald-Design erzeugt und als PDF gespeichert.
              </p>
              <dl className="grid gap-2">
                <div>
                  <dt className="text-bw-text-muted">Partner</dt>
                  <dd className="font-medium">{handwerkerAnzeigename(hw)}</dd>
                </div>
                <div>
                  <dt className="text-bw-text-muted">Vertrags-Nr.</dt>
                  <dd className="font-medium">{vertragsNr}</dd>
                </div>
              </dl>
              {pdfUrl ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm inline-flex gap-1.5"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    PDF öffnen
                  </a>
                  <Button variant="secondary" onClick={onClose}>
                    Schließen
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </AppFlowScreen>
  )

  return createPortal(wizard, document.body)
}
