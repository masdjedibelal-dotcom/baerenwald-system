import type { SupabaseClient } from '@supabase/supabase-js'
import type { AngebotPosition, Gewerk } from '@/lib/types'

export type GewerkAusfuehrung = 'eigen' | 'fachbetrieb' | 'beides'

export function normalizeGewerkAusfuehrung(v: string | null | undefined): GewerkAusfuehrung {
  if (v === 'fachbetrieb' || v === 'beides') return v
  return 'eigen'
}

export function getHinweisForPosition(gewerkId: string, gewerke: Gewerk[]): string {
  const gewerk = gewerke.find((g) => g.id === gewerkId)
  if (!gewerk) return ''
  if (normalizeGewerkAusfuehrung(gewerk.ausfuehrung) === 'eigen') return ''
  return gewerk.fachbetrieb_hinweis?.trim() ?? ''
}

export function istFachbetriebGewerk(gewerk: Gewerk | undefined): boolean {
  if (!gewerk) return false
  return normalizeGewerkAusfuehrung(gewerk.ausfuehrung) !== 'eigen'
}

/** Position zeigt optionalen Fachbetrieb-Hinweis (Gewerk-Einstellung). */
export function positionKannFachbetriebHinweis(gewerkId: string | undefined, gewerke: Gewerk[]): boolean {
  return istFachbetriebGewerk(gewerkById(gewerke, gewerkId))
}

export function resolveIstFachbetriebInPdf(
  position: { ist_fachbetrieb?: boolean },
  gewerk: Gewerk | undefined
): boolean {
  if (position.ist_fachbetrieb === true) return true
  if (position.ist_fachbetrieb === false) return false
  return istFachbetriebGewerk(gewerk)
}

/** Fachbetrieb-Hinweis in Beschreibung/Rechnung nur wenn explizit aktiviert. */
export function resolvePositionBeschreibungExport(
  input: {
    leistung: string
    beschreibung?: string | null
    positionBeschreibung?: string | null
    ist_fachbetrieb?: boolean
    fachbetriebHinweisAnzeigen?: boolean
    gewerk_id?: string
  },
  gewerke: Gewerk[] = []
): string {
  const leistung = input.leistung.trim() || 'Position'
  const raw = (input.positionBeschreibung ?? input.beschreibung ?? '').trim()
  const gewerk = gewerkById(gewerke, input.gewerk_id)
  const istFachbetrieb =
    input.fachbetriebHinweisAnzeigen !== undefined
      ? input.fachbetriebHinweisAnzeigen !== false
      : resolveIstFachbetriebInPdf({ ist_fachbetrieb: input.ist_fachbetrieb }, gewerk)

  if (istFachbetrieb) return raw

  const defaultHinweis = input.gewerk_id ? getHinweisForPosition(input.gewerk_id, gewerke) : ''
  if (!raw || raw === leistung) return ''
  if (defaultHinweis && raw === defaultHinweis) return ''
  return raw
}

export function sanitizeAngebotPositionForExport(
  p: AngebotPosition,
  gewerke: Gewerk[] = []
): AngebotPosition {
  const leistung = (p.leistung || '').trim() || 'Position'
  const beschreibung = resolvePositionBeschreibungExport(
    {
      leistung,
      beschreibung: p.beschreibung,
      ist_fachbetrieb: p.ist_fachbetrieb,
      gewerk_id: p.gewerk_id,
    },
    gewerke
  )
  if (beschreibung === (p.beschreibung || '').trim() && p.ist_fachbetrieb !== true) return p
  return { ...p, leistung, beschreibung }
}

export function sanitizeAngebotPositionenForExport(
  positionen: AngebotPosition[],
  gewerke: Gewerk[] = []
): AngebotPosition[] {
  return positionen.map((p) => sanitizeAngebotPositionForExport(p, gewerke))
}

export function gewerkAusfuehrungBadge(
  ausfuehrung: GewerkAusfuehrung
): { label: string; className: string } | null {
  if (ausfuehrung === 'fachbetrieb') {
    return {
      label: 'Fachbetrieb',
      className: 'bg-[#E6F1FB] text-[#185FA5]',
    }
  }
  if (ausfuehrung === 'beides') {
    return {
      label: 'Eigen + Partner',
      className: 'bg-amber-50 text-amber-900',
    }
  }
  if (ausfuehrung === 'eigen') {
    return {
      label: 'Eigenleistung',
      className: 'bg-[#EAF3DE] text-[#2E7D52]',
    }
  }
  return null
}

export function gewerkById(gewerke: Gewerk[], gewerkId: string | undefined): Gewerk | undefined {
  if (!gewerkId) return undefined
  return gewerke.find((g) => g.id === gewerkId)
}

/** Für Angebots-PDF: alle Gewerke inkl. inaktiver (alte Positionen). */
export async function loadGewerkeAusfuehrung(supabase: SupabaseClient): Promise<Gewerk[]> {
  const { data } = await supabase
    .from('gewerke')
    .select('id, name, slug, aktiv, ausfuehrung, fachbetrieb_hinweis, ist_bauleistung')
    .order('name', { ascending: true })
  return (data ?? []) as Gewerk[]
}
