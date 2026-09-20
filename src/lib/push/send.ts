/**
 * Server: Web-Push an Staff mit aktiver Subscription + Prefs.
 * Phase 2 — Aufruf von Event-Hooks (z. B. neue Anfrage).
 */
import { logDbError } from '@/lib/errors/log-db-error'
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
  const logPush = async (sent: number, skipped: string) => {
    try {
      const { logNotifyEmailResult } = await import('@/lib/kommunikation/log-notify-email-result')
      await logNotifyEmailResult({
        typ: 'crm_push',
        betreff: `CRM-Push: ${input.typ}`,
        ok: sent > 0,
        error: sent > 0 ? null : skipped || 'kein Empfänger',
      })
    } catch (e) {
      logDbError('lib/push/send:email_log', e)
    }
  }

  if (!configureVapid()) {
    await logPush(0, 'vapid_missing')
    return { sent: 0, skipped: 'vapid_missing' }
  }

  const { data: prefsRows, error: prefsErr } = await supabaseAdmin
    .from('crm_push_prefs')
    .select('*')
    .eq('push_enabled', true)
  if (prefsErr) logDbError('lib/push/send:crm_push_prefs', prefsErr)

  if (prefsErr || !prefsRows?.length) {
    const skipped = prefsErr?.message || 'no_prefs'
    await logPush(0, skipped)
    return { sent: 0, skipped }
  }

  const eligibleUserIds = prefsRows
    .filter((row) => isPushPrefEnabledForTyp(rowToPrefs(row as Record<string, unknown>), input.typ))
    .map((row) => String((row as { user_id: string }).user_id))

  if (!eligibleUserIds.length) {
    await logPush(0, 'no_eligible_users')
    return { sent: 0, skipped: 'no_eligible_users' }
  }

  const { data: subs, error: subErr } = await supabaseAdmin
    .from('crm_push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .in('user_id', eligibleUserIds)
  if (subErr) logDbError('lib/push/send:crm_push_subscriptions', subErr)

  if (subErr || !subs?.length) {
    const skipped = subErr?.message || 'no_subscriptions'
    await logPush(0, skipped)
    return { sent: 0, skipped }
  }

  const rawTitle = String(input.title ?? '').trim()
  // Gleicher Name wie Manifest → Safari „Bärenwald from Bärenwald“
  const title = !rawTitle || /^bärenwald$/i.test(rawTitle) ? '' : rawTitle
  const body = String(input.body ?? '').trim() || rawTitle || 'Neue Benachrichtigung'

  const payload = JSON.stringify({
    title,
    body: /^bärenwald$/i.test(body) && title === '' ? 'Neue Benachrichtigung' : body,
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
        const { error: __dbErr1 } = await supabaseAdmin.from('crm_push_subscriptions').delete().eq('id', sub.id)
        if (__dbErr1) logDbError('lib/push/send:crm_push_subscriptions', __dbErr1)
      } else {
        console.warn('[crm-push]', e instanceof Error ? e.message : e)
      }
    }
  }

  const skipped = sent ? '' : 'send_failed'
  await logPush(sent, skipped)
  return { sent, skipped }
}
