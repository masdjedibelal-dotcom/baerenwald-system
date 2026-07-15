'use client'

import { Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'

export function AngebotWizardVersandEmpfaengerCard({
  mailTo,
  onMailToChange,
  mailCc,
  onMailCcChange,
  disabled,
  dokumentLabel = 'Angebot',
}: {
  mailTo: string[]
  onMailToChange: (emails: string[]) => void
  mailCc: string[]
  onMailCcChange: (emails: string[]) => void
  disabled?: boolean
  dokumentLabel?: string
}) {
  return (
    <Card
      title={
        <>
          <Mail className="h-3.5 w-3.5 shrink-0 text-bw-text-muted" aria-hidden />
          E-Mail-Empfänger
        </>
      }
    >
      <p className="mb-3 text-[12.5px] leading-relaxed text-bw-text-muted">
        Prüfen Sie An und CC, bevor Sie das {dokumentLabel} versenden. Weitere Adressen per Eingabe
        und Enter hinzufügen — entfernen per Klick auf das × in der Pille.
      </p>
      <div className="space-y-3">
        <EmailPillsField
          label="An"
          required
          emails={mailTo}
          onChange={onMailToChange}
          placeholder="kunde@beispiel.de"
          hint="Mindestens eine Empfänger-Adresse"
          disabled={disabled}
        />
        <EmailPillsField
          label="CC"
          emails={mailCc}
          onChange={onMailCcChange}
          placeholder="weitere@beispiel.de"
          hint={`Optional — ${KUNDE_MAIL_BCC_HINT}`}
          disabled={disabled}
        />
      </div>
    </Card>
  )
}
