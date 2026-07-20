'use client'

import type { ReactNode } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { formatEurRange } from '@/lib/angebote/angebot-wizard-types'
import { formatDatum } from '@/lib/utils'

export type ProjektUebersichtExtraRow = {
  label: string
  children: ReactNode
}

export function MockProjektUebersichtCard({
  title = 'Projekt-Übersicht',
  projekt,
  beschreibung,
  region,
  preisMin,
  preisMax,
  preisrahmenLabel,
  quelle,
  startDatum,
  endDatum,
  fortschritt,
  /** Live-Funnel & Co. — gleiches `.prop`-Design, nach Beschreibung */
  extraRows,
  /** Zusätzliche Zeilen nach Quelle (z. B. Eingegangen) */
  footerRows,
}: {
  title?: string
  projekt: string
  beschreibung?: string | null
  region?: string | null
  preisMin?: number | null
  preisMax?: number | null
  /** Fertiger Anzeige-String (z. B. wenn kein Min/Max-Zahlenpaar) */
  preisrahmenLabel?: string | null
  quelle?: string | null
  startDatum?: string | null
  endDatum?: string | null
  fortschritt?: number | null
  extraRows?: ProjektUebersichtExtraRow[]
  footerRows?: ProjektUebersichtExtraRow[]
}) {
  const preisrahmen =
    preisrahmenLabel?.trim() ||
    (preisMin != null && preisMax != null ? formatEurRange(preisMin, preisMax) : null)
  const zeitraum =
    startDatum && endDatum
      ? `${formatDatum(startDatum)} – ${formatDatum(endDatum)}`
      : startDatum
        ? formatDatum(startDatum)
        : null

  return (
    <MockCard title={title} icon="clipboard-list">
      <div className="props">
        <MockProp label="Projekt">{projekt}</MockProp>
        {beschreibung?.trim() ? (
          <MockProp label="Beschreibung">{beschreibung.trim()}</MockProp>
        ) : null}
        {(extraRows ?? []).map((row, i) => (
          <MockProp key={`extra-${i}-${row.label}`} label={row.label}>
            {row.children}
          </MockProp>
        ))}
        {region && region !== '—' ? <MockProp label="Region">{region}</MockProp> : null}
        {preisrahmen ? (
          <MockProp label="Preisrahmen">
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>{preisrahmen}</span>
          </MockProp>
        ) : null}
        {quelle ? <MockProp label="Quelle">{quelle}</MockProp> : null}
        {zeitraum ? <MockProp label="Zeitraum">{zeitraum}</MockProp> : null}
        {fortschritt != null ? <MockProp label="Fortschritt">{fortschritt} %</MockProp> : null}
        {(footerRows ?? []).map((row, i) => (
          <MockProp key={`footer-${i}-${row.label}`} label={row.label}>
            {row.children}
          </MockProp>
        ))}
      </div>
    </MockCard>
  )
}
