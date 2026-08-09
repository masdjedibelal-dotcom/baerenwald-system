'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { createRechnungEntwurf } from '@/app/(dashboard)/rechnungen/actions'
import { createNachtragManuell } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { orgFreigabeErforderlich } from '@/lib/org/org-freigabe-logic'
import { listAuftragPositionEintraege } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import type { AngebotPosition, Kunde, Lead } from '@/lib/types'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function posFromLebenszyklus(opts: {
  id: string
  leistung: string
  beschreibung?: string | null
  menge: number
  einheit: string
  einzelNetto: number
  negativ?: boolean
}): AngebotPosition {
  const menge = opts.negativ ? -Math.abs(opts.menge) : opts.menge
  const netto = round2(opts.einzelNetto)
  return {
    id: opts.id,
    gewerk_id: '',
    gewerk_name: 'Ausführung',
    leistung: opts.leistung,
    beschreibung: opts.beschreibung ?? '',
    lohn_netto: netto,
    material_netto: 0,
    gesamt_min: netto,
    gesamt_max: netto,
    menge,
    einheit: opts.einheit,
    preis_typ: 'fix',
  }
}

/**
 * Rechnungs-Entwurf aus Positions-Lebenszyklus (Regie/Aufwand + LV).
 * Läuft auch ohne Partner-Abschluss-Button.
 */
export async function createRechnungEntwurfFromPositionLebenszyklus(
  auftragId: string
): Promise<{ ok: true; rechnungId: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: auf, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunde_id, angebot_id, titel, lead_id, start_datum, end_datum')
    .eq('id', auftragId)
    .maybeSingle()
  if (error || !auf?.kunde_id) {
    return { ok: false, message: error?.message ?? 'Auftrag/Kunde fehlt.' }
  }

  const { data: positionen } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, menge, einheit, preis_vk, preis_partner, lohn_vk, typ, verguetung, stundensatz, leistung_status'
    )
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  const eintraege = await listAuftragPositionEintraege(auftragId)
  const zeitByPos = new Map<string, number>()
  for (const e of eintraege) {
    if (!e.position_id) continue
    zeitByPos.set(
      e.position_id,
      (zeitByPos.get(e.position_id) ?? 0) + (Number(e.zeit_minuten) || 0)
    )
  }
  const { aggregateRegieBeschreibungFromEintraege } = await import(
    '@/lib/auftraege/auftrag-positionen-rechnung'
  )
  const textByPos = aggregateRegieBeschreibungFromEintraege(eintraege)

  const rechnungPos: AngebotPosition[] = []
  for (const p of positionen ?? []) {
    const isAufwand = String(p.verguetung) === 'aufwand' || String(p.typ) === 'regie'
    const minuten = zeitByPos.get(String(p.id)) ?? 0
    if (String(p.typ) === 'regie' && minuten <= 0 && String(p.leistung_status) !== 'erledigt') {
      continue
    }
    const std = minuten > 0 ? round2(minuten / 60) : Number(p.menge) || 1
    const satz =
      isAufwand && p.stundensatz != null
        ? Number(p.stundensatz)
        : Number(p.preis_vk ?? p.lohn_vk ?? p.preis_partner) || 0
    if (satz <= 0) continue
    const menge = isAufwand ? Math.max(std, 0.25) : Number(p.menge) || 1
    const partnerText = textByPos[String(p.id)]?.trim() || ''
    const baseBesch = String(p.beschreibung ?? '').trim()
    const beschreibung = isAufwand
      ? [partnerText || null, baseBesch && partnerText !== baseBesch ? baseBesch : null]
          .filter(Boolean)
          .join('\n\n') || baseBesch
      : baseBesch

    rechnungPos.push(
      posFromLebenszyklus({
        id: String(p.id),
        leistung: String(p.leistung_name),
        beschreibung: beschreibung || null,
        menge,
        einheit: isAufwand ? 'Std' : String(p.einheit ?? 'Psch'),
        einzelNetto: satz,
      })
    )
  }

  if (!rechnungPos.length) {
    return { ok: false, message: 'Keine abrechenbaren Positionen gefunden.' }
  }

  const heute = new Date().toISOString().slice(0, 10)
  const r = await createRechnungEntwurf({
    angebot_id: auf.angebot_id ? String(auf.angebot_id) : null,
    auftrag_id: auftragId,
    kunde_id: String(auf.kunde_id),
    positionen: rechnungPos,
    leistungszeitraum_von: auf.start_datum ?? heute,
    leistungszeitraum_bis: auf.end_datum ?? heute,
    faellig_am: null,
    einleitung: `Abrechnung Auftrag ${auf.titel ?? ''}`.trim(),
    hinweise: 'Entwurf aus Positions-Lebenszyklus (Partner-Zeiten / Festpreise).',
  })

  if (!r.ok) return r

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'rechnung_entwurf_aus_lebenszyklus',
    actorId: user.id,
    actorRolle: 'crm',
    kundeId: String(auf.kunde_id),
    payload: { rechnung_id: r.id, positionen: rechnungPos.length },
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/rechnungen')
  return { ok: true, rechnungId: r.id }
}

