import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { AuftraegeListeClient } from '@/components/auftraege/AuftraegeListeClient'
import type { AuftragListeEintrag } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Aufträge',
}

export const revalidate = 60

export default async function AuftraegePage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftraege')
    .select(
      `
      *,
      kunden(id, name, email, telefon, adresse, plz, ort),
      angebote(id, gesamt_fix, gesamt_min, gesamt_max, positionen),
      auftrag_handwerker(
        *,
        handwerker(name),
        gewerke(name, slug)
      ),
      auftrag_positionen(id, gewerk_name)
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Aufträge konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error.message}</p>
      </div>
    )
  }

  return <AuftraegeListeClient auftraege={(data ?? []) as AuftragListeEintrag[]} />
}
