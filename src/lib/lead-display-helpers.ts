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

type LeadAuftraggeberNamePick = {
  name?: string | null
  org_anzeigename?: string | null
  vorname?: string | null
  nachname?: string | null
  typ?: string | null
}

/** Anzeige-Name der Hausverwaltung (Auftraggeber) bei Mieter-/HV-Meldungen. */
export function leadAuftraggeberAnzeigeName(
  auftraggeber: LeadAuftraggeberNamePick | LeadAuftraggeberNamePick[] | null | undefined
): string | null {
  const ag = !auftraggeber
    ? null
    : Array.isArray(auftraggeber)
      ? auftraggeber[0] ?? null
      : auftraggeber
  if (!ag) return null
  const org = ag.org_anzeigename?.trim()
  if (org) return org
  const display = kundeDisplayName(ag)
  return display !== '—' ? display : null
}

/**
 * Anzeige-Name des Kunden einer Anfrage/Vorgangs.
 * Bei Mieter-Meldungen: Hausverwaltung (auftraggeber), nicht Meldername.
 * Sonst: verknüpfter Kunde (Firma vor Ansprechpartner), sonst Lead-Kontakt.
 */
export function leadKontaktAnzeigeName(
  lead: {
    kontakt_name?: string | null
    auftraggeber_kunde_id?: string | null
    kunden?:
      | KundeListenNamePick
      | KundeListenNamePick[]
      | null
    auftraggeber?: LeadAuftraggeberNamePick | LeadAuftraggeberNamePick[] | null
  },
  fallback = 'Ohne Namen'
): string {
  const hvName = leadAuftraggeberAnzeigeName(lead.auftraggeber)
  if (hvName) return hvName

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

/** Vertrags-/Stammdaten-Kunde: bei HV-Meldung die Hausverwaltung, sonst Melder. */
export function leadVertragsKundeId(lead: {
  kunde_id?: string | null
  auftraggeber_kunde_id?: string | null
  kunden?: { id?: string | null } | { id?: string | null }[] | null
  auftraggeber?: { id?: string | null } | { id?: string | null }[] | null
}): string | null {
  const agRaw = lead.auftraggeber
  const ag = !agRaw ? null : Array.isArray(agRaw) ? agRaw[0] ?? null : agRaw
  const agId = lead.auftraggeber_kunde_id?.trim() || ag?.id?.trim() || null
  if (agId) return agId
  const kundeRaw = lead.kunden
  const kunde = !kundeRaw ? null : Array.isArray(kundeRaw) ? kundeRaw[0] ?? null : kundeRaw
  return lead.kunde_id?.trim() || kunde?.id?.trim() || null
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

  const staffHint = fd.preis_hinweis ?? fd.preisHinweis
  if (typeof staffHint === 'string' && staffHint.trim()) return staffHint.trim()

  return '—'
}

const WEBSITE_DUMP_LINE_LABELS: Record<string, string> = {
  bereiche: 'Bereiche',
  plz: 'PLZ',
  zeitraum: 'Zeitraum',
  kundentyp: 'Kundentyp',
  garten: 'Garten',
  bad: 'Bad',
  heizung: 'Heizung',
  elektrik: 'Elektrik',
  boden: 'Boden',
  fassade: 'Fassade',
  dach: 'Dach',
  fenster: 'Fenster',
  situation: 'Situation',
  leistungen: 'Leistungen',
  umfang: 'Umfang',
  dringlichkeit: 'Dringlichkeit',
}

const WEBSITE_DUMP_VALUE_LABELS: Record<string, string> = {
  ...KUNDENTYP_MAP,
  gartengestaltung: 'Garten',
  flexibel: 'Flexibel',
  terrasse: 'Terrasse / Außenbereich',
  naturstein: 'Naturstein/Platten',
  nein: 'Nein',
  ja: 'Ja',
}

/**
 * Website-`=== Projektanfrage ===`-Dump → lesbare Prop-Zeilen
 * (Fallback, wenn funnel_daten unvollständig und kontakt_nachricht den Dump enthält).
 */
export function parseWebsiteAnfrageDump(
  text: string | null | undefined
): { k: string; v: string }[] {
  if (!text?.trim()) return []
  if (isEchterFreitext(text)) return []
  const t = text.trim()
  if (
    !t.includes('===') &&
    !t.includes('Strukturierte') &&
    !t.includes('Bereiche:') &&
    !t.includes('Projektanfrage')
  ) {
    return []
  }

  const out: { k: string; v: string }[] = []
  const seen = new Set<string>()
  const push = (k: string, v: string) => {
    const key = k.trim()
    const val = v.trim()
    if (!key || !val || val === '—' || val.startsWith('{')) return
    if (seen.has(key)) return
    seen.add(key)
    out.push({ k: key, v: val })
  }

  const formatVal = (raw: string) => {
    const s = raw.trim()
    return WEBSITE_DUMP_VALUE_LABELS[s.toLowerCase()] ?? WEBSITE_DUMP_VALUE_LABELS[s] ?? s
  }

  // JSON-Blöcke (z. B. unter „Projekt-Details:“)
  const jsonMatches = t.match(/\{[^{}]+\}/g) ?? []
  for (const rawJson of jsonMatches) {
    try {
      const obj = JSON.parse(rawJson) as Record<string, unknown>
      for (const [key, val] of Object.entries(obj)) {
        if (val == null || val === '') continue
        const label =
          (
            {
              gartenLeistung: 'Garten-Leistung',
              gartenTerrasseMaterial: 'Terrassen-Material',
              gartenZaun: 'Zaun',
              gartenZugaenglichkeit: 'Zugang Garten',
              ausbauRohbau: 'Rohbau vorhanden',
              ausbauDeckenhoehe: 'Deckenhöhe',
              durchbruchAnzahl: 'Durchbrüche',
              durchbruchTragend: 'Tragende Wand',
              terrasseMaterial: 'Terrasse Material',
              terrasseUnterbau: 'Terrasse Unterbau',
            } as Record<string, string>
          )[key] ?? key
        if (typeof val === 'boolean') {
          push(label, val ? 'Ja' : 'Nein')
        } else if (typeof val === 'number') {
          push(label, String(val))
        } else if (typeof val === 'string') {
          push(label, formatVal(val))
        }
      }
    } catch {
      /* ignore malformed */
    }
  }

  for (const rawLine of t.split(/\n/)) {
    const line = rawLine.replace(/^[-–*•]\s*/, '').trim()
    if (!line || line.startsWith('===') || line.startsWith('{')) continue
    if (/^strukturierte\b/i.test(line)) continue
    if (/^projekt-?details\b/i.test(line) && line.includes('{')) continue
    if (/^antworten\b/i.test(line)) continue

    const m = line.match(/^([A-Za-zÄÖÜäöüß0-9 _/-]+):\s*(.+)$/)
    if (!m) continue
    const rawKey = m[1]!.trim()
    const rawVal = m[2]!.trim()
    if (rawVal.startsWith('{')) continue
    if (/projekt-?details|fachdetails|antworten/i.test(rawKey)) continue

    const keyNorm = rawKey.toLowerCase().replace(/\s+/g, '')
    const label =
      WEBSITE_DUMP_LINE_LABELS[keyNorm] ??
      WEBSITE_DUMP_LINE_LABELS[rawKey.toLowerCase()] ??
      rawKey

    // Mehrteilige Garten-Zeile: „Fläche/Umfang: … · Leistung: …“
    if (/^[·•|]/.test(rawVal) === false && rawVal.includes('·')) {
      const parts = rawVal.split(/\s*·\s*/)
      const leftover: string[] = []
      for (const part of parts) {
        const pm = part.match(/^([^:]+):\s*(.+)$/)
        if (pm) {
          push(pm[1]!.trim(), formatVal(pm[2]!))
        } else {
          leftover.push(part.trim())
        }
      }
      if (leftover.length) push(label, leftover.map(formatVal).join(' · '))
      continue
    }

    push(label, formatVal(rawVal))
  }

  return out
}
