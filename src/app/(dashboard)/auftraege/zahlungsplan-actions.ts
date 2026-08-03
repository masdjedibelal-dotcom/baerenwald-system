'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  emptyZahlungsplan,
  parseZahlungsplan,
  auftragSummenAusPositionen,
  validateZahlungsplanGegenGesamt,
  berechneZahlungsplan,
  rechnungArtFuerZeile,
  abschlagBereitsAbgerechnet,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { auftragPositionenToAngebotPositionen } from '@/lib/auftraege/auftrag-positionen-rechnung'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'
import {
  zahlplanDarfGeloeschtWerden,
  zahlplanMergeMitEinfrieren,
} from '@/lib/rechnungen/zahlplan-gates'
import {
  createRechnungEntwurf,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import {
  ensureAbschlagEntwuerfeForAuftrag,
  storniereAbschlagEntwuerfeForAuftrag,
  storniereVerwaisteVollEntwuerfe,
} from '@/lib/rechnungen/ensure-abschlag-entwuerfe'

/**
 * Spec Q2: Unverbindlicher Zahlplan-Vorschlag liegt auf `angebote.zahlungsplan`.
 * `auftraege.zahlungsplan` wird nicht mehr gelesen/geschrieben.
 */
async function angebotIdForAuftrag(
  supabase: ReturnType<typeof createClient>,
  auftragId: string
): Promise<{ ok: true; angebotId: string } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) return { ok: false, message: error.message }
  const angebotId = data?.angebot_id ? String(data.angebot_id) : ''
  if (!angebotId) {
    return {
      ok: false,
      message: 'Kein verknüpftes Angebot — Zahlplan-Vorschlag nur am Angebot speicherbar.',
    }
  }
  return { ok: true, angebotId }
}

export async function saveAuftragZahlungsplan(
  auftragId: string,
  plan: Zahlungsplan,
  opts?: { force?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!plan.zeilen.length) {
    return { ok: false, message: 'Mindestens eine Abschlagszeile erforderlich.' }
  }

  const supabase = createClient()
  const angRef = await angebotIdForAuftrag(supabase, auftragId)
  if (!angRef.ok) return angRef

  const { data: angRow, error: loadErr } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angRef.angebotId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: loadErr.message }

  const bisher = parseZahlungsplan(angRow?.zahlungsplan) ?? emptyZahlungsplan()

  const { data: rechnungen } = await supabase
    .from('rechnungen')
    .select('id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, faellig_am')
    .eq('auftrag_id', auftragId)

  const links = (rechnungen ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    brutto: r.brutto as number | null,
    faellig_am: r.faellig_am as string | null,
  }))

  let normalized: Zahlungsplan = {
    modus: 'abschlagsplan',
    zeilen: plan.zeilen.map((z) => ({
      ...z,
      titel: z.titel.trim() || 'Abschlag',
      position_ids: z.position_ids?.length ? [...z.position_ids] : [],
    })),
  }

  if (!opts?.force && bisher.zeilen.length) {
    const merged = zahlplanMergeMitEinfrieren(bisher, normalized, links)
    if (!merged.ok) return merged
    normalized = merged.plan
  }

  const { data: auftragPosRows } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  let gesamtNetto = 0
  if (auftragPosRows?.length) {
    const asAngebot = auftragPositionenToAngebotPositionen(auftragPosRows as AuftragPosition[])
    gesamtNetto = auftragSummenAusPositionen(asAngebot).netto
  }

  const sumGate = validateZahlungsplanGegenGesamt(normalized, gesamtNetto)
  if (!sumGate.ok) return sumGate

  const { error } = await supabase
    .from('angebote')
    .update({ zahlungsplan: normalized, updated_at: new Date().toISOString() })
    .eq('id', angRef.angebotId)

  if (error) {
    if (error.message.includes('zahlungsplan')) {
      return {
        ok: false,
        message: 'Datenbank-Schema veraltet: Migration für Zahlungsplan ausführen.',
      }
    }
    return { ok: false, message: error.message }
  }

  // Verwaiste Voll-Entwürfe (z. B. nach Auftrag→Rechnung ohne Plan) bereinigen
  const stornoVoll = await storniereVerwaisteVollEntwuerfe(auftragId)
  if (!stornoVoll.ok) return stornoVoll

  // Alle Abschläge sofort als Entwürfe — Versand einzeln
  const entwuerfe = await ensureAbschlagEntwuerfeForAuftrag(auftragId, normalized)
  if (!entwuerfe.ok) return entwuerfe

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/angebote/${angRef.angebotId}`)
  revalidatePath('/vorgaenge')
  revalidatePath('/rechnungen')
  return { ok: true }
}

/** Gesamten Abschlagsplan-Vorschlag am Angebot entfernen (nur wenn keine Rate gestellt/bezahlt). */
export async function clearAuftragZahlungsplan(
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const angRef = await angebotIdForAuftrag(supabase, auftragId)
  if (!angRef.ok) return angRef

  const { data: angRow, error: loadErr } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angRef.angebotId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: loadErr.message }

  const plan = parseZahlungsplan(angRow?.zahlungsplan)
  const { data: rechnungen } = await supabase
    .from('rechnungen')
    .select('id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, faellig_am')
    .eq('auftrag_id', auftragId)

  const links = (rechnungen ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    brutto: r.brutto as number | null,
    faellig_am: r.faellig_am as string | null,
  }))

  const gate = zahlplanDarfGeloeschtWerden(plan, links)
  if (!gate.ok) return gate

  const { error } = await supabase
    .from('angebote')
    .update({
      zahlungsplan: emptyZahlungsplan(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', angRef.angebotId)

  if (error) return { ok: false, message: error.message }

  const stornoDrafts = await storniereAbschlagEntwuerfeForAuftrag(auftragId)
  if (!stornoDrafts.ok) return stornoDrafts

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/angebote/${angRef.angebotId}`)
  revalidatePath('/vorgaenge')
  revalidatePath('/rechnungen')
  return { ok: true }
}

