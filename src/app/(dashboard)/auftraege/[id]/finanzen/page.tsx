import { notFound } from 'next/navigation'
import { AuftragFinanzenClient } from '@/components/auftraege/AuftragFinanzenClient'
import { loadAuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { createClient } from '@/lib/supabase-server'

export default async function AuftragFinanzenPage({ params }: { params: { id: string } }) {
  const id = params.id
  const supabase = createClient()
  const { data: auf } = await supabase
    .from('auftraege')
    .select('id, titel, kunden(name)')
    .eq('id', id)
    .maybeSingle()
  if (!auf) notFound()

  const payload = await loadAuftragFinanzenClientPayload(id)
  if (!payload) notFound()

  const row = auf as { titel?: string | null; kunden?: { name?: string } | { name?: string }[] | null }
  const kundenRaw = row.kunden
  const kundeName = Array.isArray(kundenRaw) ? kundenRaw[0]?.name : kundenRaw?.name

  return (
    <AuftragFinanzenClient
      auftragId={id}
      projektTitel={row.titel}
      kundeName={kundeName ?? null}
      {...payload}
    />
  )
}
