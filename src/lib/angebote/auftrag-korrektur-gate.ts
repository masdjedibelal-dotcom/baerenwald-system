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
}

/** Kunden-Ausgang Rechnung gestellt? (Partner-Eingang / Gutschrift ignorieren) */
export function auftragHatGestellteKundenrechnung(rows: RechnungGateRow[]): boolean {
  return rows.some((r) => {
    if (String(r.richtung ?? '') === 'eingehend') return false
    if (String(r.beleg_typ ?? 'rechnung') === 'gutschrift') return false
    return istRechnungGestellt(String(r.status ?? ''))
  })
}

/** Bearbeitbar: Auftrag existiert und keine gestellte Kundenrechnung. */
export function auftragDarfKorrektur(ctx: AuftragKorrekturKontext): boolean {
  return Boolean(ctx.auftragId) && !ctx.hatGestellteRechnung
}

export function auftragKorrekturSperrgrund(ctx: AuftragKorrekturKontext): string {
  if (!ctx.auftragId) return COPY_ERROR.auftragKorrekturKeinAuftrag
  if (ctx.hatGestellteRechnung) return COPY_ERROR.auftragKorrekturRechnungGestellt
  return COPY_ERROR.generic
}
