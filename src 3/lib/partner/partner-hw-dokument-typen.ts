/**
 * Handwerker-PDFs aus dem Partner-Portal → CRM (Stufe 1).
 * Labels analog handwerks-plattform/src/lib/partner/partner-hw-dokument-typen.ts
 *
 * PostgREST-Join für Auftrags-/Angebots-Detail: `angebot_handwerker(${ANGEBOT_HANDWERKER_HW_DOKUMENT_SELECT})`
 * (vollständig in `auftraege-data.ts` → `AUFTRAG_DETAIL_SELECT` und Fallback).
 */

export type PartnerHwDokumentArt = 'unterlage' | 'rechnung'

/** Mindest-Spalten für Partner-Unterlagen in verschachtelten SELECTs. */
export const ANGEBOT_HANDWERKER_HW_DOKUMENT_SELECT = `
  id,
  angebot_id,
  handwerker_id,
  gewerk_id,
  hw_angebot_pdf_url,
  hw_angebot_anhang_urls,
  hw_rechnung_pdf_url,
  hw_rechnung_eingereicht_at,
  hw_eingereicht_at,
  handwerker(id, name, email, telefon),
  gewerke(id, name, slug)
`.trim()

export const PARTNER_HW_DOKUMENT_CRM_LABEL = {
  unterlage: 'Handwerker · Unterlage',
  unterlageNr: (nr: number) => `Handwerker · Unterlage ${nr}`,
  rechnung: 'Handwerker · Rechnung',
} as const

export function partnerHwDokumentListenName(
  art: PartnerHwDokumentArt,
  opts?: { index?: number; total?: number }
): string {
  if (art === 'rechnung') return PARTNER_HW_DOKUMENT_CRM_LABEL.rechnung
  const total = opts?.total ?? 1
  const index = opts?.index ?? 0
  if (total <= 1) return PARTNER_HW_DOKUMENT_CRM_LABEL.unterlage
  return PARTNER_HW_DOKUMENT_CRM_LABEL.unterlageNr(index + 1)
}

/** Storage-Pfade aus `hw_angebot_anhang_urls` (jsonb) inkl. Fallback auf Primär-PDF. */
export function parseHwAnhangStoragePaths(
  raw: unknown,
  fallbackPath: string | null | undefined
): string[] {
  if (Array.isArray(raw)) {
    const paths = raw.map((x) => String(x).trim()).filter(Boolean)
    if (paths.length) return paths
  }
  const fb = fallbackPath?.trim()
  return fb ? [fb] : []
}
