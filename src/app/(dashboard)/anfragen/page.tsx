import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { AnfragenListeClient } from '@/components/anfragen/AnfragenListeClient'
import type { Lead } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Anfragen',
}

export const revalidate = 60

export default async function AnfragenPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*, kunden(id, name, email, telefon)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        <p className="font-medium">Anfragen konnten nicht geladen werden.</p>
        <p className="mt-1 opacity-90">{error.message}</p>
      </div>
    )
  }

  return <AnfragenListeClient leads={(data ?? []) as Lead[]} />
}
