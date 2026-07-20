'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { EingangsrechnungKategorie } from '@/lib/types'

export async function createEingangsrechnung(input: {
  auftragId: string
  lieferant: string
  beschreibung: string
  kategorie: EingangsrechnungKategorie
  betrag_netto: number
  mwst_satz: number
  betrag_brutto: number
  rechnungsdatum: string | null
  faellig_am: string | null
  beleg_url: string | null
  notizen: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id ?? null
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const { error } = await supabaseAdmin.from('eingangsrechnungen').insert({
    auftrag_id: input.auftragId,
    lieferant: input.lieferant.trim(),
    beschreibung: input.beschreibung.trim() || null,
    kategorie: input.kategorie,
    betrag_netto: input.betrag_netto,
    mwst_satz: input.mwst_satz,
    betrag_brutto: input.betrag_brutto,
    rechnungsdatum: input.rechnungsdatum,
    faellig_am: input.faellig_am,
    beleg_url: input.beleg_url,
    notizen: input.notizen.trim() || null,
    erstellt_von: uid,
  })

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}/finanzen`)
  return { ok: true }
}

export async function toggleEingangsrechnungBezahlt(
  id: string,
  auftragId: string,
  bezahlt: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const heute = new Date().toISOString().slice(0, 10)
  const { error } = await supabaseAdmin
    .from('eingangsrechnungen')
    .update({
      bezahlt,
      bezahlt_am: bezahlt ? heute : null,
    })
    .eq('id', id)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}/finanzen`)
  return { ok: true }
}

export async function createEinbehalt(input: {
  auftragId: string
  handwerker_id: string
  rechnung_brutto: number
  einbehalt_prozent: number
  freigabe_datum: string
  notizen: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const pct = Math.max(0, Math.min(100, input.einbehalt_prozent))
  const brutto = Math.max(0, input.rechnung_brutto)
  const einbehalt = Math.round((brutto * pct) / 100 * 100) / 100
  const bezahlt = Math.round((brutto - einbehalt) * 100) / 100

  const { error } = await supabaseAdmin.from('einbehalte').insert({
    auftrag_id: input.auftragId,
    handwerker_id: input.handwerker_id,
    rechnung_brutto: brutto,
    einbehalt_prozent: pct,
    einbehalt_betrag: einbehalt,
    bezahlt_betrag: bezahlt,
    status: 'einbehalten',
    freigabe_datum: input.freigabe_datum,
    notizen: input.notizen.trim() || null,
  })

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/auftraege/${input.auftragId}/finanzen`)
  return { ok: true }
}

export async function createBuergschaft(input: {
  einbehaltId: string
  auftragId: string
  handwerker_id: string
  urkunden_nummer: string
  bank: string
  betrag: number
  gueltig_bis: string
  dokument_url: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const { error: ins } = await supabaseAdmin.from('buergschaften').insert({
    einbehalt_id: input.einbehaltId,
    handwerker_id: input.handwerker_id,
    urkunden_nummer: input.urkunden_nummer.trim(),
    bank: input.bank.trim() || null,
    betrag: input.betrag,
    gueltig_bis: input.gueltig_bis,
    dokument_url: input.dokument_url,
  })
  if (ins) return { ok: false, message: ins.message }

  const { error: up } = await supabaseAdmin
    .from('einbehalte')
    .update({ status: 'buergschaft' })
    .eq('id', input.einbehaltId)
    .eq('auftrag_id', input.auftragId)

  if (up) return { ok: false, message: up.message }
  revalidatePath(`/auftraege/${input.auftragId}/finanzen`)
  return { ok: true }
}

export async function freigebenEinbehalt(
  einbehaltId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const { error } = await supabaseAdmin
    .from('einbehalte')
    .update({
      status: 'freigegeben',
      freigegeben_at: new Date().toISOString(),
    })
    .eq('id', einbehaltId)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}/finanzen`)
  return { ok: true }
}

