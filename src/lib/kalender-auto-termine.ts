import { revalidatePath } from 'next/cache'
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

export function tomorrowYmd(): string {
  return addDaysYmd(new Date().toISOString().slice(0, 10), 1)
}

type KalenderAutoTerminInput = {
  titel: string
  datum: string
  typ: KalenderTermin['typ']
  lead_id?: string | null
  auftrag_id?: string | null
}

function mapKalenderRow(input: KalenderAutoTerminInput) {
  return {
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
  }
}

/** Automatische Kalendereinträge. Fehler nur loggen. */
export async function insertKalenderAutoTermin(
  input: KalenderAutoTerminInput,
  opts?: { skipRevalidate?: boolean }
): Promise<void> {
  await insertKalenderAutoTermine([input], opts)
}

/** Mehrere Termine in einem Insert (schneller als einzelne Aufrufe). */
export async function insertKalenderAutoTermine(
  inputs: KalenderAutoTerminInput[],
  opts?: { skipRevalidate?: boolean }
): Promise<void> {
  if (!inputs.length) return
  const { error } = await supabaseAdmin.from('kalender_termine').insert(inputs.map(mapKalenderRow))
  if (error) {
    console.warn('[kalender-auto]', error.message)
    return
  }
  if (!opts?.skipRevalidate) revalidatePath('/kalender')
}
