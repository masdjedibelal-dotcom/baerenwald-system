'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { AuftragAuftragdetailsTab } from '@/components/auftraege/AuftragDetailsTab'
import { VorgangZahlungTab } from '@/components/vorgang/VorgangZahlungTab'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { auftragSummenAusPositionen } from '@/lib/rechnungen/zahlungsplan'
import type {
  RechnungAuswahlZeile,
  RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'
import type { AuftragDetail, LeadDetail, Rechnung } from '@/lib/types'
import type { RechnungErstellenOpts } from '@/components/vorgang/VorgangZahlungTab'

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

function detailToAuswahlZeile(detail: Rechnung): RechnungAuswahlZeile {
  const extra = detail as Rechnung & {
    rechnung_art?: string | null
    abschlag_index?: number | null
    zahlungsplan_abschlag_id?: string | null
  }
  return {
    id: detail.id,
    rechnungsnummer: detail.rechnungsnummer ?? '',
    status: detail.status,
    brutto: detail.brutto,
    rechnungsdatum: detail.rechnungsdatum ?? null,
    faellig_am: detail.faellig_am,
    pdf_url: detail.pdf_url,
    gesendet_at: detail.gesendet_at,
    rechnung_art: extra.rechnung_art ?? null,
    abschlag_index: extra.abschlag_index ?? null,
    zahlungsplan_abschlag_id: extra.zahlungsplan_abschlag_id ?? null,
    beleg_typ: detail.beleg_typ ?? null,
    bezug_rechnung_id: detail.bezug_rechnung_id ?? null,
    created_at: detail.created_at,
    erinnerung_7_sent_at: detail.erinnerung_7_sent_at,
    erinnerung_21_sent_at: detail.erinnerung_21_sent_at,
    intern_warnung_30_at: detail.intern_warnung_30_at,
    reklamation_am: detail.reklamation_am,
    reklamation_grund: detail.reklamation_grund,
  }
}

/** Zahlung-Tab auf der Rechnung — Mock: Tabelle + RateDrawer rechts. */
export function RechnungZahlplanTab({
  detail,
  auftragDetail,
  rechnungen,
  fallbackTitel,
  onEditInvoice,
  onOpenWizard,
  onCreateInvoice,
  onRefresh,
}: {
  detail: Rechnung
  auftragDetail: AuftragDetail | null
  rechnungen: RechnungAuswahlZeile[]
  fallbackTitel?: string | null
  onEditInvoice?: (rechnungId: string) => void
  onOpenWizard?: (bootstrap: RechnungWizardBootstrap) => void
  onCreateInvoice?: (opts?: RechnungErstellenOpts) => void
  onRefresh?: () => void
}) {
  const mergedRechnungen = useMemo(() => {
    const map = new Map<string, RechnungAuswahlZeile>()
    for (const r of rechnungen) map.set(r.id, r)
    const self = detailToAuswahlZeile(detail)
    const existing = map.get(detail.id)
    map.set(detail.id, existing ? { ...self, ...existing } : self)
    return Array.from(map.values()).sort((a, b) => {
      const da = a.created_at ? Date.parse(a.created_at) : 0
      const db = b.created_at ? Date.parse(b.created_at) : 0
      return da - db
    })
  }, [rechnungen, detail])

  const planRaw = (() => {
    if (!auftragDetail) return null
    const ang = Array.isArray(auftragDetail.angebote)
      ? auftragDetail.angebote[0]
      : auftragDetail.angebote
    return (ang as { zahlungsplan?: unknown } | null | undefined)?.zahlungsplan ?? null
  })()

  const gesamtNetto = (() => {
    if (!auftragDetail) return Number(detail.netto ?? 0) || 0
    const ap = auftragDetail.auftrag_positionen ?? []
    if (ap.length) {
      return auftragSummenAusPositionen(auftragPositionenToAngebotPositionen(ap)).netto
    }
    const ang = Array.isArray(auftragDetail.angebote)
      ? auftragDetail.angebote[0]
      : auftragDetail.angebote
    const raw = (ang as { positionen?: unknown } | null)?.positionen
    return auftragSummenAusPositionen(normalizeAngebotPositionen(raw)).netto
  })()

  return (
    <VorgangZahlungTab
      variant="rechnung"
      auftragId={auftragDetail?.id ?? detail.auftrag_id}
      zahlungsplanRaw={planRaw}
      gesamtNetto={gesamtNetto}
      gesamtBruttoHint={Number(detail.brutto ?? 0) || null}
      rechnungen={mergedRechnungen}
      aktuelleRechnungId={detail.id}
      fallbackTitel={fallbackTitel}
      onEditInvoice={onEditInvoice}
      onOpenWizard={onOpenWizard}
      onCreateInvoice={onCreateInvoice}
      onRefresh={onRefresh}
      readOnly={false}
    />
  )
}
