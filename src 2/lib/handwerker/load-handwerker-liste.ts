import { createClient } from '@/lib/supabase-server'
import type { GewerkOption, HandwerkerZeile } from '@/components/handwerker/HandwerkerListeClient'

function gewerkeNamenFromRow(
  gewerke: unknown,
  slugToName: Map<string, string>
): string[] {
  if (gewerke == null) return []
  if (Array.isArray(gewerke)) {
    return gewerke
      .map((x) => {
        if (typeof x === 'string') return slugToName.get(x.toLowerCase()) ?? x
        if (x && typeof x === 'object' && 'name' in x) return String((x as { name?: string }).name ?? '')
        return String(x)
      })
      .filter(Boolean)
  }
  if (typeof gewerke === 'string') {
    try {
      const p = JSON.parse(gewerke) as unknown
      return gewerkeNamenFromRow(p, slugToName)
    } catch {
      return gewerke.trim() ? [gewerke] : []
    }
  }
  return []
}

export type HandwerkerListeData = {
  rows: HandwerkerZeile[]
  gewerkeOptionen: GewerkOption[]
}

export async function loadHandwerkerListe(): Promise<HandwerkerListeData> {
  const supabase = createClient()

  const [{ data: gewData }, { data: hwData, error }, { data: docRows }, { data: zu }] =
    await Promise.all([
      supabase.from('gewerke').select('slug, name').eq('aktiv', true).order('name'),
      supabase
        .from('handwerker')
        .select(
          'id, name, firma, vorname, nachname, email, telefon, gewerke, compliance_status, ist_fachbetrieb, aktiv, created_at'
        )
        .eq('aktiv', true)
        .order('name', { ascending: true }),
      supabase.from('partner_dokumente').select('handwerker_id'),
      supabase
        .from('auftrag_handwerker')
        .select('handwerker_id')
        .in('status', ['zugewiesen', 'in_arbeit']),
    ])

  if (error) {
    throw new Error(error.message ?? 'Handwerker konnten nicht geladen werden')
  }

  const einsatzIds = new Set(
    Array.from(new Set((zu ?? []).map((r) => r.handwerker_id as string)))
  )

  const slugToName = new Map((gewData ?? []).map((g) => [String(g.slug).toLowerCase(), g.name as string]))
  const gewerkeOptionen = (gewData ?? []).map((g) => ({
    slug: g.slug as string,
    name: g.name as string,
  }))

  const docsCount = new Map<string, number>()
  for (const r of docRows ?? []) {
    const id = r.handwerker_id as string | null
    if (!id) continue
    docsCount.set(id, (docsCount.get(id) ?? 0) + 1)
  }

  const rows: HandwerkerZeile[] = (hwData ?? []).map((h) => {
    const r = h as HandwerkerZeile
    return {
      ...r,
      gewerk_namen: gewerkeNamenFromRow(h.gewerke, slugToName),
      docs_vorhanden: docsCount.get(r.id) ?? 0,
      aktiver_einsatz: einsatzIds.has(r.id),
    }
  })

  return { rows, gewerkeOptionen }
}
