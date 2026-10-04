import {
  dokumentFuerTyp
} from '@/lib/handwerker/compliance-katalog'
import type { PartnerDokument } from '@/lib/types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { hatOffeneErgaenzungFuerPortal } from '@/lib/vertraege/portal-vertrag-helpers'

export const RAHMENVERTRAG_TYP_SLUG = 'rahmenvertrag'

export function rahmenvertragErfuellt(
  dokumente: PartnerDokument[],
  rahmenVertrag?: HandwerkerVertragRow | null
): boolean {
  const doc = dokumentFuerTyp(dokumente, RAHMENVERTRAG_TYP_SLUG, { auftragId: null })
  if (doc?.datei_url?.trim()) return true
  return Boolean(
    rahmenVertrag?.pdf_url?.trim() &&
      (rahmenVertrag.status === 'pdf_erzeugt' || rahmenVertrag.status === 'unterschrieben')
  )
}

export function projektvertragErfuellt(
  vertraege: HandwerkerVertragRow[],
  auftragId: string,
  handwerkerId: string,
  auftragHandwerkerBestaetigtAm?: string | null,
  opts?: { istBauprojekt?: boolean | null }
): boolean {
  if (opts?.istBauprojekt === false) return true
  if (hatOffeneErgaenzungFuerPortal(vertraege, auftragId, handwerkerId)) return false
  if (auftragHandwerkerBestaetigtAm) return true
  const v = vertraege.find(
    (x) =>
      x.typ === 'projekt' &&
      x.auftrag_id === auftragId &&
      x.handwerker_id === handwerkerId &&
      x.pdf_url?.trim()
  )
  if (!v) return false
  return v.status === 'pdf_erzeugt' || v.status === 'unterschrieben'
}
