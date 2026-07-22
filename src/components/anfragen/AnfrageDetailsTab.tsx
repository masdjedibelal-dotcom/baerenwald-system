'use client'

import { useMemo } from 'react'
import {
  EntityProjektUebersichtCard,
  type ProjektUebersichtExtraRow,
} from '@/components/crm/EntityProjektUebersichtCard'
import { updateLeadBeschreibung } from '@/app/(dashboard)/anfragen/actions'
import {
  isEchterFreitext,
  kundentypLabel,
  resolveLeadPreisAnzeige,
  zeitraumLabel,
} from '@/lib/lead-display-helpers'
import {
  anfrageTypAnzeige,
  fachdetailDisplayLabel,
  fachdetailPropLabel,
  fachdetailsForProjektUebersicht,
  groesseDisplay,
  leadSituationDisplay,
  normalizeFunnelDaten,
} from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { groessePropLabel } from '@/lib/vorab-formular-config'
import type { LeadDetail } from '@/lib/types'
import { BEREICH_LABELS, formatDatum, formatDatumZeit } from '@/lib/utils'

function projektTitel(lead: LeadDetail): string {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (bereiche.length) {
    return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  }
  const sit = leadSituationDisplay(lead.situation)
  if (sit) return sit
  return 'Anfrage'
}

function beschreibungFromLead(lead: LeadDetail): string | null {
  if (isEchterFreitext(lead.kontakt_nachricht)) return lead.kontakt_nachricht!.trim()
  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object'
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}
  const note = typeof fd.beschreibung === 'string' ? fd.beschreibung.trim() : ''
  if (note) return note
  const note2 = typeof fd.note === 'string' ? fd.note.trim() : ''
  return note2 || null
}

function resolveZeitraumAnzeige(
  lead: LeadDetail,
  normZeitraumLabel: string | null,
  normDringlichkeitLabel: string | null
): string | null {
  if (lead.zeitraum_von && lead.zeitraum_bis) {
    return `${formatDatum(lead.zeitraum_von)} – ${formatDatum(lead.zeitraum_bis)}`
  }
  if (lead.zeitraum_von) return formatDatum(lead.zeitraum_von)

  if (normZeitraumLabel) return normZeitraumLabel
  if (normDringlichkeitLabel) return normDringlichkeitLabel

  const fromLead = zeitraumLabel(lead.zeitraum)
  return fromLead || null
}

