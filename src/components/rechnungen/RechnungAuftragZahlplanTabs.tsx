'use client'

import Link from 'next/link'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { AuftragAuftragdetailsTab } from '@/components/auftraege/AuftragDetailsTab'
import { VorgangZahlungTab } from '@/components/vorgang/VorgangZahlungTab'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { AuftragDetail, LeadDetail } from '@/lib/types'

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

/** Zahlung-Tab auf der Rechnung — gleiche drei Zustände wie Auftrag (Phase 7). */
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

  const planRaw = (() => {
    const ang = Array.isArray(auftragDetail.angebote)
      ? auftragDetail.angebote[0]
      : auftragDetail.angebote
    return (ang as { zahlungsplan?: unknown } | null | undefined)?.zahlungsplan
  })()

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

  return (
    <VorgangZahlungTab
      variant="rechnung"
      auftragId={auftragDetail.id}
      zahlungsplanRaw={planRaw}
      gesamtNetto={gesamtNetto}
      rechnungen={rechnungen}
      aktuelleRechnungId={aktuelleRechnungId}
      readOnly
    />
  )
}
