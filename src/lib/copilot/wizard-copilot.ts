import 'server-only'

import { randomUUID } from 'crypto'

import {
  loadAngebotWizardBootstrap,
  saveAngebotWizardDraft,
  type SaveAngebotWizardDraftPayload,
} from '@/app/(dashboard)/angebote/wizard-actions'
import { listHandwerkerFuerGewerk } from '@/app/(dashboard)/angebote/actions'
import { angebotWizardPositionenFromLead } from '@/lib/angebote/angebot-positionen-from-lead'
import {
  defaultProjektBeschreibungText,
  defaultWizardMeta,
  initialDokumentTypFromLead,
  parseZahlungsbedingungenKey,
  resolveAngebotKundeTyp,
  wizardPositionsToAngebot,
  type AngebotWizardMeta,
  type AngebotWizardZahlungsbedingung,
} from '@/lib/angebote/angebot-wizard-types'
import { parseAngebotAnrede } from '@/lib/templates/angebot-mail'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import { resolveKundeId } from '@/lib/copilot/crm-actions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { loadWizardContext } from '@/lib/wizard-context'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AngebotPosition, Gewerk, Lead } from '@/lib/types'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'

export type CopilotWizardPosition = {
  gewerk_slug?: string
  gewerk_id?: string
  gewerk_name?: string
  leistung?: string
  beschreibung: string
  menge?: number
  einheit?: string
  preis_netto: number
}

export type PrepareAngebotWizardInput = {
  lead_id: string
  angebot_id?: string
}

export type SaveAngebotWizardCopilotInput = {
  lead_id: string
  angebot_id?: string | null
  kunde_id?: string
  dokument_typ?: 'einfach' | 'projekt'
  titel?: string
  leistungsumfang?: string
  projektbeschreibung?: string
  positionen: CopilotWizardPosition[]
  zahlungsbedingungen?: string
  gueltig_bis?: string
  einleitung?: string
  schluss?: string
  hinweise?: string
  wichtige_hinweise?: string
  fotos_urls?: Array<{ url: string; beschreibung?: string }>
  handwerker_zuweisungen?: Array<{
    gewerk_slug?: string
    gewerk_id?: string
    handwerker_id: string
    aufgabe_notiz?: string
  }>
  varianten?: SaveAngebotWizardDraftPayload['varianten']
}

function resolveGewerk(
  row: CopilotWizardPosition,
  gewerke: Gewerk[]
): Gewerk | null {
  if (row.gewerk_id) {
    return gewerke.find((g) => g.id === row.gewerk_id) ?? null
  }
  if (row.gewerk_slug) {
    return gewerke.find((g) => g.slug === row.gewerk_slug) ?? null
  }
  if (row.gewerk_name) {
    const n = row.gewerk_name.toLowerCase()
    return gewerke.find((g) => g.name.toLowerCase() === n) ?? null
  }
  return gewerke.find((g) => g.slug === 'sonstiges') ?? gewerke[0] ?? null
}

function copilotPositionenToAngebot(
  rows: CopilotWizardPosition[],
  gewerke: Gewerk[],
  firm: FirmenEinstellungen
): AngebotPosition[] {
  const wizardRows = rows.map((row) => {
    const g = resolveGewerk(row, gewerke)
    const preis = Math.max(0, Number(row.preis_netto) || 0)
    const menge = Math.max(0.01, Number(row.menge) || 1)
    return {
      id: randomUUID(),
      gewerk_id: g?.id ?? '',
      gewerk_name: g?.name ?? row.gewerk_name ?? 'Sonstiges',
      gewerk_slug: g?.slug ?? row.gewerk_slug ?? 'sonstiges',
      leistung: row.leistung?.trim() || row.beschreibung.trim() || 'Leistung',
      beschreibung: row.beschreibung.trim(),
      menge,
      einheit: row.einheit?.trim() || 'Stk.',
      preis_min: preis,
      preis_max: preis,
    }
  })
  return wizardPositionsToAngebot(wizardRows, firm)
}

