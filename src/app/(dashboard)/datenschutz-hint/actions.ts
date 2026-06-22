'use server'

import { createClient } from '@/lib/supabase-server'

export async function loadDatenschutzHintDismissed(): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return false

  const { data, error } = await supabase
    .from('user_profiles')
    .select('datenschutz_hint_bestaetigt_am')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    const msg = (error.message ?? '').toLowerCase()
    if (error.code === '42703' || msg.includes('datenschutz_hint_bestaetigt_am')) {
      return false
    }
    console.warn('[loadDatenschutzHintDismissed]', error.message)
    return false
  }

  return Boolean((data as { datenschutz_hint_bestaetigt_am?: string | null } | null)?.datenschutz_hint_bestaetigt_am)
}

export async function dismissDatenschutzHint(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) return { ok: false, message: 'Nicht angemeldet' }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('user_profiles')
    .update({ datenschutz_hint_bestaetigt_am: now })
    .eq('id', user.id)

  if (error) {
    const msg = (error.message ?? '').toLowerCase()
    if (error.code === '42703' || msg.includes('datenschutz_hint_bestaetigt_am')) {
      return { ok: true }
    }
    return { ok: false, message: error.message }
  }

  return { ok: true }
}
