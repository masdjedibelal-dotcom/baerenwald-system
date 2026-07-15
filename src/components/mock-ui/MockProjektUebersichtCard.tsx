'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { formatEurRange } from '@/lib/angebote/angebot-wizard-types'
import { formatDatum } from '@/lib/utils'

export function MockProjektUebersichtCard({
  projekt,
  region,
  preisMin,
  preisMax,
  quelle,
  startDatum,
  endDatum,
  fortschritt,
}: {
  projekt: string
  region?: string | null
  preisMin?: number | null
  preisMax?: number | null
  quelle?: string | null
  startDatum?: string | null
  endDatum?: string | null
  fortschritt?: number | null
}) {
  const preisrahmen =
    preisMin != null && preisMax != null ? formatEurRange(preisMin, preisMax) : null
  const zeitraum =
    startDatum && endDatum
      ? `${formatDatum(startDatum)} – ${formatDatum(endDatum)}`
      : startDatum
        ? formatDatum(startDatum)
        : null

  return (
    <MockCard title="Projekt-Übersicht" icon="clipboard-list">
      <div className="props">
        <MockProp label="Projekt">{projekt}</MockProp>
        {region ? <MockProp label="Region">{region}</MockProp> : null}
        {preisrahmen ? (
          <MockProp label="Preisrahmen">
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{preisrahmen}</span>
          </MockProp>
        ) : null}
        {quelle ? <MockProp label="Quelle">{quelle}</MockProp> : null}
        {zeitraum ? <MockProp label="Zeitraum">{zeitraum}</MockProp> : null}
        {fortschritt != null ? <MockProp label="Fortschritt">{fortschritt} %</MockProp> : null}
      </div>
    </MockCard>
  )
}
