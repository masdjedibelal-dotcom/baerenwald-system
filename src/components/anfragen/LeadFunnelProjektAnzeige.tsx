'use client'

import { useRef } from 'react'
import { Pencil } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import {
  LeadProjektWasBlock,
  type LeadProjektWasBlockHandle,
} from '@/components/anfragen/LeadProjektWasBlock'
import {
  anfrageTypAnzeige,
  fachdetailDisplayLabel,
  fachdetailPropLabel,
  fachdetailsForProjektUebersicht,
  groesseDisplay,
  normalizeFunnelDaten,
} from '@/lib/lead-funnel-daten'
import { groessePropLabel } from '@/lib/vorab-formular-config'
import { kundentypLabel, resolveLeadPreisAnzeige, zeitraumLabel } from '@/lib/lead-display-helpers'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import type { Gewerk, LeadDetail, Preisliste } from '@/lib/types'
import {
  BEREICH_LABELS,
  KANAL_LABELS,
  formatDatum,
  formatDatumZeit,
} from '@/lib/utils'

import { MockProp } from '@/components/mock-ui/MockProp'

function resolveZeitraumAnzeige(
  lead: LeadDetail,
  normZeitraumLabel: string | null,
  normDringlichkeitLabel: string | null
): string {
  if (lead.zeitraum_von && lead.zeitraum_bis) {
    return `${formatDatum(lead.zeitraum_von)} – ${formatDatum(lead.zeitraum_bis)}`
  }
  if (lead.zeitraum_von) return formatDatum(lead.zeitraum_von)

  if (normZeitraumLabel) return normZeitraumLabel
  if (normDringlichkeitLabel) return normDringlichkeitLabel

  return zeitraumLabel(lead.zeitraum)
}

export function LeadFunnelProjektAnzeige({
  lead,
  gewerke = [],
  preislisten = [],
  onSaved,
}: {
  lead: LeadDetail
  gewerke?: Gewerk[]
  preislisten?: Preisliste[]
  onSaved?: () => void
}) {
  const wasBlockRef = useRef<LeadProjektWasBlockHandle>(null)

  let norm
  try {
    norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche)
  } catch (e) {
    console.error('[LeadFunnelProjektAnzeige]', e)
    return (
      <p className="text-[13px] text-bw-text-muted">
        Projektdaten konnten nicht geladen werden.
      </p>
    )
  }

  const bereiche = bereicheFuerAnzeige(
    norm.bereiche.length ? norm.bereiche : lead.bereiche,
    lead.situation
  )
  const sitLabel = norm.labels.situation || '—'

  const zeitraumAnzeige = resolveZeitraumAnzeige(
    lead,
    norm.labels.zeitraum,
    norm.labels.dringlichkeit
  )

  const budgetAnzeige = resolveLeadPreisAnzeige(
    lead.kanal,
    lead.budget_ca,
    lead.preis_min,
    lead.preis_max,
    lead.funnel_daten
  )
  const hatPreis = budgetAnzeige !== '—'

  const groessenEntries = Object.entries(norm.groessen)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) =>
      (BEREICH_LABELS[a] ?? a).localeCompare(BEREICH_LABELS[b] ?? b, 'de')
    )

  const ktLabel =
    norm.labels.kundentyp ||
    kundentypLabel(norm.kundentyp ?? lead.kundentyp) ||
    kundentypLabel(lead.kundentyp)

  const bereicheAnzeige =
    norm.labels.bereiche.length > 0
      ? norm.labels.bereiche.join(', ')
      : bereiche.length > 0
        ? bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
        : '—'

  const plzAnzeige = lead.plz?.trim() || norm.plz || '—'

  const fachdetailRows = fachdetailsForProjektUebersicht(
    lead.funnel_daten as Record<string, unknown> | undefined,
    bereiche
  )

  const anfrageTyp =
    anfrageTypAnzeige(norm, lead) ||
    (norm.preis_modus === 'komplex' ? 'Individuell / Komplex' : null)

  const quelleAnzeige =
    lead.kanal === 'website' && norm.labels.funnel_quelle
      ? `${KANAL_LABELS[lead.kanal] ?? lead.kanal} · ${norm.labels.funnel_quelle}`
      : KANAL_LABELS[lead.kanal] ?? lead.kanal

  return (
    <MockCard
      collapsible
      title="Projekt-Übersicht"
      actions={
        <button
          type="button"
          onClick={() => wasBlockRef.current?.addLeistung()}
          className="btn btn-ghost btn-sm"
          aria-label="Leistung hinzufügen"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      }
    >
      <div className="props">
        {anfrageTyp ? <MockProp label="Anfrageart">{anfrageTyp}</MockProp> : null}
        <MockProp label="Situation">{sitLabel}</MockProp>
        <MockProp label="Bereiche">{bereicheAnzeige}</MockProp>

        {groessenEntries.map(([bereich, wert]) => (
          <MockProp key={bereich} label={groessePropLabel(bereich)}>
            {groesseDisplay(bereich, wert, norm.groessen_einheiten[bereich])}
          </MockProp>
        ))}

        {fachdetailRows.map((entry) => (
          <MockProp
            key={entry.configKey}
            label={fachdetailPropLabel(entry.configKey, bereiche)}
          >
            {entry.values
              .map((v) => fachdetailDisplayLabel(entry.configKey, v))
              .filter(Boolean)
              .join(', ')}
          </MockProp>
        ))}

        <MockProp label="PLZ">{plzAnzeige}</MockProp>
        <MockProp label="Kundentyp">{ktLabel || '—'}</MockProp>
        <MockProp label="Zeitraum">{zeitraumAnzeige}</MockProp>
        {norm.labels.dringlichkeit &&
        norm.labels.dringlichkeit !== norm.labels.zeitraum &&
        norm.labels.dringlichkeit !== zeitraumAnzeige ? (
          <MockProp label="Dringlichkeit">{norm.labels.dringlichkeit}</MockProp>
        ) : null}
        {norm.labels.zugaenglichkeit ? (
          <MockProp label="Zugänglichkeit">{norm.labels.zugaenglichkeit}</MockProp>
        ) : null}
        {norm.labels.umfang ? (
          <MockProp label="Umfang / Rhythmus">{norm.labels.umfang}</MockProp>
        ) : null}
        <MockProp label="Preisrahmen">
          <span className={hatPreis ? 'font-semibold text-bw-primary' : ''}>
            {budgetAnzeige}
          </span>
        </MockProp>
        <MockProp label="Quelle">{quelleAnzeige}</MockProp>
        <MockProp label="Eingegangen">
          {lead.created_at ? formatDatumZeit(lead.created_at) : '—'}
        </MockProp>

        {norm.labels.zustand ? (
          <MockProp label="Zustand">{norm.labels.zustand}</MockProp>
        ) : null}
      </div>

      <LeadProjektWasBlock
        ref={wasBlockRef}
        lead={lead}
        gewerke={gewerke}
        preislisten={preislisten}
        onSaved={onSaved}
      />
    </MockCard>
  )
}
