'use server'

import { logDbError } from '@/lib/errors/log-db-error';
import { supabaseAdmin } from '@/lib/supabase-admin';

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
