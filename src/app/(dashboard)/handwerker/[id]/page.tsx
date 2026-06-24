import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { HandwerkerDetailClient } from '@/components/handwerker/HandwerkerDetailClient'
import { loadHandwerkerDetail } from '@/app/(dashboard)/handwerker/actions'
import { findVerwandteStammdatenKontakte } from '@/app/actions/stammdaten-kontakt'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { loadRahmenVertragForHandwerker } from '@/app/(dashboard)/vertraege/wizard-actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient()
  const { data } = await supabase.from('handwerker').select('name').eq('id', id).maybeSingle()
  return { title: data?.name?.trim() ? String(data.name) : 'Handwerker' }
}

export default async function HandwerkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [detail, gewerke, rahmenVertrag, complianceTypen] = await Promise.all([
    loadHandwerkerDetail(id),
    loadGewerkeAusfuehrung(supabase),
    loadRahmenVertragForHandwerker(id),
    loadComplianceTypen(),
  ])

  if (!detail.handwerker) notFound()

  const hw = detail.handwerker
  const verwandteStammdaten = await findVerwandteStammdatenKontakte({
    email: hw.email,
    telefon: hw.telefon,
    excludeTyp: 'handwerker',
    excludeId: id,
  })

  const gewerkeSlugs = gewerke.map((g) => ({ slug: g.slug, name: g.name }))

  return (
    <div>
      <HandwerkerDetailClient
        payload={detail}
        gewerkeSlugs={gewerkeSlugs}
        gewerke={gewerke}
        complianceTypen={complianceTypen}
        rahmenVertrag={rahmenVertrag}
        verwandteStammdaten={verwandteStammdaten}
      />
    </div>
  )
}
