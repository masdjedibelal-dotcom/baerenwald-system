'use server'

import { createClient } from '@/lib/supabase-server'
import {
  deleteFormularTemplate as softDeleteFormularTemplate,
  saveFormularTemplate as persistFormularTemplate,
} from '@/app/actions/formulare'
import type { FormularFeld, FormularTemplate } from '@/lib/types'

function parseFelder(raw: unknown): FormularFeld[] {
  if (!Array.isArray(raw)) return []
  return raw as FormularFeld[]
}

const STANDARD_NAMES = [
  'Bad & Sanitär — Vorab',
  'Heizung — Vorab',
  'Allgemein — Abnahme',
] as const

function standardFelderBad(): FormularFeld[] {
  return [
    { id: 'bad_m2', label: 'Istaufnahme Badgröße (m²)', typ: 'number', pflicht: true },
    {
      id: 'bad_fliesen',
      label: 'Fliesenzustand',
      typ: 'select',
      pflicht: true,
      optionen: ['gut', 'mittel', 'schlecht'],
    },
    { id: 'bad_leitungen', label: 'Leitungen Zustand', typ: 'textarea', pflicht: false },
    { id: 'bad_sonst', label: 'Besonderheiten', typ: 'textarea', pflicht: false },
    { id: 'bad_fotos', label: 'Fotos Istzustand', typ: 'foto', pflicht: false },
  ]
}

function standardFelderHeizung(): FormularFeld[] {
  return [
    { id: 'hz_typ', label: 'Heizungstyp', typ: 'text', pflicht: true },
    { id: 'hz_baujahr', label: 'Baujahr', typ: 'number', pflicht: true },
    { id: 'hz_wartung', label: 'Letzte Wartung', typ: 'date', pflicht: false },
    { id: 'hz_zustand', label: 'Aktueller Zustand', typ: 'textarea', pflicht: false },
    { id: 'hz_fotos', label: 'Fotos', typ: 'foto', pflicht: false },
  ]
}

function standardFelderAbnahme(): FormularFeld[] {
  return [
    { id: 'ab_arbeit', label: 'Arbeiten vollständig abgeschlossen', typ: 'checkbox', pflicht: true },
    { id: 'ab_sauber', label: 'Baustelle besenrein übergeben', typ: 'checkbox', pflicht: true },
    { id: 'ab_maengel', label: 'Mängel vorhanden', typ: 'checkbox', pflicht: false },
    {
      id: 'ab_maengel_txt',
      label: 'Mängel Beschreibung',
      typ: 'textarea',
      pflicht: false,
      pflicht_wenn: { feld_id: 'ab_maengel', wert: true },
    },
    { id: 'ab_fotos', label: 'Fotos Endzustand', typ: 'foto', pflicht: false },
    { id: 'ab_bem', label: 'Bemerkungen', typ: 'textarea', pflicht: false },
  ]
}

export async function ensureStandardFormularTemplates(): Promise<void> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('formular_templates')
    .select('name')
    .in('name', [...STANDARD_NAMES])

  const have = new Set((existing ?? []).map((r: { name: string }) => r.name))
  if (STANDARD_NAMES.every((n) => have.has(n))) return

  const { data: gewerke } = await supabase.from('gewerke').select('id, slug').eq('aktiv', true)
  const bySlug = Object.fromEntries((gewerke ?? []).map((g: { id: string; slug: string }) => [g.slug, g.id]))

  const candidates: {
    name: string
    gewerk_id: string | null
    typ: FormularTemplate['typ']
    subtyp: string | null
    phase: FormularTemplate['phase']
    felder: FormularFeld[]
    aktiv: boolean
  }[] = []

  if (!have.has('Bad & Sanitär — Vorab')) {
    candidates.push({
      name: 'Bad & Sanitär — Vorab',
      gewerk_id: (bySlug['bad'] as string | undefined) ?? (bySlug['sanitaer'] as string | undefined) ?? null,
      typ: 'handwerker',
      subtyp: 'bautagebuch',
      phase: 'vorab',
      felder: standardFelderBad(),
      aktiv: true,
    })
  }
  if (!have.has('Heizung — Vorab')) {
    candidates.push({
      name: 'Heizung — Vorab',
      gewerk_id: (bySlug['heizung'] as string | undefined) ?? null,
      typ: 'handwerker',
      subtyp: 'bautagebuch',
      phase: 'vorab',
      felder: standardFelderHeizung(),
      aktiv: true,
    })
  }
  if (!have.has('Allgemein — Abnahme')) {
    candidates.push({
      name: 'Allgemein — Abnahme',
      gewerk_id: null,
      typ: 'handwerker',
      subtyp: 'abnahme',
      phase: 'abnahme',
      felder: standardFelderAbnahme(),
      aktiv: true,
    })
  }

  for (const row of candidates) {
    const { error } = await supabase.from('formular_templates').insert(row)
    if (error) console.error('ensureStandardFormularTemplates', row.name, error.message)
  }
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
