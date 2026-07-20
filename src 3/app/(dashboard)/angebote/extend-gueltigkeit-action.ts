'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { heuteYmd } from '@/lib/angebot-einfach'
import { formatDatum } from '@/lib/utils'

export async function extendAngebotGueltigkeit(input: {
  angebotId: string
  gueltigBis: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gueltig = input.gueltigBis.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gueltig)) {
    return { ok: false, message: 'Bitte ein gültiges Datum wählen.' }
  }
  if (gueltig <= heuteYmd()) {
    return { ok: false, message: 'Das Gültigkeitsdatum muss in der Zukunft liegen.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: row, error: loadErr } = await supabase
    .from('angebote')
    .select('id, status_einfach, lead_id, angebotsnr, kunden(name)')
    .eq('id', input.angebotId)
    .maybeSingle()

  if (loadErr || !row) {
    return { ok: false, message: loadErr?.message ?? 'Angebot nicht gefunden' }
  }

  const st = row.status_einfach as string | null
  if (st !== 'gesendet' && st !== 'abgelaufen') {
    return {
      ok: false,
      message: 'Gültigkeit kann nur bei gesendeten oder abgelaufenen Angeboten verlängert werden.',
    }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('angebote')
    .update({
      gueltig_bis: gueltig,
      verlaengert_am: now,
      nachgefasst_am: null,
      status_einfach: 'gesendet',
      updated_at: now,
    })
    .eq('id', input.angebotId)

  if (error) return { ok: false, message: error.message }

  const leadId = row.lead_id as string | null
  if (leadId) {
    await supabase.from('lead_timeline').insert({
      lead_id: leadId,
      angebot_id: input.angebotId,
      typ: 'angebot',
      titel: 'Gültigkeit verlängert',
      beschreibung: `Gültig bis ${formatDatum(gueltig)} · Erinnerung in 7 Tagen`,
      erstellt_von: user?.id ?? null,
    })
  }

  revalidatePath('/angebote')
  revalidatePath(`/angebote/${input.angebotId}`)
  if (leadId) revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}
