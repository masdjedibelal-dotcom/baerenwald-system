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
  const { data } = await supabase.from('handwerker').select('name').eq('id', id).maybeSingle()
  if (data?.name?.trim()) return { title: String(data.name) }
  const { data: partner } = await supabase.from('partner').select('name').eq('id', id).maybeSingle()
  return { title: partner?.name?.trim() ? String(partner.name) : 'Handwerker' }
}

export default async function HandwerkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [detail, gewerke, rahmenVertrag, complianceTypen, vorgaenge] = await Promise.all([
    loadHandwerkerDetail(id),
    loadGewerkeAusfuehrung(supabase),
    loadRahmenVertragForHandwerker(id),
    loadComplianceTypen(),
    loadVorgaengeListe(),
  ])

  if (!detail.handwerker) {
    // Legacy-Partner-ID: Mapping auf Handwerker, sonst Liste
    const { data: map } = await supabase
      .from('partner_handwerker_map')
      .select('handwerker_id')
      .eq('partner_id', id)
      .maybeSingle()
    if (map?.handwerker_id) redirect(`/handwerker/${map.handwerker_id}`)

    // Query-Fehler nicht als 404 maskieren
    if (detail.loadError) {
      return (
        <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-card">
          <h1 className="text-lg font-semibold text-ink">Handwerker konnte nicht geladen werden</h1>
          <p className="mt-2 text-sm text-muted">{detail.loadError}</p>
          <Link
            href="/handwerker"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:opacity-95"
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
