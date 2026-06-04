import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import type { KalenderTermin } from '@/lib/types'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** YYYY-MM-DD + Tage (lokal) */
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function tomorrowYmd(): string {
  return addDaysYmd(new Date().toISOString().slice(0, 10), 1)
}

/** Automatische Kalendereinträge (ohne neue Migration). Fehler nur loggen. */
export async function insertKalenderAutoTermin(input: {
  titel: string
  datum: string
  typ: KalenderTermin['typ']
  lead_id?: string | null
  auftrag_id?: string | null
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('kalender_termine').insert({
    titel: input.titel,
    datum: input.datum,
    typ: input.typ,
    lead_id: input.lead_id ?? null,
    auftrag_id: input.auftrag_id ?? null,
    uhrzeit_von: null,
    uhrzeit_bis: null,
    adresse: null,
    beschreibung: null,
    erledigt: false,
  })
  if (error) {
    console.warn('[kalender-auto]', error.message)
    return
  }
  revalidatePath('/kalender')
}
