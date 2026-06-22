import { supabaseAdmin } from '@/lib/supabase-admin'
import { persistPdfForVertrag } from '@/lib/vertraege/persist-vertrag-pdf'
import { nextVertragsnummer } from '@/lib/vertraege/next-vertragsnummer'
import {
  bauvorhabenAusAuftrag,
  leistungsumfangAusPositionen,
  verguetungAusPositionen,
} from '@/lib/vertraege/build-vertrag-texte'
import type { AuftragPosition } from '@/lib/types'
import { sendProjektvertragBereitMail } from '@/lib/vertraege/send-projektvertrag-bereit-mail'

function unwrapJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

function positionenFuerZuordnung(
  positionen: AuftragPosition[],
  handwerkerId: string,
  gewerkName: string
): AuftragPosition[] {
  const gn = gewerkName.trim().toLowerCase()
  return positionen.filter(
    (p) =>
      p.handwerker_id === handwerkerId ||
      (gn && p.gewerk_name?.trim().toLowerCase() === gn)
  )
}

/** Legt nach CRM-Übernahme einen Projektvertrag an (pdf_erzeugt), falls noch keiner existiert. */
export async function provisionProjektVertragFuerHandwerker(
  auftragId: string,
  handwerkerId: string
): Promise<{ ok: true; vertrag_id: string; created: boolean } | { ok: false; message: string }> {
  const { data: existing } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('id, pdf_url')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .eq('typ', 'projekt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.pdf_url?.trim()) {
    return { ok: true, vertrag_id: existing.id as string, created: false }
  }

  const { data: zuordnung } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('gewerk_id, gewerke(name)')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .maybeSingle()

  if (!zuordnung) {
    return { ok: false, message: 'Keine Handwerker-Zuordnung am Auftrag.' }
  }

  const gewerk = unwrapJoin(
    (zuordnung as { gewerke?: { name: string } | { name: string }[] | null }).gewerke
  )
  const gewerkName = gewerk?.name ?? ''
  const gewerkId = (zuordnung as { gewerk_id?: string | null }).gewerk_id ?? null

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(plz, ort, adresse, strasse, hausnummer), auftrag_positionen(*)')
    .eq('id', auftragId)
    .maybeSingle()

  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }

  const positionen = (auf.auftrag_positionen ?? []) as AuftragPosition[]
  const pos = positionenFuerZuordnung(positionen, handwerkerId, gewerkName)
  const kunde = auf.kunden as {
    adresse?: string | null
    strasse?: string | null
    hausnummer?: string | null
    plz?: string | null
    ort?: string | null
  } | null
  const kundeAdr =
    kunde?.adresse?.trim() ||
    [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(' ').trim() ||
    null

  const now = new Date().toISOString()
  const vertragsNr = await nextVertragsnummer(supabaseAdmin, 'projekt')

  let vertragId = existing?.id as string | undefined

  const row = {
    typ: 'projekt' as const,
    vertrags_nr: vertragsNr,
    auftrag_id: auftragId,
    handwerker_id: handwerkerId,
    gewerk_id: gewerkId,
    gewerk_name: gewerkName || null,
    bauvorhaben: bauvorhabenAusAuftrag({
      titel: (auf.titel as string | null) ?? 'Auftrag',
      kunde_adresse: kundeAdr,
      kunde_plz: kunde?.plz ?? null,
      kunde_ort: kunde?.ort ?? null,
      gewerk_name: gewerkName,
    }),
    leistungsumfang: leistungsumfangAusPositionen(pos),
    verguetung_text: verguetungAusPositionen(pos),
    regiesatz_netto: 56,
    einbehalt_prozent: 5,
    zahlungsziel_tage: 14,
    aufmass_rhythmus_tage: 14,
    notizen: 'Automatisch nach CRM-Übernahme erzeugt — Partner bestätigt im Portal.',
    updated_at: now,
  }

  if (vertragId) {
    const { error } = await supabaseAdmin.from('handwerker_vertraege').update(row).eq('id', vertragId)
    if (error) return { ok: false, message: error.message }
  } else {
    const { data: ins, error } = await supabaseAdmin
      .from('handwerker_vertraege')
      .insert({ ...row, status: 'entwurf', created_at: now })
      .select('id')
      .single()
    if (error || !ins) return { ok: false, message: error?.message ?? 'Vertrag anlegen fehlgeschlagen' }
    vertragId = ins.id as string
  }

  const pdf = await persistPdfForVertrag(vertragId)
  if (!pdf.ok) return pdf

  const mail = await sendProjektvertragBereitMail({
    auftragId,
    handwerkerId,
    vertragId,
  })
  if (!mail.ok) {
    console.warn('[provisionProjektVertrag] vertrag-bereit-mail:', mail.message)
  } else if (!mail.gesendet && mail.hinweis) {
    console.warn('[provisionProjektVertrag] vertrag-bereit-mail:', mail.hinweis)
  }

  return { ok: true, vertrag_id: vertragId, created: true }
}