/**
 * Partner-Gutschrift-Entwurf (negative Positionen) aus Aufwand/Regie-Zeiten.
 */
export async function createPartnerGutschriftEntwurfFromLebenszyklus(
  auftragId: string
): Promise<{ ok: true; rechnungId: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunde_id, angebot_id, titel, start_datum, end_datum')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf?.kunde_id) return { ok: false, message: 'Auftrag/Kunde fehlt.' }

  const { data: positionen } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, menge, einheit, preis_partner, stundensatz, verguetung, typ'
    )
    .eq('auftrag_id', auftragId)

  const eintraege = await listAuftragPositionEintraege(auftragId)
  const zeitByPos = new Map<string, number>()
  for (const e of eintraege) {
    if (!e.position_id) continue
    zeitByPos.set(
      e.position_id,
      (zeitByPos.get(e.position_id) ?? 0) + (Number(e.zeit_minuten) || 0)
    )
  }

  const pos: AngebotPosition[] = []
  for (const p of positionen ?? []) {
    const isAufwand = String(p.verguetung) === 'aufwand' || String(p.typ) === 'regie'
    const minuten = zeitByPos.get(String(p.id)) ?? 0
    if (isAufwand && minuten <= 0) continue
    const std = minuten > 0 ? round2(minuten / 60) : Number(p.menge) || 1
    const satz = Number(p.stundensatz ?? p.preis_partner) || 0
    if (satz <= 0) continue
    pos.push(
      posFromLebenszyklus({
        id: randomUUID(),
        leistung: `Partner: ${p.leistung_name}`,
        beschreibung: p.beschreibung,
        menge: isAufwand ? Math.max(std, 0.25) : Number(p.menge) || 1,
        einheit: isAufwand ? 'Std' : String(p.einheit ?? 'Psch'),
        einzelNetto: satz,
        negativ: true,
      })
    )
  }

  if (!pos.length) {
    return { ok: false, message: 'Keine Partner-Zeiten/Preise für Gutschrift-Entwurf.' }
  }

  const heute = new Date().toISOString().slice(0, 10)
  const r = await createRechnungEntwurf({
    angebot_id: auf.angebot_id ? String(auf.angebot_id) : null,
    auftrag_id: auftragId,
    kunde_id: String(auf.kunde_id),
    positionen: pos,
    leistungszeitraum_von: auf.start_datum ?? heute,
    leistungszeitraum_bis: auf.end_datum ?? heute,
    faellig_am: null,
    einleitung: `Partner-Gutschrift-Entwurf — ${auf.titel ?? ''}`.trim(),
    hinweise: 'Interner Entwurf aus Positions-Zeiten (kein finaler Beleg).',
  })
  if (!r.ok) return r

  await supabaseAdmin.from('rechnungen').update({ beleg_typ: 'gutschrift' }).eq('id', r.id)

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'gutschrift_entwurf_aus_lebenszyklus',
    actorId: user.id,
    actorRolle: 'crm',
    kundeId: String(auf.kunde_id),
    payload: { rechnung_id: r.id },
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, rechnungId: r.id }
}

