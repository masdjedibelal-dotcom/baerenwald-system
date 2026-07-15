import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { RechnungNeuPageClient } from '@/components/rechnungen/RechnungNeuPageClient'
import type { Gewerk, Preisliste } from '@/lib/types'

/**
 * Direktrechnung ohne Anfrage/Angebot/Auftrag.
 * Mit auftrag_id → weiterhin Auftrags-Rechnungsauswahl (Legacy).
 */
export default async function RechnungNeuPage({
  searchParams,
}: {
  searchParams: { auftrag_id?: string; kunde_id?: string }
}) {
  const auftragId = searchParams.auftrag_id?.trim()
  if (auftragId) {
    redirect(`/auftraege/${auftragId}/rechnungen-auswahl`)
  }

  const supabase = createClient()
  const [firm, { data: gewerke }, { data: preisRaw }] = await Promise.all([
    fetchFirmenEinstellungen(supabase),
    supabase.from('gewerke').select('id, name, slug, aktiv').eq('aktiv', true).order('name'),
    supabase.from('preislisten').select('*').eq('aktiv', true),
  ])

  return (
    <RechnungNeuPageClient
      gewerke={(gewerke ?? []) as Gewerk[]}
      preislisten={(preisRaw ?? []) as Preisliste[]}
      firm={firm}
      initialKundeId={searchParams.kunde_id}
    />
  )
}
