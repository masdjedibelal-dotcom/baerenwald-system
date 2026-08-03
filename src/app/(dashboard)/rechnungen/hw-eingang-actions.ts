'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { HwRechnungStatus } from '@/lib/rechnungen/load-hw-eingangsrechnungen'

export async function setHwEingangsrechnungStatus(
  zuweisungId: string,
  status: HwRechnungStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = zuweisungId?.trim()
  if (!id) return { ok: false, message: 'Zuweisung fehlt.' }
  if (!['eingereicht', 'bezahlt', 'abgelehnt'].includes(status)) {
    return { ok: false, message: 'Ungültiger Status.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id, angebot_id, hw_rechnung_pdf_url')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr || !row) return { ok: false, message: fetchErr?.message ?? 'Eintrag nicht gefunden.' }
  if (!String((row as { hw_rechnung_pdf_url?: string | null }).hw_rechnung_pdf_url ?? '').trim()) {
    return { ok: false, message: 'Keine Handwerker-Rechnung vorhanden.' }
  }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      hw_rechnung_status: status,
      hw_rechnung_bezahlt_at: status === 'bezahlt' ? now : null,
    })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }

  const angebotId = String((row as { angebot_id: string }).angebot_id)
  revalidatePath('/vorgaenge')
  revalidatePath('/rechnungen')
  revalidatePath(`/angebote/${angebotId}`)

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('angebot_id', angebotId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (auf?.id) revalidatePath(`/auftraege/${auf.id}`)

  return { ok: true }
}

export async function markHwEingangsrechnungBezahlt(
  zuweisungId: string,
  bezahlt: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  return setHwEingangsrechnungStatus(zuweisungId, bezahlt ? 'bezahlt' : 'eingereicht')
}
