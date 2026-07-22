'use server'

import { listKatalogPositionen } from '@/app/(dashboard)/katalog/actions'
import { katalogPreisLabel, katalogVarianteLabel } from '@/lib/katalog/katalog-types'

export type KatalogSuggestItem = {
  position_id: string
  variante_id: string
  titel: string
  variante: string
  gewerk_name: string | null
  einheit: string
  preis: number
  preis_label: string
  beschreibung: string
  score: number
  reason: string
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
}

/**
 * Schlägt Katalog-Varianten zu Anfrage-/Projekttext vor (Keyword-Match).
 * Kein Write-back — nur Lesen aus katalog_*.
 */
export async function suggestKatalogPositionen(opts: {
  text: string
  gewerkHints?: string[]
  limit?: number
}): Promise<KatalogSuggestItem[]> {
  const text = String(opts.text ?? '').trim()
  if (!text) return []

  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 20)
  const tokens = tokenize(text)
  const hintSet = new Set(
    (opts.gewerkHints ?? []).map((h) => h.toLowerCase().trim()).filter(Boolean)
  )

  const katalog = await listKatalogPositionen({ nurAktiv: true })
  const scored: KatalogSuggestItem[] = []

  for (const pos of katalog) {
    const hay = `${pos.titel} ${pos.kategorie} ${pos.beschreibung_standard} ${pos.gewerk_name ?? ''}`.toLowerCase()
    let score = 0
    const matched: string[] = []
    for (const t of tokens) {
      if (hay.includes(t)) {
        score += t.length >= 6 ? 3 : 2
        matched.push(t)
      }
    }
    if (pos.gewerk_slug && hintSet.has(pos.gewerk_slug.toLowerCase())) score += 4
    if (pos.gewerk_name && hintSet.has(pos.gewerk_name.toLowerCase())) score += 4
    if (score <= 0) continue

    const variante =
      pos.varianten.find((v) => /standard/i.test(v.variante)) ?? pos.varianten[0]
    if (!variante) continue

    scored.push({
      position_id: pos.id,
      variante_id: variante.id,
      titel: pos.titel,
      variante: katalogVarianteLabel(variante),
      gewerk_name: pos.gewerk_name ?? null,
      einheit: variante.einheit,
      preis: Number(variante.preis) || 0,
      preis_label: katalogPreisLabel(variante),
      beschreibung: (variante.beschreibung || pos.beschreibung_standard || '').trim(),
      score,
      reason: matched.length
        ? `Passt zu: ${matched.slice(0, 4).join(', ')}`
        : 'Passendes Gewerk',
    })
  }

  scored.sort((a, b) => b.score - a.score || a.titel.localeCompare(b.titel, 'de'))

  // Eine Variante pro Position (beste)
  const seenPos = new Set<string>()
  const out: KatalogSuggestItem[] = []
  for (const s of scored) {
    if (seenPos.has(s.position_id)) continue
    seenPos.add(s.position_id)
    out.push(s)
    if (out.length >= limit) break
  }
  return out
}
