'use client'

import Link from 'next/link'
import { Check, FileText, ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { LeadStatus } from '@/lib/types'

export type LeadSchritt = {
  id: string
  label: string
  dateLabel: string
  done: boolean
  href?: string
  onClick?: () => void
}

export function buildLeadNaechsteSchritte(
  status: LeadStatus,
  opts: {
    angeboteCount: number
    hatAngenommenesAngebot?: boolean
    angenommenAngebotHref?: string
    auftragId?: string
    leadId: string
    onAngebotClick?: () => void
  }
): LeadSchritt[] {
  const {
    angeboteCount,
    hatAngenommenesAngebot = false,
    angenommenAngebotHref,
    auftragId,
    leadId,
    onAngebotClick,
  } = opts
  const hasAngebot =
    angeboteCount > 0 || status === 'angebot' || status === 'auftrag' || status === 'abgeschlossen'
  const auftragDone = status === 'auftrag' || status === 'abgeschlossen'

  return [
    {
      id: 'angebot',
      label: 'Angebot erstellen',
      dateLabel: hasAngebot ? 'Erledigt' : 'Heute',
      done: hasAngebot,
      href: hasAngebot ? undefined : onAngebotClick ? undefined : `/angebote/neu?lead_id=${leadId}`,
      onClick: hasAngebot ? undefined : onAngebotClick,
    },
    {
      id: 'angebot_angenommen',
      label: 'Angebot angenommen',
      dateLabel: hatAngenommenesAngebot ? 'Erledigt' : '—',
      done: hatAngenommenesAngebot,
      href: hatAngenommenesAngebot ? angenommenAngebotHref : undefined,
    },
    {
      id: 'auftrag',
      label: 'Auftragsbestätigung',
      dateLabel: auftragDone ? 'Erledigt' : '—',
      done: auftragDone,
      href: auftragId ? `/auftraege/${auftragId}` : undefined,
    },
  ]
}

export function LeadNaechsteSchritteCard({
  steps,
  onStepClick,
  onQuickAngebot,
}: {
  steps: LeadSchritt[]
  onStepClick?: (step: LeadSchritt) => void
  onQuickAngebot?: () => void
}) {
  const angebotStep = steps.find((s) => s.id === 'angebot')
  /** Kein zweiter Vollbreiten-Button, wenn der Schritt „Angebot erstellen“ schon klickbar ist. */
  const showQuick =
    onQuickAngebot &&
    angebotStep &&
    !angebotStep.done &&
    !angebotStep.onClick &&
    !angebotStep.href

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
        {showQuick ? (
          <button
            type="button"
            className="btn btn-primary btn-sm mt-1 inline-flex gap-1.5 self-start"
            onClick={onQuickAngebot}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Angebot erstellen
          </button>
        ) : null}
      </div>
    </Card>
  )
}
