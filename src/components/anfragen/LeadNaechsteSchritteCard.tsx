'use client'

import Link from 'next/link'
import { Check, ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export type LeadSchritt = {
  id: string
  label: string
  dateLabel: string
  done: boolean
  href?: string
  onClick?: () => void
}

export function buildLeadNaechsteSchritte(
  opts: {
    hatTermin?: boolean
    handwerkerErledigt?: boolean
    /** Angebot an Kunden versendet */
    angebotAnKundeGesendet?: boolean
    angebotHref?: string
    onTerminClick?: () => void
    onHandwerkerEinholen?: () => void
    onAngebotAnKunde?: () => void
  }
): LeadSchritt[] {
  const {
    hatTermin = false,
    handwerkerErledigt = false,
    angebotAnKundeGesendet = false,
    angebotHref,
    onTerminClick,
    onHandwerkerEinholen,
    onAngebotAnKunde,
  } = opts

  return [
    {
      id: 'termin',
      label: 'Termin vereinbaren',
      dateLabel: hatTermin ? 'Erledigt' : 'Heute',
      done: hatTermin,
      onClick: hatTermin ? undefined : onTerminClick,
    },
    {
      id: 'angebot_kunde',
      label: 'Angebot an Kunden senden',
      dateLabel: angebotAnKundeGesendet ? 'Erledigt' : hatTermin ? 'Als Nächstes' : '—',
      done: angebotAnKundeGesendet,
      onClick: angebotAnKundeGesendet ? undefined : onAngebotAnKunde,
      href: angebotAnKundeGesendet
        ? undefined
        : angebotHref
          ? `${angebotHref}#angebot-versand-kunde`
          : undefined,
    },
    {
      id: 'handwerker_angebot',
      label: 'Handwerker-Angebot / Rechnung einholen',
      dateLabel: handwerkerErledigt
        ? 'Erledigt'
        : angebotAnKundeGesendet
          ? 'Als Nächstes'
          : '—',
      done: handwerkerErledigt,
      onClick:
        handwerkerErledigt || !angebotAnKundeGesendet ? undefined : onHandwerkerEinholen,
      href:
        handwerkerErledigt || !angebotAnKundeGesendet
          ? undefined
          : angebotHref
            ? `${angebotHref}#handwerker-partner`
            : undefined,
    },
  ]
}

export function LeadNaechsteSchritteCard({
  steps,
  onStepClick,
}: {
  steps: LeadSchritt[]
  onStepClick?: (step: LeadSchritt) => void
}) {
  return (
    <Card
      collapsible
      title={
        <>
          <ListChecks className="h-4 w-4 text-bw-primary" aria-hidden />
          Nächste Schritte
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
                className="detail-step detail-step-btn"
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
