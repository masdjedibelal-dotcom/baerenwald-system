'use client'

import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'
import {
  aktuelleMahnstufeNummer,
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
  const aktuelle = aktuelleMahnstufeNummer(rechnung)
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

  const statusHint =
    aktuelle === 0
      ? 'Noch keine Mahnung versendet'
      : aktuelle === 3
        ? 'Interne Warnung aktiv'
        : `Aktuelle Mahnstufe ${aktuelle}`

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
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
        Alle Mahnstufen gehören zur Rechnung{' '}
        <strong>{rechnung.rechnungsnummer?.trim() || '—'}</strong> — es werden keine separaten
        Rechnungen angelegt.
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>{statusHint}</p>

      <Timeline items={timelineItems} />

      {mahnMails.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--text-4)',
              marginBottom: 8,
            }}
          >
            <MockIcon ctx="default" n="mail" size={13} />
            Versandte Mahn-E-Mails
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mahnMails.map((m) => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                  {m.betreff}
                </span>
                <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-3)' }}>
                  {formatZeitpunkt(m.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </MockCard>
  )
}
