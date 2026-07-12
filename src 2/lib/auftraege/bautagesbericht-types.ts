export const BAUTAGESBERICHT_MAX_FOTOS = 12

export type BautagesberichtFoto = {
  url: string
  caption?: string | null
}

export type AuftragBautagesbericht = {
  id: string
  auftrag_id: string
  tag_nummer: number
  datum: string
  arbeitszeit_von?: string | null
  arbeitszeit_bis?: string | null
  wetter?: string | null
  auftraggeber_name?: string | null
  auftraggeber_adresse?: string | null
  nachunternehmer_name?: string | null
  nachunternehmer_firma?: string | null
  leistungen: string[]
  behinderungen?: string | null
  qualitaetssicherung?: string | null
  risiken: string[]
  zusammenfassung?: string | null
  personal_namen: string[]
  fotos: BautagesberichtFoto[]
  foto_display_urls?: BautagesberichtFoto[] | null
  handwerker_id?: string | null
  handwerker?: { id: string; name: string; firma?: string | null } | null
  pdf_url?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const DEFAULT_BAUTAGESBERICHT_RISIKEN = [
  'Ordnung und Sauberkeit täglich kontrollieren.',
  'Materiallagerung sichern.',
  'Gerüstbereiche freihalten.',
  'Öffnungen gegen Beschädigungen schützen.',
  'Dokumentation täglich fortführen.',
]

export function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((x) => String(x ?? '').trim()).filter(Boolean)
}

export function parseBautagesberichtFotos(raw: unknown): BautagesberichtFoto[] {
  if (!Array.isArray(raw)) return []
  const out: BautagesberichtFoto[] = []
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ url: item.trim() })
      continue
    }
    if (item && typeof item === 'object' && 'url' in item) {
      const url = String((item as { url?: unknown }).url ?? '').trim()
      if (!url) continue
      const caption = (item as { caption?: unknown }).caption
      out.push({ url, caption: caption != null ? String(caption) : null })
    }
    if (out.length >= BAUTAGESBERICHT_MAX_FOTOS) break
  }
  return out.slice(0, BAUTAGESBERICHT_MAX_FOTOS)
}
