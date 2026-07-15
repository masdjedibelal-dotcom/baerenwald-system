import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { PartnerDetailClient } from '@/components/partner/PartnerDetailClient'
import type { PartnerKategorie, PartnerRow } from '@/components/partner/PartnerNetzwerkClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = createClient()
  const { data } = await supabase.from('partner').select('name').eq('id', id).maybeSingle()
  return { title: data?.name?.trim() ? String(data.name) : 'Partner' }
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: partner, error: pErr }, { data: kategorien, error: kErr }] = await Promise.all([
    supabase.from('partner').select('*, partner_kategorien(name, slug, sort_order)').eq('id', id).maybeSingle(),
    supabase.from('partner_kategorien').select('id, name, slug, sort_order').order('sort_order', { ascending: true }),
  ])

  if (pErr || kErr || !partner) notFound()

  return (
    <div>
      <PartnerDetailClient
        partner={partner as PartnerRow}
        kategorien={(kategorien ?? []) as PartnerKategorie[]}
      />
    </div>
  )
}
