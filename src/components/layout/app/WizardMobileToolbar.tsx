'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { AppFlowStepDots } from '@/components/layout/app/AppFlowScreen'

type WizardMobileToolbarProps = {
  onClose: () => void
  totalSteps: number
  currentStep: number
  stepLabel?: string
  actions: ReactNode
}

/** Eine kompakte Header-Zeile auf Mobile: Schließen · Schritte · Aktionen */
export function WizardMobileToolbar({
  onClose,
  totalSteps,
  currentStep,
  stepLabel,
  actions,
}: WizardMobileToolbarProps) {
  return (
    <div className="wizard-mobile-toolbar md:hidden">
      <button
        type="button"
        className="btn btn-ghost btn-sm wizard-mobile-toolbar__close shrink-0"
        onClick={onClose}
        aria-label="Schließen"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="wizard-mobile-toolbar__center min-w-0">
        <AppFlowStepDots total={totalSteps} current={currentStep} compact />
        {stepLabel ? <span className="sr-only">{stepLabel}</span> : null}
      </div>
      <div className="wizard-mobile-toolbar__actions">{actions}</div>
    </div>
  )
}
