'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import {
  deleteFormularTemplate as softDeleteFormularTemplate,
  saveFormularTemplate as persistFormularTemplate,
} from '@/app/actions/formulare'
import type { FormularFeld,FormularTemplate } from '@/lib/types'

function parseFelder(raw: unknown): FormularFeld[] {
  if (!Array.isArray(raw)) return []
  return raw as FormularFeld[]
}

export async function loadFormularTemplate(id: string): Promise<FormularTemplate | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('formular_templates')
    .select('*, gewerke(id, name, slug)')
    .eq('id', id)
    .maybeSingle()
  if (error) logDbError('app/formulare/actions:formular_templates', error)

  if (error || !data) return null
  const row = data as FormularTemplate & { felder: unknown }
  return { ...row, felder: parseFelder(row.felder) }
}

export async function saveFormularTemplate(input: {
  id?: string | null
  name: string
  gewerk_id: string | null
  typ: FormularTemplate['typ']
  subtyp: string | null
  phase: FormularTemplate['phase']
  felder: FormularFeld[]
  aktiv: boolean
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  try {
    const id = await persistFormularTemplate(
      {
        name: input.name,
        subtyp: input.subtyp,
        phase: input.phase,
        typ: input.typ,
        gewerk_id: input.gewerk_id,
        felder: input.felder,
        aktiv: input.aktiv,
      },
      input.id ?? undefined
    )
    return { ok: true, id }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Speichern fehlgeschlagen' }
  }
}

export async function deleteFormularTemplate(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await softDeleteFormularTemplate(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Löschen fehlgeschlagen' }
  }
}