function fehlendeWizardFelder(input: {
  kundeId: string | null
  positionen: CopilotWizardPosition[]
  meta: AngebotWizardMeta
  dokumentTyp: 'einfach' | 'projekt'
  projektbeschreibung: string | null
  handwerkerNoetig?: boolean
  gewerkeOhneHw?: string[]
}): string[] {
  const fehlend: string[] = []
  if (!input.kundeId) fehlend.push('kunde_id — Kunde verknüpfen (create_kunde oder aus Lead)')
  if (!input.positionen.length) {
    fehlend.push('positionen — mindestens eine Leistung mit beschreibung und preis_netto')
  }
  for (let i = 0; i < input.positionen.length; i++) {
    const p = input.positionen[i]!
    if (!p.beschreibung?.trim()) fehlend.push(`positionen[${i}].beschreibung`)
    if (p.preis_netto == null || Number.isNaN(Number(p.preis_netto))) {
      fehlend.push(`positionen[${i}].preis_netto`)
    }
  }
  if (!input.meta.leistungsumfang?.trim() && !input.meta.titel?.trim()) {
    fehlend.push('leistungsumfang oder titel — Projekttitel fürs Angebot')
  }
  if (input.dokumentTyp === 'projekt' && !input.projektbeschreibung?.trim()) {
    fehlend.push('projektbeschreibung — bei dokument_typ projekt erforderlich')
  }
  if (input.handwerkerNoetig && (input.gewerkeOhneHw?.length ?? 0) > 0) {
    fehlend.push(
      `handwerker_zuweisungen für Gewerke: ${input.gewerkeOhneHw!.join(', ')} — vor Kundenversand`
    )
  }
  return fehlend
}

export async function prepareAngebotWizardCopilot(input: PrepareAngebotWizardInput) {
  const leadId = input.lead_id.trim()
  const { data: leadRow, error } = await supabaseAdmin
    .from('leads')
    .select(
      `
      *,
      kunden!kunde_id(id, name, email, telefon, typ)
    `
    )
    .eq('id', leadId)
    .maybeSingle()
  if (error) throw error
  if (!leadRow) return { error: 'Lead nicht gefunden' }

  const lead = leadRow as Lead
  const kunde = resolveLeadKunde(lead.kunden as import('@/lib/types').Kunde | import('@/lib/types').Kunde[] | null)
  const kundeId = kunde?.id ?? lead.kunde_id ?? null
  const kundeName = kunde?.name ?? lead.kontakt_name ?? 'Kunde'
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, lead.kundentyp)

  const ctx = await loadWizardContext(supabaseAdmin)

  if (input.angebot_id) {
    const loaded = await loadAngebotWizardBootstrap(input.angebot_id, leadId, { asSystem: true })
    if (!loaded.ok) return { error: loaded.message }
    const b = loaded.bootstrap
    const posVorschlag: CopilotWizardPosition[] = b.positionen.map((p) => ({
      gewerk_id: p.gewerk_id,
      gewerk_slug: p.gewerk_slug,
      gewerk_name: p.gewerk_name,
      leistung: p.leistung,
      beschreibung: p.beschreibung || p.leistung,
      menge: p.menge,
      einheit: p.einheit,
      preis_netto: p.gesamt_max || p.gesamt_min || 0,
    }))
    const fehlend = fehlendeWizardFelder({
      kundeId,
      positionen: posVorschlag,
      meta: b.meta,
      dokumentTyp: b.dokumentTyp,
      projektbeschreibung: b.projektbeschreibung,
    })
    return {
      modus: 'bearbeiten' as const,
      lead_id: leadId,
      angebot_id: b.angebotId,
      angebotsnr: b.angebotsnr,
      kunde_id: kundeId,
      kunde_name: kundeName,
      dokument_typ: b.dokumentTyp,
      meta: b.meta,
      projektbeschreibung: b.projektbeschreibung,
      positionen_vorschlag: posVorschlag,
      fotos_urls: b.projektFotos,
      varianten: b.varianten ?? null,
      wichtige_hinweise: b.wichtige_hinweise ?? null,
      fehlende_felder: fehlend,
      gewerke: ctx.gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
      naechster_schritt:
        fehlend.length > 0
          ? 'Fehlende Angaben bei Belal erfragen, dann save_angebot_wizard'
          : 'save_angebot_wizard zum Speichern',
    }
  }

  const dokumentTyp = initialDokumentTypFromLead(lead.bereiche, lead.situation)
  const wizardPos = angebotWizardPositionenFromLead(lead, ctx.gewerke, ctx.preislisten)
  const positionenVorschlag: CopilotWizardPosition[] = wizardPos.map((p) => ({
    gewerk_id: p.gewerk_id,
    gewerk_slug: p.gewerk_slug,
    gewerk_name: p.gewerk_name,
    leistung: p.leistung,
    beschreibung: p.beschreibung || p.leistung,
    menge: p.menge,
    einheit: p.einheit,
    preis_netto: p.preis_max || p.preis_min || 0,
  }))

  const projektLabel =
    lead.situation?.trim()?.slice(0, 80) ||
    (Array.isArray(lead.bereiche) ? lead.bereiche.join(', ') : '') ||
    'Projekt'
  const meta = defaultWizardMeta(
    kundeName,
    projektLabel,
    projektLabel,
    parseAngebotAnrede(null, kundeTyp),
    kundeTyp,
    ctx.firm
  )
  const projektbeschreibung =
    dokumentTyp === 'projekt' ? defaultProjektBeschreibungText(meta.titel) : null

  const fehlend = fehlendeWizardFelder({
    kundeId,
    positionen: positionenVorschlag,
    meta,
    dokumentTyp,
    projektbeschreibung,
  })

  const summen =
    positionenVorschlag.length > 0
      ? summenAusPositionen(copilotPositionenToAngebot(positionenVorschlag, ctx.gewerke, ctx.firm), 19)
      : null

  return {
    modus: 'neu' as const,
    lead_id: leadId,
    kunde_id: kundeId,
    kunde_name: kundeName,
    lead_status: lead.status,
    dokument_typ: dokumentTyp,
    meta,
    projektbeschreibung,
    positionen_vorschlag: positionenVorschlag,
    summe_netto: summen?.nettoMin ?? null,
    summe_brutto: summen?.bruttoMin ?? null,
    fehlende_felder: fehlend,
    gewerke: ctx.gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
    naechster_schritt:
      fehlend.length > 0
        ? 'Fehlende Felder bei Belal erfragen (Preise, Titel, ggf. Kunde anlegen)'
        : 'save_angebot_wizard mit den Vorschlägen oder Anpassungen',
  }
}

