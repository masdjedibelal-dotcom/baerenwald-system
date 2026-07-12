import { RAHMENVERTRAG_TYP_SLUG } from '@/lib/handwerker/compliance-vertrag-status'
import { replacePartnerDokumentForTyp } from '@/app/(dashboard)/handwerker/actions'

/** Verknüpft erzeugten Rahmenvertrag-PDF mit Compliance-Dokumenttyp „rahmenvertrag“. */
export async function syncRahmenvertragComplianceDoc(input: {
  handwerker_id: string
  pdf_url: string
  vertrags_nr?: string | null
}): Promise<void> {
  if (!input.pdf_url.trim()) return
  await replacePartnerDokumentForTyp({
    handwerker_id: input.handwerker_id,
    auftrag_id: null,
    typ: RAHMENVERTRAG_TYP_SLUG,
    bezeichnung: input.vertrags_nr?.trim()
      ? `Rahmenvertrag ${input.vertrags_nr.trim()} (inkl. AVV Anlage 1 + 2)`
      : 'Rahmenvertrag (inkl. AVV Anlage 1 + 2)',
    gueltig_bis: null,
    datei_url: input.pdf_url.trim(),
  })
}
