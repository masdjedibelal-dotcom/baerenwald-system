import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { RechnungDetailClient } from '@/components/rechnungen/RechnungDetailClient'
import type { Rechnung } from '@/lib/types'

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rechnungen')
    .select('*, kunden(id, name, email, telefon, adresse, plz, ort, typ)')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !data) notFound()

  return <RechnungDetailClient detail={data as Rechnung} />
}
