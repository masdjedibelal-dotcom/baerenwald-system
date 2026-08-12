'use server'

import { createClient } from '@/lib/supabase-server'
import {
  CRM_PUSH_PREF_DEFAULTS,
  type CrmPushPrefKey,
  type CrmPushPrefs,
} from '@/lib/push/prefs'

function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null
}

export async function getCrmPushSetup(): Promise<{
  prefs: CrmPushPrefs
  vapidPublicKey: string | null
  hasSubscription: boolean
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      prefs: { ...CRM_PUSH_PREF_DEFAULTS },
      vapidPublicKey: vapidPublicKey(),
      hasSubscription: false,
    }
  }

  const [{ data: prefsRow }, { data: subs }] = await Promise.all([
    supabase.from('crm_push_prefs').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('crm_push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1),
  ])

  const prefs: CrmPushPrefs = {
    ...CRM_PUSH_PREF_DEFAULTS,
    ...(prefsRow
      ? {
          push_enabled: Boolean(prefsRow.push_enabled),
          neue_anfragen: Boolean(prefsRow.neue_anfragen),
          handwerker_updates: Boolean(prefsRow.handwerker_updates),
          angebot_entscheidungen: Boolean(prefsRow.angebot_entscheidungen),
          anstehende_abnahmen: Boolean(prefsRow.anstehende_abnahmen),
          auftrag_partner: Boolean(prefsRow.auftrag_partner),
          ueberfaellige_rechnungen: Boolean(prefsRow.ueberfaellige_rechnungen),
          system_updates: Boolean(prefsRow.system_updates),
        }
      : {}),
  }

  return {
    prefs,
    vapidPublicKey: vapidPublicKey(),
    hasSubscription: (subs?.length ?? 0) > 0,
  }
}

export async function upsertCrmPushPrefs(
  patch: Partial<CrmPushPrefs>
): Promise<{ ok: true; prefs: CrmPushPrefs } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const current = await getCrmPushSetup()
  const next: CrmPushPrefs = { ...current.prefs, ...patch, }

  const { error } = await supabase.from('crm_push_prefs').upsert(
    {
      user_id: user.id,
      push_enabled: next.push_enabled,
      neue_anfragen: next.neue_anfragen,
      handwerker_updates: next.handwerker_updates,
      angebot_entscheidungen: next.angebot_entscheidungen,
      anstehende_abnahmen: next.anstehende_abnahmen,
      auftrag_partner: next.auftrag_partner,
      ueberfaellige_rechnungen: next.ueberfaellige_rechnungen,
      system_updates: next.system_updates,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) return { ok: false, message: error.message }
  return { ok: true, prefs: next }
}

export async function saveCrmPushSubscription(input: {
  endpoint: string
  p256dh: string
  auth: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const endpoint = input.endpoint.trim()
  const p256dh = input.p256dh.trim()
  const auth = input.auth.trim()
  if (!endpoint || !p256dh || !auth) {
    return { ok: false, message: 'Ungültige Push-Subscription' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const now = new Date().toISOString()
  const { error } = await supabase.from('crm_push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
      user_agent: null,
      last_seen_at: now,
    },
    { onConflict: 'endpoint' }
  )
  if (error) return { ok: false, message: error.message }

  await upsertCrmPushPrefs({ push_enabled: true })
  return { ok: true }
}

export async function removeCrmPushSubscription(endpoint?: string | null): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  let q = supabase.from('crm_push_subscriptions').delete().eq('user_id', user.id)
  if (endpoint?.trim()) q = q.eq('endpoint', endpoint.trim())
  const { error } = await q
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function setCrmPushPrefSwitch(
  key: CrmPushPrefKey | 'push_enabled',
  value: boolean
): Promise<{ ok: true; prefs: CrmPushPrefs } | { ok: false; message: string }> {
  return upsertCrmPushPrefs({ [key]: value } as Partial<CrmPushPrefs>)
}
