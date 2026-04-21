import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { PageHeader } from '@/components/layout/PageHeader'
import { HandwerkerDetailClient } from '@/components/handwerker/HandwerkerDetailClient'
import { loadHandwerkerDetail } from '@/app/(dashboard)/handwerker/actions'

export default async function HandwerkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [detail, { data: gewData }] = await Promise.all([
    loadHandwerkerDetail(id),
    supabase.from('gewerke').select('slug, name').eq('aktiv', true).order('name'),
  ])

  if (!detail.handwerker) notFound()

  const gewerkeSlugs = (gewData ?? []).map((g) => ({
    slug: g.slug as string,
    name: g.name as string,
  }))

  const title = detail.handwerker.firma
    ? `${detail.handwerker.name} · ${detail.handwerker.firma}`
    : detail.handwerker.name

  return (
    <div>
      <PageHeader
        title={title}
        breadcrumbs={[
          { label: 'Handwerker', href: '/handwerker' },
          { label: detail.handwerker.name },
        ]}
        action={
          <Link href="/handwerker" className="btn btn-secondary btn-sm">
            ← Zur Liste
          </Link>
        }
      />
      <HandwerkerDetailClient payload={detail} gewerkeSlugs={gewerkeSlugs} />
    </div>
  )
}
