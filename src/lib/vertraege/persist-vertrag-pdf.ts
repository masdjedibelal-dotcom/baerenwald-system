import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { renderVertragPdfBuffer } from '@/lib/pdf/vertrag-pdf'
import type { HandwerkerVertragRow, VertragHandwerkerSnapshot, VertragPdfPayload } from '@/lib/vertraege/types'

async function loadHandwerkerSnapshot(
  supabase: SupabaseClient,
  id: string
): Promise<VertragHandwerkerSnapshot | null> {
  const { data } = await supabase
    .from('handwerker')
    .select('id, name, firma, adresse, telefon, email, steuernummer, ustid')
    .eq('id', id)
    .maybeSingle()
  return data as VertragHandwerkerSnapshot | null
}

export function vertragRowToPdfPayload(
  row: HandwerkerVertragRow,
  firm: Awaited<ReturnType<typeof fetchFirmenEinstellungen>>,
  handwerker: VertragHandwerkerSnapshot
): VertragPdfPayload {
  return {
    typ: row.typ,
    vertrags_nr: row.vertrags_nr,
    bauvorhaben: row.bauvorhaben,
    gewerk_name: row.gewerk_name,
    leistungsumfang: row.leistungsumfang ?? '—',
    verguetung_text: row.verguetung_text,
    regiesatz_netto: row.regiesatz_netto,
    einbehalt_prozent: row.einbehalt_prozent,
    zahlungsziel_tage: row.zahlungsziel_tage,
    aufmass_rhythmus_tage: row.aufmass_rhythmus_tage,
    dokument_titel: row.dokument_titel,
    vertrag_vom: row.vertrag_vom,
    bezug_vertrag_vom: row.bezug_vertrag_vom,
    bezug_vertrags_nr: row.bezug_vertrags_nr,
    firm,
    handwerker,
  }
}

export async function persistPdfForVertrag(
  vertragId: string
): Promise<{ ok: true; buffer: Buffer; publicUrl: string } | { ok: false; message: string }> {
  const { data: row, error } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('*')
    .eq('id', vertragId)
    .maybeSingle()

  if (error || !row) return { ok: false, message: error?.message ?? 'Vertrag nicht gefunden' }

  const vertrag = row as HandwerkerVertragRow
  const handwerker = await loadHandwerkerSnapshot(supabaseAdmin, vertrag.handwerker_id)
  if (!handwerker) return { ok: false, message: 'Handwerker nicht gefunden' }

  const firm = await fetchFirmenEinstellungen(supabaseAdmin)
  const payload = vertragRowToPdfPayload(vertrag, firm, handwerker)

  let buffer: Buffer
  try {
    buffer = await renderVertragPdfBuffer(payload)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'PDF-Render fehlgeschlagen' }
  }

  const path = `${vertrag.typ}/${vertragId}/${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('vertraege-pdfs')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('vertraege-pdfs').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  await supabaseAdmin
    .from('handwerker_vertraege')
    .update({
      pdf_url: publicUrl,
      status: 'pdf_erzeugt',
      updated_at: new Date().toISOString(),
    })
    .eq('id', vertragId)

  if (vertrag.auftrag_id) revalidatePath(`/auftraege/${vertrag.auftrag_id}`)
  revalidatePath(`/handwerker/${vertrag.handwerker_id}`)

  return { ok: true, buffer, publicUrl }
}
