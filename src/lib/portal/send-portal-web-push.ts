/**
 * Portal-Web-Push aus dem CRM (Shared DB: push_subscriptions + push_prefs).
 * Notification-Titel leer (App-Name „Bärenwald“ kommt vom Manifest) — Inhalt nur im Body.
 */
import { logDbError } from '@/lib/errors/log-db-error'
import { safeVoidNotify } from '@/lib/errors/safe-void-notify'
import webpush from 'web-push'

import { supabaseAdmin } from '@/lib/supabase-admin'

let vapidReady = false

function ensureVapid(): boolean {
  const pub =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    ''
  const priv = process.env.VAPID_PRIVATE_KEY?.trim() || ''
  const subject =
    process.env.VAPID_SUBJECT?.trim() || 'mailto:system@baerenwaldmuenchen.de'
  if (!pub || !priv) return false
  if (!vapidReady) {
    webpush.setVapidDetails(subject, pub, priv)
    vapidReady = true
  }
  return true
}

async function resolveOrgAuthUserIds(kundeId: string): Promise<string[]> {
  const id = kundeId.trim()
  if (!id) return []
  const ids = new Set<string>()
  const { data: kunde, error } = await supabaseAdmin
    .from('kunden')
    .select('auth_user_id')
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('lib/portal/send-portal-web-push:kunden', error)
  const main = String(kunde?.auth_user_id ?? '').trim()
  if (main) ids.add(main)
  const { data: mitglieder, error: error2 } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('auth_user_id')
    .eq('kunde_id', id)
    .eq('aktiv', true)
  if (error2) logDbError('lib/portal/send-portal-web-push:kunden_mitglieder', error2)
  for (const m of mitglieder ?? []) {
    const uid = String(m.auth_user_id ?? '').trim()
    if (uid) ids.add(uid)
  }
  return Array.from(ids)
}

async function logPortalPush(ok: boolean, error: string | null) {
  try {
    const { logNotifyEmailResult } = await import('@/lib/kommunikation/log-notify-email-result')
    await logNotifyEmailResult({
      typ: 'portal_push',
      betreff: 'Portal-Web-Push',
      ok,
      error,
    })
  } catch (e) {
    logDbError('lib/portal/send-portal-web-push:email_log', e)
  }
}

export async function sendPortalWebPushToUsers(
  userIds: string[],
  input: { titel?: string | null; body?: string | null; url: string; tag?: string }
): Promise<{ sent: number; skipped: string }> {
  const unique = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)))
  if (!unique.length) {
    await logPortalPush(false, 'no_users')
    return { sent: 0, skipped: 'no_users' }
  }
  if (!ensureVapid()) {
    await logPortalPush(false, 'vapid_missing')
    return { sent: 0, skipped: 'vapid_missing' }
  }

  const { data: prefs, error } = await supabaseAdmin
    .from('push_prefs')
    .select('auth_user_id, push_enabled')
    .in('auth_user_id', unique)
  if (error) logDbError('lib/portal/send-portal-web-push:push_prefs', error)

  const enabled = new Set(
    (prefs ?? [])
      .filter((p) => p.push_enabled)
      .map((p) => String(p.auth_user_id))
  )
  if (!enabled.size) {
    await logPortalPush(false, 'no_prefs')
    return { sent: 0, skipped: 'no_prefs' }
  }

  const { data: subs, error: error2 } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('auth_user_id', Array.from(enabled))
  if (error2) logDbError('lib/portal/send-portal-web-push:push_subscriptions', error2)

  if (!subs?.length) {
    await logPortalPush(false, 'no_subscriptions')
    return { sent: 0, skipped: 'no_subscriptions' }
  }

  const t = String(input.titel ?? '').trim()
  const b = String(input.body ?? '').trim()
  let body = b || t || 'Neue Benachrichtigung'
  if (t && b && !b.toLowerCase().startsWith(t.toLowerCase())) {
    body = `${t} — ${b}`
  } else if (t && !b) {
    body = t
  }

  const payload = JSON.stringify({
    // Leer: Manifest liefert „Bärenwald“ — sonst Safari „Bärenwald from Bärenwald“
    title: '',
    body,
    url: input.url || '/portal',
    tag: input.tag ?? 'baerenwald',
  })

  const staleIds: string[] = []
  let sent = 0
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: String(sub.endpoint),
            keys: { p256dh: String(sub.p256dh), auth: String(sub.auth) },
          },
          payload,
          { TTL: 60 * 60 * 12, urgency: 'normal' }
        )
        sent += 1
      } catch (e) {
        const status =
          e && typeof e === 'object' && 'statusCode' in e
            ? Number((e as { statusCode?: number }).statusCode)
            : 0
        if (status === 404 || status === 410) staleIds.push(String(sub.id))
        else console.warn('[portal-push] send failed:', status || e)
      }
    })
  )

  if (staleIds.length) {
    const { error: __dbErr1 } = await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds)
    if (__dbErr1) logDbError('lib/portal/send-portal-web-push:push_subscriptions', __dbErr1)
  }

  const skipped = sent ? '' : 'send_failed'
  await logPortalPush(sent > 0, sent > 0 ? null : skipped)
  return { sent, skipped }
}

export function schedulePortalWebPushToUsers(
  userIds: string[],
  input: { titel?: string | null; body?: string | null; url: string; tag?: string }
): void {
  safeVoidNotify('portal-web-push', sendPortalWebPushToUsers(userIds, input))
}

/** HV-Org: Push an Hauptkonto + aktive Mitglieder. */
export function schedulePortalWebPushForOrgKunde(
  kundeId: string,
  input: { titel?: string | null; body?: string | null; url: string; tag?: string }
): void {
  safeVoidNotify(
    'portal-web-push-org',
    resolveOrgAuthUserIds(kundeId).then((ids) => sendPortalWebPushToUsers(ids, input))
  )
}
