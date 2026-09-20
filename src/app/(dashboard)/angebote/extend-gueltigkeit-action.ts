'use server'

<<<<<<< Updated upstream
import { revalidateAngebotDetail, revalidateLeadDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
=======
import { logDbError } from '@/lib/errors/log-db-error'
import { revalidatePath } from 'next/cache'
>>>>>>> Stashed changes
import { createClient } from '@/lib/supabase-server'
import { heuteYmd } from '@/lib/angebot-einfach'
import { formatDatum } from '@/lib/utils'
import { writeAngebotStatusEinfach } from '@/lib/status/write-angebot-status'

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
  if (loadErr) logDbError('app/angebote/extend-gueltigkeit-action:angebote', loadErr)

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
<<<<<<< Updated upstream
  const { error: error2 } = await writeAngebotStatusEinfach(supabase, input.angebotId, 'gesendet', {
    gueltig_bis: gueltig,
    verlaengert_am: now,
    nachgefasst_am: null,
  })
=======
  const { error: error2 } = await supabase
    .from('angebote')
    .update({
      gueltig_bis: gueltig,
      verlaengert_am: now,
      nachgefasst_am: null,
      status_einfach: 'gesendet',
      updated_at: now,
    })
    .eq('id', input.angebotId)
>>>>>>> Stashed changes
  if (error2) logDbError('app/angebote/extend-gueltigkeit-action:angebote', error2)

  if (error2) return { ok: false, message: error2.message }

  const leadId = row.lead_id as string | null
  if (leadId) {
    const { error: __dbErr1 } = await supabase.from('lead_timeline').insert({
      lead_id: leadId,
      angebot_id: input.angebotId,
      typ: 'angebot',
      titel: 'Gültigkeit verlängert',
      beschreibung: `Gültig bis ${formatDatum(gueltig)} · Erinnerung in 7 Tagen`,
      erstellt_von: user?.id ?? null,
    })
    if (__dbErr1) logDbError('app/angebote/extend-gueltigkeit-action:lead_timeline', __dbErr1)
  }

  revalidateAngebotDetail(input.angebotId)
  if (leadId) revalidateLeadDetail(leadId)
  return { ok: true }
}
