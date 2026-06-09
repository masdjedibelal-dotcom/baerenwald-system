import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AngebotVisualisierungClient } from '@/components/angebote/AngebotVisualisierungClient'
import { loadKiVisualisierung } from '@/lib/visualize/queries'
import type { AngebotDetail } from '@/lib/types'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'

export default async function AngebotVisualisierungPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { session?: string; ist_url?: string }
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebote')
    .select('*, kunden(id, name)')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) notFound()

  const detail: AngebotDetail = {
    ...(data as AngebotDetail),
    positionen: normalizeAngebotPositionen((data as { positionen: unknown }).positionen),
  }

  const sessionId = searchParams.session?.trim()
  const initialSession = sessionId ? await loadKiVisualisierung(sessionId) : null
  if (initialSession && initialSession.angebot_id !== params.id) notFound()

  const initialIstUrl = searchParams.ist_url?.trim() || null

  return (
    <AngebotVisualisierungClient
      detail={detail}
      initialSession={initialSession}
      initialIstUrl={initialIstUrl}
    />
  )
}
