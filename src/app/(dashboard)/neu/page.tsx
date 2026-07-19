import { createClient } from '@/lib/supabase-server'
import { NeuPageClient } from './NeuPageClient'

export default async function NeuPage() {
  const supabase = createClient()
  const { data } = await supabase
    .from('gewerke')
    .select('id, name, slug')
    .eq('aktiv', true)
    .order('name')

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
