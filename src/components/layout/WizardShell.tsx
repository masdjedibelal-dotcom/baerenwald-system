'use client'

import type { ReactNode } from 'react'
import { AppFlowScreen } from '@/components/layout/app/AppFlowScreen'
import { WizardMobileToolbar } from '@/components/layout/app/WizardMobileToolbar'
import { cn } from '@/lib/utils'

export type WizardShellStep = {
  id: number
  label: string
}

/** Gemeinsame Wizard-Hülle (Spec §7): AppFlowScreen + Mobile-Toolbar + Desktop-Header. */
export function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  onClose,
  mobileActions,
  desktopActions,
  footer,
  children,
  className,
}: {
  title: string
  subtitle?: ReactNode
  steps: WizardShellStep[]
  currentStep: number
  onClose: () => void
  mobileActions?: ReactNode
  desktopActions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  const stepMeta = steps.find((s) => s.id === currentStep)
  const stepLabel = stepMeta
    ? `Schritt ${currentStep}: ${stepMeta.label}`
    : `Schritt ${currentStep}`

  const header = (
    <>
      <WizardMobileToolbar
        onClose={onClose}
        totalSteps={steps.length}
        currentStep={currentStep}
        stepLabel={stepLabel}
        actions={mobileActions}
      />
      <div className="wizard-header-desktop hidden md:flex md:min-w-0 md:flex-1 md:items-center md:gap-4">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Schließen">
          ×
        </button>
        <div className="h-6 w-px bg-bw-border" aria-hidden />
        <div className="title-block min-w-0 flex-1">
          <div className="ttl">{title}</div>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
        <nav className="stepper hidden lg:flex" aria-label="Fortschritt">
          {steps.map((s) => (
            <span
              key={s.id}
              className={cn(
                'step',
                s.id === currentStep && 'active',
                s.id < currentStep && 'done'
              )}
            >
              {s.label}
            </span>
          ))}
        </nav>
        {desktopActions ? <div className="flex shrink-0 items-center gap-2">{desktopActions}</div> : null}
      </div>
    </>
  )

  return (
    <AppFlowScreen header={header} footer={footer} className={className}>
      {children}
    </AppFlowScreen>
  )
}
