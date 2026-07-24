'use client'

import type { ReactNode } from 'react'
import { Fragment, useEffect, useRef } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { WizardMobileToolbar } from '@/components/layout/app/WizardMobileToolbar'
import { trapFocus } from '@/lib/a11y/focus-trap'
import { cn } from '@/lib/utils'

export type WizardShellStep = {
  id: number
  label: string
}

/** Mock Wizard-Hülle: .wizard + .wizard-top + .stepper + mobiles Sticky-Footer */
export function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  onClose,
  mobileActions,
  mobileFooter,
  desktopActions,
  footer,
  children,
  className,
  saveHint,
}: {
  title: string
  subtitle?: ReactNode
  steps: WizardShellStep[]
  currentStep: number
  onClose: () => void
  /** Kompakte Header-Aktionen (mobil) — z. B. nur Zurück */
  mobileActions?: ReactNode
  /** Sticky Primary-CTA unten (mobil) — Daumenbereich */
  mobileFooter?: ReactNode
  desktopActions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  /** z. B. „Gespeichert ✓“ / „Speichert…“ */
  saveHint?: string | null
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const stepMeta = steps.find((s) => s.id === currentStep)
  const stepLabel = stepMeta
    ? `Schritt ${currentStep}: ${stepMeta.label}`
    : `Schritt ${currentStep}`

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    return trapFocus(root, () => onCloseRef.current())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentStep intentional
  }, [currentStep])

  /** iOS/Android: Footer über der Soft-Keyboard halten */
  useEffect(() => {
    if (!mobileFooter) return
    const root = rootRef.current
    const vv = window.visualViewport
    if (!root || !vv) return

    const sync = () => {
      root.style.height = `${vv.height}px`
      root.style.transform = vv.offsetTop ? `translateY(${vv.offsetTop}px)` : ''
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      root.style.setProperty('--keyboard-inset', `${kb}px`)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.height = ''
      root.style.transform = ''
      root.style.removeProperty('--keyboard-inset')
    }
  }, [mobileFooter])

  return (
    <div
      ref={rootRef}
      className={cn(
        'wizard wizard-flow',
        Boolean(mobileFooter) && 'wizard-flow--has-mobile-footer',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
    >
      <div className="wizard-inner-shell">
        <div className="wizard-top">
          <WizardMobileToolbar
            onClose={onClose}
            totalSteps={steps.length}
            currentStep={currentStep}
            stepLabel={stepLabel}
            actions={mobileActions}
            saveHint={saveHint}
          />
          <div className="wizard-header-desktop hidden w-full min-w-0 flex-1 items-center gap-4 md:flex">
            <MockBtn sm kind="ghost" icon="x" onClick={onClose} title="Abbrechen" />
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} aria-hidden />
            <div className="title-block min-w-0 flex-1">
              <div className="ttl">{title}</div>
              {subtitle ? <div className="sub">{subtitle}</div> : null}
              {saveHint ? <div className="wizard-save-hint">{saveHint}</div> : null}
            </div>
            <nav className="stepper hidden lg:flex" aria-label="Fortschritt">
              {steps.map((s, i) => (
                <Fragment key={s.id}>
                  {i > 0 ? (
                    <MockIcon ctx="default" n="chevron-right" size={14} className="step-arrow" />
                  ) : null}
                  <div
                    className={cn(
                      'step',
                      s.id === currentStep && 'active',
                      s.id < currentStep && 'done'
                    )}
                  >
                    <div className="step-n">
                      {s.id < currentStep ? <MockIcon ctx="default" n="check" size={11} /> : s.id}
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
        {mobileFooter ? (
          <div className="wizard-mobile-footer md:hidden" role="toolbar" aria-label="Wizard-Aktionen">
            {mobileFooter}
          </div>
        ) : null}
        {footer}
      </div>
    </div>
  )
}
