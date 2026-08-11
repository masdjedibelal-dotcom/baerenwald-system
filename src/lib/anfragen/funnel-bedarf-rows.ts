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
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import {
  BEREICH_LABELS,
  anfragePreisDetailLabel,
  formatDatum,
  formatDatumZeit,
  isCrmStaffFunnel,
  kanalLabel,
} from '@/lib/utils'
import {
  meldeBereichLabel,
  meldeKategorieLabel,
} from '@/lib/anfragen/melde-fachdetail-labels'

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

  const staffSelbst = isCrmStaffFunnel(lead.funnel_daten)

  /*
   * Situation + Bereiche nie als ExtraRows: stecken schon im Vorhaben-/Projekttitel
   * (Situation · Bereich) — Anfrage, Angebot, Auftrag.
   * Anfrageart bleibt bei Website-Leads (Preis-Modus / Komplex).
   */
  if (!staffSelbst) {
    const anfrageTyp =
      anfrageTypAnzeige(norm, {
        situation: lead.situation,
        bereiche: lead.bereiche ?? undefined,
        kanal: lead.kanal ?? undefined,
      }) || (norm.preis_modus === 'komplex' ? 'Individuell / Komplex' : null)
    if (anfrageTyp) extraRows.push({ label: 'Anfrageart', children: anfrageTyp })
  }

  const meldeKategorie = strFromFunnel(fdRaw, 'melde_kategorie')
  if (meldeKategorie) {
    extraRows.push({
      label: 'Melde-Kategorie',
      children: meldeKategorieLabel(meldeKategorie),
    })
  }
  const meldeBereich = strFromFunnel(fdRaw, 'melde_bereich')
  if (meldeBereich) {
    extraRows.push({
      label: 'Melde-Bereich',
      children: meldeBereichLabel(meldeBereich),
    })
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

  if (!staffSelbst) {
    const preisHinweis = strFromFunnel(fdRaw, 'preis_hinweis', 'preisHinweis')
    if (preisHinweis) extraRows.push({ label: 'Preis-Hinweis', children: preisHinweis })
  }

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

/** Objekt-Zeile: Titel nur wenn er sich von der Straße unterscheidet. */
function formatAnfragePhaseObjektZeile(o: {
  titel?: string | null
  strasse?: string | null
  hausnummer?: string | null
  plz?: string | null
  ort?: string | null
}): string | null {
  const titel = o.titel?.trim() || ''
  const strasseOnly = o.strasse?.trim() || ''
  const strasse =
    kundenObjektStrasseZeile({
      strasse: o.strasse ?? null,
      hausnummer: o.hausnummer ?? null,
    }) || ''
  const ort = [o.plz?.trim(), o.ort?.trim()].filter(Boolean).join(' ')
  const t = titel.toLowerCase()
  const s = strasse.toLowerCase()
  const so = strasseOnly.toLowerCase()
  // Titel nur wenn er nicht schon die Straße (mit/ohne Nr.) wiederholt
  const titelEigenstaendig =
    Boolean(t) &&
    t !== s &&
    t !== so &&
    !s.startsWith(`${t} `) &&
    !so.startsWith(`${t} `) &&
    !(so && t.includes(so))
  const parts = [titelEigenstaendig ? titel : null, strasse || null, ort || null].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/**
 * Prop-Zeilen für Anfrage-Phase-Sheet (Verlauf Split-over).
 * HV-Meldung: Kunde = Hausverwaltung, Melder = Mieter, Ort/Adresse über Objekt.
 * Privat: Kunde + Tel + E-Mail, ohne Melder/Objekt-Block.
 */
export function buildAnfragePhaseSheetProps(lead: {
  id: string
  status?: string | null
  kanal?: string | null
  anlass?: string | null
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
  auftraggeber_kunde_id?: string | null
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

  const isHv =
    resolvePipelineKontext({
      kanal: lead.kanal,
      auftraggeber_kunde_id: lead.auftraggeber_kunde_id,
      anlass: lead.anlass,
    }) === 'hv_meldung' ||
    Boolean(lead.auftraggeber || lead.auftraggeber_kunde_id || lead.melder_name?.trim())

  const staffSelbst = isCrmStaffFunnel(lead.funnel_daten)
  const hatObjekt = Boolean(lead.kunden_objekte)
  /** Bei HV mit Objekt: keine doppelten Ort/Adresse/Melder-Spiegel aus Funnel/Dump */
  const skipLabels = new Set<string>([
    'Situation',
    'Bereiche',
    ...(staffSelbst
      ? [
          'Auftraggeber',
          'Anliegen',
          'Anfrageart',
          'Preis-Hinweis',
          'Budget-Hinweis',
          'Kunde',
          'Telefon',
          'E-Mail',
          'Melder',
          'Melder-Kontakt',
          'Einheit',
          'Objekt',
          'Ort',
          'Adresse',
        ]
      : isHv
        ? [
            'Auftraggeber',
            ...(hatObjekt ? ['Ort', 'Adresse'] : []),
            'Kunde',
            'Telefon',
            'E-Mail',
            'Melder',
            'Melder-Kontakt',
            'Einheit',
            'Objekt',
          ]
        : ['Auftraggeber', 'Melder', 'Melder-Kontakt', 'Einheit', 'Objekt']),
  ])

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

  const vorhaben = strFromFunnel(fd, 'vorhaben')
  if (!staffSelbst) {
    const anliegenId = typeof fd.anliegen === 'string' ? fd.anliegen.trim() : ''
    const anliegenLabel =
      STAFF_ANLIEGEN.find((a) => a.id === anliegenId)?.label ??
      STAFF_ANLIEGEN_LABELS[anliegenId]
    push('Anliegen', anliegenLabel || leadSituationDisplay(lead.situation) || null)
  }
  push('Vorhaben', vorhaben)
  // Fallback: Vorhaben aus Situation · Bereiche (wie Anzeige-Titel)
  if (!seen.has('Vorhaben')) {
    const sit = leadSituationDisplay(lead.situation)
    const ber = (lead.bereiche ?? [])
      .map((b) => BEREICH_LABELS[b] ?? b)
      .filter(Boolean)
      .join(', ')
    const parts = [sit, ber].filter(Boolean)
    push('Vorhaben', parts.length ? parts.join(' · ') : null)
  }

  const { extraRows } = buildFunnelBedarfExtraRows(lead)
  for (const row of extraRows) {
    if (typeof row.children !== 'string') continue
    if (skipLabels.has(row.label)) continue
    push(row.label, row.children)
  }

  if (!staffSelbst) {
    const dumpSources = [
      lead.kontakt_nachricht,
      typeof fd.formattedSummary === 'string' ? fd.formattedSummary : null,
      typeof fd.technicalDetails === 'string' ? fd.technicalDetails : null,
    ]
    for (const src of dumpSources) {
      for (const row of parseWebsiteAnfrageDump(src)) {
        if (skipLabels.has(row.k)) continue
        push(row.k, row.v)
      }
    }
  }

  const beschreibung = (lead.kontakt_nachricht ?? '').trim()
  if (isEchterFreitext(beschreibung)) {
    const body =
      vorhaben && beschreibung.startsWith(vorhaben)
        ? beschreibung.slice(vorhaben.length).replace(/^\n+/, '').trim()
        : beschreibung
    const text = (body || beschreibung).trim()
    const sameAsVorhaben =
      Boolean(vorhaben) &&
      (text.toLowerCase() === vorhaben!.toLowerCase() ||
        beschreibung.toLowerCase() === vorhaben!.toLowerCase())
    if (text && !(staffSelbst && sameAsVorhaben)) {
      push('Beschreibung', text)
    }
  }

  if (!staffSelbst) {
    if (isHv) {
      const agName =
        lead.auftraggeber?.org_anzeigename?.trim() || lead.auftraggeber?.name?.trim() || null
      push('Kunde', agName)

      if (lead.kunden_objekte) {
        push('Objekt', formatAnfragePhaseObjektZeile(lead.kunden_objekte))
      }

      push('Einheit', lead.melder_einheit)
      push('Melder', lead.melder_name)
      push(
        'Melder-Kontakt',
        [lead.melder_telefon, lead.melder_email].filter(Boolean).join(' · ') || null
      )
    } else {
      push('Kunde', lead.kontakt_name?.trim() || lead.kunden?.name?.trim() || null)
      push('Telefon', lead.kontakt_telefon?.trim() || lead.kunden?.telefon?.trim() || null)
      push('E-Mail', lead.kontakt_email?.trim() || lead.kunden?.email?.trim() || null)

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
    }
  }

  const freigabe = (lead.org_freigabe_status ?? '').trim()
  if (freigabe && freigabe !== 'nicht_noetig') {
    push('HV-Freigabe', ORG_FREIGABE_KURZ[freigabe] ?? freigabe)
  }

  push('Interne Notiz', lead.notizen)

  // Preiseinschätzung / Preisrahmen zuletzt
  const budget = resolveLeadPreisAnzeige(
    (lead.kanal ?? 'sonstiges') as import('@/lib/types').LeadKanal,
    lead.budget_ca,
    lead.preis_min,
    lead.preis_max,
    lead.funnel_daten
  )
  const preisLabel = anfragePreisDetailLabel(
    (lead.kanal ?? 'sonstiges') as import('@/lib/types').LeadKanal,
    lead.funnel_daten
  )
  push(preisLabel, budget === '—' ? null : budget)
  if (!staffSelbst) {
    push('Budget-Hinweis', strFromFunnel(fd, 'budget_hinweis', 'budgetHinweis'))
  }

  return out
}
