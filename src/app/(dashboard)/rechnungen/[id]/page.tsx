import { notFound } from 'next/navigation'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { RechnungDetailClient } from '@/components/rechnungen/RechnungDetailClient'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { parseKleinunternehmerSetting } from '@/lib/rechnung-berechnung'
import { loadProjektKontext } from '@/lib/crm/load-projekt-kontext'
import type { Gewerk, Preisliste, Rechnung } from '@/lib/types'

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [firm, gwRes, plRes, mahnRes, { data, error }] = await Promise.all([
    fetchFirmenEinstellungen(supabase),
    supabase.from('gewerke').select('id, name, slug').eq('aktiv', true).order('name'),
    supabase.from('preislisten').select('*').order('gewerk_id'),
    supabase
      .from('email_log')
      .select('id, betreff, created_at')
      .eq('rechnung_id', params.id)
      .eq('typ', 'zahlungserinnerung')
      .order('created_at', { ascending: true }),
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

  const rec = data as Rechnung & {
    kunde_id: string
    auftrag_id: string | null
    angebot_id: string | null
  }

  const projektKontext = await loadProjektKontext(supabase, {
    activeKind: 'rechnung',
    activeId: params.id,
    rechnungId: params.id,
    kundeId: rec.kunde_id,
    auftragId: rec.auftrag_id,
    angebotId: rec.angebot_id,
  })

  return (
    <RechnungDetailClient
      detail={data as Rechnung}
      kleinunternehmerFirma={parseKleinunternehmerSetting(firm.kleinunternehmer)}
      gewerke={(gwRes.data ?? []) as Gewerk[]}
      preislisten={(plRes.data ?? []) as Preisliste[]}
      firm={firm}
      mahnMails={mahnRes.data ?? []}
      projektKontext={projektKontext}
    />
  )
}
