'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

/** Erzeugt Versicherungsakte als einfaches Text-PDF (Platzhalter bis Voll-PDF-Template). */
export async function erzeugeVersicherungsaktePdf(auftragId: string): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const id = auftragId?.trim()
  if (!id) return { ok: false, message: 'Auftrag fehlt.' }

  const { data: auftrag, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunde_id, kostentraeger, versicherungs_nr, lead_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !auftrag) return { ok: false, message: error?.message ?? 'Auftrag nicht gefunden.' }

  const { data: befundRows } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('titel, beschreibung, datum, foto_urls, handwerker(name, firma)')
    .eq('auftrag_id', id)
    .eq('eintrag_typ', 'befund')
    .order('datum', { ascending: true })
    .limit(5)

  const befundText = (befundRows ?? [])
    .map((row) => {
      const hwRaw = row.handwerker as { name?: string; firma?: string } | { name?: string; firma?: string }[] | null
      const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
      const partner = String(hw?.firma ?? hw?.name ?? 'Partner').trim()
      const fotos = Array.isArray(row.foto_urls) ? row.foto_urls.length : 0
      return [
        `Partner: ${partner}`,
        `Datum: ${String(row.datum ?? '').slice(0, 10)}`,
        String(row.titel ?? 'Schadenbefund'),
        String(row.beschreibung ?? '').trim(),
        fotos > 0 ? `Fotos: ${fotos} Anhang/Anhänge` : 'Fotos: —',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  const toc = [
    '1. Deckblatt',
    '2. Schadensmeldung',
    '3. Fotos vorher',
    '4. Befund',
    '5. Nachher-Fotos',
    '6. Abnahmeprotokoll',
    '7. Rechnung',
    '8. Trocknungsnachweis — nicht erforderlich',
  ].join('\n')

  const body = [
    'VERSICHERUNGSAKTE',
    `Auftrag: ${id}`,
    `Kostenträger: ${auftrag.kostentraeger ?? '—'}`,
    `Versicherungs-Nr.: ${auftrag.versicherungs_nr ?? '—'}`,
    '',
    'INHALTSVERZEICHNIS',
    toc,
    '',
    '--- 1. Deckblatt ---',
    'Versicherungsakte Musterverwaltung / Bärenwald',
    '',
    '--- 2. Schadensmeldung ---',
    '(Anhang: Meldungstext)',
    '',
    '--- 3. Fotos vorher ---',
    '(Anhang: Fotodokumentation Schaden)',
    '',
    '--- 4. Befund ---',
    befundText || '(Kein Partner-Befund hinterlegt)',
    '',
    '--- 5. Nachher-Fotos ---',
    '(Anhang: Fotodokumentation nach Ausführung)',
    '',
    '--- 6. Abnahmeprotokoll ---',
    '(Anhang: Digitale Abnahme)',
    '',
    '--- 7. Rechnung ---',
    '(Anhang: Rechnung mit §35a-Ausweis)',
    '',
    '--- 8. Trocknungsnachweis ---',
    'Nicht erforderlich.',
    '',
    `Erstellt: ${new Date().toISOString()}`,
  ].join('\n')

  const pdfBytes = Buffer.from(
    `%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n% ${body.replace(/\n/g, ' ')}`,
    'utf8'
  )

  const path = `versicherungsakten/${id}.pdf`
  const bucket = 'protokolle'
  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, pdfBytes, { upsert: true, contentType: 'application/pdf' })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  const url = pub.publicUrl

  await supabaseAdmin
    .from('auftraege')
    .update({ versicherungsakte_pdf_url: url })
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
