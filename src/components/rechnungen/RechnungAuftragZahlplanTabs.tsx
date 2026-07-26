'use client'

import Link from 'next/link'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { AuftragAuftragdetailsTab } from '@/components/auftraege/AuftragDetailsTab'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import {
  auftragSummenAusPositionen,
  berechneZahlungsplan,
  parseZahlungsplan,
  rechnungFuerAbschlagZeile,
  zahlplanRateStatus,
} from '@/lib/rechnungen/zahlungsplan'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { AuftragDetail, LeadDetail } from '@/lib/types'
import { formatDatum } from '@/lib/utils'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'

function rateBadge(st: 'geplant' | 'gestellt' | 'bezahlt') {
  if (st === 'bezahlt') return <MockBadge kind={hubSpotStatusToMockBadgeKind('order')}>Bezahlt</MockBadge>
  if (st === 'gestellt') return <MockBadge kind={hubSpotStatusToMockBadgeKind('offer')}>Gestellt</MockBadge>
  return <MockBadge kind={hubSpotStatusToMockBadgeKind('done')}>Geplant</MockBadge>
}

/** Read-only Auftragskontext auf der Rechnung. */
export function RechnungAuftragdetailsTab({
  auftragDetail,
  lead,
}: {
  auftragDetail: AuftragDetail | null
  lead?: LeadDetail | null
}) {
  if (!auftragDetail) {
    return (
      <MockEmpty
        icon="briefcase"
        title="Kein Auftrag verknüpft"
        hint="Diese Rechnung ist keinem Auftrag zugeordnet."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={`/auftraege/${auftragDetail.id}`}>
          <MockBtn sm kind="ghost" icon="external-link">
            Zum Auftrag
          </MockBtn>
        </Link>
      </div>
      <AuftragAuftragdetailsTab detail={auftragDetail} lead={lead} editable={false} />
    </div>
  )
}

/** Zahlplan des Auftrags auf der Rechnung (Übersicht + Links). */
export function RechnungZahlplanTab({
  auftragDetail,
  rechnungen,
  aktuelleRechnungId,
}: {
  auftragDetail: AuftragDetail | null
  rechnungen: RechnungAuswahlZeile[]
  aktuelleRechnungId?: string
}) {
  if (!auftragDetail) {
    return (
      <MockEmpty
        icon="calculator"
        title="Kein Zahlplan"
        hint="Ohne Auftrag gibt es keinen Abschlagsplan."
      />
    )
  }

  const plan = parseZahlungsplan((auftragDetail as { zahlungsplan?: unknown }).zahlungsplan)
  const ap = auftragDetail.auftrag_positionen ?? []
  let gesamtNetto = 0
  if (ap.length) {
    gesamtNetto = auftragSummenAusPositionen(auftragPositionenToAngebotPositionen(ap)).netto
  } else {
    const ang = Array.isArray(auftragDetail.angebote)
      ? auftragDetail.angebote[0]
      : auftragDetail.angebote
    const raw = (ang as { positionen?: unknown } | null)?.positionen
    gesamtNetto = auftragSummenAusPositionen(normalizeAngebotPositionen(raw)).netto
  }

  if (!plan?.zeilen?.length) {
    return (
      <MockCard title="Zahlplan" icon="calculator">
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
          Für diesen Auftrag ist noch kein Abschlagsplan hinterlegt.
        </p>
        <div style={{ marginTop: 12 }}>
          <Link href={`/auftraege/${auftragDetail.id}?tab=finanzen`}>
            <MockBtn sm kind="primary" icon="calculator">
              Zum Auftrag · Zahlung
            </MockBtn>
          </Link>
        </div>
      </MockCard>
    )
  }

  const links = rechnungen.map((r) => ({
    id: r.id,
    brutto: r.brutto,
    status: r.status,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id,
    rechnung_art: r.rechnung_art,
    abschlag_index: r.abschlag_index,
    faellig_am: r.faellig_am,
  }))

  const kontext = berechneZahlungsplan(plan, gesamtNetto)

  return (
    <MockCard
      title="Zahlplan"
      icon="calculator"
      actions={
        <Link href={`/auftraege/${auftragDetail.id}?tab=finanzen`}>
          <MockBtn sm kind="ghost" icon="external-link">
            Im Auftrag öffnen
          </MockBtn>
        </Link>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {kontext.zeilen.map((z) => {
          const st = zahlplanRateStatus(z.id, links)
          const r = rechnungFuerAbschlagZeile(z.id, links)
          const aktiv = r?.id === aktuelleRechnungId
          return (
            <div
              key={z.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 10,
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 10,
                border: aktiv ? '1.5px solid var(--green)' : '0.5px solid var(--border)',
                background: aktiv ? 'var(--green-50)' : 'var(--card)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{z.titel}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {formatEurBetrag(Number(r?.brutto ?? z.brutto) || 0)}
                  {z.faellig_am ? ` · fällig ${formatDatum(z.faellig_am)}` : ''}
                </div>
              </div>
              <div>{rateBadge(st)}</div>
              <div>
                {r ? (
                  <Link href={`/rechnungen/${r.id}`}>
                    <MockBtn sm kind="ghost" icon="eye">
                      {aktiv ? 'Diese RE' : 'Öffnen'}
                    </MockBtn>
                  </Link>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-4)' }}>—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </MockCard>
  )
}
