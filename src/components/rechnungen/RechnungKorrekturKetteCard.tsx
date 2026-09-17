'use client'

import Link from 'next/link'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  korrekturKetteMemberRoleLabel,
  type RechnungKorrekturKetteUi,
} from '@/lib/rechnungen/rechnung-korrektur'
import { rechnungStatusDisplay } from '@/lib/status/status-display'
import { cn } from '@/lib/utils'

export function RechnungKorrekturKetteCard({
  kette,
}: {
  kette: RechnungKorrekturKetteUi
}) {
  return (
    <MockCard
      title="Korrektur-Kette"
      icon="arrows-exchange"
      className="dshell-framed"
      actions={
        kette.pending ? (
          <MockBadge kind="neu">Entwurf</MockBadge>
        ) : (
          <MockBadge kind="aktiv">Versendet</MockBadge>
        )
      }
    >
      <ul className="re-kette-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {kette.members.map((m) => {
          const status = rechnungStatusDisplay(m.status, {
            korrektur_von: m.role === 'neu' ? 'x' : null,
          })
          const nr =
            m.rechnungsnummer?.trim() ||
            (m.role === 'gutschrift' ? 'Gutschrift' : 'Rechnung')
          const betrag =
            m.brutto != null && Number.isFinite(m.brutto)
              ? formatEurBetrag(m.brutto)
              : null
          return (
            <li
              key={m.id}
              className={cn('re-kette-row', m.current && 're-kette-row--current')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: '0.5px solid var(--border)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--fs-meta)',
                  fontWeight: 600,
                  color: 'var(--text-3)',
                  minWidth: 110,
                }}
              >
                {korrekturKetteMemberRoleLabel(m.role)}
              </span>
              {m.current ? (
                <span style={{ flex: 1, fontWeight: 500, minWidth: 0 }}>
                  {nr}
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 'var(--fs-meta)',
                      color: 'var(--text-3)',
                      fontWeight: 500,
                    }}
                  >
                    (diese)
                  </span>
                </span>
              ) : (
                <Link
                  href={`/rechnungen/${m.id}`}
                  style={{
                    flex: 1,
                    fontWeight: 500,
                    minWidth: 0,
                    color: 'var(--text)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {nr}
                </Link>
              )}
              {betrag ? (
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--text-2)',
                  }}
                >
                  {betrag}
                </span>
              ) : null}
              <MockBadge
                kind={
                  m.status.toLowerCase() === 'storniert'
                    ? 'storniert'
                    : m.status.toLowerCase() === 'entwurf'
                      ? 'neu'
                      : m.status.toLowerCase() === 'bezahlt'
                        ? 'aktiv'
                        : m.status.toLowerCase() === 'gesendet' ||
                            m.status.toLowerCase() === 'versendet'
                          ? 'warten'
                          : 'plain'
                }
              >
                {m.role === 'original' &&
                m.status.toLowerCase() !== 'storniert' &&
                kette.pending
                  ? 'Wird ersetzt'
                  : status.label}
              </MockBadge>
            </li>
          )
        })}
      </ul>
      {kette.pending ? (
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-3)',
          }}
        >
          Original bleibt gültig, bis die Korrektur versendet wird.
        </p>
      ) : null}
    </MockCard>
  )
}
