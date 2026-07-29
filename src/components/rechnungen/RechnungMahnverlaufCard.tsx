'use client'

import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import {
  buildRechnungMahnverlauf,
  naechsteZahlungserinnerungStufe,
  type RechnungMahnKontext,
} from '@/lib/rechnungen/mahnverlauf'
import { formatDatum } from '@/lib/utils'

export type RechnungMahnMailZeile = {
  id: string
  betreff: string
  created_at: string
}

function formatZeitpunkt(iso: string | null | undefined): string {
  if (!iso?.trim()) return 'Noch nicht'
  return formatDatum(iso.slice(0, 10))
}

export function RechnungMahnverlaufCard({
  rechnung,
  mahnMails = [],
  onSendErinnerung,
  onMailAnsehen,
  empty,
}: {
  rechnung: RechnungMahnKontext & { rechnungsnummer?: string | null }
  mahnMails?: RechnungMahnMailZeile[]
  onSendErinnerung?: (stufe: 1 | 2) => void
  onMailAnsehen?: (emailLogId: string) => void
  /** Wenn true: leerer Zustand (keine Mahnung relevant) */
  empty?: boolean
}) {
  const stufen = buildRechnungMahnverlauf(rechnung)
  const naechste = naechsteZahlungserinnerungStufe(rechnung)
  const stufe1Mail = mahnMails[0] ?? null
  const stufe2Mail = mahnMails[1] ?? null

  const timelineItems: TimelineItem[] = stufen.map((s) => {
    const mail =
      s.id === 'stufe1' ? stufe1Mail : s.id === 'stufe2' ? stufe2Mail : null

    return {
      id: s.id,
      text: s.label,
      time: s.sentAt
        ? `Versendet am ${formatZeitpunkt(s.sentAt)}${s.hint ? ` · ${s.hint}` : ''}`
        : s.state === 'active'
          ? `Als Nächstes${s.hint ? ` · ${s.hint}` : ''}`
          : s.hint ?? 'Noch nicht',
      state: s.state === 'skipped' ? 'open' : s.state,
      linkLabel: mail && onMailAnsehen ? 'E-Mail ansehen' : undefined,
      onLinkClick: mail && onMailAnsehen ? () => onMailAnsehen(mail.id) : undefined,
    }
  })

  if (empty) {
    return (
      <MockCard title="Mahnverlauf" icon="mail-forward">
        <MockEmpty
          icon="mail-forward"
          title="Kein Mahnverlauf"
          hint="Mahnungen erscheinen hier, sobald die Rechnung versendet und fällig ist."
        />
      </MockCard>
    )
  }

  return (
    <MockCard
      title="Mahnverlauf"
      icon="mail-forward"
      actions={
        naechste && onSendErinnerung ? (
          <MockBtn sm kind="primary" icon="alert-triangle" onClick={() => onSendErinnerung(naechste)}>
            {naechste === 1 ? '1. Erinnerung' : '2. Erinnerung'}
          </MockBtn>
        ) : null
      }
    >
      <Timeline items={timelineItems} />
    </MockCard>
  )
}
