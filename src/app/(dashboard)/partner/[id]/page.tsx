import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
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
  if (data?.name?.trim()) return { title: String(data.name) }
  const { data: hw } = await supabase.from('handwerker').select('name').eq('id', id).maybeSingle()
  return { title: hw?.name?.trim() ? String(hw.name) : 'Partner' }
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createClient()

  const [{ data: partner, error: pErr }, { data: kategorien, error: kErr }] = await Promise.all([
    supabase.from('partner').select('*, partner_kategorien(name, slug, sort_order)').eq('id', id).maybeSingle(),
    supabase.from('partner_kategorien').select('id, name, slug, sort_order').order('sort_order', { ascending: true }),
  ])

  if (pErr) {
    console.error('[partner detail]', pErr.message)
    return (
      <div className="mx-auto max-w-md rounded-lg border border-border bg-surface p-6 text-center shadow-card">
        <h1 className="text-lg font-semibold text-ink">Partner konnte nicht geladen werden</h1>
        <p className="mt-2 text-sm text-muted">{pErr.message}</p>
        <Link
          href="/partner"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white hover:opacity-95"
        >
          Zurück zur Liste
        </Link>
      </div>
    )
  }

  if (!partner) {
    // Sidebar „Partner“ = Fachbetriebe unter /handwerker
    const { data: asHw } = await supabase.from('handwerker').select('id').eq('id', id).maybeSingle()
    if (asHw?.id) redirect(`/handwerker/${asHw.id}`)
    notFound()
  }

  if (kErr) {
    console.warn('[partner detail] Kategorien:', kErr.message)
  }

  return (
    <div>
      <PartnerDetailClient
        partner={partner as PartnerRow}
        kategorien={(kategorien ?? []) as PartnerKategorie[]}
      />
    </div>
  )
}
