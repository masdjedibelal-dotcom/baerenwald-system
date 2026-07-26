/** Wann eine Rechnung wie korrigiert wird. */

import type { RechnungStatus } from '@/lib/types'

export type RechnungKorrekturModus = 'direkt' | 'storno_neu' | 'gesperrt'

export function rechnungKorrekturModus(status: RechnungStatus | string | null | undefined): RechnungKorrekturModus {
  const s = (status ?? '').toLowerCase()
  if (s === 'entwurf') return 'direkt'
  if (s === 'gesendet' || s === 'bezahlt') return 'storno_neu'
  return 'gesperrt'
}

export function rechnungDarfHardGeloeschtWerden(status: RechnungStatus | string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'entwurf'
}

/** Soft-Storno ohne Ersatz — nur gesendet, nicht bezahlt. */
export function rechnungDarfOhneErsatzStorniertWerden(
  status: RechnungStatus | string | null | undefined
): boolean {
  return (status ?? '').toLowerCase() === 'gesendet'
}

export type RechnungKorrekturSibling = {
  id: string
  created_at?: string | null
  status?: string | null
  beleg_typ?: string | null
  zahlungsplan_abschlag_id?: string | null
  rechnung_art?: string | null
  abschlag_index?: number | null
  bezug_rechnung_id?: string | null
}

/** Ob zur Rechnung bereits eine Storno-Gutschrift (mit Bezug) existiert. */
export function hatStornoGutschriftZuRechnung(
  rechnungId: string,
  siblings: RechnungKorrekturSibling[]
): boolean {
  return siblings.some(
    (s) =>
      String(s.beleg_typ ?? '') === 'gutschrift' &&
      String(s.bezug_rechnung_id ?? '') === rechnungId
  )
}

/**
 * Soft-Storno darf zurückgenommen werden, wenn storniert und keine Gutschrift mit Bezug existiert.
 */
export function rechnungDarfStornoZurueckgenommenWerden(
  status: RechnungStatus | string | null | undefined,
  rechnungId: string,
  siblings: RechnungKorrekturSibling[]
): boolean {
  if ((status ?? '').toLowerCase() !== 'storniert') return false
  return !hatStornoGutschriftZuRechnung(rechnungId, siblings)
}

/** Nachfolger-RE nach Korrektur (Storno + neue Nr.). */
export function findeNachfolgerRechnungId(
  original: {
    id: string
    created_at?: string | null
    zahlungsplan_abschlag_id?: string | null
    rechnung_art?: string | null
    abschlag_index?: number | null
  },
  siblings: RechnungKorrekturSibling[]
): string | null {
  const origTs = original.created_at ? new Date(original.created_at).getTime() : 0
  const abOrig = String(original.zahlungsplan_abschlag_id ?? '').trim() || null
  const artOrig = String(original.rechnung_art ?? 'voll')
  const idxOrig = original.abschlag_index ?? null

  const candidates = siblings.filter((s) => {
    if (s.id === original.id) return false
    if (String(s.beleg_typ ?? 'rechnung') === 'gutschrift') return false
    if (String(s.status ?? '') === 'storniert') return false
    const sTs = s.created_at ? new Date(s.created_at).getTime() : 0
    if (sTs <= origTs) return false
    const abS = String(s.zahlungsplan_abschlag_id ?? '').trim() || null
    if (abOrig || abS) return abOrig === abS
    return (
      String(s.rechnung_art ?? 'voll') === artOrig && (s.abschlag_index ?? null) === idxOrig
    )
  })

  candidates.sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    return ta - tb
  })
  return candidates[0]?.id ?? null
}
