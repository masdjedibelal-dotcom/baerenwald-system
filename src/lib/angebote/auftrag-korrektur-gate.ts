/**
 * Reine Gate-Logik für „Auftrag bearbeiten“ (ohne DB).
 */
import { COPY_ERROR } from '@/lib/copy/errors'
import { istRechnungGestellt } from '@/lib/status/write-rechnung-status'

export type AuftragKorrekturKontext = {
  auftragId: string | null
  hatGestellteRechnung: boolean
}

export type RechnungGateRow = {
  status?: string | null
  richtung?: string | null
  beleg_typ?: string | null
  rechnung_art?: string | null
}

/**
 * Sperrt „Auftrag bearbeiten“: gestellte Voll- oder Schlussrechnung an den Kunden.
 * Abschläge sperren nicht (Entscheidung 29.09.2026) — weitere Abschläge und die
 * Schlussrechnung richten sich nach der neuen Auftragssumme.
 * Partner-Eingang und Gutschriften zählen nicht.
 */
export function auftragHatGestellteKundenrechnung(rows: RechnungGateRow[]): boolean {
  return rows.some((r) => {
    if (String(r.richtung ?? '') === 'eingehend') return false
    if (String(r.beleg_typ ?? 'rechnung') === 'gutschrift') return false
    if (String(r.rechnung_art ?? '') === 'abschlag') return false
    return istRechnungGestellt(String(r.status ?? ''))
  })
}

/** Bearbeitbar: Auftrag existiert und keine gestellte Voll- oder Schlussrechnung. */
export function auftragDarfKorrektur(ctx: AuftragKorrekturKontext): boolean {
  return Boolean(ctx.auftragId) && !ctx.hatGestellteRechnung
}

export function auftragKorrekturSperrgrund(ctx: AuftragKorrekturKontext): string {
  if (!ctx.auftragId) return COPY_ERROR.auftragKorrekturKeinAuftrag
  if (ctx.hatGestellteRechnung) return COPY_ERROR.auftragKorrekturRechnungGestellt
  return COPY_ERROR.generic
}
