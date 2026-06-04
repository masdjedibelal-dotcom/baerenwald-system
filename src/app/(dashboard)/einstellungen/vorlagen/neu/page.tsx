import { createClient } from '@/lib/supabase-server'
import { AngebotNeuForm } from '@/components/angebote/AngebotNeuForm'
import type { Gewerk, Handwerker, Preisliste } from '@/lib/types'

export default async function VorlageNeuPage() {
  const supabase = createClient()
  const [{ data: gewerke }, { data: preisRaw }, { data: hwRaw }] = await Promise.all([
    supabase.from('gewerke').select('id, name, slug, aktiv').eq('aktiv', true).order('name'),
    supabase
      .from('preislisten')
      .select('id, gewerk_id, leistung, einheit, preis_min, aktiv, gewerke(id,name,slug)')
      .eq('aktiv', true),
    supabase
      .from('handwerker')
      .select('id, name, email, telefon, gewerke, aktiv, firma')
      .eq('aktiv', true),
  ])

  return (
    <AngebotNeuForm
      gewerke={(gewerke ?? []) as Gewerk[]}
      preislisten={(preisRaw ?? []) as unknown as Preisliste[]}
      handwerker={(hwRaw ?? []) as Handwerker[]}
      modusVorlage={{
        id: null,
        initial: { name: '', beschreibung: '', positionen: [], mitPreisen: true },
      }}
    />
  )
}
