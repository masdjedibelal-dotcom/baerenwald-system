'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { toSlug } from '@/lib/utils'

export type ComplianceTypRow = {
  id: string
  slug: string
  bezeichnung: string
  beschreibung: string | null
  pflicht_fuer_fachbetriebe: boolean
  erneuerung_monate: number | null
  sort_order: number
  aktiv: boolean
}

export async function loadComplianceTypen(): Promise<ComplianceTypRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('compliance_dokument_typen')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('loadComplianceTypen', error.message)
    return []
  }
  return (data ?? []) as ComplianceTypRow[]
}

export async function updateComplianceTyp(
  id: string,
  patch: Partial<Pick<ComplianceTypRow, 'pflicht_fuer_fachbetriebe' | 'erneuerung_monate' | 'aktiv'>>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('compliance_dokument_typen').update(patch).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/compliance')
  revalidatePath('/handwerker')
  return { ok: true }
}

export async function createComplianceTyp(input: {
  bezeichnung: string
  beschreibung: string | null
  erneuerung_monate: number | null
  pflicht_fuer_fachbetriebe: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const name = input.bezeichnung.trim()
  if (!name) return { ok: false, message: 'Bezeichnung erforderlich' }
  let base = toSlug(name)
  if (!base) base = 'dokument'
  let slug = base
  for (let i = 0; i < 50; i++) {
    slug = i === 0 ? base : `${base}_${i}`
    const { data: ex } = await supabase.from('compliance_dokument_typen').select('id').eq('slug', slug).maybeSingle()
    if (ex) continue
    const { error } = await supabase.from('compliance_dokument_typen').insert({
      slug,
      bezeichnung: name,
      beschreibung: input.beschreibung?.trim() || null,
      pflicht_fuer_fachbetriebe: input.pflicht_fuer_fachbetriebe,
      erneuerung_monate: input.erneuerung_monate,
      sort_order: 900 + i,
      aktiv: true,
    })
    if (error) return { ok: false, message: error.message }
    revalidatePath('/einstellungen/compliance')
    return { ok: true }
  }
  return { ok: false, message: 'Kein freier Slug' }
}
