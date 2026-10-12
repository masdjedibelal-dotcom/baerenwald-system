/**
 * Gesamtnachlass (Zeile `__gesamtrabatt__`, `beschreibung` = `prozent:7` / `betrag:200` / …)
 * — eine Rechenquelle für CRM und Portal (via Sync). Rein: kein Supabase, kein React.
 */

export type GesamtrabattModus =
  | 'prozent'
  | 'prozent_brutto'
  | 'betrag'
  | 'betrag_brutto'
  | 'ziel_netto'
  | 'ziel_brutto'

export function parseGesamtrabattModus(raw: string | null | undefined): GesamtrabattModus {
  const m = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (m === 'betrag') return 'betrag'
  if (m === 'betrag_brutto') return 'betrag_brutto'
  if (m === 'prozent_brutto') return 'prozent_brutto'
  if (m === 'ziel_netto' || m === 'zielnetto') return 'ziel_netto'
  if (m === 'ziel_brutto' || m === 'zielbrutto') return 'ziel_brutto'
  return 'prozent'
}

export function isGesamtrabattZielModus(
  modus: string | null | undefined
): modus is 'ziel_netto' | 'ziel_brutto' {
  return modus === 'ziel_netto' || modus === 'ziel_brutto'
}

/** Abzug (positiv, netto) aus Modus + Wert. */
export function gesamtrabattAbzugFromModus(
  modus: GesamtrabattModus,
  wert: number,
  artikelNetto: number,
  artikelBrutto?: number
): number {
  const netto = Math.max(0, artikelNetto)
  // Prozent vom Brutto = gleicher Anteil vom Netto
  if (modus === 'prozent' || modus === 'prozent_brutto') {
    const p = Math.max(0, Math.min(100, wert))
    if (p <= 0 || netto <= 0) return 0
    return Math.round(netto * (p / 100) * 100) / 100
  }
  if (modus === 'betrag') {
    if (wert <= 0 || netto <= 0) return 0
    return Math.round(Math.min(netto, Math.max(0, wert)) * 100) / 100
  }
  if (modus === 'betrag_brutto') {
    // fester Brutto-Betrag → proportionaler Netto-Abzug (auch bei gemischter USt)
    const bruttoSumme =
      artikelBrutto != null && Number.isFinite(artikelBrutto) && artikelBrutto > 0
        ? artikelBrutto
        : Math.round(netto * 1.19 * 100) / 100
    if (wert <= 0 || netto <= 0 || bruttoSumme <= 0) return 0
    const anteil = Math.min(1, Math.max(0, wert) / bruttoSumme)
    return Math.round(netto * anteil * 100) / 100
  }
  if (modus === 'ziel_netto') {
    const ziel = Math.max(0, wert)
    return Math.round(Math.max(0, netto - ziel) * 100) / 100
  }
  // ziel_brutto → proportionaler Netto-Abzug (auch bei gemischter USt)
  const brutto =
    artikelBrutto != null && Number.isFinite(artikelBrutto) && artikelBrutto > 0
      ? artikelBrutto
      : Math.round(netto * 1.19 * 100) / 100
  if (brutto <= 0 || netto <= 0) return 0
  const ziel = Math.max(0, wert)
  if (ziel >= brutto) return 0
  const zielNetto = (ziel / brutto) * netto
  return Math.round(Math.max(0, netto - zielNetto) * 100) / 100
}

/** Nachlass-Zeile (Angebots-Position) → Modus + Wert. */
export function gesamtrabattMetaAusZeile(p: {
  beschreibung?: string | null
  gesamt_min?: unknown
  lohn_netto?: unknown
  vk_netto?: unknown
}): { modus: GesamtrabattModus; wert: number } {
  const besch = String(p.beschreibung ?? '').trim()
  const colon = besch.indexOf(':')
  const modusRaw = colon >= 0 ? besch.slice(0, colon).trim() : ''
  const wertRaw = colon >= 0 ? besch.slice(colon + 1).trim() : ''
  const modus = modusRaw ? parseGesamtrabattModus(modusRaw) : 'betrag'
  let wert = Math.abs(Number(String(wertRaw).replace(',', '.')))
  if (!Number.isFinite(wert) || (wert <= 0 && !isGesamtrabattZielModus(modus))) {
    // Ohne Meta: gespeicherter Negativbetrag = Abzug in € (nie als Prozent missverstehen).
    wert =
      Math.abs(Number(p.gesamt_min) || 0) ||
      Math.abs(Number(p.lohn_netto) || 0) ||
      Math.abs(Number(p.vk_netto) || 0)
  }
  return { modus, wert: Number.isFinite(wert) ? wert : 0 }
}
