'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import Link from 'next/link'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  korrekturKetteMemberRoleLabel,
  type RechnungKorrekturKetteUi,
} from '@/lib/rechnungen/rechnung-korrektur'
import { rechnungStatusDisplay } from '@/lib/status/status-display'
import { cn } from '@/lib/utils'

function memberBadgeKind(status: string): 'storniert' | 'neu' | 'aktiv' | 'warten' | 'plain' {
  const s = status.toLowerCase()
  if (s === 'storniert') return 'storniert'
  if (s === 'entwurf') return 'neu'
  if (s === 'bezahlt') return 'aktiv'
  if (s === 'gesendet' || s === 'versendet') return 'warten'
  return 'plain'
}

function memberStatusLabel(
  m: RechnungKorrekturKetteUi['members'][number],
  pending: boolean
): string {
  if (m.role === 'original' && m.status.toLowerCase() !== 'storniert' && pending) {
    return 'Wird ersetzt'
  }
  if (m.role === 'neu' && m.status.toLowerCase() === 'entwurf') {
    return 'Korrektur Entwurf'
  }
  if (
    m.role === 'neu' &&
    (m.status.toLowerCase() === 'gesendet' || m.status.toLowerCase() === 'versendet')
  ) {
    return 'Korrektur versendet'
  }
  return rechnungStatusDisplay(m.status, {
    korrektur_von: m.role === 'neu' ? 'x' : null,
  }).label
}

/**
 * Korrektur-Verlauf — wie Phasenverlauf: Text links, Betrag, Status rechts.
 * Mehrstufige Korrekturen (nochmals korrigieren) als fortlaufende Zeilen.
 */
export function RechnungKorrekturKetteCard({
  kette,
}: {
  kette: RechnungKorrekturKetteUi
}) {
  return (
    <MockCard
      title="Korrektur"
      icon="arrows-exchange"
      className="dshell-framed"
      actions={
        kette.pending ? (
          <MockBadge kind="neu">Korrektur Entwurf</MockBadge>
        ) : (
          <MockBadge kind="warten">Korrektur versendet</MockBadge>
        )
      }
    >
      <ul className="re-kette-list">
        {kette.members.map((m) => {
          const nr =
            m.rechnungsnummer?.trim() ||
            (m.role === 'gutschrift' ? 'Gutschrift' : 'Rechnung')
          const betrag =
            m.brutto != null && Number.isFinite(m.brutto)
              ? formatEurBetrag(m.brutto)
              : '—'
          const roleLabel = korrekturKetteMemberRoleLabel(m.role, m.wave)
          return (
            <li
              key={m.id}
              className={cn('re-kette-row', m.current && 're-kette-row--current')}
            >
              <div className="re-kette-text">
                <span className="re-kette-role">{roleLabel}</span>
                {m.current ? (
                  <span className="re-kette-nr">
                    {nr}
                    <span className="re-kette-here"> (diese)</span>
                  </span>
                ) : (
                  <Link href={`/rechnungen/${m.id}`} className="re-kette-nr re-kette-nr--link">
                    {nr}
                  </Link>
                )}
              </div>
              <span className="re-kette-betrag">{betrag}</span>
              <span className="re-kette-status">
                <MockBadge kind={memberBadgeKind(m.status)}>
                  {memberStatusLabel(m, kette.pending)}
                </MockBadge>
              </span>
            </li>
          )
        })}
      </ul>
    </MockCard>
  )
}
