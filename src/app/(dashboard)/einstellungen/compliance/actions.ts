'use server'

<<<<<<< Updated upstream
import { revalidateAuftragList, revalidateEinstellungenPath, revalidateHandwerkerList } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
=======
import { logDbError } from '@/lib/errors/log-db-error'
import { revalidatePath } from 'next/cache'
>>>>>>> Stashed changes
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
  kategorie: string | null
  scope: 'standard' | 'bauprojekt' | 'gewerk'
  gewerk_slugs: string[] | null
  pflicht_bauprojekt: boolean
  vertrag_referenz: string | null
  mehrfach_erlaubt: boolean
  compliance_ebene: 'allgemein' | 'meister' | 'leistung'
  nur_bei_bauleistung: boolean
}

export async function loadComplianceTypen(): Promise<ComplianceTypRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('compliance_dokument_typen')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) logDbError('app/einstellungen/compliance/actions:compliance_dokument_typen', error)
  if (error) {
    console.warn('loadComplianceTypen', error.message)
    return []
  }
  return (data ?? []) as ComplianceTypRow[]
}

export async function updateComplianceTyp(
  id: string,
  patch: Partial<
    Pick<
      ComplianceTypRow,
      | 'bezeichnung'
      | 'beschreibung'
      | 'pflicht_fuer_fachbetriebe'
      | 'pflicht_bauprojekt'
      | 'erneuerung_monate'
      | 'aktiv'
      | 'kategorie'
      | 'scope'
      | 'mehrfach_erlaubt'
      | 'compliance_ebene'
      | 'nur_bei_bauleistung'
    >
  >
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const row: Record<string, unknown> = { ...patch }
  if (typeof row.bezeichnung === 'string') {
    const b = row.bezeichnung.trim()
    if (!b) return { ok: false, message: 'Bezeichnung erforderlich' }
    row.bezeichnung = b
  }
  if (typeof row.beschreibung === 'string') {
    row.beschreibung = row.beschreibung.trim() || null
  }
  const { error } = await supabase.from('compliance_dokument_typen').update(row).eq('id', id)
  if (error) logDbError('app/einstellungen/compliance/actions:compliance_dokument_typen', error)
  if (error) return { ok: false, message: error.message }
  revalidateEinstellungenPath('/einstellungen/compliance')
  revalidateHandwerkerList()
  revalidateAuftragList()
  return { ok: true }
}

export async function createComplianceTyp(input: {
  bezeichnung: string
  beschreibung: string | null
  erneuerung_monate: number | null
  pflicht_fuer_fachbetriebe: boolean
  pflicht_bauprojekt?: boolean
  kategorie?: string | null
  scope?: 'standard' | 'bauprojekt' | 'gewerk'
  mehrfach_erlaubt?: boolean
  compliance_ebene?: 'allgemein' | 'meister' | 'leistung'
  nur_bei_bauleistung?: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const name = input.bezeichnung.trim()
  if (!name) return { ok: false, message: 'Bezeichnung erforderlich' }
  let base = toSlug(name)
  if (!base) base = 'dokument'
  let slug = base
  for (let i = 0; i < 50; i++) {
    slug = i === 0 ? base : `${base}_${i}`
    const { data: ex, error } = await supabase.from('compliance_dokument_typen').select('id').eq('slug', slug).maybeSingle()
    if (error) logDbError('app/einstellungen/compliance/actions:compliance_dokument_typen', error)
    if (ex) continue
    const { error: error2 } = await supabase.from('compliance_dokument_typen').insert({
      slug,
      bezeichnung: name,
      beschreibung: input.beschreibung?.trim() || null,
      pflicht_fuer_fachbetriebe: input.pflicht_fuer_fachbetriebe,
      pflicht_bauprojekt: input.pflicht_bauprojekt ?? false,
      erneuerung_monate: input.erneuerung_monate,
      sort_order: 900 + i,
      aktiv: true,
      kategorie: input.kategorie?.trim() || null,
      scope: input.scope ?? 'bauprojekt',
      mehrfach_erlaubt: input.mehrfach_erlaubt ?? false,
      compliance_ebene: input.compliance_ebene ?? 'leistung',
      nur_bei_bauleistung: input.nur_bei_bauleistung ?? false,
    })
    if (error2) logDbError('app/einstellungen/compliance/actions:compliance_dokument_typen', error2)
    if (error2) return { ok: false, message: error2.message }
<<<<<<< Updated upstream
    revalidateEinstellungenPath('/einstellungen/compliance')
=======
    revalidatePath('/einstellungen/compliance')
>>>>>>> Stashed changes
    return { ok: true }
  }
  return { ok: false, message: 'Kein freier Slug' }
}
