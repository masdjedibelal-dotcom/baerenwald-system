/**
 * Shared-DB: In-App-Notification wenn CRM einen Direktauftrag bestätigt/anlegt
 * (HV-Glocke + Privatkunden-Portal), analog Angebot gesendet.
 */

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { C } from '@/lib/tokens/colors'

const AUFTRAG_NOTIF_VISUAL = {
  iconBg: C.greenTint3,
  iconFg: C.greenDeep2,
  iconGlyph: '✅',
} as const

function portalVorgangLink(leadId: string): string {
  return `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}&tab=uebersicht`
}

async function hasRecentHvNotif(opts: {
  kundeId: string
  leadId: string
}): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data, error } = await supabaseAdmin
    .from('hv_notifications')
    .select('id')
    .eq('kunde_id', opts.kundeId)
    .eq('typ', 'auftrag')
    .ilike('link', `%${opts.leadId}%`)
    .gte('created_at', since)
    .limit(1)
  if (error) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:hv_notifications', error)
  return (data ?? []).length > 0
}

async function hasUnreadPortalNotif(opts: {
  empfaengerUserId: string
  leadId: string
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('portal_notifications')
    .select('id')
    .eq('empfaenger_user_id', opts.empfaengerUserId)
    .eq('vorgang_ref', opts.leadId)
    .eq('typ', 'auftrag')
    .eq('gelesen', false)
    .limit(1)
  if (error) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:portal_notifications', error)
  return (data ?? []).length > 0
}

/**
 * Schreibt hv_notifications / portal_notifications nach CRM-Direktauftrag.
 * Idempotent innerhalb ~15 Min (HV) bzw. ungelesener gleicher Typ (Privat).
 */
export async function notifyPortalAuftragBestaetigtFromCrm(input: {
  leadId: string
  auftragId?: string | null
  titel?: string | null
}): Promise<void> {
  const leadId = input.leadId.trim()
  if (!leadId) return

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id, kunde_id, auftraggeber_kunde_id, situation, melder_einheit')
    .eq('id', leadId)
    .maybeSingle()
  if (leadErr) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:leads', leadErr)

  if (leadErr) {
    console.warn('[notifyPortalAuftragBestaetigtFromCrm] lead:', leadErr.message)
    return
  }
  if (!lead?.id) return

  let auftragTitel = String(input.titel ?? '').trim()
  const auftragId = String(input.auftragId ?? '').trim()
  if (!auftragTitel && auftragId) {
    const { data: auf, error } = await supabaseAdmin
      .from('auftraege')
      .select('titel')
      .eq('id', auftragId)
      .maybeSingle()
    if (error) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:auftraege', error)
    auftragTitel = String(auf?.titel ?? '').trim()
  }

  const bezug =
    auftragTitel ||
    String(lead.situation ?? '').trim() ||
    String(lead.melder_einheit ?? '').trim() ||
    'Ihr Vorgang'

  const notifTitel = `Auftrag bestätigt: ${bezug}`
  const body = `Wir haben den Auftrag „${bezug}“ angelegt. Details finden Sie im Portal.`
  const portalPath = portalVorgangLink(leadId)

  const orgKundeId = String(lead.auftraggeber_kunde_id ?? '').trim()
  const portalKundeId = String(lead.kunde_id ?? '').trim()

  const insertHv = async (kundeId: string) => {
    if (await hasRecentHvNotif({ kundeId, leadId })) return
    const { error } = await supabaseAdmin.from('hv_notifications').insert({
      kunde_id: kundeId,
      typ: 'auftrag',
      titel: notifTitel,
      body,
      link: portalPath,
    })
    if (error) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:hv_notifications', error)
    if (error) {
      console.warn('[notifyPortalAuftragBestaetigtFromCrm] hv_notifications:', error.message)
    } else {
      const { schedulePortalWebPushForOrgKunde } = await import(
        '@/lib/portal/send-portal-web-push'
      )
      schedulePortalWebPushForOrgKunde(kundeId, {
        titel: notifTitel,
        body,
        url: portalPath,
        tag: 'auftrag',
      })
    }
  }

  const insertPortal = async (authUserId: string) => {
    if (await hasUnreadPortalNotif({ empfaengerUserId: authUserId, leadId })) {
      return
    }
    const { error } = await supabaseAdmin.from('portal_notifications').insert({
      empfaenger_user_id: authUserId,
      typ: 'auftrag',
      titel: notifTitel,
      body,
      vorgang_ref: leadId,
      link: portalPath,
      gelesen: false,
      icon_bg: AUFTRAG_NOTIF_VISUAL.iconBg,
      icon_fg: AUFTRAG_NOTIF_VISUAL.iconFg,
      icon_glyph: AUFTRAG_NOTIF_VISUAL.iconGlyph,
    })
    if (error) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:portal_notifications', error)
    if (error) {
      console.warn(
        '[notifyPortalAuftragBestaetigtFromCrm] portal_notifications:',
        error.message
      )
    } else {
      const { schedulePortalWebPushToUsers } = await import(
        '@/lib/portal/send-portal-web-push'
      )
      schedulePortalWebPushToUsers([authUserId], {
        titel: notifTitel,
        body,
        url: portalPath,
        tag: 'auftrag',
      })
    }
  }

  if (orgKundeId) {
    await insertHv(orgKundeId)
  }

  if (portalKundeId) {
    const { data: kunde, error } = await supabaseAdmin
      .from('kunden')
      .select('auth_user_id, portal_modus')
      .eq('id', portalKundeId)
      .maybeSingle()
    if (error) logDbError('lib/portal/notify-portal-auftrag-bestaetigt:kunden', error)

    const authUserId = String(kunde?.auth_user_id ?? '').trim()
    const modus = String(kunde?.portal_modus ?? '')
      .trim()
      .toLowerCase()

    if (modus === 'organisation') {
      if (!orgKundeId || orgKundeId === portalKundeId) {
        await insertHv(portalKundeId)
      }
    } else if (authUserId && portalKundeId !== orgKundeId) {
      await insertPortal(authUserId)
    } else if (authUserId && !orgKundeId) {
      await insertPortal(authUserId)
    }
  }
}
