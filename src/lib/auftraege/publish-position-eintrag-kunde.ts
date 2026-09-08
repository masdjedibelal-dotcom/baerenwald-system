import 'server-only'

import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { eintragTypLabel } from '@/lib/auftraege/position-lebenszyklus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveEintragFotoDisplayUrl } from '@/lib/partner/handwerker-uploads'

/**
 * Bautagebuch-/Positions-Eintrag sofort fürs Kundenportal freigeben
 * (auftrag_timeline.fuer_kunde_freigegeben = true) — kein CRM-Freigabe-Schritt.
 */
export async function publishPositionEintragFuerKunde(input: {
  eintragId: string
  auftragId: string
  typ: string
  /** Expliziter Portal-Titel (sonst Typ · Leistung). */
  titel?: string | null
  beschreibung?: string | null
  leistungName?: string | null
  leistungNames?: string[] | null
  erstelltVon?: string | null
  handwerkerId?: string | null
}): Promise<void> {
  const leistungLabel =
    (input.leistungNames ?? [])
      .map((n) => n.trim())
      .filter(Boolean)
      .join(', ') ||
    input.leistungName?.trim() ||
    null
  const titelParts = [
    input.titel?.trim() || eintragTypLabel(input.typ as never) || 'Bautagebuch',
    input.titel?.trim() ? null : leistungLabel,
  ].filter(Boolean)

  const { data: fotos } = await supabaseAdmin
    .from('eintrag_fotos')
    .select('storage_path')
    .eq('eintrag_id', input.eintragId)
    .limit(12)

  const fotoUrls: string[] = []
  const paths = (fotos ?? [])
    .map((f) => String(f.storage_path ?? '').trim())
    .filter(Boolean)
  const resolved = await Promise.all(paths.map((path) => resolveEintragFotoDisplayUrl(path)))
  for (const url of resolved) {
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

  // Notify nicht blockierend — Speichern soll nicht auf Portal-Push warten
  void import('@/lib/portal/notify-portal-bautagebuch')
    .then(({ notifyPortalBautagebuchFromCrm }) =>
      notifyPortalBautagebuchFromCrm({
        auftragId: input.auftragId,
        eintragTitel: titelParts.join(' · ') || 'Bautagebuch-Update',
      })
    )
    .catch((e) => {
      console.warn(
        '[publishPositionEintragFuerKunde] Portal-Notify:',
        e instanceof Error ? e.message : e
      )
    })
}