/** Bedarf aus Funnel — ohne Region/Quelle (Stammdaten) und ohne Verkaufspreise. */
function buildBedarfExtraRows(lead: LeadDetail): {
  extraRows: ProjektUebersichtExtraRow[]
  footerRows: ProjektUebersichtExtraRow[]
} {
  let norm
  try {
    norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche)
  } catch (e) {
    console.error('[AnfrageDetailsTab] funnel', e)
    return {
      extraRows: [],
      footerRows: lead.created_at
        ? [{ label: 'Eingegangen', children: formatDatumZeit(lead.created_at) }]
        : [],
    }
  }

  const bereiche = bereicheFuerAnzeige(
    norm.bereiche.length ? norm.bereiche : lead.bereiche,
    lead.situation
  )
  const extraRows: ProjektUebersichtExtraRow[] = []

  const anfrageTyp =
    anfrageTypAnzeige(norm, lead) ||
    (norm.preis_modus === 'komplex' ? 'Individuell / Komplex' : null)
  if (anfrageTyp) extraRows.push({ label: 'Anfrageart', children: anfrageTyp })

  const sitLabel = (norm.labels.situation || leadSituationDisplay(lead.situation) || '').trim()
  if (sitLabel && sitLabel !== '—') {
    extraRows.push({ label: 'Situation', children: sitLabel })
  }

  const bereicheAnzeige =
    norm.labels.bereiche.length > 0
      ? norm.labels.bereiche.join(', ')
      : bereiche.length > 0
        ? bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
        : ''
  if (bereicheAnzeige) {
    extraRows.push({ label: 'Bereiche', children: bereicheAnzeige })
  }

  const groessenEntries = Object.entries(norm.groessen)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) =>
      (BEREICH_LABELS[a] ?? a).localeCompare(BEREICH_LABELS[b] ?? b, 'de')
    )
  for (const [bereich, wert] of groessenEntries) {
    extraRows.push({
      label: groessePropLabel(bereich),
      children: groesseDisplay(bereich, wert, norm.groessen_einheiten[bereich]),
    })
  }

  const fachdetailRows = fachdetailsForProjektUebersicht(
    lead.funnel_daten as Record<string, unknown> | undefined,
    bereiche
  )
  for (const entry of fachdetailRows) {
    const text = entry.values
      .map((v) => fachdetailDisplayLabel(entry.configKey, v))
      .filter(Boolean)
      .join(', ')
    if (!text) continue
    extraRows.push({
      label: fachdetailPropLabel(entry.configKey, bereiche),
      children: text,
    })
  }

  const ktLabel =
    norm.labels.kundentyp ||
    kundentypLabel(norm.kundentyp ?? lead.kundentyp) ||
    kundentypLabel(lead.kundentyp)
  if (ktLabel) extraRows.push({ label: 'Kundentyp', children: ktLabel })

  const zeitraumAnzeige = resolveZeitraumAnzeige(
    lead,
    norm.labels.zeitraum,
    norm.labels.dringlichkeit
  )
  if (zeitraumAnzeige) {
    extraRows.push({ label: 'Zeitraum', children: zeitraumAnzeige })
  }

  if (
    norm.labels.dringlichkeit &&
    norm.labels.dringlichkeit !== norm.labels.zeitraum &&
    norm.labels.dringlichkeit !== zeitraumAnzeige
  ) {
    extraRows.push({ label: 'Dringlichkeit', children: norm.labels.dringlichkeit })
  }

  if (norm.labels.zugaenglichkeit) {
    extraRows.push({ label: 'Zugänglichkeit', children: norm.labels.zugaenglichkeit })
  }
  if (norm.labels.umfang) {
    extraRows.push({ label: 'Umfang / Rhythmus', children: norm.labels.umfang })
  }
  if (norm.labels.zustand) {
    extraRows.push({ label: 'Zustand', children: norm.labels.zustand })
  }

  const footerRows: ProjektUebersichtExtraRow[] = []
  if (lead.created_at) {
    footerRows.push({ label: 'Eingegangen', children: formatDatumZeit(lead.created_at) })
  }

  return { extraRows, footerRows }
}

/** Anfrage: Bedarf (Funnel) — keine Positionen/Wunschliste in Details. */
export function AnfrageDetailsTab({
  lead,
  onSaved,
}: {
  lead: LeadDetail
  onSaved?: () => void
}) {
  const preisrahmen = resolveLeadPreisAnzeige(
    lead.kanal,
    lead.budget_ca,
    lead.preis_min,
    lead.preis_max,
    lead.funnel_daten
  )

  const bedarfUi = useMemo(() => buildBedarfExtraRows(lead), [lead])

  return (
    <EntityProjektUebersichtCard
      title="Anfrage"
      icon="inbox"
      initial={{
        titel: projektTitel(lead),
        beschreibung: beschreibungFromLead(lead) ?? '',
        startDatum: '',
        endDatum: '',
        istBauprojekt: false,
      }}
      editableFields={['beschreibung']}
      onSave={async (draft) => {
        const r = await updateLeadBeschreibung(lead.id, draft.beschreibung)
        if (r.ok) onSaved?.()
        return r
      }}
      preisrahmenLabel={preisrahmen === '—' ? null : preisrahmen}
      extraRows={bedarfUi.extraRows}
      footerRows={bedarfUi.footerRows}
    />
  )
}
