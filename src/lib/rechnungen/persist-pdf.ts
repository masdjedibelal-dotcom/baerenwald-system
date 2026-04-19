import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Kunde, Rechnung } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { renderRechnungPdfBuffer } from '@/lib/pdf/rechnung-pdf'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'

export async function buildRechnungPdfBuffer(
  supabase: SupabaseClient,
  rechnungId: string
): Promise<
  { ok: true; buffer: Buffer; rechnungsnummer: string } | { ok: false; message: string }
> {
  const { data: rec, error } = await supabase
    .from('rechnungen')
    .select(
      `
      *,
      kunden(*)
    `
    )
    .eq('id', rechnungId)
    .maybeSingle()

  if (error || !rec) return { ok: false, message: 'Rechnung nicht gefunden' }

  const row = rec as Rechnung & { kunden?: Kunde | null }
  if (!row.kunden) return { ok: false, message: 'Kunde fehlt' }

  const positionen = normalizeAngebotPositionen(row.positionen)
  const firm = await fetchFirmenEinstellungen(supabase)
  const mwst = Number(row.mwst_satz) || DEFAULT_MWST_SATZ
  const summen = summenAusPositionen(positionen, mwst)

  try {
    const buf = Buffer.from(
      await renderRechnungPdfBuffer({
        firm,
        kunde: row.kunden,
        rechnungsnummer: row.rechnungsnummer,
        rechnungsdatum: String(row.rechnungsdatum),
        leistungszeitraum_von: row.leistungszeitraum_von,
        leistungszeitraum_bis: row.leistungszeitraum_bis,
        faellig_am: row.faellig_am,
        positionen,
        summen,
        betraegeDb: {
          lohn_netto: row.lohn_netto,
          material_netto: row.material_netto,
          netto: row.netto,
          mwst_betrag: row.mwst_betrag,
          brutto: row.brutto,
          mwst_satz: row.mwst_satz,
        },
      })
    )
    return { ok: true, buffer: buf, rechnungsnummer: row.rechnungsnummer }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'PDF-Render fehlgeschlagen',
    }
  }
}

export async function persistPdfForRechnung(
  rechnungId: string
): Promise<{ ok: true; buffer: Buffer; publicUrl: string } | { ok: false; message: string }> {
  const built = await buildRechnungPdfBuffer(supabaseAdmin, rechnungId)
  if (!built.ok) return built

  const buffer = built.buffer
  const path = `${rechnungId}/${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('rechnungen-pdfs')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: true })

  if (upErr) return { ok: false, message: upErr.message }

  const { data: pub } = supabaseAdmin.storage.from('rechnungen-pdfs').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  await supabaseAdmin
    .from('rechnungen')
    .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', rechnungId)

  revalidatePath(`/rechnungen/${rechnungId}`)
  return { ok: true, buffer, publicUrl }
}
