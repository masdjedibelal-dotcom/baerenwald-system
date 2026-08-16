import {
  notifyPartnerUnified,
  partnerOffenLink,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Nach CRM „Als überwiesen“: AH-Status + Partner-Meldung „Rechnung wurde überwiesen“.
 */
export async function syncEingangsrechnungUeberwiesen(input: {
  rechnungId: string
  angebotHandwerkerId: string | null
  handwerkerId: string | null
  auftragId: string | null
  rechnungsnummer?: string | null
}): Promise<{ partnerNotified: boolean }> {
  const now = new Date().toISOString()
  const ahId = input.angebotHandwerkerId?.trim() || null
  let handwerkerId = input.handwerkerId?.trim() || null
  let angebotId: string | null = null

  if (ahId) {
    const { data: ah } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id, handwerker_id, angebot_id')
      .eq('id', ahId)
      .maybeSingle()
    if (ah) {
      if (!handwerkerId) handwerkerId = String(ah.handwerker_id ?? '').trim() || null
      angebotId = String(ah.angebot_id ?? '').trim() || null
    }
    await supabaseAdmin
      .from('angebot_handwerker')
      .update({
        hw_rechnung_status: 'bezahlt',
        hw_rechnung_bezahlt_at: now,
      })
      .eq('id', ahId)
  }

  if (!handwerkerId) return { partnerNotified: false }

  let auftragId = input.auftragId?.trim() || null
  if (!auftragId && angebotId) {
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('id, titel')
      .eq('angebot_id', angebotId)
      .neq('status', 'storniert')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    auftragId = auf?.id ? String(auf.id) : null
  }

  let projektName = input.rechnungsnummer?.trim() || 'Rechnung'
  if (auftragId) {
    const { data: auf } = await supabaseAdmin
      .from('auftraege')
      .select('titel')
      .eq('id', auftragId)
      .maybeSingle()
    const t = (auf?.titel as string | null)?.trim()
    if (t) projektName = t
  }

  const link = auftragId
    ? partnerVorgangLink(auftragId)
    : ahId
      ? partnerOffenLink(ahId)
      : '/partner'

  const notify = await notifyPartnerUnified({
    handwerkerId,
    typ: 'erinnerung',
    projektName,
    leistungName: 'Rechnung wurde überwiesen',
    link,
    anfrageId: ahId,
    auftragId,
    sendMail: true,
  })

  if (!notify.ok) {
    console.warn('[syncEingangsrechnungUeberwiesen] Partner-Notify:', notify.error)
  }

  return { partnerNotified: notify.ok }
}
