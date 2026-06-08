import type { AuftragPosition } from '@/lib/types'

export function bauvorhabenAusAuftrag(input: {
  titel?: string | null
  kunde_adresse?: string | null
  kunde_plz?: string | null
  kunde_ort?: string | null
  gewerk_name?: string | null
}): string {
  const parts = [input.titel?.trim(), input.gewerk_name?.trim()].filter(Boolean)
  const ort = [input.kunde_plz, input.kunde_ort].filter(Boolean).join(' ')
  const adr = [input.kunde_adresse?.trim(), ort.trim()].filter(Boolean).join(', ')
  if (parts.length && adr) return `${parts.join(' – ')} – ${adr}`
  if (parts.length) return parts.join(' – ')
  return adr || 'Bauvorhaben gemäß Auftrag'
}

export function leistungsumfangAusPositionen(positionen: AuftragPosition[]): string {
  const names = positionen
    .map((p) => p.leistung_name?.trim())
    .filter(Boolean)
  if (!names.length) return 'Leistungen gemäß Auftragspositionen und Leistungsverzeichnis.'
  return Array.from(new Set(names)).join(', ') + '.'
}

export function verguetungAusPositionen(positionen: AuftragPosition[]): string {
  if (!positionen.length) return 'Vergütung gemäß gesonderter Vereinbarung.'
  const lines: string[] = []
  const byKey = new Map<string, AuftragPosition[]>()
  for (const p of positionen) {
    const key = `${p.einheit ?? 'pauschal'}`
    const list = byKey.get(key) ?? []
    list.push(p)
    byKey.set(key, list)
  }
  for (const group of Array.from(byKey.values())) {
    const p = group[0]!
    const einheit = (p.einheit ?? 'Pauschal').toLowerCase()
    const preis = p.preis_partner ?? p.preis_fix
    if (preis != null && preis > 0) {
      if (einheit === 'qm' || einheit === 'm²' || einheit === 'm2') {
        lines.push(`Die Vergütung beträgt ${formatEur(preis)} netto je m².`)
      } else if (einheit === 'stunde' || einheit === 'h') {
        lines.push(`Stundensatz ${formatEur(preis)} netto.`)
      } else if (einheit === 'pauschal' || group.length === 1) {
        lines.push(`${p.leistung_name}: ${formatEur(preis)} netto pauschal.`)
      } else {
        lines.push(`${p.leistung_name}: ${formatEur(preis)} netto je ${p.einheit ?? 'Einheit'}.`)
      }
    }
  }
  if (!lines.length) {
    const sum = positionen.reduce((s, p) => s + (p.preis_partner ?? p.preis_fix ?? 0), 0)
    if (sum > 0) return `Die Vergütung beträgt ${formatEur(sum)} netto (Summe der vereinbarten Positionen).`
    return 'Vergütung gemäß Aufmaß und bestätigter Mengen.'
  }
  lines.push('Regiearbeiten werden ausschließlich nach vorheriger schriftlicher Freigabe vergütet.')
  return lines.join(' ')
}

function formatEur(n: number) {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function handwerkerAnzeigename(h: { name: string; firma?: string | null }) {
  const firma = h.firma?.trim()
  if (firma && firma !== h.name.trim()) return `${h.name.trim()} (${firma})`
  return h.name.trim()
}
