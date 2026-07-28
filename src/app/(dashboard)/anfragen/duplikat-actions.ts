'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Phase 10: Duplikat-Lead zusammenführen — Ziel behalten, Doppelter bleibt sichtbar mit zusammengefuehrt_in. */
export async function zusammenfuehrenLeadDuplikat(input: {
  doppelterLeadId: string
  zielLeadId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const doppel = input.doppelterLeadId.trim()
  const ziel = input.zielLeadId.trim()
  if (!doppel || !ziel) return { ok: false, message: 'Beide Leads erforderlich.' }
  if (doppel === ziel) return { ok: false, message: 'Ziel und Duplikat müssen verschieden sein.' }

  const { data: zielRow, error: zErr } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('id', ziel)
    .maybeSingle()
  if (zErr || !zielRow) return { ok: false, message: 'Ziel-Anfrage nicht gefunden.' }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({
      zusammengefuehrt_in: ziel,
      duplikat_hinweis: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', doppel)

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/anfragen/${doppel}`)
  revalidatePath(`/anfragen/${ziel}`)
  revalidatePath('/vorgaenge')
  return { ok: true }
}

/** Kandidaten für Zusammenführen: gleiche Tel/Mail oder Objekt in 30 Tagen (einfache Heuristik). */
export async function listDuplikatKandidaten(leadId: string): Promise<
  | { ok: true; kandidaten: { id: string; label: string }[] }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const id = leadId.trim()
  if (!id) return { ok: false, message: 'Lead fehlt' }

  const { data: lead, error } = await supabase
    .from('leads')
    .select(
      'id, telefon, email, melder_telefon, melder_email, objekt_id, kunde_id, created_at, situation'
    )
    .eq('id', id)
    .maybeSingle()
  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden' }

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceIso = since.toISOString()

  const { data: rows } = await supabase
    .from('leads')
    .select('id, situation, telefon, email, melder_telefon, melder_email, objekt_id, kunde_id, created_at')
    .neq('id', id)
    .gte('created_at', sinceIso)
    .is('zusammengefuehrt_in', null)
    .order('created_at', { ascending: false })
    .limit(80)

  const tel = String(lead.telefon || lead.melder_telefon || '')
    .replace(/\D/g, '')
    .slice(-8)
  const mail = String(lead.email || lead.melder_email || '')
    .trim()
    .toLowerCase()
  const objekt = String(lead.objekt_id || '').trim()
  const kunde = String(lead.kunde_id || '').trim()

  const kandidaten: { id: string; label: string }[] = []
  for (const r of rows ?? []) {
    const rTel = String(r.telefon || r.melder_telefon || '')
      .replace(/\D/g, '')
      .slice(-8)
    const rMail = String(r.email || r.melder_email || '')
      .trim()
      .toLowerCase()
    const matchTel = Boolean(tel && rTel && tel === rTel)
    const matchMail = Boolean(mail && rMail && mail === rMail)
    const matchObj = Boolean(objekt && r.objekt_id && objekt === String(r.objekt_id))
    const matchKunde = Boolean(kunde && r.kunde_id && kunde === String(r.kunde_id) && (matchTel || matchMail))
    if (!(matchTel || matchMail || matchObj || matchKunde)) continue
    kandidaten.push({
      id: String(r.id),
      label: String(r.situation || r.id).slice(0, 80),
    })
  }

  return { ok: true, kandidaten }
}
