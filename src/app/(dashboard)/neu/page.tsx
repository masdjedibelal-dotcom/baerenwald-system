import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { NeuPageClient } from './NeuPageClient'

export default async function NeuPage() {
  const supabase = createClient()
  const {data, error} = await supabase
    .from('gewerke')
    .select('id, name, slug')
    .eq('aktiv', true)
    .order('sort_order')
    .order('name')
  if (error) logDbError('app/neu/page:gewerke', error)

  return (
    <NeuPageClient
      gewerkeOptionen={(data ?? []).map((g) => ({
        id: String(g.id),
        name: String(g.name),
        slug: String(g.slug),
      }))}
    />
  )
}
