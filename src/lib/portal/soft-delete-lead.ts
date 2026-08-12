/**
 * CRM: Lead soft-löschen + Portal-Benachrichtigungen entfernen (Shared DB).
 * Plus Hard-Cascade für Kunden-Löschung.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

/** HV- + Portal-Glocke zu diesem Lead entfernen. */
export async function deletePortalNotificationsForLead(
  leadId: string
): Promise<void> {
  const id = leadId.trim()
  if (!id) return

  const [{ error: hvErr }, { error: portalByRefErr }, { error: portalByLinkErr }] =
    await Promise.all([
      supabaseAdmin
        .from('hv_notifications')
        .delete()
        .or(`link.ilike.%id=${id}%,link.ilike.%${id}%`),
      supabaseAdmin.from('portal_notifications').delete().eq('vorgang_ref', id),
      supabaseAdmin
        .from('portal_notifications')
        .delete()
        .ilike('link', `%${id}%`),
    ])

  if (hvErr) console.warn('[deletePortalNotificationsForLead] hv:', hvErr.message)
  if (portalByRefErr)
    console.warn(
      '[deletePortalNotificationsForLead] portal ref:',
      portalByRefErr.message
    )
  if (portalByLinkErr)
    console.warn(
      '[deletePortalNotificationsForLead] portal link:',
      portalByLinkErr.message
    )
}

async function deleteByIds(
  table: string,
  column: string,
  ids: string[]
): Promise<string | null> {
  if (!ids.length) return null
  const { error } = await supabaseAdmin.from(table).delete().in(column, ids)
  return error ? `${table}: ${error.message}` : null
}

/**
 * Soft-Delete: `geloescht_am` setzen. Portal filtert Soft-Deletes aus den Listen.
 * Bezahlte/erledigte Rechnungen blockieren nicht.
 */
export async function softDeleteLeadForPortal(input: {
  leadId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = input.leadId.trim()
  if (!id) return { ok: false, message: 'Anfrage-ID fehlt.' }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id, geloescht_am')
    .eq('id', id)
    .maybeSingle()

  if (leadErr) return { ok: false, message: leadErr.message }
  if (!lead?.id) return { ok: false, message: 'Vorgang nicht gefunden.' }
  if ((lead as { geloescht_am?: string | null }).geloescht_am) {
    await deletePortalNotificationsForLead(id)
    return { ok: true }
  }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ geloescht_am: now, updated_at: now })
    .eq('id', id)

  if (error) return { ok: false, message: error.message }

  await deletePortalNotificationsForLead(id)
  return { ok: true }
}

/**
 * Hard-Delete Lead inkl. Angebote, Aufträge, Rechnungen (auch bezahlt/erledigt).
 * Für Kunden-Löschung — Soft-Delete allein lässt FK auf kunden bestehen.
 */
export async function hardDeleteLeadCascade(
  leadId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = leadId.trim()
  if (!id) return { ok: false, message: 'Anfrage-ID fehlt.' }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (leadErr) return { ok: false, message: leadErr.message }
  if (!lead?.id) return { ok: true }

  const { data: auftraege } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('lead_id', id)
  const auftragIds = (auftraege ?? []).map((a) => a.id as string)

  const { data: angebote } = await supabaseAdmin
    .from('angebote')
    .select('id')
    .eq('lead_id', id)
  const angebotIds = (angebote ?? []).map((a) => a.id as string)

  const rechnungIdSet = new Set<string>()
  if (auftragIds.length) {
    const { data } = await supabaseAdmin
      .from('rechnungen')
      .select('id')
      .in('auftrag_id', auftragIds)
    for (const r of data ?? []) rechnungIdSet.add(String(r.id))
  }
  if (angebotIds.length) {
    const { data } = await supabaseAdmin
      .from('rechnungen')
      .select('id')
      .in('angebot_id', angebotIds)
    for (const r of data ?? []) rechnungIdSet.add(String(r.id))
  }
  // Direkt am Lead hängende Rechnungen
  {
    const { data } = await supabaseAdmin.from('rechnungen').select('id').eq('lead_id', id)
    for (const r of data ?? []) rechnungIdSet.add(String(r.id))
  }
  const rechnungIds = Array.from(rechnungIdSet)

  let positionIds: string[] = []
  if (auftragIds.length) {
    const { data: pos } = await supabaseAdmin
      .from('auftrag_positionen')
      .select('id')
      .in('auftrag_id', auftragIds)
    positionIds = (pos ?? []).map((p) => String(p.id))
  }

  const errors: string[] = []
  // Reihenfolge: Kinder vor Eltern (FK)
  for (const err of [
    await deleteByIds('rechnungen', 'id', rechnungIds),
    positionIds.length
      ? await deleteByIds('position_eintraege', 'position_id', positionIds)
      : null,
    auftragIds.length
      ? await deleteByIds('position_eintraege', 'auftrag_id', auftragIds)
      : null,
    await deleteByIds('partner_positions_anfragen', 'auftrag_id', auftragIds),
    await deleteByIds('auftrag_abnahmeprotokolle', 'auftrag_id', auftragIds),
    await deleteByIds('auftrag_fachdoku_slots', 'auftrag_id', auftragIds),
    await deleteByIds('auftrag_bautagebuch_eintraege', 'auftrag_id', auftragIds),
    await deleteByIds('auftrag_timeline', 'auftrag_id', auftragIds),
    await deleteByIds('auftrag_handwerker', 'auftrag_id', auftragIds),
    await deleteByIds('auftrag_positionen', 'auftrag_id', auftragIds),
    await deleteByIds('kalender_termine', 'auftrag_id', auftragIds),
    await deleteByIds('kalender_termine', 'lead_id', [id]),
    await deleteByIds('ki_anfragen_log', 'lead_id', [id]),
    await deleteByIds('lead_timeline', 'lead_id', [id]),
    await deleteByIds('leads_status_history', 'lead_id', [id]),
    await deleteByIds('angebot_handwerker', 'angebot_id', angebotIds),
    await deleteByIds('angebote', 'id', angebotIds),
    await deleteByIds('auftraege', 'id', auftragIds),
  ]) {
    if (err) {
      // Spalte/Tabelle fehlt → ignorieren (ältere DBs)
      if (/does not exist|relation|schema cache|column/i.test(err)) continue
      errors.push(err)
    }
  }

  await deletePortalNotificationsForLead(id)

  if (errors.length) {
    return { ok: false, message: errors.join('\n') }
  }

  const { error: delLead } = await supabaseAdmin.from('leads').delete().eq('id', id)
  if (delLead) return { ok: false, message: `leads: ${delLead.message}` }
  return { ok: true }
}
