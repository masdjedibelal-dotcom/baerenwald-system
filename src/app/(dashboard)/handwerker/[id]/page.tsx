import { logDbError } from '@/lib/errors/log-db-error'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { HandwerkerDetailClient } from '@/components/handwerker/HandwerkerDetailClient'
import { loadHandwerkerDetail } from '@/app/(dashboard)/handwerker/actions'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { loadRahmenVertragForHandwerker } from '@/app/(dashboard)/vertraege/wizard-actions'
import { loadVorgaengeListe } from '@/lib/vorgang/load-vorgaenge-liste'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient()
  const {data, error: error1} = await supabase.from('handwerker').select('name').eq('id', id).maybeSingle()
  if (error1) logDbError('app/handwerker/[id]/page:handwerker', error1)
  if (data?.name?.trim()) return { title: String(data.name) }
  const {data: partner, error: error2} = await supabase.from('partner').select('name').eq('id', id).maybeSingle()
  if (error2) logDbError('app/handwerker/[id]/page:partner', error2)
  return { title: partner?.name?.trim() ? String(partner.name) : 'Partner' }
}

export default async function HandwerkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [detail, gewerke, rahmenVertrag, complianceTypen, vorgaenge] = await Promise.all([
    loadHandwerkerDetail(id),
    loadGewerkeAusfuehrung(supabase),
    loadRahmenVertragForHandwerker(id),
    loadComplianceTypen(),
    loadVorgaengeListe({ handwerkerId: id }),
  ])

  if (!detail.handwerker) {
    // Legacy-Partner-ID: Mapping auf Handwerker, sonst Liste
    const {data: map, error: error3} = await supabase
      .from('partner_handwerker_map')
      .select('handwerker_id')
      .eq('partner_id', id)
      .maybeSingle()
    if (error3) logDbError('app/handwerker/[id]/page:partner_handwerker_map', error3)
    if (map?.handwerker_id) redirect(`/handwerker/${map.handwerker_id}`)

    // Query-Fehler nicht als 404 maskieren
    if (detail.loadError) {
      return (
        <div className="mx-auto max-w-md rounded-card border border-border bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold text-ink">Partner konnte nicht geladen werden</h1>
          <p className="mt-2 text-sm text-muted">{detail.loadError}</p>
          <Link
            href="/handwerker"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-card bg-primary px-4 text-sm font-medium text-white hover:opacity-95"
          >
            Zurück zur Liste
          </Link>
        </div>
      )
    }

    notFound()
  }

  const gewerkeSlugs = gewerke.map((g) => ({ slug: g.slug, name: g.name }))

  return (
    <div>
      <HandwerkerDetailClient
        key={id}
        payload={detail}
        gewerkeSlugs={gewerkeSlugs}
        gewerke={gewerke}
        complianceTypen={complianceTypen}
        rahmenVertrag={rahmenVertrag}
        vorgaengeRows={vorgaenge.rows}
      />
    </div>
  )
}
