'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import {
  AnfrageNeuForm,
  ANFRAGE_BEARBEITEN_FORM_ID,
} from '@/components/anfragen/AnfrageNeuForm'
import { StaffFunnelWizard } from '@/components/anfragen/staff-funnel/StaffFunnelWizard'
import { cn } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'

const PHASES = [
  { id: 1, label: 'Anfrage' },
  { id: 2, label: 'Prüfen' },
] as const

/**
 * Fullscreen: neu = Staff-Funnel (DocumentCanvas), bearbeiten = Formular (DocumentCanvas).
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
  const formId = useMemo(() => ANFRAGE_BEARBEITEN_FORM_ID, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setStep(1)
  }, [open])

  if (!isBearbeiten) {
    return (
      <StaffFunnelWizard
        open={open}
        onClose={onClose}
        defaultKundeId={defaultKundeId}
        onSuccess={(id) => {
          if (onSuccess) onSuccess(id)
          else {
            onClose()
            router.push(`/anfragen/${id}`)
          }
        }}
      />
    )
  }

  if (!open || !mounted) return null

  function submitForm() {
    const form = document.getElementById(formId) as HTMLFormElement | null
    form?.requestSubmit()
  }

  const navActions = (
    <div className="flex w-full flex-wrap items-center gap-2">
      {step > 1 ? (
        <MockBtn kind="ghost" icon="chevron-left" onClick={() => setStep(1)}>
          Zurück
        </MockBtn>
      ) : (
        <span className="flex-1" />
      )}
      <div className="ml-auto">
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
            onClick={submitForm}
          >
            <Save className="mr-1.5 h-4 w-4" aria-hidden />
            {meta.loading ? 'Speichern…' : 'Speichern'}
          </MockBtn>
        )}
      </div>
    </div>
  )

  return (
    <DocumentCanvas
      open={open}
      title="Anfrage"
      onClose={onClose}
      onSave={() => {
        if (step < 2) {
          if (meta.isValid) setStep(2)
        } else if (meta.isValid && !meta.loading) {
          submitForm()
        }
      }}
      saveBusy={meta.loading}
      className="wizard-flow"
    >
      <nav className="document-section-nav" aria-label="Phasen">
        {PHASES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn(
              'document-section-nav__chip',
              step === p.id && 'document-section-nav__chip--active'
            )}
            onClick={() => {
              if (p.id === 2 && !meta.isValid) return
              setStep(p.id)
            }}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto hidden md:block">{navActions}</div>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
        {step === 2 ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 'var(--fs-head)', fontWeight: 600, letterSpacing: '-0.01em' }}>Prüfen</div>
            <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)', marginTop: 2 }}>
              Angaben prüfen und speichern
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
            router.refresh()
          }}
          onCancel={onClose}
        />
      </div>

      <div className="mt-4 md:hidden">{navActions}</div>
    </DocumentCanvas>
  )
}
