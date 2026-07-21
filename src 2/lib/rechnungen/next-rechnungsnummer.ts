import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Erste Rechnungsnummer im Jahr 2026 (danach fortlaufend). */
export const RE_NUMMER_START_2026 = 2069

export type RechnungBelegNummerTyp = 'rechnung' | 'gutschrift'

export function rechnungsnummerPrefix(
  typ: RechnungBelegNummerTyp,
  jahr = new Date().getFullYear()
): string {
  const y = String(jahr)
  return typ === 'gutschrift' ? `GS-RE${y}-` : `RE${y}-`
}

export function isRe2026FormatNummer(
  nummer: string,
  typ: RechnungBelegNummerTyp = 'rechnung'
): boolean {
  const n = nummer.trim()
  const prefix = rechnungsnummerPrefix(typ)
  if (!n.startsWith(prefix)) return false
  const suffix = n.slice(prefix.length)
  return /^[0-9]+$/.test(suffix)
}

function startNummerFuerJahr(jahr: string): number {
  return jahr === '2026' ? RE_NUMMER_START_2026 : 1
}

/** Nächste Nummer per Abfrage (RE2026-2069, RE2026-2070, …). */
export async function nextRechnungsnummerAusDb(
  supabase: SupabaseClient,
  typ: RechnungBelegNummerTyp = 'rechnung'
): Promise<string> {
  const jahr = String(new Date().getFullYear())
  const prefix = rechnungsnummerPrefix(typ, Number(jahr))
  const start = startNummerFuerJahr(jahr)

  const { data, error } = await supabase
    .from('rechnungen')
    .select('rechnungsnummer')
    .like('rechnungsnummer', `${prefix}%`)

  if (error) {
    console.warn('[nextRechnungsnummerAusDb]', error.message)
    return `${prefix}${start}`
  }

  let max = 0
  for (const row of data ?? []) {
    const nr = String(row.rechnungsnummer ?? '').trim()
    if (!nr.startsWith(prefix)) continue
    const suffix = nr.slice(prefix.length)
    if (!/^[0-9]+$/.test(suffix)) continue
    max = Math.max(max, parseInt(suffix, 10))
  }

  const next = Math.max(max + 1, start)
  return `${prefix}${next}`
}

/**
 * Vergibt RE{Jahr}-{Nr} (ab 2069 in 2026) bzw. GS-RE… für Gutschriften.
 * Nutzt RPC `generate_beleg_nummer`, falls das RE-Format liefert — sonst DB-Fallback.
 */
export async function allocateRechnungsnummer(
  typ: RechnungBelegNummerTyp = 'rechnung',
  supabase: SupabaseClient = supabaseAdmin
): Promise<{ ok: true; nummer: string } | { ok: false; message: string }> {
  const { data: rpcRaw, error: rpcErr } = await supabase.rpc('generate_beleg_nummer', {
    p_typ: typ,
  })

  if (!rpcErr && rpcRaw) {
    const fromRpc = String(rpcRaw).trim()
    if (isRe2026FormatNummer(fromRpc, typ)) {
      return { ok: true, nummer: fromRpc }
    }
    console.warn(
      '[allocateRechnungsnummer] RPC lieferte altes Format, Fallback:',
      fromRpc
    )
  } else if (rpcErr) {
    const legacy = await supabase.rpc('generate_rechnungsnummer')
    if (!legacy.error && legacy.data) {
      const fromLegacy = String(legacy.data).trim()
      if (isRe2026FormatNummer(fromLegacy, typ)) {
        return { ok: true, nummer: fromLegacy }
      }
    }
    console.warn('[allocateRechnungsnummer] RPC fehlgeschlagen:', rpcErr.message)
  }

  try {
    const nummer = await nextRechnungsnummerAusDb(supabase, typ)
    return { ok: true, nummer }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Rechnungsnummer konnte nicht erzeugt werden.',
    }
  }
}

/** Entwürfe mit BW-… o. ä. erhalten beim Öffnen/Versand eine RE2026-…-Nummer. */
export async function maybeUpgradeLegacyRechnungsnummer(
  supabase: SupabaseClient,
  rechnungId: string,
  current: string | null | undefined,
  status: string,
  belegTyp: RechnungBelegNummerTyp = 'rechnung'
): Promise<string> {
  const nr = current?.trim() ?? ''
  if (status !== 'entwurf') return nr
  if (nr && isRe2026FormatNummer(nr, belegTyp)) return nr

  const numRes = await allocateRechnungsnummer(belegTyp, supabaseAdmin)
  if (!numRes.ok) return nr

  const { error } = await supabase
    .from('rechnungen')
    .update({ rechnungsnummer: numRes.nummer, updated_at: new Date().toISOString() })
    .eq('id', rechnungId)

  if (error) {
    console.warn('[maybeUpgradeLegacyRechnungsnummer]', rechnungId, error.message)
    return nr
  }
  return numRes.nummer
}
