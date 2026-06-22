import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AngebotNeuForm } from '@/components/angebote/AngebotNeuForm'
import type { AngebotVorlage, Gewerk, Handwerker, Preisliste } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

function inferMitPreisen(v: AngebotVorlage): boolean {
  const gm = v.gesamt_min ?? 0
  const gx = v.gesamt_max ?? 0
  return Math.abs(Number(gm)) + Math.abs(Number(gx)) > 0.01
}

export default async function VorlageBearbeitenPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const [{ data: gewerke }, { data: preisRaw }, { data: hwRaw }, { data: vRow }] = await Promise.all([
    supabase.from('gewerke').select('id, name, slug, aktiv').eq('aktiv', true).order('name'),
    supabase
      .from('preislisten')
      .select('id, gewerk_id, leistung, einheit, preis_min, aktiv, gewerke(id,name,slug)')
      .eq('aktiv', true),
    supabase
      .from('handwerker')
      .select('id, name, email, telefon, gewerke, aktiv, firma')
      .eq('aktiv', true),
    supabase.from('angebot_vorlagen').select('*').eq('id', params.id).maybeSingle(),
  ])

  if (!vRow) notFound()

  const v = {
    ...(vRow as AngebotVorlage),
    positionen: normalizeAngebotPositionen((vRow as { positionen: unknown }).positionen),
  }

  return (
    <AngebotNeuForm
      gewerke={(gewerke ?? []) as Gewerk[]}
      preislisten={(preisRaw ?? []) as unknown as Preisliste[]}
      handwerker={(hwRaw ?? []) as Handwerker[]}
      modusVorlage={{
        id: v.id,
        initial: {
          name: v.name,
          beschreibung: v.beschreibung ?? '',
          positionen: v.positionen,
          mitPreisen: inferMitPreisen(v),
        },
      }}
    />
  )
}
