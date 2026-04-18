import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AngebotDetailClient } from '@/components/angebote/AngebotDetailClient'
import type { AngebotDetail, AngebotPosition } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

export default async function AngebotDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebote')
    .select(
      `
      *,
      kunden(*),
      leads(*),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, gewerke, aktiv),
        gewerke(id, name, slug)
      )
    `
    )
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) notFound()

  const detail: AngebotDetail = {
    ...(data as AngebotDetail),
    positionen: parsePositionen((data as { positionen: unknown }).positionen),
  }

  return <AngebotDetailClient detail={detail} />
}
