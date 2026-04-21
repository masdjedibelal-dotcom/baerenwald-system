import { createClient } from '@/lib/supabase-server'
import {
  PartnerNetzwerkClient,
  type PartnerKategorie,
  type PartnerRow,
} from '@/components/partner/PartnerNetzwerkClient'

export default async function PartnerPage() {
  const supabase = createClient()
  const { data: partners, error: pErr } = await supabase
    .from('partner')
    .select('*, partner_kategorien(name, slug, sort_order)')
    .order('name')

  const { data: kategorien, error: kErr } = await supabase
    .from('partner_kategorien')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })

  if (pErr || kErr) {
    return (
      <div className="rounded-lg border border-status-cancel-bg bg-status-cancel-bg/30 p-4 text-sm text-status-cancel-text">
        Partner konnten nicht geladen werden: {pErr?.message ?? kErr?.message}
      </div>
    )
  }

  const sorted = [...(partners ?? [])].sort((a, b) => {
    const ao = (a as PartnerRow).partner_kategorien?.sort_order ?? 999
    const bo = (b as PartnerRow).partner_kategorien?.sort_order ?? 999
    if (ao !== bo) return ao - bo
    return (a as PartnerRow).name.localeCompare((b as PartnerRow).name, 'de')
  })

  return (
    <PartnerNetzwerkClient partners={sorted as PartnerRow[]} kategorien={(kategorien ?? []) as PartnerKategorie[]} />
  )
}
