'use client'

import type { NaechsterSchrittHint } from '@/lib/crm/naechster-schritt'

/** Kompakter Hinweis unter dem Detail-Kopf: was jetzt dran ist. */
export function NaechsterSchrittBanner({ step }: { step: NaechsterSchrittHint | null }) {
  if (!step) return null
  return (
    <div className="next-step-banner" role="status">
      <span className="next-step-banner__label">{step.label}</span>
      <span className="next-step-banner__hint">{step.hint}</span>
    </div>
  )
}
