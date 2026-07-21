'use client'

import Link from 'next/link'
import { Check, ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export type NaechsterSchritt = {
  id: string
  label: string
  dateLabel: string
  done: boolean
  href?: string
  onClick?: () => void
}

export function NaechsteSchritteCard({
  title = 'Nächste Schritte',
  steps,
  onStepClick,
}: {
  title?: string
  steps: NaechsterSchritt[]
  onStepClick?: (step: NaechsterSchritt) => void
}) {
  if (steps.length === 0) return null

  return (
    <Card
      title={
        <>
          <ListChecks className="h-4 w-4 text-bw-primary" aria-hidden />
          {title}
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {steps.map((step) => {
          const inner = (
            <>
              <span className={`detail-step-check ${step.done ? 'done' : ''}`} aria-hidden>
                {step.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
              </span>
              <span
                className={`flex-1 text-[13px] ${step.done ? 'text-bw-text-muted line-through' : 'text-bw-text'}`}
              >
                {step.label}
              </span>
              <span className="text-xs text-bw-text-muted">{step.dateLabel}</span>
            </>
          )

          if (step.href && !step.done) {
            return (
              <Link
                key={step.id}
                href={step.href}
                className="detail-step detail-step-btn"
                onClick={() => onStepClick?.(step)}
              >
                {inner}
              </Link>
            )
          }

          if (step.onClick && !step.done) {
            return (
              <button
                key={step.id}
                type="button"
                className="detail-step detail-step-btn w-full text-left"
                onClick={() => {
                  onStepClick?.(step)
                  step.onClick?.()
                }}
              >
                {inner}
              </button>
            )
          }

          return (
            <div key={step.id} className="detail-step">
              {inner}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