/**
 * Schwellen-Guard (§6): Übersteigt anerkannte weitere_arbeit die Org-Schwelle → Nachtragsfreigabe.
 */
export async function pruefeSchwelleWeitereArbeitUndNachtrag(
  auftragId: string
): Promise<
  | { ok: true; freigabeNoetig: boolean; nachtragId?: string; betragEur: number }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, lead_id, kunde_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden.' }

  const { data: regiePos } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, preis_partner, stundensatz, verguetung, anerkennung_status, menge, einheit'
    )
    .eq('auftrag_id', auftragId)
    .eq('typ', 'regie')
    .eq('anerkennung_status', 'anerkannt')

  const eintraege = await listAuftragPositionEintraege(auftragId)
  let betrag = 0
  const nachtragPos: AngebotPosition[] = []
  for (const p of regiePos ?? []) {
    const min = eintraege
      .filter((e) => e.position_id === String(p.id))
      .reduce((s, e) => s + (Number(e.zeit_minuten) || 0), 0)
    const satz = Number(p.stundensatz ?? p.preis_partner) || 0
    let zeile = 0
    let menge = Number(p.menge) || 1
    let einheit = String(p.einheit ?? 'Psch')
    if (String(p.verguetung) === 'aufwand' && min > 0) {
      menge = round2(min / 60)
      einheit = 'Std'
      zeile = round2(menge * satz)
    } else {
      zeile = round2(satz * menge)
    }
    betrag += zeile
    nachtragPos.push(
      posFromLebenszyklus({
        id: randomUUID(),
        leistung: String(p.leistung_name),
        beschreibung: p.beschreibung,
        menge,
        einheit,
        einzelNetto: satz,
      })
    )
  }

  let org: Pick<
    Kunde,
    | 'id'
    | 'name'
    | 'email'
    | 'org_anzeigename'
    | 'portal_modus'
    | 'freigabe_modus'
    | 'freigabe_schwelle_eur'
    | 'notfall_direkt'
  > | null = null
  let lead: Lead | null = null
  let objektOverride: {
    freigabe_schwelle_eur?: number | null
    notfall_direkt?: boolean | null
  } | null = null

  if (auf.kunde_id) {
    const { data: k } = await supabaseAdmin
      .from('kunden')
      .select(
        'id, name, email, org_anzeigename, portal_modus, freigabe_modus, freigabe_schwelle_eur, notfall_direkt'
      )
      .eq('id', auf.kunde_id)
      .maybeSingle()
    org = k as typeof org
  }
  if (auf.lead_id) {
    const { data: l } = await supabaseAdmin.from('leads').select('*').eq('id', auf.lead_id).maybeSingle()
    lead = l as Lead | null
    if (lead?.kunde_objekt_id) {
      const { data: o } = await supabaseAdmin
        .from('kunden_objekte')
        .select('freigabe_schwelle_eur, notfall_direkt')
        .eq('id', lead.kunde_objekt_id)
        .maybeSingle()
      objektOverride = o as typeof objektOverride
    }
  }

  const freigabeNoetig =
    org && lead
      ? orgFreigabeErforderlich(org, lead, betrag, {
          folgearbeit: true,
          objekt: objektOverride,
        })
      : betrag > 500

  if (!freigabeNoetig || betrag <= 0) {
    return { ok: true, freigabeNoetig: false, betragEur: betrag }
  }

  const nachtrag = await createNachtragManuell({
    auftragId,
    grund: 'Schwellen-Guard weitere Arbeit',
    beschreibung: `Anerkannte Regie/weitere Arbeit (${betrag.toFixed(2)} €) überschreitet Freigabe-Schwelle.`,
    positionen: nachtragPos,
    handwercher_bestaetigt: false,
  })

  if (!nachtrag.ok) {
    return { ok: false, message: nachtrag.message }
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'schwellen_guard_nachtrag',
    actorId: user.id,
    actorRolle: 'crm',
    payload: { nachtrag_id: nachtrag.id, betrag_eur: betrag },
  })

  return {
    ok: true,
    freigabeNoetig: true,
    nachtragId: nachtrag.id,
    betragEur: betrag,
  }
}
