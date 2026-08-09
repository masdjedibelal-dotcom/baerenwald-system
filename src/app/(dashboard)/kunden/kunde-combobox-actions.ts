'use server'

import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { Kunde } from '@/lib/types'

/** N4: Kunden für Combobox (>15 → Tipp-Filter) — bis 200 Einträge. */
export async function listKundenFuerCombobox(q?: string) {
  const term = (q ?? '').trim()
  const { data } = await withCrmReadFallback(async (db) => {
    let query = db
      .from('kunden')
      .select(
        'id, name, vorname, nachname, typ, email, telefon, plz, ort, strasse, hausnummer, adresse, notizen, created_at'
      )
      .order('name')
      .limit(200)
    if (term.length >= 1) {
      const esc = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
      const pattern = `%${esc}%`
      query = query.or(
        `name.ilike.${pattern},vorname.ilike.${pattern},nachname.ilike.${pattern},email.ilike.${pattern},ort.ilike.${pattern}`
      )
    }
    return query
  })
  return { kunden: (data ?? []) as Kunde[] }
}
