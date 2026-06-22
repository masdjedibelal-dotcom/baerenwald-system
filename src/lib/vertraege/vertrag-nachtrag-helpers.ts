import type { HandwerkerVertragRow } from '@/lib/vertraege/types'

export function istHauptvertragFuerNachtrag(v: HandwerkerVertragRow): boolean {
  if (v.typ !== 'projekt') return false
  if (v.dokument_art === 'ergaenzung' || v.parent_vertrag_id) return false
  return v.status === 'pdf_erzeugt' || v.status === 'unterschrieben'
}
