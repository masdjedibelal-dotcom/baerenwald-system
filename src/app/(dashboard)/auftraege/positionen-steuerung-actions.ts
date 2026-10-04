'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { type MailAnrede } from '@/lib/mail/anrede'
import { gewichteterFortschrittProzent } from '@/lib/auftraege/auftrag-fortschritt-preis'
import type { AuftragPosition } from '@/lib/types'

/** Fortschritt auf Auftragsebene aus Leistungsstatus + Verkaufspreisen berechnen. */
export async function syncAuftragFortschrittFromPositionen(
  auftragId: string
): Promise<{ ok: true; fortschritt: number } | { ok: false; message: string }> {
const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_positionen')
    .select('preis_fix, leistung_status')
    .eq('auftrag_id', auftragId)
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftrag_positionen', error)

  if (error) {
    if (error.code === '42703' || error.message.includes('leistung_status')) {
      const { data: fallback, error: err2 } = await supabase
        .from('auftrag_positionen')
        .select('preis_fix')
        .eq('auftrag_id', auftragId)
      if (err2) logDbError('app/auftraege/positionen-steuerung-actions:auftrag_positionen', err2)
      if (err2) return { ok: false, message: err2.message }
      const pct = gewichteterFortschrittProzent(
        (fallback ?? []).map((r) => ({ preis_fix: r.preis_fix, leistung_status: 'offen' } as AuftragPosition))
      )
      const { error: upErr } = await supabase
        .from('auftraege')
        .update({ fortschritt: pct, updated_at: new Date().toISOString() })
        .eq('id', auftragId)
      if (upErr) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', upErr)
      if (upErr) return { ok: false, message: upErr.message }
      revalidateAuftragDetail(auftragId)
      return { ok: true, fortschritt: pct }
    }
    return { ok: false, message: error.message }
  }

  const pct = gewichteterFortschrittProzent((data ?? []) as AuftragPosition[])
  const { error: upErr } = await supabase
    .from('auftraege')
    .update({ fortschritt: pct, updated_at: new Date().toISOString() })
    .eq('id', auftragId)
  if (upErr) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', upErr)
  if (upErr) return { ok: false, message: upErr.message }
  revalidateAuftragDetail(auftragId)
  return { ok: true, fortschritt: pct }
}

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', userId: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', error)
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', userId: null }
  return { ok: true as const, userId: user.id }
}

export async function getKundeInformierenMailDefaults(
  auftragId: string
): Promise<{ ok: true; defaultAnrede: MailAnrede } | { ok: false; message: string }> {
  const { data: auf, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunden(typ)')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/positionen-steuerung-actions:auftraege', error)
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }
  return { ok: true, defaultAnrede: 'sie' }
}
