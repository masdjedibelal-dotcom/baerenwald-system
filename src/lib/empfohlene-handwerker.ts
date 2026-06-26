import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { handwerkerHatGewerkSlug } from '@/lib/handwerker/gewerk-match'
import type { SupabaseClient } from '@supabase/supabase-js'

export type EmpfohlenerHandwerker = {
  id: string
  name: string
  firma: string | null
  gewerkName: string
  gewerkSlug: string
  telefon: string | null
  verfuegbar: boolean
  /** Ø-Bewertung (1–5), optional aus DB — ohne Eintrag UI = 0 */
  bewertung_note?: number | null
}

type LeadBereicheInput = {
  bereiche?: string[] | null
  situation?: string | null
}

export function gewerkSlugsFromLead(lead: LeadBereicheInput, max = 3): string[] {
  const slugs = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  return Array.from(new Set(slugs)).slice(0, max)
}

export async function loadEmpfohleneHandwerker(
  supabase: SupabaseClient,
  lead: LeadBereicheInput
): Promise<EmpfohlenerHandwerker[]> {
  const slugs = gewerkSlugsFromLead(lead, 3)
  if (!slugs.length) return []

  const { data: gewerkeRows } = await supabase.from('gewerke').select('id, name, slug').in('slug', slugs)
  const gewerke = gewerkeRows ?? []
  if (!gewerke.length) return []

  const { data: allHw, error: hwErr } = await supabase
    .from('handwerker')
    .select('id, name, firma, telefon, gewerke, aktiv, bewertung_gesamt')
    .eq('aktiv', true)

  type HandwerkerRow = {
    id: string
    name: string
    firma: string | null
    telefon: string | null
    gewerke: string[] | null
    aktiv: boolean
    bewertung_gesamt?: number | null
  }

  let handwerker: HandwerkerRow[] = ((allHw ?? []) as unknown as HandwerkerRow[])
  if (hwErr && /bewertung|42703|PGRST204|does not exist/i.test(hwErr.message)) {
    const { data: fallback } = await supabase
      .from('handwerker')
      .select('id, name, firma, telefon, gewerke, aktiv')
      .eq('aktiv', true)
    handwerker = (fallback ?? []) as unknown as HandwerkerRow[]
  } else if (hwErr) {
    console.error('[loadEmpfohleneHandwerker]', hwErr.message)
    return []
  }
  const busyIds = new Set<string>()

  const hwIds = handwerker.map((h) => h.id as string)
  if (hwIds.length) {
    const { data: ah } = await supabase
      .from('auftrag_handwerker')
      .select('handwerker_id, auftraege(status)')
      .in('handwerker_id', hwIds)
    for (const row of ah ?? []) {
      const auf = row.auftraege as { status?: string } | { status?: string }[] | null
      const a = Array.isArray(auf) ? auf[0] : auf
      if (a?.status === 'offen' || a?.status === 'in_arbeit') busyIds.add(row.handwerker_id as string)
    }
  }

  const result: EmpfohlenerHandwerker[] = []

  for (const slug of slugs) {
    const gw = gewerke.find((g) => g.slug === slug)
    if (!gw) continue

    const kandidaten = handwerker
      .filter((h) => handwerkerHatGewerkSlug((h.gewerke as string[] | null) ?? [], slug))
      .map((h) => ({
        id: h.id as string,
        name: h.name as string,
        firma: (h.firma as string | null) ?? null,
        telefon: (h.telefon as string | null) ?? null,
        verfuegbar: !busyIds.has(h.id as string),
        bewertung_gesamt: (h as { bewertung_gesamt?: number | null }).bewertung_gesamt ?? null,
      }))
      .sort((a, b) => {
        if (a.verfuegbar !== b.verfuegbar) return a.verfuegbar ? -1 : 1
        return a.name.localeCompare(b.name, 'de')
      })

    const pick = kandidaten[0]
    if (!pick) continue

    result.push({
      ...pick,
      gewerkName: gw.name as string,
      gewerkSlug: slug,
      bewertung_note: pick.bewertung_gesamt ?? null,
    })
    if (result.length >= 3) break
  }

  return result
}
