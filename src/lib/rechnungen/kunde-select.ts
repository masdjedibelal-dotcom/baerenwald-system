import type { SupabaseClient } from '@supabase/supabase-js'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { isRechnungComplianceSchemaError } from '@/lib/rechnungen/rechnung-speichern'
import type { Kunde } from '@/lib/types'

const KUNDE_SELECT =
  'id, name, vorname, nachname, email, telefon, adresse, strasse, hausnummer, plz, ort, typ, ust_id, kundennummer'

const KUNDE_SELECT_LEGACY =
  'id, name, vorname, nachname, email, telefon, adresse, strasse, hausnummer, plz, ort, typ, kundennummer'

export async function loadKundeFuerRechnung(
  _supabase: SupabaseClient,
  kundeId: string
): Promise<{ data: Kunde | null; error: { message: string } | null }> {
  let result = await withCrmReadFallback(async (db) =>
    db.from('kunden').select(KUNDE_SELECT).eq('id', kundeId).maybeSingle()
  )

  if (result.error && isRechnungComplianceSchemaError(result.error.message)) {
    result = await withCrmReadFallback(async (db) =>
      db.from('kunden').select(KUNDE_SELECT_LEGACY).eq('id', kundeId).maybeSingle()
    )
  }

  if (result.error) return { data: null, error: { message: result.error.message } }
  return { data: (result.data as Kunde | null) ?? null, error: null }
}

export const KUNDE_EMBED_SELECT = `kunden(${KUNDE_SELECT})`
export const KUNDE_EMBED_SELECT_LEGACY = `kunden(${KUNDE_SELECT_LEGACY})`
