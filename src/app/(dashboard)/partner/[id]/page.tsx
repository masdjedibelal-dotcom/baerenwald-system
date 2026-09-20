import { logDbError } from '@/lib/errors/log-db-error'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

/** Spec §3: Partner-Detail → Handwerker (Mapping wenn vorhanden). */
export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const {data: map, error: error1} = await supabase
    .from('partner_handwerker_map')
    .select('handwerker_id')
    .eq('partner_id', id)
    .maybeSingle()
  if (error1) logDbError('app/partner/[id]/page:partner_handwerker_map', error1)

  if (map?.handwerker_id) {
    redirect(`/handwerker/${map.handwerker_id}`)
  }

  const {data: hw, error: error2} = await supabase.from('handwerker').select('id').eq('id', id).maybeSingle()
  if (error2) logDbError('app/partner/[id]/page:handwerker', error2)
  if (hw?.id) {
    redirect(`/handwerker/${hw.id}`)
  }

  redirect('/handwerker')
}
