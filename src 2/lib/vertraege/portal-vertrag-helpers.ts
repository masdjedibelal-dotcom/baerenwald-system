import type { HandwerkerVertragRow } from '@/lib/vertraege/types'

export function istErgaenzungsvertrag(v: HandwerkerVertragRow): boolean {
  return v.dokument_art === 'ergaenzung' || Boolean(v.parent_vertrag_id)
}

/** Ergänzung mit PDF, noch nicht vom Partner bestätigt */
export function offeneErgaenzungFuerPortal(
  vertraege: HandwerkerVertragRow[],
  auftragId: string,
  handwerkerId: string
): HandwerkerVertragRow | null {
  const row = vertraege
    .filter(
      (v) =>
        v.typ === 'projekt' &&
        v.auftrag_id === auftragId &&
        v.handwerker_id === handwerkerId &&
        istErgaenzungsvertrag(v) &&
        v.status === 'pdf_erzeugt' &&
        v.pdf_url?.trim()
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  return row ?? null
}

export function hatOffeneErgaenzungFuerPortal(
  vertraege: HandwerkerVertragRow[],
  auftragId: string,
  handwerkerId: string
): boolean {
  return offeneErgaenzungFuerPortal(vertraege, auftragId, handwerkerId) != null
}

export function letzterHauptvertrag(
  vertraege: HandwerkerVertragRow[],
  auftragId: string,
  handwerkerId: string
): HandwerkerVertragRow | null {
  const row = vertraege
    .filter(
      (v) =>
        v.typ === 'projekt' &&
        v.auftrag_id === auftragId &&
        v.handwerker_id === handwerkerId &&
        !istErgaenzungsvertrag(v)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  return row ?? null
}
