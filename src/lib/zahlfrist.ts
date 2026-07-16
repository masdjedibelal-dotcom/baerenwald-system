/** Mock-Segmente für Zahlfrist / Zahlungsziel (Angebot + Rechnung). */
export type ZahlfristSeg = '7' | '14' | '30' | 'datum'

export const ZAHLFRIST_SEG_OPTIONS: Array<{ value: ZahlfristSeg; label: string }> = [
  { value: '7', label: '7 Tage' },
  { value: '14', label: '14 Tage' },
  { value: '30', label: '30 Tage' },
  { value: 'datum', label: 'Datum' },
]

export function plusDaysIso(days: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDateDeYmd(ymd: string): string {
  if (!ymd?.trim()) return '—'
  try {
    return new Date(`${ymd.trim()}T12:00:00`).toLocaleDateString('de-DE')
  } catch {
    return ymd
  }
}

/** Mock-Anzeige: „zahlbar innerhalb von n Tagen…“ / „zahlbar bis Datum“ */
export function zahlfristAnzeigeText(seg: ZahlfristSeg, datumYmd: string): string {
  if (seg === 'datum') return `zahlbar bis ${formatDateDeYmd(datumYmd)}`
  return `zahlbar innerhalb von ${seg} Tagen nach Rechnungserhalt`
}

/** Fälligkeitsdatum aus Segment (bei „Datum“ = freies Datum). */
export function faelligAmFromZahlfrist(seg: ZahlfristSeg, datumYmd: string, from = new Date()): string {
  if (seg === 'datum') return datumYmd?.trim() || plusDaysIso(14, from)
  return plusDaysIso(Number(seg) || 14, from)
}

/** Segment aus gespeichertem Fälligkeitsdatum (relativ zu heute) ableiten. */
export function zahlfristSegFromFaelligAm(
  faelligAm: string | null | undefined,
  from = new Date()
): { seg: ZahlfristSeg; datum: string } {
  const ymd = (faelligAm ?? '').trim() || plusDaysIso(14, from)
  for (const days of [7, 14, 30] as const) {
    if (ymd === plusDaysIso(days, from)) return { seg: String(days) as ZahlfristSeg, datum: ymd }
  }
  return { seg: 'datum', datum: ymd }
}
