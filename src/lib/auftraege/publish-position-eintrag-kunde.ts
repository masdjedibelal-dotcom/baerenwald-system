import 'server-only'

import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { eintragTypLabel } from '@/lib/auftraege/position-lebenszyklus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'

/**
 * Bautagebuch-/Positions-Eintrag sofort fürs Kundenportal freigeben
 * (auftrag_timeline.fuer_kunde_freigegeben = true) — kein CRM-Freigabe-Schritt.
 */
export async function publishPositionEintragFuerKunde(input: {
  eintragId: string
  auftragId: string
  typ: string
  beschreibung?: string | null
  leistungName?: string | null
  erstelltVon?: string | null
  handwerkerId?: string | null
}): Promise<void> {
  const titelParts = [
    eintragTypLabel(input.typ as never) || 'Bautagebuch',
    input.leistungName?.trim() || null,
  ].filter(Boolean)

  const { data: fotos } = await supabaseAdmin
    .from('eintrag_fotos')
    .select('storage_path')
    .eq('eintrag_id', input.eintragId)
    .limit(12)

  const fotoUrls: string[] = []
  for (const f of fotos ?? []) {
    const path = String(f.storage_path ?? '').trim()
    if (!path) continue
    const url =
      (await signedHandwerkerUploadUrl(path)) ??
      (/^https?:\/\//i.test(path) ? path : null)
    if (url) fotoUrls.push(url)
  }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'bautagebuch',
    titel: titelParts.join(' · '),
    beschreibung: input.beschreibung?.trim() || null,
    foto_urls: fotoUrls,
    fuer_kunde_freigegeben: true,
    sichtbar_fuer_kunde: true,
    erstellt_von: input.erstelltVon ?? null,
    handwerker_id: input.handwerkerId ?? null,
  })
}
