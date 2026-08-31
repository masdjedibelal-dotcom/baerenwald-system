import { supabaseAdmin } from '@/lib/supabase-admin'
import { normalizeHwRechnungStatus } from '@/lib/rechnungen/load-hw-eingangsrechnungen'

export type EnsurePartnerEingangsRechnungResult =
  | { ok: true; rechnungId: string; created: boolean }
  | { ok: false; error: string }

function mapHwStatusToRechnungStatus(
  raw: string | null | undefined
): 'gesendet' | 'bezahlt' | 'storniert' {
  const s = normalizeHwRechnungStatus(raw)
  if (s === 'bezahlt') return 'bezahlt'
  if (s === 'abgelehnt') return 'storniert'
  return 'gesendet'
}

/**
 * Partner-Rechnung → eigener CRM-Vorgang in `rechnungen` (richtung=eingehend),
 * analog zu ausgehenden Kundenrechnungen.
 */
export async function ensurePartnerEingangsRechnungVorgang(
  angebotHandwerkerId: string
): Promise<EnsurePartnerEingangsRechnungResult> {
  const ahId = angebotHandwerkerId.trim()
  if (!ahId) return { ok: false, error: 'Zuweisung fehlt.' }

  const { data: existing } = await supabaseAdmin
    .from('rechnungen')
    .select('id')
    .eq('angebot_handwerker_id', ahId)
    .maybeSingle()

  const { data: ah, error: ahErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(
      `
      id,
      angebot_id,
      handwerker_id,
      hw_rechnung_pdf_url,
      hw_rechnung_eingereicht_at,
      hw_rechnung_status,
      hw_rechnung_bezahlt_at,
      hw_rechnung_betrag_brutto,
      hw_preis_brutto,
      handwerker:handwerker_id ( id, name, firma ),
      angebote:angebot_id ( id, kunde_id, angebotsnr, lead_id )
    `
    )
    .eq('id', ahId)
    .maybeSingle()

  if (ahErr || !ah) {
    return { ok: false, error: ahErr?.message ?? 'Zuweisung nicht gefunden.' }
  }

  const pdfPath = String(ah.hw_rechnung_pdf_url ?? '').trim()
  if (!pdfPath) {
    return { ok: false, error: 'Keine Partner-Rechnung vorhanden.' }
  }

  const ang = ah.angebote as
    | { id?: string; kunde_id?: string | null; angebotsnr?: string | null; lead_id?: string | null }
    | { id?: string; kunde_id?: string | null; angebotsnr?: string | null; lead_id?: string | null }[]
    | null
  const angebot = Array.isArray(ang) ? ang[0] : ang
  const angebotId = String(ah.angebot_id ?? angebot?.id ?? '').trim()
  let kundeId = String(angebot?.kunde_id ?? '').trim()

  let auftragId: string | null = null
  let auftragTitel: string | null = null
  let leistungszeitraumVon: string | null = null
  let leistungszeitraumBis: string | null = null
  if (angebotId) {
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('id, titel, kunde_id, start_datum, end_datum')
      .eq('angebot_id', angebotId)
      .neq('status', 'storniert')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (auf?.id) {
      auftragId = String(auf.id)
      auftragTitel = (auf.titel as string | null)?.trim() || null
      if (!kundeId) kundeId = String(auf.kunde_id ?? '').trim()
      leistungszeitraumVon = String(auf.start_datum ?? '').trim().slice(0, 10) || null
      leistungszeitraumBis = String(auf.end_datum ?? '').trim().slice(0, 10) || null
    }
  }

  if (!kundeId) {
    return { ok: false, error: 'Kein Kunde für Eingangsrechnung ableitbar.' }
  }

  const hw = ah.handwerker as
    | { id?: string; name?: string | null; firma?: string | null }
    | { id?: string; name?: string | null; firma?: string | null }[]
    | null
  const hwRow = Array.isArray(hw) ? hw[0] : hw
  const hwName =
    hwRow?.firma?.trim() || hwRow?.name?.trim() || 'Partner'
  const handwerkerId = String(ah.handwerker_id ?? hwRow?.id ?? '').trim() || null

  const betragRaw =
    ah.hw_rechnung_betrag_brutto != null && Number.isFinite(Number(ah.hw_rechnung_betrag_brutto))
      ? Number(ah.hw_rechnung_betrag_brutto)
      : ah.hw_preis_brutto != null && Number.isFinite(Number(ah.hw_preis_brutto))
        ? Number(ah.hw_preis_brutto)
        : null

  const status = mapHwStatusToRechnungStatus(ah.hw_rechnung_status as string | null)
  const reverseCharge13b = Boolean(
    (ah as { hw_rechnung_reverse_charge_13b?: boolean | null }).hw_rechnung_reverse_charge_13b
  )
  const eingereichtAt =
    String(ah.hw_rechnung_eingereicht_at ?? '').trim() || new Date().toISOString()
  const rechnungsdatum = eingereichtAt.slice(0, 10)
  const nrSuffix = ahId.replace(/-/g, '').slice(0, 8).toUpperCase()
  const rechnungsnummer =
    String(angebot?.angebotsnr ?? '').trim()
      ? `ER-${String(angebot?.angebotsnr).trim()}`
      : `ER-${nrSuffix}`

  // Positions-Zeitraum des Partners, falls Auftrag keinen Zeitraum hat
  if (auftragId && handwerkerId && (!leistungszeitraumVon || !leistungszeitraumBis)) {
    const { data: posRows } = await supabaseAdmin
      .from('auftrag_positionen')
      .select('start_datum, end_datum')
      .eq('auftrag_id', auftragId)
      .eq('handwerker_id', handwerkerId)
      .not('start_datum', 'is', null)
      .order('start_datum', { ascending: true })
      .limit(20)
    const starts = (posRows ?? [])
      .map((p) => String(p.start_datum ?? '').trim().slice(0, 10))
      .filter(Boolean)
      .sort()
    const ends = (posRows ?? [])
      .map((p) => String(p.end_datum ?? p.start_datum ?? '').trim().slice(0, 10))
      .filter(Boolean)
      .sort()
    if (!leistungszeitraumVon && starts[0]) leistungszeitraumVon = starts[0]
    if (!leistungszeitraumBis && ends.length) leistungszeitraumBis = ends[ends.length - 1]
  }
  if (!leistungszeitraumVon) leistungszeitraumVon = rechnungsdatum
  if (!leistungszeitraumBis) leistungszeitraumBis = leistungszeitraumVon

  const payload: Record<string, unknown> = {
    richtung: 'eingehend',
    angebot_handwerker_id: ahId,
    handwerker_id: handwerkerId,
    angebot_id: angebotId || null,
    auftrag_id: auftragId,
    kunde_id: kundeId,
    rechnungsnummer,
    status,
    beleg_typ: 'rechnung',
    rechnung_art: 'voll',
    positionen: [
      {
        id: `er-${ahId.slice(0, 8)}`,
        leistung: `Partner-Rechnung · ${hwName}`,
        menge: 1,
        einheit: 'Pauschale',
        lohn_netto: betragRaw ?? 0,
        material_netto: 0,
        vk_netto: betragRaw ?? 0,
        gesamt_min: betragRaw ?? 0,
        gesamt_max: betragRaw ?? 0,
        gewerk_id: '',
        gewerk_name: '',
        preis_typ: 'fix',
      },
    ],
    netto: betragRaw,
    brutto: betragRaw,
    mwst_satz: 0,
    mwst_betrag: 0,
    reverse_charge_13b: reverseCharge13b,
    pdf_url: pdfPath,
    rechnungsdatum,
    leistungszeitraum_von: leistungszeitraumVon,
    leistungszeitraum_bis: leistungszeitraumBis,
    gesendet_at: eingereichtAt,
    bezahlt_at:
      status === 'bezahlt'
        ? String(ah.hw_rechnung_bezahlt_at ?? '').trim() || eingereichtAt
        : null,
    hinweise: auftragTitel
      ? `Eingangsrechnung Partner zu Auftrag „${auftragTitel}“.`
      : 'Eingangsrechnung Partner.',
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error: upErr } = await supabaseAdmin
      .from('rechnungen')
      .update(payload)
      .eq('id', existing.id)
    if (upErr) return { ok: false, error: upErr.message }
    return { ok: true, rechnungId: String(existing.id), created: false }
  }

  const { data: created, error: insErr } = await supabaseAdmin
    .from('rechnungen')
    .insert({
      ...payload,
      created_at: eingereichtAt,
    })
    .select('id')
    .single()

  if (insErr || !created?.id) {
    // Race: parallel insert
    if (/unique|duplicate/i.test(insErr?.message ?? '')) {
      const { data: again } = await supabaseAdmin
        .from('rechnungen')
        .select('id')
        .eq('angebot_handwerker_id', ahId)
        .maybeSingle()
      if (again?.id) {
        await supabaseAdmin.from('rechnungen').update(payload).eq('id', again.id)
        return { ok: true, rechnungId: String(again.id), created: false }
      }
    }
    return { ok: false, error: insErr?.message ?? 'Rechnung konnte nicht angelegt werden.' }
  }

  const rechnungId = String(created.id)
  return { ok: true, rechnungId, created: true }
}

/** Alle vorhandenen Partner-PDFs als Vorgänge nachziehen. */
export async function backfillPartnerEingangsRechnungVorgaenge(): Promise<{
  ok: number
  failed: number
}> {
  const { data } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id')
    .not('hw_rechnung_pdf_url', 'is', null)
    .limit(500)

  let ok = 0
  let failed = 0
  for (const row of data ?? []) {
    const r = await ensurePartnerEingangsRechnungVorgang(String(row.id))
    if (r.ok) ok += 1
    else failed += 1
  }
  return { ok, failed }
}
