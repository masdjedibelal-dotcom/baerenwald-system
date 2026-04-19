import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { AngeboteListeClient } from '@/components/angebote/AngeboteListeClient'
import type { AngebotListeEintrag, AngebotPosition } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

export const metadata: Metadata = {
  title: 'Angebote',
}

export const revalidate = 60

export default async function AngebotePage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebote')
    .select(
      `
      *,
      kunden(id, name, email),
      leads(id, situation, bereiche),
      angebot_handwerker(
        id,
        status,
        handwerker_id,
        gewerk_id,
        handwerker(name)
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Angebote konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error.message}</p>
      </div>
    )
  }

  const rows: AngebotListeEintrag[] = (data ?? []).map((row) => {
    const r = row as AngebotListeEintrag & { positionen: unknown }
    return {
      ...r,
      positionen: parsePositionen(r.positionen),
    }
  })

  return <AngeboteListeClient angebote={rows} />
}
