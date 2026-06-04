import type { Kunde } from '@/lib/types'

/** Lesbare Labels & Freitext-Erkennung für Lead-/Funnel-Anzeige. */

const KUNDENTYP_MAP: Record<string, string> = {
  eigentuemer: 'Eigentümer',
  mieter: 'Mieter',
  verwaltung: 'Hausverwaltung',
  gewerbe: 'Gewerbe',
  privat: 'Privat',
  hausverwaltung: 'Hausverwaltung',
}

const PREIS_MODUS_MAP: Record<string, string> = {
  standard: 'Standard',
  komplex: 'Individuell / Komplex',
  fix: 'Festpreis',
  range: 'Preisrahmen',
  budget: 'Ca.-Budget',
}

export function zeitraumLabel(v?: string | null): string {
  const MAP: Record<string, string> = {
    sofort: 'So schnell wie möglich',
    heute: 'Heute',
    diese_woche: 'Diese Woche',
    woche: 'Diese Woche',
    ein_monat: 'Innerhalb 1 Monat',
    zwei_monate: '1–2 Monate',
    vier_wochen: 'Bis zu 4 Wochen',
    drei_monate: '1–3 Monate',
    sechs_monate: '3–6 Monate',
    naechster_monat: 'Nächster Monat',
    naechstes_jahr: 'Nächstes Jahr',
    naechste_saison: 'Nächste Saison',
    flexibel: 'Flexibel',
    offen: 'Noch offen',
    dringend: 'Dringend',
    normal: 'Normal',
    '1_monat': 'Innerhalb 1 Monat',
    '3_monate': '1–3 Monate',
    '6_monate': '3–6 Monate',
  }
  if (!v) return '—'
  return MAP[v] ?? v
}

/** PostgREST liefert bei manchen Abfragen ein Array statt eines einzelnen Kunden. */
export function resolveLeadKunde(
  kunden: Kunde | Kunde[] | null | undefined
): Kunde | null {
  if (!kunden) return null
  if (Array.isArray(kunden)) return kunden[0] ?? null
  return kunden
}

export function kundentypLabel(v?: string | null): string {
  if (!v?.trim()) return '—'
  return KUNDENTYP_MAP[v] ?? v
}

export function preisModusLabel(v?: string | null): string | null {
  if (!v?.trim()) return null
  const key = v.toLowerCase()
  return PREIS_MODUS_MAP[key] ?? v
}

/** Website: `{ badWas: "komplett" }` · CRM: `["komplett"]` → string[] */
export function normalizeFachdetails(details: unknown): string[] {
  if (details == null) return []
  if (Array.isArray(details)) {
    return details.filter((x): x is string => typeof x === 'string' && x.length > 0)
  }
  if (typeof details === 'object') {
    return Object.values(details as Record<string, unknown>).filter(
      (x): x is string => typeof x === 'string' && x.length > 0
    )
  }
  if (typeof details === 'string' && details.trim()) return [details.trim()]
  return []
}

/** Echter Freitext — kein JSON-/Debug-Dump, kein formattedSummary aus funnel_daten. */
export function isEchterFreitext(s?: string | null): boolean {
  if (!s?.trim()) return false
  const t = s.trim()

  if (t.startsWith('{') || t.startsWith('[')) return false

  if (
    t.includes('===') ||
    t.includes('Bereiche:') ||
    t.includes('fachdetail') ||
    t.includes('Strukturierte') ||
    t.includes('Antworten (IDs)') ||
    t.includes('Projektanfrage') ||
    t.includes('Reparatur/Notfall') ||
    t.includes('funnel_daten') ||
    t.includes('"fachdetails"') ||
    t.includes('"groessen"')
  ) {
    return false
  }

  return true
}

/** Anzeige-Name einer Anfrage: Kontakt (Stammdaten auf dem Lead) vor verknüpftem Kundendatensatz. */
export function leadKontaktAnzeigeName(
  lead: {
    kontakt_name?: string | null
    kunden?: { name?: string | null } | null
  },
  fallback = 'Ohne Namen'
): string {
  const k = lead.kontakt_name?.trim()
  if (k) return k
  const kn = lead.kunden?.name?.trim()
  if (kn) return kn
  return fallback
}
