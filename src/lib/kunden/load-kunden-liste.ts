import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import type { Kunde } from '@/lib/types'

export type KundeListeZeile = Kunde & {
  anzahl_leads: number
  anzahl_auftraege: number
  gesamt_umsatz: number
}

export async function loadKundenListe(): Promise<KundeListeZeile[]> {
  const kundenRes = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .select(
        'id, name, vorname, nachname, email, telefon, ort, typ, created_at, gesamt_umsatz, letzte_aktivitaet, auth_user_id'
      )
      .order('created_at', { ascending: false })
      .limit(500)
  )
  const kunden = kundenRes.data
  if (kundenRes.error) {
    console.warn('loadKundenListe', kundenRes.error.message)
    return []
  }

  const supabase = createClient()
  const { data: leadRows } = await supabase.from('leads').select('kunde_id, auftraggeber_kunde_id')
  const { data: aufRows } = await supabase.from('auftraege').select('kunde_id')
  const { data: reRows } = await supabase
    .from('rechnungen')
    .select('kunde_id, brutto, status')
    .eq('status', 'bezahlt')

  const leadCount = new Map<string, number>()
  for (const r of leadRows ?? []) {
    const kundeId = r.kunde_id as string | null
    const auftraggeberId = r.auftraggeber_kunde_id as string | null
    if (kundeId) leadCount.set(kundeId, (leadCount.get(kundeId) ?? 0) + 1)
    if (auftraggeberId && auftraggeberId !== kundeId) {
      leadCount.set(auftraggeberId, (leadCount.get(auftraggeberId) ?? 0) + 1)
    }
  }

  const aufCount = new Map<string, number>()
  for (const r of aufRows ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    aufCount.set(id, (aufCount.get(id) ?? 0) + 1)
  }

  const umsatzByKunde = new Map<string, number>()
  for (const r of reRows ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    const b = Number(r.brutto) || 0
    umsatzByKunde.set(id, (umsatzByKunde.get(id) ?? 0) + b)
  }

  return (kunden ?? []).map((k) => {
    const row = k as Kunde
    return {
      ...row,
      anzahl_leads: leadCount.get(row.id) ?? 0,
      anzahl_auftraege: aufCount.get(row.id) ?? 0,
      gesamt_umsatz: umsatzByKunde.get(row.id) ?? row.gesamt_umsatz ?? 0,
    }
  })
}
