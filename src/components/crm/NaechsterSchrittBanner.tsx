'use client'

import { MockBtn } from '@/components/mock-ui'
import type { ReactNode } from 'react'
import type { NaechsterSchrittHint } from '@/lib/crm/naechster-schritt'
import { cn } from '@/lib/utils'

export type NextStepMetric = { label: string; value: string }

/** Spec §4: nächster Schritt + Kontext + 2–3 Kennzahlen */
export function NextStepBar({
  step,
  metrics,
  onStepClick,
  className,
}: {
  step: NaechsterSchrittHint | null
  metrics?: NextStepMetric[]
  onStepClick?: () => void
  className?: string
}) {
  if (!step && (!metrics || metrics.length === 0)) return null
  return (
    <div className={cn('next-step-bar', className)} role="status">
      {step ? (
        onStepClick ? (
          <MockBtn className="next-step-bar__main next-step-bar__main--btn" type="button" onClick={onStepClick}>
            <span className="next-step-bar__label">{step.label}</span>
            {step.hint?.trim() ? (
              <span className="next-step-bar__hint">{step.hint}</span>
            ) : null}
          </MockBtn>
        ) : (
          <div className="next-step-bar__main">
            <span className="next-step-bar__label">{step.label}</span>
            {step.hint?.trim() ? (
              <span className="next-step-bar__hint">{step.hint}</span>
            ) : null}
          </div>
        )
      ) : null}
      {metrics && metrics.length > 0 ? (
        <div className="next-step-bar__metrics">
          {metrics.slice(0, 3).map((m) => (
            <div key={m.label} className="next-step-bar__metric">
              <span className="next-step-bar__metric-val">{m.value}</span>
              <span className="next-step-bar__metric-lbl">{m.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Alias — nutze NextStepBar */
export function NaechsterSchrittBanner({
  step,
}: {
  step: NaechsterSchrittHint | null
}): ReactNode {
  return <NextStepBar step={step} />
}
