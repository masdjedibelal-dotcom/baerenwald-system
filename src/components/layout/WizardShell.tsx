'use client'

import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { WizardMobileToolbar } from '@/components/layout/app/WizardMobileToolbar'
import { cn } from '@/lib/utils'

export type WizardShellStep = {
  id: number
  label: string
}

/** Mock Wizard-Hülle: .wizard + .wizard-top + .stepper */
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

  return (
    <div className={cn('wizard', className)} role="dialog" aria-modal="true">
      <div className="wizard-inner-shell">
        <div className="wizard-top">
          <WizardMobileToolbar
            onClose={onClose}
            totalSteps={steps.length}
            currentStep={currentStep}
            stepLabel={stepLabel}
            actions={mobileActions}
          />
          <div className="wizard-header-desktop hidden w-full min-w-0 flex-1 items-center gap-4 md:flex">
            <MockBtn sm kind="ghost" icon="x" onClick={onClose} title="Abbrechen" />
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} aria-hidden />
            <div className="title-block min-w-0 flex-1">
              <div className="ttl">{title}</div>
              {subtitle ? <div className="sub">{subtitle}</div> : null}
            </div>
            <nav className="stepper hidden lg:flex" aria-label="Fortschritt">
              {steps.map((s, i) => (
                <Fragment key={s.id}>
                  {i > 0 ? <MockIcon n="chevron-right" size={14} className="step-arrow" /> : null}
                  <div
                    className={cn(
                      'step',
                      s.id === currentStep && 'active',
                      s.id < currentStep && 'done'
                    )}
                  >
                    <div className="step-n">
                      {s.id < currentStep ? <MockIcon n="check" size={11} /> : s.id}
                    </div>
                    <span>{s.label}</span>
                  </div>
                </Fragment>
              ))}
            </nav>
            {desktopActions ? (
              <div className="flex shrink-0 items-center gap-2">{desktopActions}</div>
            ) : null}
          </div>
        </div>
        <div className="wizard-body">
          <div className="wizard-inner">{children}</div>
        </div>
        {footer}
      </div>
    </div>
  )
}
