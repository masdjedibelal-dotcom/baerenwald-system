import 'server-only'

import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

import { logDbError } from '@/lib/errors/log-db-error'
import { writeEinsatzStatus } from '@/lib/status/write-einsatz-status'
import { getPublicAppUrl } from '@/lib/utils'

/**
 * Einsatz annehmen/ablehnen per Mail-Link (ohne Portal-Login).
 * Der Link führt auf eine Bestätigungsseite; erst der Klick dort ändert den Status.
 */

export function neuerAntwortToken(): string {
  return randomBytes(24).toString('hex')
}

export function einsatzAntwortLink(token: string, antwort?: 'annehmen' | 'ablehnen'): string {
  return `${getPublicAppUrl()}/einsatz/${encodeURIComponent(token)}${antwort ? `?antwort=${antwort}` : ''}`
}

export type EinsatzPerToken = {
  id: string
  auftrag_id: string
  handwerker_id: string
  titel: string
  anweisung: string | null
  termin_von: string | null
  termin_bis: string | null
  ort: string | null
  kontakt_vor_ort: string | null
  ek_betrag: number | null
  ek_art: 'netto' | 'brutto'
  status: string
  ablehnung_grund: string | null
  partner_name: string
}

/** Token prüfen: nur 48 Hex-Zeichen (aus neuerAntwortToken). */
export function verifyTokenFormat(token: string): boolean {
  return /^[0-9a-f]{48}$/.test(token)
}

export async function einsatzPerToken(db: SupabaseClient, token: string): Promise<EinsatzPerToken | null> {
  if (!verifyTokenFormat(token)) return null
  const { data, error } = await db
    .from('einsaetze')
    .select(
      'id, auftrag_id, handwerker_id, titel, anweisung, termin_von, termin_bis, ort, kontakt_vor_ort, ek_betrag, ek_art, status, ablehnung_grund, handwerker(name, firma)'
    )
    .eq('antwort_token', token)
    .maybeSingle()
  if (error) logDbError('lib/einsatz/antwort:laden', error)
  if (!data) return null
  const hwRaw = (data as { handwerker?: unknown }).handwerker
  const hw = (Array.isArray(hwRaw) ? hwRaw[0] : hwRaw) as { name?: string | null; firma?: string | null } | null
  return {
    id: String(data.id),
    auftrag_id: String(data.auftrag_id),
    handwerker_id: String(data.handwerker_id),
    titel: String(data.titel ?? ''),
    anweisung: (data.anweisung as string | null) ?? null,
    termin_von: (data.termin_von as string | null) ?? null,
    termin_bis: (data.termin_bis as string | null) ?? null,
    ort: (data.ort as string | null) ?? null,
    kontakt_vor_ort: (data.kontakt_vor_ort as string | null) ?? null,
    ek_betrag: data.ek_betrag == null ? null : Number(data.ek_betrag),
    ek_art: data.ek_art === 'brutto' ? 'brutto' : 'netto',
    status: String(data.status ?? ''),
    ablehnung_grund: (data.ablehnung_grund as string | null) ?? null,
    partner_name: hw?.firma?.trim() || hw?.name?.trim() || 'Partner',
  }
}

/** Antwort des Partners speichern — gleicher Schritt wie „Annehmen“/„Ablehnen“ im Partner-Portal. */
export async function einsatzBeantworten(
  db: SupabaseClient,
  token: string,
  antwort: 'annehmen' | 'ablehnen',
  grund?: string | null
): Promise<{ ok: true; status: string } | { ok: false; message: string }> {
  const e = await einsatzPerToken(db, token)
  if (!e) return { ok: false, message: 'Dieser Link ist nicht (mehr) gültig.' }
  if (e.status !== 'gesendet') {
    return { ok: false, message: e.status === 'angenommen' ? 'Der Einsatz ist bereits angenommen.' : 'Der Einsatz wurde bereits beantwortet.' }
  }
  const now = new Date().toISOString()
  const w = await writeEinsatzStatus(db, {
    einsatzId: e.id,
    handwerkerId: e.handwerker_id,
    von: 'gesendet',
    nach: antwort === 'annehmen' ? 'angenommen' : 'abgelehnt',
    extra:
      antwort === 'annehmen'
        ? { angenommen_at: now, angenommen_von: 'partner' }
        : { abgelehnt_at: now, ablehnung_grund: grund?.trim().slice(0, 500) || 'Per E-Mail abgelehnt' },
  })
  if (!w.ok) return { ok: false, message: w.error }
  return { ok: true, status: antwort === 'annehmen' ? 'angenommen' : 'abgelehnt' }
}
