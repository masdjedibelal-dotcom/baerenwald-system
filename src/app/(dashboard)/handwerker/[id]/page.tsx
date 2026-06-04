import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { HandwerkerDetailClient } from '@/components/handwerker/HandwerkerDetailClient'
import { loadHandwerkerDetail } from '@/app/(dashboard)/handwerker/actions'

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

  const [detail, { data: gewData }] = await Promise.all([
    loadHandwerkerDetail(id),
    supabase.from('gewerke').select('slug, name').eq('aktiv', true).order('name'),
  ])

  if (!detail.handwerker) notFound()

  const gewerkeSlugs = (gewData ?? []).map((g) => ({
    slug: g.slug as string,
    name: g.name as string,
  }))

  return (
    <div>
      <HandwerkerDetailClient payload={detail} gewerkeSlugs={gewerkeSlugs} />
    </div>
  )
}
