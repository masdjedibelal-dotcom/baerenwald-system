import type { Kunde, LeadKanal } from '@/lib/types'
import { kundeDisplayName, type KundeListenNamePick } from '@/lib/kunde-stammdaten'
import { funnelPositionenGesamt, parseFunnelPositionen } from '@/lib/lead-funnel-positionen'
import { formatAnfragePreisAnzeige, formatWebsiteLeadPreis } from '@/lib/utils'

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
  budget: 'Ca.-Preisrahmen',
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

/** Anzeige-Name einer Anfrage: verknüpfter Kunde (Firma vor Ansprechpartner), sonst Lead-Kontakt. */
export function leadKontaktAnzeigeName(
  lead: {
    kontakt_name?: string | null
    kunden?:
      | KundeListenNamePick
      | KundeListenNamePick[]
      | null
  },
  fallback = 'Ohne Namen'
): string {
  const kundeRaw = lead.kunden
  const kunde = !kundeRaw
    ? null
    : Array.isArray(kundeRaw)
      ? kundeRaw[0] ?? null
      : kundeRaw
  if (kunde) {
    const display = kundeDisplayName(kunde)
    if (display !== '—') return display
  }
  const kontakt = lead.kontakt_name?.trim()
  if (kontakt) return kontakt
  return fallback
}

function numPos(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Preis/Budget: Lead-Spalten, dann Funnel (GPT/Website), dann GPT-Hinweistext. */
export function resolveLeadPreisAnzeige(
  kanal: LeadKanal,
  budget_ca: number | null | undefined,
  preis_min: number | null | undefined,
  preis_max: number | null | undefined,
  funnel?: unknown
): string {
  const direkt = formatAnfragePreisAnzeige(kanal, budget_ca, preis_min, preis_max, funnel)
  if (direkt !== '—') return direkt

  if (!funnel || typeof funnel !== 'object') return '—'
  const fd = funnel as Record<string, unknown>

  const fMin = numPos(fd.preis_min ?? fd.preisMin)
  const fMax = numPos(fd.preis_max ?? fd.preisMax)
  const fBudget = numPos(fd.budget_ca ?? fd.budgetCa)
  const ausFunnelFeldern = formatWebsiteLeadPreis(fBudget, fMin, fMax, funnel)
  if (ausFunnelFeldern !== '—') return ausFunnelFeldern

  if (Array.isArray(fd.breakdown)) {
    let minSum = 0
    let maxSum = 0
    for (const item of fd.breakdown) {
      if (!item || typeof item !== 'object') continue
      const b = item as Record<string, unknown>
      minSum += numPos(b.min) ?? 0
      maxSum += numPos(b.max) ?? 0
    }
    if (minSum > 0 || maxSum > 0) {
      const ausBreakdown = formatWebsiteLeadPreis(null, minSum || null, maxSum || null, funnel)
      if (ausBreakdown !== '—') return ausBreakdown
    }
  }

  const positionen = parseFunnelPositionen(funnel)
  if (positionen.length) {
    const { gesamtMin, gesamtMax } = funnelPositionenGesamt(positionen)
    const ausPositionen = formatWebsiteLeadPreis(null, gesamtMin || null, gesamtMax || null, funnel)
    if (ausPositionen !== '—') return ausPositionen
  }

  const erk = fd.gpt_erklaerung
  if (erk && typeof erk === 'object') {
    const hint = (erk as Record<string, unknown>).preis_hinweis_optional
    if (typeof hint === 'string' && hint.trim()) return hint.trim()
  }

  return '—'
}
