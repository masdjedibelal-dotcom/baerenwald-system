import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AnfrageDetailClient } from '@/components/anfragen/AnfrageDetailClient'
import type { LeadDetail } from '@/lib/types'

export default async function AnfrageDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(
      `
      *,
      kunden(*),
      leads_status_history(
        *,
        user_profiles(name)
      ),
      vorab_formulare(
        id,
        daten,
        created_at,
        updated_at,
        formular_templates(name, phase, typ, felder)
      )
    `
    )
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  const lead = data as LeadDetail
  const history = [...(lead.leads_status_history ?? [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return <AnfrageDetailClient lead={{ ...lead, leads_status_history: history }} />
}
