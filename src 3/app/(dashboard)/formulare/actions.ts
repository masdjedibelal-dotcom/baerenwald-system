'use server'

import { createClient } from '@/lib/supabase-server'
import {
  deleteFormularTemplate as softDeleteFormularTemplate,
  saveFormularTemplate as persistFormularTemplate,
} from '@/app/actions/formulare'
import {
  deactivateObsoleteFormularTemplates,
  ensureStandardTemplates,
} from '@/lib/standard-templates'
import type { FormularFeld, FormularTemplate } from '@/lib/types'

function parseFelder(raw: unknown): FormularFeld[] {
  if (!Array.isArray(raw)) return []
  return raw as FormularFeld[]
}

/** Standard-Baustellen-Formulare sicherstellen; überholte Vorab-/Doppel-Seeds deaktivieren. */
export async function ensureStandardFormularTemplates(): Promise<void> {
  await ensureStandardTemplates()
  await deactivateObsoleteFormularTemplates()
}

export async function loadFormularTemplates(): Promise<FormularTemplate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('formular_templates')
    .select('*, gewerke(id, name, slug)')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as FormularTemplate[]).map((row) => ({
    ...row,
    felder: parseFelder(row.felder as unknown),
  }))
}

export type FormularListeZeile = FormularTemplate & { genutzt: number }

/** Templates inkl. Nutzung aus `formular_eintraege` (für Einstellungen-Liste). */
export async function loadFormularTemplatesMitNutzung(): Promise<FormularListeZeile[]> {
  const templates = await loadFormularTemplates()
  if (!templates.length) return []

  const supabase = createClient()
  const { data } = await supabase.from('formular_eintraege').select('template_id')
  const counts = new Map<string, number>()
  for (const r of data ?? []) {
    const id = (r as { template_id?: string | null }).template_id?.trim()
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  return templates.map((t) => ({ ...t, genutzt: counts.get(t.id) ?? 0 }))
}

export async function duplicateFormularTemplate(
  id: string
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const src = await loadFormularTemplate(id)
  if (!src) return { ok: false, message: 'Formular nicht gefunden' }
  return saveFormularTemplate({
    name: `${src.name.trim()} (Kopie)`,
    gewerk_id: src.gewerk_id,
    typ: src.typ,
    subtyp: src.subtyp ?? null,
    phase: src.phase,
    felder: src.felder,
    aktiv: true,
  })
}

export async function loadFormularTemplate(id: string): Promise<FormularTemplate | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('formular_templates')
    .select('*, gewerke(id, name, slug)')
    .eq('id', id)
    .maybeSingle()

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
