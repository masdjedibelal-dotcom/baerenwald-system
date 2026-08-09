'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

/** Spec §9 RateDrawer — Reklamation ohne Statuswechsel. */
export async function setRechnungReklamation(
  rechnungId: string,
  opts: { grund?: string; clear?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: rec, error: loadErr } = await supabase
    .from('rechnungen')
    .select('id, status, beleg_typ')
    .eq('id', rechnungId)
    .maybeSingle()
  if (loadErr || !rec) return { ok: false, message: 'Rechnung nicht gefunden.' }
  if (String(rec.beleg_typ ?? 'rechnung') === 'gutschrift') {
    return { ok: false, message: 'Gutschriften können nicht reklamiert werden.' }
  }
  const st = String(rec.status ?? '')
  if (st === 'storniert') return { ok: false, message: 'Stornierte Rechnung.' }
  if (st === 'entwurf') {
    return { ok: false, message: 'Reklamation nur bei gestellter Rechnung.' }
  }

  const patch = opts.clear
    ? {
        reklamation_am: null,
        reklamation_grund: null,
        updated_at: new Date().toISOString(),
      }
    : {
        reklamation_am: new Date().toISOString().slice(0, 10),
        reklamation_grund: (opts.grund ?? 'Kunde beanstandet Position').trim() || null,
        updated_at: new Date().toISOString(),
      }

  const { error } = await supabase.from('rechnungen').update(patch).eq('id', rechnungId)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/rechnungen')
  revalidatePath(`/rechnungen/${rechnungId}`)
  const { data: withAuftrag } = await supabase
    .from('rechnungen')
    .select('auftrag_id')
    .eq('id', rechnungId)
    .maybeSingle()
  if (withAuftrag?.auftrag_id) {
    revalidatePath(`/auftraege/${withAuftrag.auftrag_id}`)
  }
  return { ok: true }
}