/** Liest den unverbindlichen Vorschlag vom verknüpften Angebot (nicht vom Auftrag). */
export async function loadAuftragZahlungsplan(auftragId: string): Promise<Zahlungsplan | null> {
  const supabase = createClient()
  const { data: auf } = await supabase
    .from('auftraege')
    .select('angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  const angebotId = auf?.angebot_id ? String(auf.angebot_id) : ''
  if (!angebotId) return null
  const { data } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angebotId)
    .maybeSingle()
  return parseZahlungsplan(data?.zahlungsplan)
}

/**
 * Externe / bereits erfolgte Zahlung für eine Planzeile erfassen.
 * Legt eine kurze Rechnung an (Status bezahlt) und verknüpft sie mit der Zeile —
 * bestehende Plan-IDs bleiben, Rest-/Schlussberechnung berücksichtigt den Betrag.
 */
export async function erfasseExterneAbschlagZahlung(input: {
  auftragId: string
  zeileId: string
  /** Optional Brutto-Override; sonst Planbetrag der Zeile */
  brutto?: number | null
  notiz?: string | null
}): Promise<{ ok: true; rechnungId: string } | { ok: false; message: string }> {
  const auftragId = input.auftragId?.trim()
  const zeileId = input.zeileId?.trim()
  if (!auftragId || !zeileId) {
    return { ok: false, message: 'Auftrag oder Rate fehlt.' }
  }

  const supabase = createClient()
  const { data: auf, error: aufErr } = await supabase
    .from('auftraege')
    .select('id, kunde_id, angebot_id, titel, start_datum, end_datum')
    .eq('id', auftragId)
    .maybeSingle()

  if (aufErr || !auf) return { ok: false, message: aufErr?.message ?? 'Auftrag nicht gefunden.' }
  const kundeId = auf.kunde_id ? String(auf.kunde_id) : ''
  if (!kundeId) return { ok: false, message: 'Kein Kunde am Auftrag.' }

  const angRef = await angebotIdForAuftrag(supabase, auftragId)
  if (!angRef.ok) return angRef

  const { data: angRow } = await supabase
    .from('angebote')
    .select('zahlungsplan')
    .eq('id', angRef.angebotId)
    .maybeSingle()

  const plan = parseZahlungsplan(angRow?.zahlungsplan)
  if (!plan?.zeilen?.length) {
    return { ok: false, message: 'Kein Abschlagsplan — bitte zuerst Plan anlegen.' }
  }
  const zeile = plan.zeilen.find((z) => z.id === zeileId)
  if (!zeile) return { ok: false, message: 'Planzeile nicht gefunden.' }

  const { data: rechnungen } = await supabase
    .from('rechnungen')
    .select(
      'id, status, zahlungsplan_abschlag_id, rechnung_art, abschlag_index, brutto, faellig_am, beleg_typ'
    )
    .eq('auftrag_id', auftragId)

  const links = (rechnungen ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as string | null,
    zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id as string | null,
    rechnung_art: r.rechnung_art as string | null,
    abschlag_index: r.abschlag_index as number | null,
    brutto: r.brutto as number | null,
    faellig_am: r.faellig_am as string | null,
  }))

  if (abschlagBereitsAbgerechnet(zeileId, links)) {
    return {
      ok: false,
      message: 'Für diese Rate existiert bereits eine gestellte/bezahlte Rechnung.',
    }
  }

  const bestehenderEntwurf = links.find(
    (l) =>
      l.zahlungsplan_abschlag_id === zeileId &&
      String(l.status) === 'entwurf' &&
      (l.rechnung_art === 'abschlag' || l.rechnung_art === 'schluss')
  )
  if (bestehenderEntwurf) {
    const storno = await updateRechnungStatus(bestehenderEntwurf.id, 'storniert')
    if (!storno.ok) return storno
  }

  const { data: auftragPosRows } = await supabase
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  let gesamtNetto = 0
  if (auftragPosRows?.length) {
    const asAngebot = auftragPositionenToAngebotPositionen(auftragPosRows as AuftragPosition[])
    gesamtNetto = auftragSummenAusPositionen(asAngebot).netto
  }

  const kontext = berechneZahlungsplan(
    plan,
    gesamtNetto,
    19,
    links
      .filter((l) => l.zahlungsplan_abschlag_id && (l.status === 'gesendet' || l.status === 'bezahlt'))
      .map((l) => ({
        zeileId: String(l.zahlungsplan_abschlag_id),
        brutto: Number(l.brutto) || 0,
      }))
  )
  const berechnet = kontext.zeilen.find((z) => z.id === zeileId)
  if (!berechnet) return { ok: false, message: 'Rate konnte nicht berechnet werden.' }

  const bruttoOverride =
    input.brutto != null && Number.isFinite(Number(input.brutto)) && Number(input.brutto) > 0
      ? Math.round(Number(input.brutto) * 100) / 100
      : null
  const brutto = bruttoOverride ?? berechnet.brutto
  if (!(brutto > 0)) return { ok: false, message: 'Betrag muss größer 0 sein.' }

  const netto = Math.round((brutto / 1.19) * 100) / 100
  const heute = new Date().toISOString().slice(0, 10)
  const art = rechnungArtFuerZeile(berechnet)
  const notiz = (input.notiz ?? '').trim() || 'Extern erfasst — bereits bezahlt (ohne Versand).'

  const position: AngebotPosition = {
    id: crypto.randomUUID(),
    gewerk_id: '',
    gewerk_name: 'Abschlag',
    leistung: berechnet.titel || 'Abschlag',
    beschreibung: notiz,
    lohn_netto: netto,
    material_netto: 0,
    gesamt_min: netto,
    gesamt_max: netto,
    menge: 1,
    einheit: 'pauschal',
    preis_typ: 'fix',
  }

  const created = await createRechnungEntwurf({
    angebot_id: angRef.angebotId,
    auftrag_id: auftragId,
    kunde_id: kundeId,
    positionen: [position],
    leistungszeitraum_von: (auf.start_datum as string | null) ?? heute,
    leistungszeitraum_bis: (auf.end_datum as string | null) ?? heute,
    faellig_am: heute,
    rechnungsdatum: heute,
    einleitung: `Bereits bezahlter Abschlag „${berechnet.titel}“ (extern erfasst).`,
    hinweise: notiz,
    rechnung_art: art,
    abschlag_index: berechnet.index,
    zahlungsplan_abschlag_id: zeileId,
  })
  if (!created.ok) return created

  const paid = await updateRechnungStatus(created.id, 'bezahlt')
  if (!paid.ok) {
    return {
      ok: false,
      message: `Rechnung angelegt, Status bezahlt fehlgeschlagen: ${paid.message}`,
    }
  }

  // Als „gestellt“ markieren, damit Plan sie als abgerechnet erkennt (bezahlt zählt bereits)
  await supabase
    .from('rechnungen')
    .update({
      gesendet_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', created.id)
    .is('gesendet_at', null)

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/rechnungen/${created.id}`)
  revalidatePath('/vorgaenge')
  return { ok: true, rechnungId: created.id }
}