export async function saveAngebotWizardCopilot(input: SaveAngebotWizardCopilotInput) {
  const leadId = input.lead_id.trim()
  const { data: leadRow } = await supabaseAdmin
    .from('leads')
    .select('id, kunde_id, kontakt_name, kundentyp, bereiche, situation, kunden!kunde_id(id, name, typ)')
    .eq('id', leadId)
    .maybeSingle()
  if (!leadRow) return { error: 'Lead nicht gefunden' }

  let kundeId = input.kunde_id?.trim() || leadRow.kunde_id
  const kunde = Array.isArray(leadRow.kunden) ? leadRow.kunden[0] : leadRow.kunden
  if (!kundeId && kunde?.id) kundeId = kunde.id
  if (kundeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(kundeId)) {
    const resolved = await resolveKundeId({ kunde_id: kundeId })
    if ('error' in resolved) return resolved
    kundeId = resolved.id
  }
  if (!kundeId) {
    return {
      error: 'kunde_id fehlt',
      fehlende_felder: ['kunde_id'],
      hinweis: 'Zuerst create_kunde oder Lead mit Kunde verknüpfen',
    }
  }

  const ctx = await loadWizardContext(supabaseAdmin)
  const kundeName = kunde?.name ?? leadRow.kontakt_name ?? 'Kunde'
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, leadRow.kundentyp)
  const dokumentTyp = input.dokument_typ ?? initialDokumentTypFromLead(leadRow.bereiche, leadRow.situation)

  const projektLabel = input.leistungsumfang?.trim() || input.titel?.trim() || 'Projekt'
  const fallbackMeta = defaultWizardMeta(
    kundeName,
    projektLabel,
    input.leistungsumfang?.trim() ?? projektLabel,
    parseAngebotAnrede(null, kundeTyp),
    kundeTyp,
    ctx.firm
  )

  const meta: AngebotWizardMeta = {
    ...fallbackMeta,
    titel: input.titel?.trim() || fallbackMeta.titel,
    leistungsumfang: input.leistungsumfang?.trim() || fallbackMeta.leistungsumfang,
    gueltig_bis: input.gueltig_bis?.trim() || fallbackMeta.gueltig_bis,
    einleitung: input.einleitung?.trim() || fallbackMeta.einleitung,
    schluss: input.schluss?.trim() || fallbackMeta.schluss,
    hinweise: input.hinweise?.trim() || fallbackMeta.hinweise,
    zahlungsbedingungen: parseZahlungsbedingungenKey(
      input.zahlungsbedingungen,
      kundeTyp
    ) as AngebotWizardZahlungsbedingung,
  }

  const projektbeschreibung =
    dokumentTyp === 'projekt'
      ? input.projektbeschreibung?.trim() ||
        defaultProjektBeschreibungText(meta.titel)
      : null

  const fehlend = fehlendeWizardFelder({
    kundeId,
    positionen: input.positionen,
    meta,
    dokumentTyp,
    projektbeschreibung,
  })
  if (fehlend.length) {
    return { error: 'Pflichtfelder fehlen', fehlende_felder: fehlend }
  }

  const positionen = copilotPositionenToAngebot(input.positionen, ctx.gewerke, ctx.firm)

  const hwZuweisungen: { gewerk_id: string; handwerker_id: string }[] = []
  const hwNotizen: Record<string, string | null | undefined> = {}
  for (const hw of input.handwerker_zuweisungen ?? []) {
    const g =
      (hw.gewerk_id && ctx.gewerke.find((x) => x.id === hw.gewerk_id)) ||
      (hw.gewerk_slug && ctx.gewerke.find((x) => x.slug === hw.gewerk_slug)) ||
      null
    if (!g || !hw.handwerker_id) continue
    hwZuweisungen.push({ gewerk_id: g.id, handwerker_id: hw.handwerker_id })
    if (hw.aufgabe_notiz?.trim()) hwNotizen[g.id] = hw.aufgabe_notiz.trim()
  }

  const payload: SaveAngebotWizardDraftPayload = {
    angebotId: input.angebot_id ?? null,
    lead_id: leadId,
    kunde_id: kundeId,
    positionen,
    meta,
    dokument_typ: dokumentTyp,
    projektbeschreibung,
    fotos_urls: input.fotos_urls?.map(
      (f): AngebotProjektFoto => ({
        url: f.url,
        beschreibung: f.beschreibung?.trim() || '',
      })
    ),
    wichtige_hinweise: input.wichtige_hinweise ?? null,
    varianten: input.varianten ?? null,
    handwerker_zuweisungen: hwZuweisungen.length ? hwZuweisungen : undefined,
    handwerker_aufgabe_notizen: Object.keys(hwNotizen).length ? hwNotizen : undefined,
  }

  const saved = await saveAngebotWizardDraft(payload, { asSystem: true })
  if (!saved.ok) return saved

  const summen = summenAusPositionen(positionen, 19)
  return {
    ok: true,
    angebot_id: saved.angebotId,
    angebotsnr: saved.angebotsnr,
    summe_netto: summen.nettoMin,
    summe_brutto: summen.bruttoMin,
    dokument_typ: dokumentTyp,
    hinweis:
      'Entwurf gespeichert. Nächste Schritte: Handwerker anfragen (send_angebot_handwerker), dann an Kunde senden (sende_angebot).',
  }
}

export async function listHandwerkerFuerGewerkCopilot(gewerkIdOrSlug: string) {
  const ctx = await loadWizardContext(supabaseAdmin)
  const gewerk =
    ctx.gewerke.find((g) => g.id === gewerkIdOrSlug) ||
    ctx.gewerke.find((g) => g.slug === gewerkIdOrSlug)
  if (!gewerk) return { error: `Gewerk nicht gefunden: ${gewerkIdOrSlug}` }
  const list = await listHandwerkerFuerGewerk(gewerk.id, { asSystem: true })
  if (!list.ok) return { error: list.message }
  return {
    gewerk: { id: gewerk.id, name: gewerk.name, slug: gewerk.slug },
    handwerker: list.handwerker,
  }
}
