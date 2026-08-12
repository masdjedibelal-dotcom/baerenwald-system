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

/** CRM-internes To-do — erscheint im Dashboard, nicht in der Anfrage-Terminliste. */
export async function insertInternesTodo(input: {
  titel: string
  datum: string
  lead_id?: string | null
  auftrag_id?: string | null
  beschreibung?: string | null
}): Promise<void> {
  const { error } = await supabaseAdmin.from('kalender_termine').insert({
    titel: input.titel.trim(),
    datum: input.datum,
    typ: 'intern',
    lead_id: input.lead_id ?? null,
    auftrag_id: input.auftrag_id ?? null,
    uhrzeit_von: null,
    uhrzeit_bis: null,
    adresse: null,
    beschreibung: input.beschreibung?.trim() || null,
    erledigt: false,
  })
  if (error) {
    console.warn('[internes-todo]', error.message)
    return
  }
  revalidatePath('/kalender')
  revalidatePath('/')
  if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
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
  revalidatePath('/kalender')
  revalidatePath('/')
  revalidatePath(`/anfragen/${leadId}`)
}

/** Offenes Nachfass-To-do auf neues Datum legen (z. B. nach Gültigkeits-Verlängerung). */
export async function planeInternesNachfassTodo(input: {
  leadId: string | null | undefined
  datum: string
  kundeName: string
  angebotRef: string
}): Promise<void> {
  if (!input.leadId?.trim()) return
  await erledigeInterneNachfassTodos(input.leadId, input.angebotRef)
  await insertInternesTodo({
    titel: `Nachfassen: ${input.kundeName.trim() || 'Kunde'}`,
    datum: input.datum,
    lead_id: input.leadId,
    beschreibung: `Angebot ${input.angebotRef} — Erinnerungs-Mail in 7 Tagen, falls keine Rückmeldung`,
  })
}
