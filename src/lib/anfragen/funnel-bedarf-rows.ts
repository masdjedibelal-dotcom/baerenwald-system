import type { ProjektUebersichtExtraRow } from '@/components/crm/EntityProjektUebersichtCard'
import {
  isEchterFreitext,
  kundentypLabel,
  parseWebsiteAnfrageDump,
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
import { STAFF_ANLIEGEN, STAFF_ANLIEGEN_LABELS } from '@/lib/anfragen/staff-funnel-types'
import { anfrageStatusDisplay } from '@/lib/status/status-display'
import { groessePropLabel } from '@/lib/vorab-formular-config'
import { BEREICH_LABELS, formatDatum, formatDatumZeit, kanalLabel } from '@/lib/utils'

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
    if (entry.configKey === 'projekt_gu') {
      for (const raw of entry.values) {
        const m = raw.match(/^([^:]+):\s*(.+)$/)
        if (m) {
          extraRows.push({ label: m[1]!.trim(), children: m[2]!.trim() })
        } else if (raw.trim()) {
          extraRows.push({
            label: fachdetailPropLabel(entry.configKey, bereiche),
            children: raw.trim(),
          })
        }
      }
      continue
    }
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

const ORG_FREIGABE_KURZ: Record<string, string> = {
  ausstehend: 'Ausstehend',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
  nicht_noetig: 'Nicht nötig',
}

/**
 * Prop-Zeilen für Anfrage-Phase-Sheet (Verlauf Split-over) —
 * alle mitgegebenen Funnel-/Kontakt-/Stammdaten als Strings.
 */
export function buildAnfragePhaseSheetProps(lead: {
  id: string
  status?: string | null
  kanal?: string | null
  situation?: string | null
  bereiche?: string[] | null
  kundentyp?: string | null
  zeitraum?: string | null
  zeitraum_von?: string | null
  zeitraum_bis?: string | null
  funnel_daten?: unknown
  created_at?: string | null
  plz?: string | null
  budget_ca?: number | null
  preis_min?: number | null
  preis_max?: number | null
  kontakt_name?: string | null
  kontakt_email?: string | null
  kontakt_telefon?: string | null
  kontakt_nachricht?: string | null
  notizen?: string | null
  melder_name?: string | null
  melder_telefon?: string | null
  melder_email?: string | null
  melder_einheit?: string | null
  org_freigabe_status?: string | null
  kunden?: {
    name?: string | null
    email?: string | null
    telefon?: string | null
    plz?: string | null
    ort?: string | null
    strasse?: string | null
    hausnummer?: string | null
  } | null
  auftraggeber?: { name?: string | null; org_anzeigename?: string | null } | null
  kunden_objekte?: {
    titel?: string | null
    strasse?: string | null
    hausnummer?: string | null
    plz?: string | null
    ort?: string | null
  } | null
}): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = []
  const seen = new Set<string>()
  const push = (k: string, v: string | null | undefined) => {
    const t = (v ?? '').trim()
    if (!t || t === '—') return
    if (seen.has(k)) return
    seen.add(k)
    out.push({ k, v: t })
  }

  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}

  push('Eingegangen', lead.created_at ? formatDatumZeit(lead.created_at) : null)
  push(
    'Status',
    anfrageStatusDisplay(lead.status ?? 'neu', {
      orgFreigabeStatus: lead.org_freigabe_status,
    }).label
  )
  push('Quelle', kanalLabel(lead.kanal ?? ''))

  const anliegenId = typeof fd.anliegen === 'string' ? fd.anliegen.trim() : ''
  const anliegenLabel =
    STAFF_ANLIEGEN.find((a) => a.id === anliegenId)?.label ??
    STAFF_ANLIEGEN_LABELS[anliegenId]
  push('Anliegen', anliegenLabel || leadSituationDisplay(lead.situation) || null)
  push('Vorhaben', strFromFunnel(fd, 'vorhaben'))

  // Strukturierte Funnel-/Website-Felder vor Kontakt (kein Freitext-Dump)
  const { extraRows } = buildFunnelBedarfExtraRows(lead)
  for (const row of extraRows) {
    if (typeof row.children === 'string') push(row.label, row.children)
  }

  // Fallback: Website-Dump in kontakt_nachricht / formattedSummary → einzelne Props
  const dumpSources = [
    lead.kontakt_nachricht,
    typeof fd.formattedSummary === 'string' ? fd.formattedSummary : null,
    typeof fd.technicalDetails === 'string' ? fd.technicalDetails : null,
  ]
  for (const src of dumpSources) {
    for (const row of parseWebsiteAnfrageDump(src)) {
      push(row.k, row.v)
    }
  }

  const beschreibung = (lead.kontakt_nachricht ?? '').trim()
  if (isEchterFreitext(beschreibung)) {
    const vorhaben = strFromFunnel(fd, 'vorhaben')
    const body =
      vorhaben && beschreibung.startsWith(vorhaben)
        ? beschreibung.slice(vorhaben.length).replace(/^\n+/, '').trim()
        : beschreibung
    push('Beschreibung', body || beschreibung)
  }

  push('Kunde', lead.kontakt_name?.trim() || lead.kunden?.name?.trim() || null)
  push('Telefon', lead.kontakt_telefon?.trim() || lead.kunden?.telefon?.trim() || null)
  push('E-Mail', lead.kontakt_email?.trim() || lead.kunden?.email?.trim() || null)

  const agName =
    lead.auftraggeber?.org_anzeigename?.trim() || lead.auftraggeber?.name?.trim() || null
  push('Auftraggeber', agName)

  if (lead.kunden_objekte) {
    const o = lead.kunden_objekte
    const strasse = [o.strasse, o.hausnummer].filter(Boolean).join(' ')
    const ort = [o.plz, o.ort].filter(Boolean).join(' ')
    push('Objekt', [o.titel?.trim(), strasse, ort].filter(Boolean).join(' · ') || null)
  }

  push('Melder', lead.melder_name)
  push(
    'Melder-Kontakt',
    [lead.melder_telefon, lead.melder_email].filter(Boolean).join(' · ') || null
  )
  push('Einheit', lead.melder_einheit)

  const freigabe = (lead.org_freigabe_status ?? '').trim()
  if (freigabe && freigabe !== 'nicht_noetig') {
    push('HV-Freigabe', ORG_FREIGABE_KURZ[freigabe] ?? freigabe)
  }

  const budget = resolveLeadPreisAnzeige(
    (lead.kanal ?? 'sonstiges') as import('@/lib/types').LeadKanal,
    lead.budget_ca,
    lead.preis_min,
    lead.preis_max,
    lead.funnel_daten
  )
  push('Budgetrahmen', budget === '—' ? null : budget)
  push('Budget-Hinweis', strFromFunnel(fd, 'budget_hinweis', 'budgetHinweis'))

  // Adresse aus Kunde, falls Funnel nichts hatte
  if (!seen.has('Adresse')) {
    const strasse = [lead.kunden?.strasse, lead.kunden?.hausnummer].filter(Boolean).join(' ')
    push('Adresse', strasse || null)
  }
  if (!seen.has('Ort')) {
    const ortZeile = [lead.plz || lead.kunden?.plz, lead.kunden?.ort]
      .filter(Boolean)
      .join(' ')
    push('Ort', ortZeile || null)
  }

  push('Interne Notiz', lead.notizen)

  return out
}
