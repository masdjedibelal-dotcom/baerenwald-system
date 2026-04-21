'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { updateGesamtUmsatz } from '@/app/actions/kunden'
import { getMailBranding } from '@/lib/mail-branding'
import { formatDatumDeFromIso } from '@/lib/mail/versand-helpers'
import { mailRechnung } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { buildRechnungPdfBuffer } from '@/lib/rechnungen/persist-pdf'
import type { AngebotPosition, Kunde, RechnungStatus } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import { insertKalenderAutoTermin, addDaysYmd } from '@/lib/kalender-auto-termine'

export async function createRechnungEntwurf(input: {
  angebot_id: string | null
  auftrag_id: string | null
  kunde_id: string
  positionen: AngebotPosition[]
  leistungszeitraum_von: string | null
  leistungszeitraum_bis: string | null
  faellig_am: string | null
  rechnungsdatum?: string | null
  mwst_satz?: number
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const positionen = normalizeAngebotPositionen(input.positionen)
  const mwst = input.mwst_satz ?? DEFAULT_MWST_SATZ
  const summen = summenAusPositionen(positionen, mwst)

  const { data: numRaw, error: rpcErr } = await supabase.rpc('generate_rechnungsnummer')
  if (rpcErr) {
    return { ok: false, message: rpcErr.message }
  }
  const rechnungsnummer = String(numRaw ?? '').trim()
  if (!rechnungsnummer) {
    return { ok: false, message: 'Rechnungsnummer konnte nicht erzeugt werden.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rechnungsdatum =
    (input.rechnungsdatum && input.rechnungsdatum.trim()) ||
    new Date().toISOString().slice(0, 10)

  const { data: row, error } = await supabase
    .from('rechnungen')
    .insert({
      angebot_id: input.angebot_id,
      auftrag_id: input.auftrag_id,
      kunde_id: input.kunde_id,
      rechnungsnummer,
      status: 'entwurf' as RechnungStatus,
      positionen,
      lohn_netto: summen.lohnZeileMin,
      material_netto: summen.materialZeileMin,
      netto: summen.nettoMin,
      mwst_satz: mwst,
      mwst_betrag: summen.mwstBetragMin,
      brutto: summen.bruttoMin,
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      faellig_am: input.faellig_am,
      rechnungsdatum,
      pdf_url: null,
      erstellt_von: user?.id ?? null,
    })
    .select('id')
    .single()

  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  if (input.faellig_am) {
    await insertKalenderAutoTermin({
      titel: `Fällig: ${rechnungsnummer}`,
      datum: input.faellig_am,
      typ: 'sonstiges',
      auftrag_id: input.auftrag_id,
    })
  }

  revalidatePath('/rechnungen')
  return { ok: true, id: row.id as string }
}

export async function updateRechnungEntwurf(
  id: string,
  input: {
    positionen: AngebotPosition[]
    leistungszeitraum_von: string | null
    leistungszeitraum_bis: string | null
    faellig_am: string | null
    rechnungsdatum?: string | null
    mwst_satz?: number
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const positionen = normalizeAngebotPositionen(input.positionen)
  const mwst = input.mwst_satz ?? DEFAULT_MWST_SATZ
  const summen = summenAusPositionen(positionen, mwst)

  const rechnungsdatum =
    (input.rechnungsdatum && input.rechnungsdatum.trim()) || undefined

  const { error } = await supabase
    .from('rechnungen')
    .update({
      positionen,
      lohn_netto: summen.lohnZeileMin,
      material_netto: summen.materialZeileMin,
      netto: summen.nettoMin,
      mwst_satz: mwst,
      mwst_betrag: summen.mwstBetragMin,
      brutto: summen.bruttoMin,
      leistungszeitraum_von: input.leistungszeitraum_von,
      leistungszeitraum_bis: input.leistungszeitraum_bis,
      faellig_am: input.faellig_am,
      ...(rechnungsdatum ? { rechnungsdatum } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }
  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${id}`)
  return { ok: true }
}

export async function updateRechnungStatus(
  id: string,
  status: RechnungStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'gesendet') patch.gesendet_at = new Date().toISOString()
  if (status === 'bezahlt') patch.bezahlt_at = new Date().toISOString()
  const { error } = await supabase.from('rechnungen').update(patch).eq('id', id)
  if (error) return { ok: false, message: error.message }

  if (status === 'bezahlt') {
    const { data: r } = await supabase.from('rechnungen').select('kunde_id').eq('id', id).maybeSingle()
    if (r?.kunde_id) {
      await updateGesamtUmsatz(r.kunde_id as string)
    }
  }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${id}`)
  return { ok: true }
}

/** Rechnung per Mail (PDF + mail-templates + email_log). */
export async function sendRechnung(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const pdf = await buildRechnungPdfBuffer(supabase, rechnungId)
  if (!pdf.ok) return pdf

  const { data: rec, error: loadErr } = await supabase
    .from('rechnungen')
    .select('rechnungsnummer, auftrag_id, kunde_id, faellig_am, brutto, kunden(name, email)')
    .eq('id', rechnungId)
    .maybeSingle()

  if (loadErr || !rec) return { ok: false, message: loadErr?.message ?? 'Rechnung nicht gefunden' }

  const kRaw = rec.kunden as Kunde | Kunde[] | null
  const kunde = Array.isArray(kRaw) ? kRaw[0] : kRaw
  const email = kunde?.email?.trim()
  if (!email) return { ok: false, message: 'Kunden-E-Mail fehlt' }

  const branding = await getMailBranding(supabaseAdmin)
  const vorname = (kunde?.name ?? 'Guten Tag').trim().split(/\s+/)[0] || 'Guten Tag'
  const tpl = mailRechnung(
    {
      name: vorname,
      nummer: String(rec.rechnungsnummer),
      brutto: Number(rec.brutto ?? 0),
      faelligAm: formatDatumDeFromIso(rec.faellig_am as string | null),
      iban: branding.iban,
    },
    branding
  )

  const mail = await sendMail({
    typ: 'rechnung',
    an: email,
    anName: kunde?.name ?? null,
    betreff: tpl.betreff,
    html: tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: `Rechnung-${rec.rechnungsnummer}.pdf`,
    kundeId: rec.kunde_id as string | null,
    auftragId: rec.auftrag_id as string | null,
    rechnungId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('rechnungen')
    .update({
      status: 'gesendet' as RechnungStatus,
      gesendet_at: now,
      updated_at: now,
    })
    .eq('id', rechnungId)

  if (error) return { ok: false, message: error.message }

  const heute = new Date().toISOString().slice(0, 10)
  await insertKalenderAutoTermin({
    titel: rec?.rechnungsnummer
      ? `Zahlungserinnerung: ${rec.rechnungsnummer}`
      : 'Zahlungserinnerung Rechnung',
    datum: addDaysYmd(heute, 7),
    typ: 'sonstiges',
    auftrag_id: (rec?.auftrag_id as string | null) ?? null,
  })

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  return { ok: true }
}

export async function sendRechnungErinnerung(
  rechnungId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  void rechnungId
  return { ok: true }
}
