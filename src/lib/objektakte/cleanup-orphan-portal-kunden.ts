import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Nach Objekt-Löschung: Portal-Stubs (Eigentümer/Mieter/Hausmeister-Login) aufräumen,
 * die keine Akte mehr und keine eigenen CRM-Vorgänge haben.
 * CRM-Privatkunden (portal_modus=privat aus „Als Privatkunde anlegen“) bleiben.
 */
export async function cleanupOrphanHvPortalKunden(
  db: SupabaseClient,
  portalKundeIds: string[]
): Promise<{ deleted: string[] }> {
  const ids = [...new Set(portalKundeIds.map((x) => x.trim()).filter(Boolean))]
  if (!ids.length) return { deleted: [] }

  const deleted: string[] = []

  for (const kid of ids) {
    const { data: kunde } = await db
      .from('kunden')
      .select('id, portal_modus, typ')
      .eq('id', kid)
      .maybeSingle()
    if (!kunde) continue

    const modus = String(kunde.portal_modus ?? '').toLowerCase()
    // Nur HV-Portal-Rollen — nicht bewusst angelegte CRM-Privatkunden
    if (modus !== 'eigentuemer' && modus !== 'mieter' && modus !== 'hausmeister') continue

    const [
      { count: bew },
      { count: eo },
      { count: hmLinks },
      { count: leads },
      { count: auftraege },
      { count: rechnungen },
    ] = await Promise.all([
      db
        .from('einheit_bewohner')
        .select('id', { count: 'exact', head: true })
        .eq('portal_kunde_id', kid)
        .eq('aktiv', true),
      db
        .from('eigentuemer_objekte')
        .select('id', { count: 'exact', head: true })
        .eq('kunde_id', kid),
      db
        .from('org_hausmeister')
        .select('id', { count: 'exact', head: true })
        .eq('portal_kunde_id', kid),
      db
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .or(`kunde_id.eq.${kid},auftraggeber_kunde_id.eq.${kid}`),
      db.from('auftraege').select('id', { count: 'exact', head: true }).eq('kunde_id', kid),
      db.from('rechnungen').select('id', { count: 'exact', head: true }).eq('kunde_id', kid),
    ])

    if ((bew ?? 0) > 0 || (eo ?? 0) > 0 || (hmLinks ?? 0) > 0) continue
    if ((leads ?? 0) > 0 || (auftraege ?? 0) > 0 || (rechnungen ?? 0) > 0) continue

    const { error } = await db.from('kunden').delete().eq('id', kid)
    if (!error) deleted.push(kid)
  }

  return { deleted }
}

/** portal_kunde_ids aller Bewohner an einem Objekt (vor Cascade-Delete). */
export async function collectPortalKundeIdsForObjekt(
  db: SupabaseClient,
  objektId: string
): Promise<string[]> {
  const ids = new Set<string>()

  const { data: einheiten } = await db
    .from('objekt_einheiten')
    .select('id')
    .eq('kunde_objekt_id', objektId)
  const einheitIds = (einheiten ?? []).map((e) => e.id as string).filter(Boolean)

  if (einheitIds.length) {
    const { data: bewohner } = await db
      .from('einheit_bewohner')
      .select('portal_kunde_id')
      .in('objekt_einheit_id', einheitIds)
      .not('portal_kunde_id', 'is', null)

    for (const b of bewohner ?? []) {
      const id = (b.portal_kunde_id as string | null)?.trim()
      if (id) ids.add(id)
    }
  }

  // Hausmeister-Portal-Stubs am Objekt (vor Cascade der Zuordnung)
  const { data: hmZuord } = await db
    .from('hausmeister_objekte')
    .select('org_hausmeister_id')
    .eq('kunde_objekt_id', objektId)
  const hmIds = (hmZuord ?? [])
    .map((r) => String(r.org_hausmeister_id ?? '').trim())
    .filter(Boolean)

  if (hmIds.length) {
    const { data: hms } = await db
      .from('org_hausmeister')
      .select('id, portal_kunde_id')
      .in('id', hmIds)
      .not('portal_kunde_id', 'is', null)

    for (const h of hms ?? []) {
      const pid = (h.portal_kunde_id as string | null)?.trim()
      if (!pid) continue
      // Nur orphan-kandidat, wenn HM keine weiteren Objekte hat
      const { count } = await db
        .from('hausmeister_objekte')
        .select('id', { count: 'exact', head: true })
        .eq('org_hausmeister_id', h.id as string)
        .neq('kunde_objekt_id', objektId)
      if ((count ?? 0) === 0) ids.add(pid)
    }
  }

  return [...ids]
}
