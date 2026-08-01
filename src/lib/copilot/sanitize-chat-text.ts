/** Nutzer-sichtbaren Assistenten-Text von IDs, URLs und Dokumentnummern befreien. */

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi

/** BW-2026-0001, RE2026-2069, AN-…, AG-… */
const DOC_NR_RE =
  /\b(?:BW|RE|AN|AG|AUF)[-–]?\d{2,4}[-–]?\d{2,6}\b/gi

const CRM_PATH_RE =
  /\/(?:rechnungen|angebote|auftraege|anfragen|kunden|handwerker|partner|vorgaenge|kalender|katalog)(?:\/[^\s)|\]"'<>]*)?/gi

const QUERY_RE = /\?[a-z0-9_]+=[^\s)&\]"'<>]+(?:&[a-z0-9_]+=[^\s)&\]"'<>]+)*/gi

function formatEurShort(n: unknown): string | null {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return null
  return `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function nestedName(rel: unknown, fallback = '—'): string {
  if (!rel) return fallback
  if (Array.isArray(rel)) {
    const first = rel[0]
    if (first && typeof first === 'object' && 'name' in first) {
      const n = String((first as { name?: unknown }).name ?? '').trim()
      if (n) return n
    }
    return fallback
  }
  if (typeof rel === 'object' && 'name' in rel) {
    const n = String((rel as { name?: unknown }).name ?? '').trim()
    if (n) return n
  }
  return fallback
}

/** Chat-Text: keine UUIDs, Pfade, Query-Params, Rechnungs-/Angebotsnummern. */
export function sanitizeAssistentChatText(raw: string): string {
  const fences: string[] = []
  // bw-apply / Code-Fences unangetastet lassen (IDs im JSON brauchen wir intern)
  let s = raw.replace(/```[\w-]*\s*[\s\S]*?```/g, (block) => {
    const i = fences.length
    fences.push(block)
    return `\u0000FENCE${i}\u0000`
  })

  // [Öffnen](/rechnungen/…) → weg; [Kunde](/…) → nur Label
  s = s.replace(/\[([^\]]*)\]\((\/[^)]+|https?:\/\/[^)]+)\)/g, (_m, label: string) => {
    const t = String(label).trim()
    if (!t || /^(öffnen|open|link|hier|details?)$/i.test(t)) return ''
    return t
  })

  s = s.replace(/https?:\/\/[^\s)\]>"']+/gi, '')
  s = s.replace(CRM_PATH_RE, '')
  s = s.replace(QUERY_RE, '')
  s = s.replace(UUID_RE, '')
  s = s.replace(DOC_NR_RE, '')

  // Leere Tabellenzellen / doppelte Pipe-Spalten aufräumen
  s = s.replace(/\|\s*\|/g, '|')
  s = s.replace(/[ \t]+\n/g, '\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  s = s.replace(/[ \t]{2,}/g, ' ')

  s = s.replace(/\u0000FENCE(\d+)\u0000/g, (_m, idx: string) => fences[Number(idx)] ?? '')

  return s.trim()
}

export function rechnungChipLabel(row: {
  brutto?: unknown
  kunden?: unknown
  rechnungsnummer?: unknown
}): string {
  const name = nestedName(row.kunden, 'Kunde')
  const betrag = formatEurShort(row.brutto)
  return betrag ? `${name} · ${betrag}` : `Rechnung · ${name}`
}

export function angebotChipLabel(row: {
  angebotsnr?: unknown
  gesamt_fix?: unknown
  leads?: unknown
}): string {
  let name = 'Kunde'
  const leads = row.leads
  if (leads && typeof leads === 'object') {
    const L = Array.isArray(leads) ? leads[0] : leads
    if (L && typeof L === 'object') {
      const kontakt = String((L as { kontakt_name?: unknown }).kontakt_name ?? '').trim()
      const kn = nestedName((L as { kunden?: unknown }).kunden, '')
      name = kn || kontakt || name
    }
  }
  const betrag = formatEurShort(row.gesamt_fix)
  return betrag ? `${name} · ${betrag}` : `Angebot · ${name}`
}
