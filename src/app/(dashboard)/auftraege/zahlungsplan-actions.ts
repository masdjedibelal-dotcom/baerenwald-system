'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { parseZahlungsplan, type Zahlungsplan } from '@/lib/rechnungen/zahlungsplan'

export async function saveAuftragZahlungsplan(
  auftragId: string,
  plan: Zahlungsplan
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!plan.zeilen.length) {
    return { ok: false, message: 'Mindestens eine Abschlagszeile erforderlich.' }
  }

  const supabase = createClient()
  const normalized: Zahlungsplan = {
    modus: 'abschlagsplan',
    zeilen: plan.zeilen.map((z) => ({
      ...z,
      titel: z.titel.trim() || 'Abschlag',
      position_ids: z.position_ids?.length ? [...z.position_ids] : [],
    })),
  }

  const { error } = await supabase
    .from('auftraege')
    .update({ zahlungsplan: normalized, updated_at: new Date().toISOString() })
    .eq('id', auftragId)

  if (error) {
    if (error.message.includes('zahlungsplan')) {
      return {
        ok: false,
        message: 'Datenbank-Schema veraltet: Migration für Zahlungsplan ausführen.',
      }
    }
    return { ok: false, message: error.message }
  }

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function loadAuftragZahlungsplan(auftragId: string): Promise<Zahlungsplan | null> {
  const supabase = createClient()
  const { data } = await supabase.from('auftraege').select('zahlungsplan').eq('id', auftragId).maybeSingle()
  return parseZahlungsplan(data?.zahlungsplan)
}
