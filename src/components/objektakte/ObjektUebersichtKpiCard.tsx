'use client'

import { MockBtn, MockUebersichtCard } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { DOC } from '@/lib/crm-labels'
import type { ObjektKpiSnapshot } from '@/lib/objektakte/compute-objekt-kpis'
import { formatEuro } from '@/lib/format/geld-datum'

export function ObjektUebersichtKpiCard({
  kpis,
  onHistorieClick,
  onBerichtClick,
}: {
  kpis: ObjektKpiSnapshot
  /** @deprecated ungenutzt — Kosten ohne Jahreszahl */
  jahr?: number
  onHistorieClick?: () => void
  onBerichtClick?: () => void
}) {
  return (
    <MockCard
      title="Kennzahlen"
      actions={
        onBerichtClick ? (
          <MockBtn sm kind="primary" icon="file-text" onClick={onBerichtClick}>
            {DOC.berichtErstellen}
          </MockBtn>
        ) : null
      }
      bodyClassName="space-y-4"
    >
      <MockUebersichtCard
        stats={[
          {
            icon: 'folders',
            label: 'Vorgänge gesamt',
            value: onHistorieClick ? (
              <MockBtn className="ueber-val-btn" type="button" onClick={onHistorieClick}>
                {kpis.vorgaengeGesamt}
              </MockBtn>
            ) : (
              kpis.vorgaengeGesamt
            ),
          },
          {
            icon: 'clock',
            label: 'Offen / in Arbeit',
            value: kpis.offenInArbeit,
          },
          {
            icon: 'euro',
            label: 'Gesamtkosten',
            value:
              kpis.kostenLaufendesJahr > 0
                ? `${formatEuro(kpis.kostenLaufendesJahr, { decimals: 0 })}`
                : '—',
          },
          {
            icon: 'tool',
            label: 'Anlagen im Register',
            value: kpis.anlagenAnzahl,
          },
        ]}
      />
    </MockCard>
  )
}
