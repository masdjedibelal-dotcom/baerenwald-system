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
    hatTermin?: boolean
    hatAngenommenesAngebot?: boolean
    angenommenAngebotHref?: string
    auftragId?: string
    /** Letztes Angebot: Partner-Pipeline abgeschlossen */
    handwerkerErledigt?: boolean
    /** Angebot an Kunden versendet */
    angebotAnKundeGesendet?: boolean
    angebotHref?: string
    onTerminClick?: () => void
    onAngebotVorbereiten?: () => void
    onHandwerkerEinholen?: () => void
    onAngebotAnKunde?: () => void
  }
): LeadSchritt[] {
  const {
    angeboteCount,
    hatTermin = false,
    hatAngenommenesAngebot = false,
    angenommenAngebotHref,
    auftragId,
    handwerkerErledigt = false,
    angebotAnKundeGesendet = false,
    angebotHref,
    onTerminClick,
    onAngebotVorbereiten,
    onHandwerkerEinholen,
    onAngebotAnKunde,
  } = opts
  const hasEntwurf = angeboteCount > 0 || status === 'angebot' || status === 'auftrag' || status === 'abgeschlossen'
  const auftragDone = status === 'auftrag' || status === 'abgeschlossen'

  return [
    {
      id: 'termin',
      label: 'Termin vereinbaren',
      dateLabel: hatTermin ? 'Erledigt' : 'Heute',
      done: hatTermin,
      onClick: hatTermin ? undefined : onTerminClick,
    },
    {
      id: 'angebot_vorbereiten',
      label: 'Angebot vorbereiten',
      dateLabel: hasEntwurf ? 'Erledigt' : 'Heute',
      done: hasEntwurf,
      onClick: hasEntwurf ? undefined : onAngebotVorbereiten,
    },
    {
      id: 'handwerker_angebot',
      label: 'Handwerker-Angebot / Rechnung einholen',
      dateLabel: handwerkerErledigt ? 'Erledigt' : hasEntwurf ? 'Als Nächstes' : '—',
      done: handwerkerErledigt,
      onClick: handwerkerErledigt || !hasEntwurf ? undefined : onHandwerkerEinholen,
      href: handwerkerErledigt || !hasEntwurf ? undefined : angebotHref ? `${angebotHref}#handwerker-partner` : undefined,
    },
    {
      id: 'angebot_kunde',
      label: 'Angebot an Kunden senden',
      dateLabel: angebotAnKundeGesendet ? 'Erledigt' : handwerkerErledigt ? 'Als Nächstes' : '—',
      done: angebotAnKundeGesendet,
      onClick:
        angebotAnKundeGesendet || !handwerkerErledigt ? undefined : onAngebotAnKunde,
      href:
        angebotAnKundeGesendet || !handwerkerErledigt
          ? undefined
          : angebotHref
            ? `${angebotHref}#angebot-versand-kunde`
            : undefined,
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
  const angebotStep = steps.find((s) => s.id === 'angebot_vorbereiten')
  const handwerkerStep = steps.find((s) => s.id === 'handwerker_angebot')
  const kundeStep = steps.find((s) => s.id === 'angebot_kunde')
  /** Kein zweiter Vollbreiten-Button, wenn ein offener Schritt schon klickbar ist. */
  const showQuick =
    onQuickAngebot &&
    ((angebotStep && !angebotStep.done && !angebotStep.onClick && !angebotStep.href) ||
      (handwerkerStep && !handwerkerStep.done && !handwerkerStep.onClick && !handwerkerStep.href) ||
      (kundeStep && !kundeStep.done && !kundeStep.onClick && !kundeStep.href))

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
            Angebot vorbereiten
          </button>
        ) : null}
      </div>
    </Card>
  )
}
