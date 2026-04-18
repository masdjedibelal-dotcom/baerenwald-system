import { createClient } from '@/lib/supabase-server'
import { RechnungenListeClient } from '@/components/rechnungen/RechnungenListeClient'
import type { RechnungListeZeile } from '@/lib/types'

export default async function RechnungenPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rechnungen')
    .select('id, rechnungsnummer, status, brutto, rechnungsdatum, faellig_am, bezahlt_at, kunden(name)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        Rechnungen konnten nicht geladen werden ({error.message}). Bitte SQL-Migration ausführen.
      </div>
    )
  }

  return <RechnungenListeClient rows={(data ?? []) as RechnungListeZeile[]} />
}
