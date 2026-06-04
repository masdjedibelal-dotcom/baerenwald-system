import { notFound } from 'next/navigation'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { RechnungDetailClient } from '@/components/rechnungen/RechnungDetailClient'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import type { Gewerk, Preisliste, Rechnung } from '@/lib/types'

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [firm, gwRes, plRes, { data, error }] = await Promise.all([
    fetchFirmenEinstellungen(supabase),
    supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
    supabase.from('preislisten').select('*').order('gewerk_id'),
    withCrmReadFallback(async (db) =>
      db
        .from('rechnungen')
        .select(
          '*, kunden(id, name, vorname, nachname, email, telefon, adresse, strasse, hausnummer, plz, ort, typ, ust_id), auftraege(id, titel), angebote(id)'
        )
        .eq('id', params.id)
        .maybeSingle()
    ),
  ])

  if (error || !data) notFound()

  return (
    <RechnungDetailClient
      detail={data as Rechnung}
      kleinunternehmerFirma={parseKleinunternehmerSetting(firm.kleinunternehmer)}
      gewerke={(gwRes.data ?? []) as Gewerk[]}
      preislisten={(plRes.data ?? []) as Preisliste[]}
      firm={firm}
    />
  )
}
