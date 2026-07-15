'use client'

import { useRef, type ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
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

function FunnelProp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{children}</div>
    </div>
  )
}

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
    <Card
      collapsible={false}
      title="Projekt-Übersicht"
      action={
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
        {anfrageTyp ? <FunnelProp label="Anfrageart">{anfrageTyp}</FunnelProp> : null}
        <FunnelProp label="Situation">{sitLabel}</FunnelProp>
        <FunnelProp label="Bereiche">{bereicheAnzeige}</FunnelProp>

        {groessenEntries.map(([bereich, wert]) => (
          <FunnelProp key={bereich} label={groessePropLabel(bereich)}>
            {groesseDisplay(bereich, wert, norm.groessen_einheiten[bereich])}
          </FunnelProp>
        ))}

        {fachdetailRows.map((entry) => (
          <FunnelProp
            key={entry.configKey}
            label={fachdetailPropLabel(entry.configKey, bereiche)}
          >
            {entry.values
              .map((v) => fachdetailDisplayLabel(entry.configKey, v))
              .filter(Boolean)
              .join(', ')}
          </FunnelProp>
        ))}

        <FunnelProp label="PLZ">{plzAnzeige}</FunnelProp>
        <FunnelProp label="Kundentyp">{ktLabel || '—'}</FunnelProp>
        <FunnelProp label="Zeitraum">{zeitraumAnzeige}</FunnelProp>
        {norm.labels.dringlichkeit &&
        norm.labels.dringlichkeit !== norm.labels.zeitraum &&
        norm.labels.dringlichkeit !== zeitraumAnzeige ? (
          <FunnelProp label="Dringlichkeit">{norm.labels.dringlichkeit}</FunnelProp>
        ) : null}
        {norm.labels.zugaenglichkeit ? (
          <FunnelProp label="Zugänglichkeit">{norm.labels.zugaenglichkeit}</FunnelProp>
        ) : null}
        {norm.labels.umfang ? (
          <FunnelProp label="Umfang / Rhythmus">{norm.labels.umfang}</FunnelProp>
        ) : null}
        <FunnelProp label="Preisrahmen">
          <span className={hatPreis ? 'font-semibold text-bw-primary' : ''}>
            {budgetAnzeige}
          </span>
        </FunnelProp>
        <FunnelProp label="Quelle">{quelleAnzeige}</FunnelProp>
        <FunnelProp label="Eingegangen">
          {lead.created_at ? formatDatumZeit(lead.created_at) : '—'}
        </FunnelProp>

        {norm.labels.zustand ? (
          <FunnelProp label="Zustand">{norm.labels.zustand}</FunnelProp>
        ) : null}
      </div>

      <LeadProjektWasBlock
        ref={wasBlockRef}
        lead={lead}
        gewerke={gewerke}
        preislisten={preislisten}
        onSaved={onSaved}
      />
    </Card>
  )
}
