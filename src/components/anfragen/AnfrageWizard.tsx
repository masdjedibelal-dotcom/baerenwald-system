'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { WizardShell } from '@/components/layout/WizardShell'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import {
  AnfrageNeuForm,
  ANFRAGE_BEARBEITEN_FORM_ID,
  ANFRAGE_NEU_FORM_ID,
} from '@/components/anfragen/AnfrageNeuForm'
import type { LeadDetail } from '@/lib/types'

const STEPS = [
  { id: 1, label: 'Anfrage' },
  { id: 2, label: 'Prüfen' },
]

/**
 * Fullscreen-Wizard für Anfrage erstellen / bearbeiten (wie Angebot/Rechnung).
 */
export function AnfrageWizard({
  open,
  onClose,
  defaultKundeId,
  bearbeitenLead,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  defaultKundeId?: string | null
  bearbeitenLead?: LeadDetail | null
  onSuccess?: (id: string) => void
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1)
  const [meta, setMeta] = useState({ loading: false, isValid: false })

  const isBearbeiten = Boolean(bearbeitenLead?.id)
  const formId = useMemo(
    () => (isBearbeiten ? ANFRAGE_BEARBEITEN_FORM_ID : ANFRAGE_NEU_FORM_ID),
    [isBearbeiten]
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setStep(1)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !mounted) return null

  const title = isBearbeiten ? 'Anfrage bearbeiten' : 'Anfrage erstellen'
  const primaryLabel = isBearbeiten ? 'Speichern' : 'Anfrage anlegen'

  const desktopActions = (
    <div className="wizard-nav-actions">
      {step > 1 ? (
        <MockBtn kind="ghost" icon="chevron-left" onClick={() => setStep(1)}>
          Zurück
        </MockBtn>
      ) : null}
      {step < 2 ? (
        <MockBtn
          kind="primary"
          icon="chevron-right"
          disabled={!meta.isValid}
          onClick={() => setStep(2)}
        >
          Weiter
        </MockBtn>
      ) : (
        <MockBtn
          kind="primary"
          disabled={!meta.isValid || meta.loading}
          onClick={() => {
            const form = document.getElementById(formId) as HTMLFormElement | null
            form?.requestSubmit()
          }}
        >
          <Save className="mr-1.5 h-4 w-4" aria-hidden />
          {meta.loading ? 'Speichern…' : primaryLabel}
        </MockBtn>
      )}
    </div>
  )

  const mobileActions =
    step < 2 ? (
      <MockBtn sm kind="primary" disabled={!meta.isValid} onClick={() => setStep(2)}>
        Weiter
      </MockBtn>
    ) : (
      <>
        <MockBtn sm kind="ghost" icon="chevron-left" onClick={() => setStep(1)} title="Zurück" />
        <MockBtn
          sm
          kind="primary"
          disabled={!meta.isValid || meta.loading}
          onClick={() => {
            const form = document.getElementById(formId) as HTMLFormElement | null
            form?.requestSubmit()
          }}
        >
          {primaryLabel}
        </MockBtn>
      </>
    )

  const wizard = (
    <WizardShell
      className="wizard-flow"
      title={title}
      steps={STEPS}
      currentStep={step}
      onClose={onClose}
      mobileActions={mobileActions}
      desktopActions={desktopActions}
    >
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        {step === 2 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Prüfen</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>
              Angaben prüfen und Anfrage {isBearbeiten ? 'speichern' : 'anlegen'}
            </div>
          </div>
        ) : null}
        <AnfrageNeuForm
          variant="sheet"
          formId={formId}
          defaultKundeId={defaultKundeId}
          bearbeitenLead={bearbeitenLead}
          onMetaChange={setMeta}
          onSuccess={(id) => {
            onSuccess?.(id)
            onClose()
            if (!isBearbeiten) router.push(`/anfragen/${id}`)
            else router.refresh()
          }}
          onCancel={onClose}
        />
      </div>
    </WizardShell>
  )

  return createPortal(wizard, document.body)
}
