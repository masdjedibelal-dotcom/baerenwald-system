import { createClient } from '@/lib/supabase-server'
import type { PartnerKategorie, PartnerRow } from '@/components/partner/PartnerNetzwerkClient'

export type PartnerListeData = {
  partners: PartnerRow[]
  kategorien: PartnerKategorie[]
}

export async function loadPartnerListe(): Promise<PartnerListeData> {
  const supabase = createClient()
  const [{ data: partners, error: pErr }, { data: kategorien, error: kErr }] = await Promise.all([
    supabase.from('partner').select('*, partner_kategorien(name, slug, sort_order)').order('name'),
    supabase
      .from('partner_kategorien')
      .select('id, name, slug, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  if (pErr || kErr) {
    throw new Error(pErr?.message ?? kErr?.message ?? 'Partner konnten nicht geladen werden')
  }

  const sorted = [...(partners ?? [])].sort((a, b) => {
    const ao = (a as PartnerRow).partner_kategorien?.sort_order ?? 999
    const bo = (b as PartnerRow).partner_kategorien?.sort_order ?? 999
    if (ao !== bo) return ao - bo
    return (a as PartnerRow).name.localeCompare((b as PartnerRow).name, 'de')
  })

  return {
    partners: sorted as PartnerRow[],
    kategorien: (kategorien ?? []) as PartnerKategorie[],
  }
}
