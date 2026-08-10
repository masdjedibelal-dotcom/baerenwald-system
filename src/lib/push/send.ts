/**
 * Server: Web-Push an Staff mit aktiver Subscription + Prefs.
 * Phase 2 — Aufruf von Event-Hooks (z. B. neue Anfrage).
 */
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  isPushPrefEnabledForTyp,
  type CrmPushPrefs,
  CRM_PUSH_PREF_DEFAULTS,
} from '@/lib/push/prefs'
import type { CrmNotificationTyp } from '@/app/(dashboard)/notifications/actions'

function configureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const priv = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:crm@baerenwaldmuenchen.de'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  return true
}

function rowToPrefs(row: Record<string, unknown> | null): CrmPushPrefs {
  if (!row) return { ...CRM_PUSH_PREF_DEFAULTS }
  return {
    push_enabled: Boolean(row.push_enabled),
    neue_anfragen: Boolean(row.neue_anfragen),
    handwerker_updates: Boolean(row.handwerker_updates),
    angebot_entscheidungen: Boolean(row.angebot_entscheidungen),
    anstehende_abnahmen: Boolean(row.anstehende_abnahmen),
    auftrag_partner: Boolean(row.auftrag_partner),
    ueberfaellige_rechnungen: Boolean(row.ueberfaellige_rechnungen),
    system_updates: Boolean(row.system_updates),
  }
}

export async function sendCrmPushToStaff(input: {
  typ: CrmNotificationTyp
  title: string
  body: string
  url: string
  tag?: string
}): Promise<{ sent: number; skipped: string }> {
  if (!configureVapid()) {
    return { sent: 0, skipped: 'vapid_missing' }
  }

  const { data: prefsRows, error: prefsErr } = await supabaseAdmin
    .from('crm_push_prefs')
    .select('*')
    .eq('push_enabled', true)

  if (prefsErr || !prefsRows?.length) {
    return { sent: 0, skipped: prefsErr?.message || 'no_prefs' }
  }

  const eligibleUserIds = prefsRows
    .filter((row) => isPushPrefEnabledForTyp(rowToPrefs(row as Record<string, unknown>), input.typ))
    .map((row) => String((row as { user_id: string }).user_id))

  if (!eligibleUserIds.length) return { sent: 0, skipped: 'no_eligible_users' }

  const { data: subs, error: subErr } = await supabaseAdmin
    .from('crm_push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .in('user_id', eligibleUserIds)

  if (subErr || !subs?.length) {
    return { sent: 0, skipped: subErr?.message || 'no_subscriptions' }
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url,
    tag: input.tag ?? `crm-${input.typ}`,
  })

  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: String(sub.endpoint),
          keys: { p256dh: String(sub.p256dh), auth: String(sub.auth) },
        },
        payload
      )
      sent += 1
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410) {
        await supabaseAdmin.from('crm_push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.warn('[crm-push]', e instanceof Error ? e.message : e)
      }
    }
  }

  return { sent, skipped: sent ? '' : 'send_failed' }
}
