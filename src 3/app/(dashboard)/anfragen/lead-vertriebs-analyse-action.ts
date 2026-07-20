'use server'

import { revalidatePath } from 'next/cache'
import {
  buildLeadVertriebsKontext,
  type KiAnfragenLogRow,
} from '@/lib/leads/lead-vertriebs-kontext'
import {
  formatLeadVertriebsAnalyse,
  generateLeadVertriebsAnalyse,
} from '@/lib/leads/generate-lead-vertriebs-analyse'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function loadKiLogs(leadId: string, sessionIds: string[]): Promise<KiAnfragenLogRow[]> {
  const { data: byLead } = await supabaseAdmin
    .from('ki_anfragen_log')
    .select(
      'id, session_id, anfrage_text, claude_antwort, typ, extrahiertes_json, lead_erstellt, created_at'
    )
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  let bySession: KiAnfragenLogRow[] = []
  if (sessionIds.length) {
    const { data } = await supabaseAdmin
      .from('ki_anfragen_log')
      .select(
        'id, session_id, anfrage_text, claude_antwort, typ, extrahiertes_json, lead_erstellt, created_at'
      )
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true })
    bySession = (data ?? []) as KiAnfragenLogRow[]
  }

  const map = new Map<string, KiAnfragenLogRow>()
  for (const row of [...((byLead ?? []) as KiAnfragenLogRow[]), ...bySession]) {
    map.set(row.id, row)
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export async function ensureLeadVertriebsAnalyse(
  leadId: string,
  options?: { force?: boolean }
): Promise<
  | { ok: true; text: string; from_cache: boolean }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: row, error } = await supabase
    .from('leads')
    .select(
      'id, status, kanal, bereiche, plz, budget_ca, preis_min, preis_max, zeitraum, zeitraum_von, zeitraum_bis, situation, kontakt_nachricht, kontakt_name, funnel_daten, ki_session_id, ki_zusammenfassung'
    )
    .eq('id', leadId)
    .maybeSingle()

  if (error || !row) return { ok: false, message: 'Anfrage nicht gefunden.' }

  const existing = (row.ki_zusammenfassung as string | null)?.trim()
  if (existing && !options?.force) {
    return { ok: true, text: existing, from_cache: true }
  }

  const funnel = row.funnel_daten as Record<string, unknown> | null
  const gptSession = String(funnel?.gpt_session_id ?? '').trim()
  const kiSession = String(row.ki_session_id ?? '').trim()
  const sessionIds: string[] = []
  if (gptSession) sessionIds.push(gptSession)
  if (kiSession && !sessionIds.includes(kiSession)) sessionIds.push(kiSession)

  const kiLogs = await loadKiLogs(leadId, sessionIds)
  const kontext = buildLeadVertriebsKontext(row as Record<string, unknown>, kiLogs)
  if (!kontext) {
    return { ok: false, message: 'Keine KI-Daten für eine Vertriebs-Analyse vorhanden.' }
  }

  try {
    const analyse = await generateLeadVertriebsAnalyse(kontext)
    const text = formatLeadVertriebsAnalyse(analyse)
    if (!text.trim()) {
      return { ok: false, message: 'Analyse leer — bitte erneut versuchen.' }
    }

    const { error: updErr } = await supabaseAdmin
      .from('leads')
      .update({
        ki_zusammenfassung: text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    if (updErr) {
      console.warn('[vertriebs-analyse speichern]', updErr.message)
    }

    revalidatePath(`/anfragen/${leadId}`)
    revalidatePath('/anfragen')
    return { ok: true, text, from_cache: false }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Vertriebs-Analyse fehlgeschlagen.',
    }
  }
}
