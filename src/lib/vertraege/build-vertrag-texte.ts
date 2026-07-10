import type { AuftragPosition } from '@/lib/types'
import type { NachtragPositionDraft } from '@/lib/vertraege/types'
import { handwerkerDisplayName, handwerkerGfName } from '@/lib/handwerker-stammdaten'

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

export function handwerkerAnzeigename(h: {
  name: string
  firma?: string | null
  vorname?: string | null
  nachname?: string | null
}) {
  return handwerkerDisplayName(h)
}

export function handwerkerVertreterName(h: {
  name: string
  firma?: string | null
  vorname?: string | null
  nachname?: string | null
}) {
  return handwerkerGfName(h) || handwerkerDisplayName(h)
}

export function formatVertragDatumDe(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function nachtragPositionenAusAuftrag(positionen: AuftragPosition[]): NachtragPositionDraft[] {
  return positionen.map((p) => ({
    id: p.id,
    quelle: 'bestehend' as const,
    leistung_name: p.leistung_name?.trim() || 'Leistung',
    einheit: p.einheit,
    menge: p.menge,
    preis_partner: p.preis_partner ?? p.preis_fix,
    gewerk_name: p.gewerk_name?.trim() || '',
  }))
}

export function auftragPositionenAusNachtragDrafts(drafts: NachtragPositionDraft[]): AuftragPosition[] {
  return drafts.map((d) => ({
    id: d.id,
    auftrag_id: '',
    gewerk_slug: null,
    gewerk_name: d.gewerk_name,
    oberkategorie: null,
    unterkategorie: null,
    leistung_name: d.leistung_name,
    beschreibung: null,
    einheit: d.einheit,
    menge: d.menge,
    preis_fix: d.preis_partner,
    preis_partner: d.preis_partner,
    lohn_fix: null,
    material_fix: null,
    handwerker_id: null,
    sort_order: null,
  }))
}

export function leistungsumfangNachtragAusPositionen(
  positionen: NachtragPositionDraft[],
  bauvorhaben: string
): string {
  const neu = positionen.filter((p) => p.quelle === 'neu')
  const geaendert = positionen.filter((p) => p.quelle === 'bestehend')
  const parts: string[] = []
  if (neu.length) {
    parts.push(
      `Ergänzung des beauftragten Leistungsumfangs am Bauvorhaben ${bauvorhaben.trim() || 'gemäß Vereinbarung'}.`
    )
    const names = neu.map((p) => p.leistung_name.trim()).filter(Boolean)
    if (names.length) parts.push(`Neu beauftragt: ${Array.from(new Set(names)).join(', ')}.`)
  }
  if (geaendert.length) {
    const lines = geaendert
      .map((p) => {
        const menge = p.menge != null ? `${p.menge.toLocaleString('de-DE')} ${p.einheit ?? ''}`.trim() : ''
        return menge ? `${p.leistung_name} (${menge})` : p.leistung_name
      })
      .filter(Boolean)
    if (lines.length) parts.push(`Angepasste Leistungen: ${lines.join('; ')}.`)
  }
  if (!parts.length) return 'Ergänzung des Leistungsumfangs gemäß nachfolgender Positionen.'
  return parts.join(' ')
}

export function verguetungNachtragAusPositionen(input: {
  bezug_vertrag_vom: string | null
  parent_verguetung_text: string
  positionen: NachtragPositionDraft[]
}): string {
  const parts: string[] = []
  if (input.bezug_vertrag_vom?.trim()) {
    parts.push(`Bezug: Nachunternehmervertrag vom ${input.bezug_vertrag_vom.trim()}.`)
  } else {
    parts.push('Bezug: dem zwischen den Parteien geschlossenen Nachunternehmervertrag.')
  }
  parts.push('')
  if (input.parent_verguetung_text.trim()) {
    parts.push('Für die ursprünglich vereinbarten Leistungen gelten unverändert die Konditionen des Ursprungsvertrags.')
    parts.push('')
  }
  const posText = verguetungAusPositionen(auftragPositionenAusNachtragDrafts(input.positionen))
  if (posText.trim() && posText !== 'Vergütung gemäß gesonderter Vereinbarung.') {
    parts.push(posText)
    parts.push('')
  }
  parts.push(
    'Die übrigen Konditionen des ursprünglichen Nachunternehmervertrags (u. a. Regiesatz, Aufmaß, Zahlungsziel, Sicherheitseinbehalt) gelten unverändert.'
  )
  return parts.join('\n')
}
