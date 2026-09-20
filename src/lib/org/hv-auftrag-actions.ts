'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { generateVersicherungsaktePdf } from '@/lib/org/generate-versicherungsakte-pdf'
import { supabaseAdmin } from '@/lib/supabase-admin'

function hergangFromLead(lead: {
  kontakt_nachricht?: string | null
  notizen?: string | null
  situation?: string | null
}): string {
  const beschreibung =
    lead.kontakt_nachricht?.trim() || lead.notizen?.trim() || ''
  if (beschreibung) return beschreibung
  const sit = lead.situation?.trim()
  if (sit && !/^(reparatur|notfall|schaden|sonstiges)$/i.test(sit)) return sit
  return 'Schadensbeschreibung fehlt — bitte vor Einreichung bei der Versicherung ergänzen.'
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
  if (error) logDbError('lib/org/hv-auftrag-actions:auftraege', error)

  if (error || !auftrag) {
    return { ok: false, message: error?.message ?? 'Auftrag nicht gefunden.' }
  }

  if (!auftrag.lead_id) {
    return {
      ok: false,
      message:
        'Schadenakte entfällt bei Direkt-Auftrag/Rechnung ohne Meldung.',
    }
  }

  let lead: Record<string, unknown> | null = null
  if (auftrag.lead_id) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select(
        'id, kostentraeger, versicherungs_nr, kontakt_nachricht, notizen, situation, melder_name, created_at, strasse, hausnummer, plz, kunde_objekt_id, funnel_daten'
      )
      .eq('id', auftrag.lead_id)
      .maybeSingle()
    if (error) logDbError('lib/org/hv-auftrag-actions:leads', error)
    lead = data
  }

  const funnel = lead?.funnel_daten
  const quelle =
    funnel && typeof funnel === 'object' && !Array.isArray(funnel)
      ? String((funnel as { quelle?: unknown }).quelle ?? '').trim()
      : ''
  if (quelle === 'crm_direkt_angebot') {
    return {
      ok: false,
      message:
        'Schadenakte entfällt bei Direkt-Angebot (kein Melde-Hergang).',
    }
  }

  const versNr =
    String(auftrag.versicherungs_nr ?? lead?.versicherungs_nr ?? '').trim() || null

  let orgName = 'Hausverwaltung'
  if (auftrag.kunde_id) {
    const { data: kunde, error } = await supabaseAdmin
      .from('kunden')
      .select('name')
      .eq('id', auftrag.kunde_id)
      .maybeSingle()
    if (error) logDbError('lib/org/hv-auftrag-actions:kunden', error)
    if (kunde?.name) orgName = String(kunde.name)
  }

  let objektTitel = String(auftrag.titel ?? 'Objekt')
  let objektAdresse: string | undefined
  const street = [lead?.strasse, lead?.hausnummer].filter(Boolean).join(' ').trim()
  const plz = lead?.plz ? String(lead.plz) : ''
  if (street || plz) objektAdresse = [street, plz].filter(Boolean).join(', ')

  if (lead?.kunde_objekt_id) {
    const { data: obj, error } = await supabaseAdmin
      .from('kunden_objekte')
      .select('titel, strasse, hausnummer, plz')
      .eq('id', lead.kunde_objekt_id)
      .maybeSingle()
    if (error) logDbError('lib/org/hv-auftrag-actions:kunden_objekte', error)
    if (obj?.titel) objektTitel = String(obj.titel)
    const oStreet = [obj?.strasse, obj?.hausnummer].filter(Boolean).join(' ').trim()
    const oPlz = obj?.plz ? String(obj.plz) : ''
    if (oStreet || oPlz) objektAdresse = [oStreet, oPlz].filter(Boolean).join(', ')
  }

  const { data: befundRows, error: error2 } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('titel, beschreibung, datum, foto_urls, eintrag_typ')
    .eq('auftrag_id', id)
    .order('datum', { ascending: true })
    .limit(40)
  if (error2) logDbError('lib/org/hv-auftrag-actions:auftrag_bautagebuch_eintraege', error2)

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

  const { data: rechnungen, error: error3 } = await supabaseAdmin
    .from('rechnungen')
    .select('rechnungsnummer, status')
    .eq('auftrag_id', id)
    .order('created_at', { ascending: false })
    .limit(3)
  if (error3) logDbError('lib/org/hv-auftrag-actions:rechnungen', error3)

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
    schadendatum:
      (lead?.created_at as string | undefined) ??
      (auftrag.created_at as string | undefined) ??
      null,
    kostentraegerLabel: 'Versicherung',
    hergang: hergangFromLead({
      kontakt_nachricht: lead?.kontakt_nachricht as string | null,
      notizen: lead?.notizen as string | null,
      situation: lead?.situation as string | null,
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
  if (upErr) logDbError('lib/org/hv-auftrag-actions:query', upErr)

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  const url = pub.publicUrl

  const { error: __dbErr1 } = await supabaseAdmin
    .from('auftraege')
    .update({
      versicherungsakte_pdf_url: url,
      kostentraeger: 'versicherung',
      ...(versNr ? { versicherungs_nr: versNr } : {}),
    })
    .eq('id', id)
  if (__dbErr1) logDbError('lib/org/hv-auftrag-actions:auftraege', __dbErr1)

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

  const { data: auftrag, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, partner_id')
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('lib/org/hv-auftrag-actions:auftraege', error)

  if (!auftrag) return { ok: false, message: 'Auftrag nicht gefunden.' }

  const { error: error2 } = await supabaseAdmin.from('gewaehrleistungen').insert({
    auftrag_id: id,
    partner_id: auftrag.partner_id ?? null,
    abnahme_am: abnahmeAm,
    frist_bis: frist.toISOString().slice(0, 10),
    status: 'aktiv',
  })
  if (error2) logDbError('lib/org/hv-auftrag-actions:gewaehrleistungen', error2)

  if (error2) return { ok: false, message: error2.message }
  return { ok: true }
}
