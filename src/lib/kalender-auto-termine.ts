import { revalidateKalender,revalidateLeadDetail } from '@/lib/crm-revalidate'
import type { KalenderTermin } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase-admin'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** YYYY-MM-DD + Tage (lokal) */
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

type KalenderAutoTerminInput = {
  titel: string
  datum: string
  typ: KalenderTermin['typ']
  lead_id?: string | null
  auftrag_id?: string | null
}

/** Mehrere Termine in einem Insert — deaktiviert: Termine nur manuell im Kalender. */
export async function insertKalenderAutoTermine(
  _inputs: KalenderAutoTerminInput[],
  _opts?: { skipRevalidate?: boolean }
): Promise<void> {
  return
}

export async function erledigeInterneNachfassTodos(
  leadId: string | null | undefined,
  angebotKurz?: string | null
): Promise<void> {
  if (!leadId?.trim()) return
  let q = supabaseAdmin
    .from('kalender_termine')
    .update({ erledigt: true })
    .eq('lead_id', leadId)
    .eq('typ', 'intern')
    .eq('erledigt', false)
    .ilike('titel', 'Nachfassen:%')

  if (angebotKurz?.trim()) {
    q = q.ilike('beschreibung', `%${angebotKurz.trim()}%`)
  }

  const { error } = await q
  if (error) {
    console.warn('[internes-todo erledigen]', error.message)
    return
  }
  revalidateKalender()
  revalidateLeadDetail(leadId)
}
