import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { loadAuftragDetail, loadRechnungenForAuftrag } from '@/app/(dashboard)/auftraege/auftraege-data'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { RechnungAuswahlPageClient } from '@/components/rechnungen/RechnungAuswahlPageClient'
import { defaultZahlungszielTage } from '@/lib/rechnungen/rechnung-wizard-types'
import type { Gewerk, Preisliste } from '@/lib/types'

export default async function AuftragRechnungenAuswahlPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [detail, rechnungen, firm, { data: gewerke }, { data: preisRaw }] = await Promise.all([
    loadAuftragDetail(params.id),
    loadRechnungenForAuftrag(params.id),
    fetchFirmenEinstellungen(supabase),
    supabase.from('gewerke').select('id, name, slug, aktiv').eq('aktiv', true).order('name'),
    supabase.from('preislisten').select('*').eq('aktiv', true),
  ])

  if (!detail) notFound()

  const zahlungszielTage = defaultZahlungszielTage(detail.kunden?.typ)

  return (
    <RechnungAuswahlPageClient
      auftragId={params.id}
      rechnungen={rechnungen}
      gewerke={(gewerke ?? []) as Gewerk[]}
      preislisten={(preisRaw ?? []) as Preisliste[]}
      firm={firm}
      zahlungszielTage={zahlungszielTage}
    />
  )
}
