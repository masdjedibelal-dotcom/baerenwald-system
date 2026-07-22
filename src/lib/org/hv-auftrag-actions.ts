'use server'

import { generateVersicherungsaktePdf } from '@/lib/org/generate-versicherungsakte-pdf'
import { supabaseAdmin } from '@/lib/supabase-admin'

function hergangFromLead(lead: {
  kontakt_nachricht?: string | null
  notizen?: string | null
  situation?: string | null
  melder_name?: string | null
  created_at?: string | null
}): string {
  const bits: string[] = []
  if (lead.created_at) {
    const d = new Date(lead.created_at).toLocaleDateString('de-DE')
    bits.push(
      `Am ${d} wurde der Schaden gemeldet` +
        (lead.melder_name ? ` (${lead.melder_name})` : '') +
        '.'
    )
  }
  const body =
    lead.kontakt_nachricht?.trim() ||
    lead.notizen?.trim() ||
    lead.situation?.trim()
  if (body) bits.push(body)
  return bits.join(' ') || 'Schadenmeldung aus dem Vorgang.'
}

/** Erzeugt echte Schadenakte (pdf-lib) und speichert URL am Auftrag. */
export async function erzeugeVersicherungsaktePdf(auftragId: string): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const id = auftragId?.trim()
  if (!id) return { ok: false, message: 'Auftrag fehlt.' }

  const { data: auftrag, error } = await supabaseAdmin
    .from('auftraege')
    .select(
      'id, kunde_id, kostentraeger, versicherungs_nr, lead_id, titel, abnahme_protokoll_url, abnahme_datum, created_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !auftrag) {
    return { ok: false, message: error?.message ?? 'Auftrag nicht gefunden.' }
  }

  let lead: Record<string, unknown> | null = null
  if (auftrag.lead_id) {
    const { data } = await supabaseAdmin
      .from('leads')
      .select(
        'id, kostentraeger, versicherungs_nr, kontakt_nachricht, notizen, situation, melder_name, created_at, strasse, hausnummer, plz, kunde_objekt_id'
      )
      .eq('id', auftrag.lead_id)
      .maybeSingle()
    lead = data
  }

  const versNr =
    String(auftrag.versicherungs_nr ?? lead?.versicherungs_nr ?? '').trim() || null

  let orgName = 'Hausverwaltung'
  if (auftrag.kunde_id) {
    const { data: kunde } = await supabaseAdmin
      .from('kunden')
      .select('name')
      .eq('id', auftrag.kunde_id)
      .maybeSingle()
    if (kunde?.name) orgName = String(kunde.name)
  }

  let objektTitel = String(auftrag.titel ?? 'Objekt')
  let objektAdresse: string | undefined
  const street = [lead?.strasse, lead?.hausnummer].filter(Boolean).join(' ').trim()
  const plz = lead?.plz ? String(lead.plz) : ''
  if (street || plz) objektAdresse = [street, plz].filter(Boolean).join(', ')

  if (lead?.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from('kunden_objekte')
      .select('titel, strasse, hausnummer, plz')
      .eq('id', lead.kunde_objekt_id)
      .maybeSingle()
    if (obj?.titel) objektTitel = String(obj.titel)
    const oStreet = [obj?.strasse, obj?.hausnummer].filter(Boolean).join(' ').trim()
    const oPlz = obj?.plz ? String(obj.plz) : ''
    if (oStreet || oPlz) objektAdresse = [oStreet, oPlz].filter(Boolean).join(', ')
  }

  const { data: befundRows } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('titel, beschreibung, datum, foto_urls, eintrag_typ')
    .eq('auftrag_id', id)
    .order('datum', { ascending: true })
    .limit(40)

  const befundZeilen = (befundRows ?? [])
    .filter((r) => String(r.eintrag_typ ?? '') === 'befund')
    .map((row) => ({
      datum: String(row.datum ?? ''),
      titel: String(row.titel ?? 'Schadenbefund'),
      text: String(row.beschreibung ?? '').trim(),
      fotoCount: Array.isArray(row.foto_urls) ? row.foto_urls.length : 0,
    }))

  const chronologie = (befundRows ?? []).map((row) => ({
    datum: String(row.datum ?? ''),
    text: `${String(row.titel ?? 'Eintrag')}${
      row.eintrag_typ === 'befund' ? ' (Befund)' : ''
    }`,
  }))

  const { data: rechnungen } = await supabaseAdmin
    .from('rechnungen')
    .select('rechnungsnummer, status')
    .eq('auftrag_id', id)
    .order('created_at', { ascending: false })
    .limit(3)

  const rechnungHinweis =
    (rechnungen ?? [])
      .map((r) => {
        const nr = r.rechnungsnummer?.trim() || 'ohne Nr.'
        return `Rechnung ${nr} (Status: ${r.status ?? '—'})`
      })
      .join('; ') || null

  const pdfBytes = await generateVersicherungsaktePdf({
    orgName,
    objektTitel,
    objektAdresse,
    versicherungsNr: versNr,
    schadenNr: versNr,
    schadendatum:
      (lead?.created_at as string | undefined) ??
      (auftrag.created_at as string | undefined) ??
      null,
    kostentraegerLabel: 'Versicherung',
    hergang: hergangFromLead({
      kontakt_nachricht: lead?.kontakt_nachricht as string | null,
      notizen: lead?.notizen as string | null,
      situation: lead?.situation as string | null,
      melder_name: lead?.melder_name as string | null,
      created_at: lead?.created_at as string | null,
    }),
    chronologie,
    befundZeilen,
    abnahmeHinweis: auftrag.abnahme_protokoll_url
      ? `Abnahmeprotokoll vorhanden${
          auftrag.abnahme_datum ? ` (${auftrag.abnahme_datum})` : ''
        }.`
      : null,
    rechnungHinweis,
  })

  const path = `versicherungsakten/${id}.pdf`
  const bucket = 'protokolle'
  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, Buffer.from(pdfBytes), {
      upsert: true,
      contentType: 'application/pdf',
    })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  const url = pub.publicUrl

  await supabaseAdmin
    .from('auftraege')
    .update({
      versicherungsakte_pdf_url: url,
      kostentraeger: 'versicherung',
      ...(versNr ? { versicherungs_nr: versNr } : {}),
    })
    .eq('id', id)

  if (auftrag.lead_id) {
    const { writeAuditEvent } = await import('@/lib/audit/write-audit-event')
    await writeAuditEvent({
      entityType: 'auftrag',
      entityId: id,
      aktion: 'versicherungsakte_erstellt',
      kundeId: auftrag.kunde_id ?? null,
      payload: { url, lead_id: auftrag.lead_id },
    })
  }

  return { ok: true, url }
}

/** Gewährleistungseintrag nach Abnahme (+5 Jahre). */
export async function registriereGewaehrleistung(
  auftragId: string,
  abnahmeAm: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = auftragId?.trim()
  if (!id || !abnahmeAm) return { ok: false, message: 'Auftrag oder Abnahmedatum fehlt.' }

  const abnahme = new Date(abnahmeAm)
  if (Number.isNaN(abnahme.getTime())) return { ok: false, message: 'Ungültiges Datum.' }

  const frist = new Date(abnahme)
  frist.setFullYear(frist.getFullYear() + 5)

  const { data: auftrag } = await supabaseAdmin
    .from('auftraege')
    .select('id, partner_id')
    .eq('id', id)
    .maybeSingle()

  if (!auftrag) return { ok: false, message: 'Auftrag nicht gefunden.' }

  const { error } = await supabaseAdmin.from('gewaehrleistungen').insert({
    auftrag_id: id,
    partner_id: auftrag.partner_id ?? null,
    abnahme_am: abnahmeAm,
    frist_bis: frist.toISOString().slice(0, 10),
    status: 'aktiv',
  })

  if (error) return { ok: false, message: error.message }
  return { ok: true }
}
