import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Kunde, Rechnung } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { renderRechnungPdfForDetail } from '@/lib/rechnungen/render-rechnung-pdf-for-detail'
import { loadRechnungDetailForPdf } from '@/lib/rechnungen/rechnung-html-payload'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { berechneRechnung, parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { validateRechnungPflichtangaben } from '@/lib/rechnung-validierung'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { loadGewerkeAusfuehrung, sanitizeAngebotPositionenForExport } from '@/lib/gewerke-ausfuehrung'

export async function buildRechnungPdfBuffer(
  supabase: SupabaseClient,
  rechnungId: string
): Promise<
  { ok: true; buffer: Buffer; rechnungsnummer: string } | { ok: false; message: string }
> {
  const detail = await loadRechnungDetailForPdf(supabase, rechnungId)
  if (!detail) return { ok: false, message: 'Rechnung nicht gefunden' }
  if (!detail.kunden) return { ok: false, message: 'Kunde fehlt' }

  const row = detail
  const kunde = row.kunden
  if (!kunde) return { ok: false, message: 'Kunde fehlt' }

  let bezugNr: string | null = null
  if (row.bezug_rechnung_id) {
    const { data: bezug } = await supabase
      .from('rechnungen')
      .select('rechnungsnummer')
      .eq('id', row.bezug_rechnung_id)
      .maybeSingle()
    bezugNr = bezug?.rechnungsnummer ?? null
  }

  const firm = await fetchFirmenEinstellungen(supabase)
  const gewerke = await loadGewerkeAusfuehrung(supabase)
  const positionen = sanitizeAngebotPositionenForExport(
    normalizeAngebotPositionen(row.positionen),
    gewerke
  )
  const kleinunternehmer = parseKleinunternehmerSetting(firm.kleinunternehmer)
  const defaultMwstSatz = Math.max(0, parseInt(firm.mwst_satz, 10) || DEFAULT_MWST_SATZ)

  const artikelCount = positionen.filter(
    (p) => p.gewerk_slug !== '__freitext__' && (p.lohn_netto !== 0 || p.material_netto !== 0)
  ).length

  const kundePflicht = {
    name: kunde.name,
    vorname: kunde.vorname ?? null,
    nachname: kunde.nachname ?? null,
    adresse: kunde.adresse ?? null,
    strasse: kunde.strasse ?? null,
    hausnummer: kunde.hausnummer ?? null,
    plz: kunde.plz ?? null,
    ort: kunde.ort ?? null,
    typ: kunde.typ,
    ust_id: kunde.ust_id ?? null,
  }

  const validMsg = validateRechnungPflichtangaben(firm, kundePflicht, {
    leistungszeitraum_von: row.leistungszeitraum_von,
    leistungszeitraum_bis: row.leistungszeitraum_bis,
    rechnungsdatum: String(row.rechnungsdatum),
    positionenCount: artikelCount,
  })
  if (validMsg) return { ok: false, message: validMsg }

  const berechnung = berechneRechnung(positionen, {
    kleinunternehmer,
    reverseCharge13b: Boolean(row.reverse_charge_13b),
    defaultMwstSatz,
  })

  try {
    const buf = await renderRechnungPdfForDetail(row, firm, gewerke)
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
