/**
 * Portal-Web-Push aus dem CRM (Shared DB: push_subscriptions + push_prefs).
 * Titel immer „Bärenwald“ — Inhalt nur im Body.
 */
import webpush from 'web-push'

import { supabaseAdmin } from '@/lib/supabase-admin'

const PUSH_APP_TITLE = 'Bärenwald'

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
  const { data: kunde } = await supabaseAdmin
    .from('kunden')
    .select('auth_user_id')
    .eq('id', id)
    .maybeSingle()
  const main = String(kunde?.auth_user_id ?? '').trim()
  if (main) ids.add(main)
  const { data: mitglieder } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('auth_user_id')
    .eq('kunde_id', id)
    .eq('aktiv', true)
  for (const m of mitglieder ?? []) {
    const uid = String(m.auth_user_id ?? '').trim()
    if (uid) ids.add(uid)
  }
  return Array.from(ids)
}

export async function sendPortalWebPushToUsers(
  userIds: string[],
  input: { titel?: string | null; body?: string | null; url: string; tag?: string }
): Promise<void> {
  const unique = Array.from(new Set(userIds.map((id) => id.trim()).filter(Boolean)))
  if (!unique.length || !ensureVapid()) return

  const { data: prefs } = await supabaseAdmin
    .from('push_prefs')
    .select('auth_user_id, push_enabled')
    .in('auth_user_id', unique)

  const enabled = new Set(
    (prefs ?? [])
      .filter((p) => p.push_enabled)
      .map((p) => String(p.auth_user_id))
  )
  if (!enabled.size) return

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('auth_user_id', Array.from(enabled))

  if (!subs?.length) return

  const t = String(input.titel ?? '').trim()
  const b = String(input.body ?? '').trim()
  let body = b || t || 'Neue Benachrichtigung'
  if (t && b && !b.toLowerCase().startsWith(t.toLowerCase())) {
    body = `${t} — ${b}`
  } else if (t && !b) {
    body = t
  }

  const payload = JSON.stringify({
    title: PUSH_APP_TITLE,
    body,
    url: input.url || '/portal',
    tag: input.tag ?? 'baerenwald',
  })

  const staleIds: string[] = []
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
    await supabaseAdmin.from('push_subscriptions').delete().in('id', staleIds)
  }
}

export function schedulePortalWebPushToUsers(
  userIds: string[],
  input: { titel?: string | null; body?: string | null; url: string; tag?: string }
): void {
  void sendPortalWebPushToUsers(userIds, input).catch((e) =>
    console.error('[portal-push] schedule:', e)
  )
}

/** HV-Org: Push an Hauptkonto + aktive Mitglieder. */
export function schedulePortalWebPushForOrgKunde(
  kundeId: string,
  input: { titel?: string | null; body?: string | null; url: string; tag?: string }
): void {
  void resolveOrgAuthUserIds(kundeId)
    .then((ids) => schedulePortalWebPushToUsers(ids, input))
    .catch((e) => console.error('[portal-push] org:', e))
}
