import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { istHvPortalRollenKunde } from '@/lib/kunde-stammdaten'
import { berechneKundeGesamtumsatz } from '@/lib/kunden/kunde-umsatz'
import { createClient } from '@/lib/supabase-server'
import type { Kunde } from '@/lib/types'

export type KundeListeZeile = Kunde & {
  anzahl_leads: number
  anzahl_auftraege: number
  gesamt_umsatz: number
}

/** Aggregiert nur für die geladenen Kunden-IDs — kein Full-Table-Scan. */
export async function loadKundenListe(): Promise<KundeListeZeile[]> {
  const kundenRes = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .select(
        'id, name, vorname, nachname, email, telefon, ort, typ, portal_modus, created_at, gesamt_umsatz, letzte_aktivitaet, auth_user_id'
      )
      .order('created_at', { ascending: false })
      .limit(500)
  )
  if (kundenRes.error) {
    // Ältere DBs ohne portal_modus
    if (/portal_modus/i.test(kundenRes.error.message)) {
      const retry = await withCrmReadFallback(async (db) =>
        db
          .from('kunden')
          .select(
            'id, name, vorname, nachname, email, telefon, ort, typ, created_at, gesamt_umsatz, letzte_aktivitaet, auth_user_id'
          )
          .order('created_at', { ascending: false })
          .limit(500)
      )
      if (retry.error) {
        console.warn('loadKundenListe', retry.error.message)
        return []
      }
      return finalizeKundenListe((retry.data ?? []) as Kunde[])
    }
    console.warn('loadKundenListe', kundenRes.error.message)
    return []
  }

  const filtered = ((kundenRes.data ?? []) as (Kunde & { portal_modus?: string | null })[]).filter(
    (k) => !istHvPortalRollenKunde(k.portal_modus)
  )
  return finalizeKundenListe(filtered)
}

async function finalizeKundenListe(kunden: Kunde[]): Promise<KundeListeZeile[]> {
  const ids = kunden.map((k) => k.id).filter(Boolean)
  if (!ids.length) return []

  const supabase = createClient()
  const [leadsByKunde, leadsByAg, aufRes, reRes] = await Promise.all([
    supabase.from('leads').select('id, kunde_id, auftraggeber_kunde_id').in('kunde_id', ids),
    supabase
      .from('leads')
      .select('id, kunde_id, auftraggeber_kunde_id')
      .in('auftraggeber_kunde_id', ids),
    supabase
      .from('auftraege')
      .select(
        `
        kunde_id, status,
        angebote(gesamt_fix, gesamt_min, gesamt_max, positionen)
      `
      )
      .in('kunde_id', ids)
      .neq('status', 'storniert'),
    supabase
      .from('rechnungen')
      .select('kunde_id, brutto, netto, auftrag_id, status')
      .eq('status', 'bezahlt')
      .in('kunde_id', ids),
  ])

  const leadById = new Map<
    string,
    { kunde_id: string | null; auftraggeber_kunde_id: string | null }
  >()
  for (const r of [...(leadsByKunde.data ?? []), ...(leadsByAg.data ?? [])]) {
    const id = String(r.id)
    if (!leadById.has(id)) {
      leadById.set(id, {
        kunde_id: (r.kunde_id as string | null) ?? null,
        auftraggeber_kunde_id: (r.auftraggeber_kunde_id as string | null) ?? null,
      })
    }
  }

  const leadCount = new Map<string, number>()
  for (const r of Array.from(leadById.values())) {
    if (r.kunde_id) leadCount.set(r.kunde_id, (leadCount.get(r.kunde_id) ?? 0) + 1)
    if (r.auftraggeber_kunde_id && r.auftraggeber_kunde_id !== r.kunde_id) {
      leadCount.set(
        r.auftraggeber_kunde_id,
        (leadCount.get(r.auftraggeber_kunde_id) ?? 0) + 1
      )
    }
  }

  const aufCount = new Map<string, number>()
  for (const r of aufRes.data ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    aufCount.set(id, (aufCount.get(id) ?? 0) + 1)
  }

  const aufByKunde = new Map<string, typeof aufRes.data>()
  for (const r of aufRes.data ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    const list = aufByKunde.get(id) ?? []
    list.push(r)
    aufByKunde.set(id, list)
  }

  const reByKunde = new Map<string, typeof reRes.data>()
  for (const r of reRes.data ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    const list = reByKunde.get(id) ?? []
    list.push(r)
    reByKunde.set(id, list)
  }

  const umsatzByKunde = new Map<string, number>()
  for (const kid of ids) {
    umsatzByKunde.set(
      kid,
      berechneKundeGesamtumsatz(aufByKunde.get(kid) ?? [], reByKunde.get(kid) ?? [])
    )
  }

  return kunden.map((row) => ({
    ...row,
    anzahl_leads: leadCount.get(row.id) ?? 0,
    anzahl_auftraege: aufCount.get(row.id) ?? 0,
    gesamt_umsatz: umsatzByKunde.get(row.id) ?? row.gesamt_umsatz ?? 0,
  }))
}
