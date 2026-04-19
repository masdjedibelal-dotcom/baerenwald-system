import { createClient } from '@/lib/supabase-server'
import type { Kunde } from '@/lib/types'

export type KundeListeZeile = Kunde & {
  anzahl_leads: number
  anzahl_auftraege: number
}

export async function loadKundenListe(): Promise<KundeListeZeile[]> {
  const supabase = createClient()
  const { data: kunden, error } = await supabase
    .from('kunden')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    console.warn('loadKundenListe', error.message)
    return []
  }

  const { data: leadRows } = await supabase.from('leads').select('kunde_id')
  const { data: aufRows } = await supabase.from('auftraege').select('kunde_id')

  const leadCount = new Map<string, number>()
  for (const r of leadRows ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    leadCount.set(id, (leadCount.get(id) ?? 0) + 1)
  }

  const aufCount = new Map<string, number>()
  for (const r of aufRows ?? []) {
    const id = r.kunde_id as string | null
    if (!id) continue
    aufCount.set(id, (aufCount.get(id) ?? 0) + 1)
  }

  return (kunden ?? []).map((k) => {
    const row = k as Kunde
    return {
      ...row,
      anzahl_leads: leadCount.get(row.id) ?? 0,
      anzahl_auftraege: aufCount.get(row.id) ?? 0,
    }
  })
}
