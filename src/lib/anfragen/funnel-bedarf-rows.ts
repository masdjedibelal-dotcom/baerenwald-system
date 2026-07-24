import type { ProjektUebersichtExtraRow } from '@/components/crm/EntityProjektUebersichtCard'
import {
  kundentypLabel,
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
import { BEREICH_LABELS, formatDatum, formatDatumZeit } from '@/lib/utils'

export type FunnelBedarfLeadPick = {
  situation?: string | null
  bereiche?: string[] | null
  kundentyp?: string | null
  zeitraum?: string | null
  zeitraum_von?: string | null
  zeitraum_bis?: string | null
  funnel_daten?: unknown
  kanal?: string | null
  created_at?: string | null
  plz?: string | null
}

function resolveZeitraumAnzeige(
  lead: FunnelBedarfLeadPick,
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

function strFromFunnel(fd: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = fd[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/**
 * Bedarf/Funnel-Zeilen für Vorgangs-Details (Anfrage, Angebot, Auftrag).
 * Zeigt alle relevanten Staff-/Website-Funnel-Eingaben.
 */
export function buildFunnelBedarfExtraRows(lead: FunnelBedarfLeadPick): {
  extraRows: ProjektUebersichtExtraRow[]
  footerRows: ProjektUebersichtExtraRow[]
} {
  const fdRaw =
    lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}

  let norm
  try {
    norm = normalizeFunnelDaten(lead.funnel_daten, lead.bereiche)
  } catch (e) {
    console.error('[buildFunnelBedarfExtraRows]', e)
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
    anfrageTypAnzeige(norm, {
      situation: lead.situation,
      bereiche: lead.bereiche ?? undefined,
      kanal: lead.kanal ?? undefined,
    }) || (norm.preis_modus === 'komplex' ? 'Individuell / Komplex' : null)
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

  const fachdetailRows = fachdetailsForProjektUebersicht(fdRaw, bereiche)
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

  // badAusstattung falls nicht schon als Fachdetail
  if (norm.badAusstattung) {
    const already = fachdetailRows.some((e) => e.configKey === 'bad_ausstattung')
    if (!already) {
      extraRows.push({
        label: fachdetailPropLabel('bad_ausstattung', bereiche),
        children: fachdetailDisplayLabel('bad_ausstattung', norm.badAusstattung),
      })
    }
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

  const strasse = strFromFunnel(fdRaw, 'strasse')
  const hausnummer = strFromFunnel(fdRaw, 'hausnummer')
  const adresse = [strasse, hausnummer].filter(Boolean).join(' ')
  if (adresse) extraRows.push({ label: 'Adresse', children: adresse })

  const ort = strFromFunnel(fdRaw, 'ort')
  const plz = (lead.plz?.trim() || norm.plz || strFromFunnel(fdRaw, 'plz') || '').trim()
  const ortZeile = [plz, ort].filter(Boolean).join(' ')
  if (ortZeile) extraRows.push({ label: 'Ort', children: ortZeile })

  const preisHinweis = strFromFunnel(fdRaw, 'preis_hinweis', 'preisHinweis')
  if (preisHinweis) extraRows.push({ label: 'Preis-Hinweis', children: preisHinweis })

  const beratung = strFromFunnel(fdRaw, 'beratung_text', 'beratungText')
  if (beratung) extraRows.push({ label: 'Beratung', children: beratung })

  const footerRows: ProjektUebersichtExtraRow[] = []
  if (lead.created_at) {
    footerRows.push({ label: 'Eingegangen', children: formatDatumZeit(lead.created_at) })
  }

  return { extraRows, footerRows }
}
