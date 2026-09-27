/**
 * Eine Rechenquelle für Regie- und Positionsbeträge (CRM + Portal via Sync).
 * Rein: kein Supabase, kein React.
 *
 * Rundung nur in `positionBetrag` / `summeBetraege` (2 NK, kaufmännisch).
 */

export type BetragSeite = 'partner' | 'kunde'

/** Minimale Positionsform für Betragsrechnung. */
export type BetragPosition = {
  typ?: string | null
  verguetung?: string | null
  menge?: number | null
  geschaetzt_std?: number | null
  stundensatz?: number | null
  stundensatz_kunde?: number | null
  preis_partner?: number | null
  preis_fix?: number | null
  /** Optional: erfasste Minuten (Bautagebuch); sonst Schätzung/Menge. */
  erfasst_minuten?: number | null
}

/** Kaufmännisch auf 2 Nachkommastellen — einzige Rundungsstelle für Beträge. */
export function roundBetrag2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export function istRegieBetragPosition(p: {
  typ?: string | null
  verguetung?: string | null
}): boolean {
  return (
    String(p.typ ?? '').toLowerCase() === 'regie' ||
    String(p.verguetung ?? '').toLowerCase() === 'aufwand'
  )
}

/**
 * Stunden aus erfasster Zeit, sonst Schätzung, sonst 1.
 * Erfasste Minuten → Stunden mit 2 NK (wie bisherige Rechnungsmenge).
 */
export function regieMengeStunden(
  erfassteMinuten: number | null | undefined,
  geschaetzteStunden: number | null | undefined
): number {
  const min = Number(erfassteMinuten)
  if (Number.isFinite(min) && min > 0) {
    return Math.round((min / 60) * 100) / 100
  }
  const gesch = Number(geschaetzteStunden)
  if (Number.isFinite(gesch) && gesch > 0) return gesch
  return 1
}

/** Partnerzeile roh (ohne Rundung): Menge × Partnersatz. */
export function regieBetragPartner(
  menge: number,
  stundensatz: number
): number {
  const m = Number(menge)
  const s = Number(stundensatz)
  if (!Number.isFinite(m) || !Number.isFinite(s) || m <= 0 || s <= 0) return 0
  return m * s
}

/**
 * Kundenzeile roh (ohne Rundung).
 * Leerer Kundensatz → Partnersatz (Altdaten).
 */
export function regieBetragKunde(
  menge: number,
  stundensatzKunde: number | null | undefined,
  stundensatzFallback: number | null | undefined
): number {
  const kunde = Number(stundensatzKunde)
  const satz =
    Number.isFinite(kunde) && kunde > 0 ? kunde : Number(stundensatzFallback)
  return regieBetragPartner(menge, satz)
}

function partnersatzAusPosition(p: BetragPosition): number {
  const s = Number(p.stundensatz)
  if (Number.isFinite(s) && s > 0) return s
  const pp = Number(p.preis_partner)
  if (Number.isFinite(pp) && pp > 0) return pp
  return 0
}

/**
 * Zeilenbetrag einer Position (Regie oder Pauschale), gerundet.
 * Regie: erfasst_minuten → sonst geschaetzt_std → sonst menge → sonst 1.
 * Pauschale partner: preis_partner; kunde: preis_fix.
 */
export function positionBetrag(
  position: BetragPosition,
  seite: BetragSeite
): number {
  if (istRegieBetragPosition(position)) {
    const menge = regieMengeStunden(
      position.erfasst_minuten,
      position.geschaetzt_std != null && Number(position.geschaetzt_std) > 0
        ? position.geschaetzt_std
        : position.menge
    )
    const partnerSatz = partnersatzAusPosition(position)
    if (seite === 'partner') {
      if (partnerSatz <= 0) {
        const fallback = Number(position.preis_partner)
        return Number.isFinite(fallback) && fallback > 0 ? roundBetrag2(fallback) : 0
      }
      return roundBetrag2(regieBetragPartner(menge, partnerSatz))
    }
    const raw = regieBetragKunde(
      menge,
      position.stundensatz_kunde,
      partnerSatz
    )
    if (raw > 0) return roundBetrag2(raw)
    const fallback = Number(position.preis_fix)
    return Number.isFinite(fallback) && fallback > 0 ? roundBetrag2(fallback) : 0
  }

  if (seite === 'partner') {
    const line = Number(position.preis_partner)
    return Number.isFinite(line) && line > 0 ? roundBetrag2(line) : 0
  }
  const line = Number(position.preis_fix)
  return Number.isFinite(line) && line > 0 ? roundBetrag2(line) : 0
}

/** Summe der gerundeten Zeilenbeträge (kein zweites Runden der Summe). */
export function summeBetraege(
  positionen: BetragPosition[],
  seite: BetragSeite
): number {
  let sum = 0
  for (const p of positionen) {
    sum += positionBetrag(p, seite)
  }
  return sum
}
