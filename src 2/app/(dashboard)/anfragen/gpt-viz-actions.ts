'use server'

import { revalidatePath } from 'next/cache'
import { fetchGptZielbildFromWebsite } from '@/lib/gpt-viz/fetch-zielbild'
import {
  gptHeroBildUrl,
  parseGptProjektStudioFunnel,
} from '@/lib/gpt-viz/funnel-daten'
import { parseLeadFunnelDaten } from '@/lib/lead-funnel-daten'
import { createClient } from '@/lib/supabase-server'

export async function ensureGptZielbildForLead(
  leadId: string,
  options?: { force?: boolean }
): Promise<
  | { ok: true; zielbild_url: string | null; from_cache: boolean }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: row, error: loadErr } = await supabase
    .from('leads')
    .select('funnel_daten')
    .eq('id', leadId)
    .maybeSingle()

  if (loadErr || !row) return { ok: false, message: 'Anfrage nicht gefunden.' }

  const studio = parseGptProjektStudioFunnel(row.funnel_daten)
  if (!studio) return { ok: false, message: 'Kein GPT-Projekt-Studio-Lead.' }

  const existing = studio.zielbild_url?.trim()
  if (existing && !options?.force) {
    return { ok: true, zielbild_url: existing, from_cache: true }
  }

  const fetched = await fetchGptZielbildFromWebsite(studio.gpt_session_id, options?.force ?? false)
  if (!fetched.ok) {
    const fallback = gptHeroBildUrl(studio)
    if (fallback) {
      return { ok: true, zielbild_url: fallback, from_cache: true }
    }
    return { ok: false, message: fetched.error }
  }

  const funnel = parseLeadFunnelDaten(row.funnel_daten)
  const { error: updateErr } = await supabase
    .from('leads')
    .update({
      funnel_daten: { ...funnel, zielbild_url: fetched.zielbild_url },
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (updateErr) {
    return { ok: true, zielbild_url: fetched.zielbild_url, from_cache: false }
  }

  revalidatePath('/anfragen')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true, zielbild_url: fetched.zielbild_url, from_cache: false }
}
