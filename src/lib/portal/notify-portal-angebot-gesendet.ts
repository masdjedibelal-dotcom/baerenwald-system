/**
 * Shared-DB: In-App-Notification nach Angebotsversand (HV + Privatkunde).
 * Unabhängig vom Portal-HTTP-Sync — damit Glocke/Dokumente auch greifen,
 * wenn PARTNER_INTERNAL_API_SECRET fehlt oder das Portal offline ist.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

const ANGEBOT_NOTIF_VISUAL = {
  iconBg: '#E4ECF7',
  iconFg: '#1F4FA8',
  iconGlyph: '📄',
} as const

function portalVorgangLink(leadId: string): string {
  return `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}&tab=angebot`
}

async function hasRecentHvNotif(opts: {
  kundeId: string
  leadId: string
}): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { data } = await supabaseAdmin
    .from('hv_notifications')
    .select('id')
    .eq('kunde_id', opts.kundeId)
    .eq('typ', 'angebot')
    .ilike('link', `%${opts.leadId}%`)
    .gte('created_at', since)
    .limit(1)
  return (data ?? []).length > 0
}

async function hasUnreadPortalNotif(opts: {
  empfaengerUserId: string
  leadId: string
}): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('portal_notifications')
    .select('id')
    .eq('empfaenger_user_id', opts.empfaengerUserId)
    .eq('vorgang_ref', opts.leadId)
    .eq('typ', 'angebot')
    .eq('gelesen', false)
    .limit(1)
  return (data ?? []).length > 0
}

/**
 * Schreibt hv_notifications / portal_notifications für den Lead nach „Angebot gesendet“.
 * Idempotent innerhalb ~15 Min (HV) bzw. ungelesener gleicher Typ (Privat).
 */
export async function notifyPortalAngebotGesendetFromCrm(leadId: string): Promise<void> {
  const trimmed = leadId.trim()
  if (!trimmed) return

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id, kunde_id, auftraggeber_kunde_id, situation, kontakt_name')
    .eq('id', trimmed)
    .maybeSingle()

  if (leadErr) {
    console.warn('[notifyPortalAngebotGesendetFromCrm] lead:', leadErr.message)
    return
  }
  if (!lead?.id) return

  const { data: angebot } = await supabaseAdmin
    .from('angebote')
    .select(
      'id, angebotsnr, leistungsumfang, status_einfach, status, gesendet_am, gesendet_kunde_at, pdf_url, gesamt_fix, gesamt_max, notizen'
    )
    .eq('lead_id', trimmed)
    .order('gesendet_am', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const gesendetAm = String(angebot?.gesendet_am ?? '').trim()
  const gesendetKundeAt = String(angebot?.gesendet_kunde_at ?? '').trim()
  const statusEinfach = String(angebot?.status_einfach ?? '')
    .trim()
    .toLowerCase()
  const statusRaw = String(angebot?.status ?? '')
    .trim()
    .toLowerCase()
  const hasPdf = Boolean(String(angebot?.pdf_url ?? '').trim())
  const wirklichGesendet =
    Boolean(gesendetAm) ||
    Boolean(gesendetKundeAt) ||
    statusEinfach === 'gesendet' ||
    statusEinfach === 'gesendet_kunde' ||
    statusRaw.includes('gesendet') ||
    hasPdf
  if (!angebot?.id || !wirklichGesendet) return

  const nr =
    String(angebot.angebotsnr ?? '').trim() ||
    String(angebot.id).slice(0, 8).toUpperCase() ||
    '—'
  let angebotTitel = ''
  try {
    const rawNotizen = String((angebot as { notizen?: string | null }).notizen ?? '').trim()
    if (rawNotizen.startsWith('{')) {
      const parsed = JSON.parse(rawNotizen) as { wizard_meta?: { titel?: string } }
      angebotTitel = String(parsed.wizard_meta?.titel ?? '').trim()
    }
  } catch {
    /* ignore */
  }
  const titel =
    angebotTitel ||
    String(angebot.leistungsumfang ?? '').trim() ||
    String((lead as { situation?: string | null }).situation ?? '').trim() ||
    'Ihr Vorgang'
  const notifTitel = `Angebot bereit: ${titel}`
  const body =
    nr !== '—'
      ? `Neues Angebot ${nr} zu „${titel}“ liegt im Portal unter Dokumente.`
      : `Neues Angebot zu „${titel}“ liegt im Portal unter Dokumente.`
  const portalPath = portalVorgangLink(trimmed)

  const orgKundeId = String(lead.auftraggeber_kunde_id ?? '').trim()
  const portalKundeId = String(lead.kunde_id ?? '').trim()

  const insertHv = async (kundeId: string) => {
    if (await hasRecentHvNotif({ kundeId, leadId: trimmed })) return
    const { error } = await supabaseAdmin.from('hv_notifications').insert({
      kunde_id: kundeId,
      typ: 'angebot',
      titel: notifTitel,
      body,
      link: portalPath,
    })
    if (error) {
      console.warn('[notifyPortalAngebotGesendetFromCrm] hv_notifications:', error.message)
    } else {
      const { schedulePortalWebPushForOrgKunde } = await import(
        '@/lib/portal/send-portal-web-push'
      )
      schedulePortalWebPushForOrgKunde(kundeId, {
        titel: notifTitel,
        body,
        url: portalPath,
        tag: 'angebot',
      })
    }
  }

  const insertPortal = async (authUserId: string) => {
    if (await hasUnreadPortalNotif({ empfaengerUserId: authUserId, leadId: trimmed })) {
      return
    }
    const { error } = await supabaseAdmin.from('portal_notifications').insert({
      empfaenger_user_id: authUserId,
      typ: 'angebot',
      titel: notifTitel,
      body,
      vorgang_ref: trimmed,
      link: portalPath,
      gelesen: false,
      icon_bg: ANGEBOT_NOTIF_VISUAL.iconBg,
      icon_fg: ANGEBOT_NOTIF_VISUAL.iconFg,
      icon_glyph: ANGEBOT_NOTIF_VISUAL.iconGlyph,
    })
    if (error) {
      console.warn(
        '[notifyPortalAngebotGesendetFromCrm] portal_notifications:',
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
        tag: 'angebot',
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
      // Direkt-Kunde = Auftraggeber-Org (ohne separates auftraggeber_kunde_id)
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
