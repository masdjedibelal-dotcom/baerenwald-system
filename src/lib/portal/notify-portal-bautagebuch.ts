/**
 * Shared-DB: In-App-Notification nach CRM-Bautagebuch-Freigabe/Versand
 * (HV-Glocke + Privatkunden-Portal), analog Partner-Updates.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

const BAUTAGEBUCH_NOTIF_VISUAL = {
  iconBg: '#E8F5EE',
  iconFg: '#1a6b4a',
  iconGlyph: '📝',
} as const

function portalVorgangLink(leadId: string): string {
  return `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}&tab=bautagebuch`
}

async function hasRecentHvNotif(opts: {
  kundeId: string
  leadId: string
  notifTitel: string
}): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('hv_notifications')
    .select('id')
    .eq('kunde_id', opts.kundeId)
    .eq('typ', 'bautagebuch')
    .eq('titel', opts.notifTitel)
    .ilike('link', `%${opts.leadId}%`)
    .gte('created_at', since)
    .limit(1)
  return (data ?? []).length > 0
}

async function hasRecentPortalNotif(opts: {
  empfaengerUserId: string
  leadId: string
  notifTitel: string
}): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('portal_notifications')
    .select('id')
    .eq('empfaenger_user_id', opts.empfaengerUserId)
    .eq('vorgang_ref', opts.leadId)
    .eq('typ', 'info')
    .eq('titel', opts.notifTitel)
    .gte('created_at', since)
    .limit(1)
  return (data ?? []).length > 0
}

/**
 * Schreibt hv_notifications / portal_notifications nach Bautagebuch-Freigabe oder -Mail.
 */
export async function notifyPortalBautagebuchFromCrm(input: {
  auftragId: string
  eintragTitel: string
}): Promise<void> {
  const auftragId = input.auftragId.trim()
  if (!auftragId) return

  const eintragTitel = input.eintragTitel.trim() || 'Bautagebuch-Update'

  const { data: auf, error: aufErr } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, lead_id')
    .eq('id', auftragId)
    .maybeSingle()

  if (aufErr) {
    console.warn('[notifyPortalBautagebuchFromCrm] auftrag:', aufErr.message)
    return
  }

  const leadId = String(auf?.lead_id ?? '').trim()
  if (!leadId) return

  const auftragTitel = String(auf?.titel ?? '').trim() || 'Auftrag'

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id, kunde_id, auftraggeber_kunde_id, situation')
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr) {
    console.warn('[notifyPortalBautagebuchFromCrm] lead:', leadErr.message)
    return
  }
  if (!lead?.id) return

  const bezug = String(lead.situation ?? '').trim() || auftragTitel
  const notifTitel = `Fortschritt: ${eintragTitel}`
  const body = `Neues Bautagebuch-Update zu „${bezug}“ — direkt im Portal sichtbar.`
  const portalPath = portalVorgangLink(leadId)

  const orgKundeId = String(lead.auftraggeber_kunde_id ?? '').trim()
  const portalKundeId = String(lead.kunde_id ?? '').trim()

  const insertHv = async (kundeId: string) => {
    if (await hasRecentHvNotif({ kundeId, leadId, notifTitel })) return
    const { error } = await supabaseAdmin.from('hv_notifications').insert({
      kunde_id: kundeId,
      typ: 'bautagebuch',
      titel: notifTitel,
      body,
      link: portalPath,
    })
    if (error) {
      console.warn('[notifyPortalBautagebuchFromCrm] hv_notifications:', error.message)
    } else {
      const { schedulePortalWebPushForOrgKunde } = await import(
        '@/lib/portal/send-portal-web-push'
      )
      schedulePortalWebPushForOrgKunde(kundeId, {
        titel: notifTitel,
        body,
        url: portalPath,
        tag: 'bautagebuch',
      })
    }
  }

  const insertPortal = async (authUserId: string) => {
    if (
      await hasRecentPortalNotif({
        empfaengerUserId: authUserId,
        leadId,
        notifTitel,
      })
    ) {
      return
    }
    const { error } = await supabaseAdmin.from('portal_notifications').insert({
      empfaenger_user_id: authUserId,
      typ: 'info',
      titel: notifTitel,
      body,
      vorgang_ref: leadId,
      link: portalPath,
      gelesen: false,
      icon_bg: BAUTAGEBUCH_NOTIF_VISUAL.iconBg,
      icon_fg: BAUTAGEBUCH_NOTIF_VISUAL.iconFg,
      icon_glyph: BAUTAGEBUCH_NOTIF_VISUAL.iconGlyph,
    })
    if (error) {
      console.warn(
        '[notifyPortalBautagebuchFromCrm] portal_notifications:',
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
        tag: 'bautagebuch',
      })
    }
  }

  if (orgKundeId) {
    await insertHv(orgKundeId)
  }

  if (portalKundeId) {
    const { data: kunde } = await supabaseAdmin
      .from('kunden')
      .select('auth_user_id, portal_modus')
      .eq('id', portalKundeId)
      .maybeSingle()

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
