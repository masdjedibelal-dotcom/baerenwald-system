import { auftragNetto } from '@/lib/dashboard/dashboard-analytics'

export type KundeUmsatzAuftrag = Parameters<typeof auftragNetto>[0] & {
  id?: string
  status?: string | null
  created_at?: string | null
}

export type KundeUmsatzRechnung = {
  status?: string | null
  brutto?: number | null
  netto?: number | null
  auftrag_id?: string | null
  bezahlt_at?: string | null
  rechnungsdatum?: string | null
}

function rechnungBetragNetto(r: KundeUmsatzRechnung): number {
  const netto = Number(r.netto)
  if (Number.isFinite(netto) && netto > 0) return netto
  const brutto = Number(r.brutto)
  if (Number.isFinite(brutto) && brutto > 0) return brutto
  return 0
}

function rechnungDatum(r: KundeUmsatzRechnung): string | null {
  return r.bezahlt_at?.trim() || r.rechnungsdatum?.trim() || null
}

/**
 * Kundenumsatz ohne Doppelzählung:
 * - Nicht stornierte Aufträge → Auftragssumme (Netto)
 * - Bezahlte Rechnungen nur ohne Auftrag (Direktrechnungen)
 */
export function berechneKundeGesamtumsatz(
  auftraege: KundeUmsatzAuftrag[],
  rechnungen: KundeUmsatzRechnung[]
): number {
  let summe = 0
  for (const a of auftraege) {
    if (String(a.status ?? '').toLowerCase() === 'storniert') continue
    summe += auftragNetto(a)
  }
  for (const r of rechnungen) {
    if (String(r.status ?? '').toLowerCase() !== 'bezahlt') continue
    if ((r.auftrag_id ?? '').trim()) continue
    summe += rechnungBetragNetto(r)
  }
  return Math.round(summe * 100) / 100
}

/** Umsatz-Zeitpunkte für Verlauf / Zeitraum-KPIs (gleiche Regeln wie Gesamtumsatz). */
export function kundeUmsatzEvents(
  auftraege: KundeUmsatzAuftrag[],
  rechnungen: KundeUmsatzRechnung[]
): Array<{ at: string; betrag: number }> {
  const events: Array<{ at: string; betrag: number }> = []

  for (const a of auftraege) {
    if (String(a.status ?? '').toLowerCase() === 'storniert') continue
    const betrag = auftragNetto(a)
    if (betrag > 0 && a.created_at) events.push({ at: a.created_at, betrag })
  }

  for (const r of rechnungen) {
    if (String(r.status ?? '').toLowerCase() !== 'bezahlt') continue
    if ((r.auftrag_id ?? '').trim()) continue
    const at = rechnungDatum(r)
    const betrag = rechnungBetragNetto(r)
    if (at && betrag > 0) events.push({ at, betrag })
  }

  return events
}
