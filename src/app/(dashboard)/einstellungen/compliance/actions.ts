'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'

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
