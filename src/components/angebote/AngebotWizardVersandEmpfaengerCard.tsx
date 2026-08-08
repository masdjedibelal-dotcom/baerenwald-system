'use client'

import { Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
export function AngebotWizardVersandEmpfaengerCard({
  mailTo,
  onMailToChange,
  mailCc,
  onMailCcChange,
  disabled,
}: {
  mailTo: string[]
  onMailToChange: (emails: string[]) => void
  mailCc: string[]
  onMailCcChange: (emails: string[]) => void
  disabled?: boolean
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
          disabled={disabled}
        />
      </div>
    </Card>
  )
}
