import type { SupabaseClient } from '@supabase/supabase-js'
import { isLegacyDemoLead } from '@/lib/legacy-demo-data'

const SENTINEL = '00000000-0000-0000-0000-000000000001'

/** Alle Zeilen einer Tabelle mit UUID-Spalte `id` löschen. */
async function wipeTable(admin: SupabaseClient, table: string): Promise<string | null> {
  const { error } = await admin.from(table).delete().neq('id', SENTINEL)
  if (error) return `${table}: ${error.message}`
  return null
}

const TRANSACTIONAL_TABLES = [
  'datenschutz_aufschub',
  'datenschutz_anfragen',
  'datenschutz_loeschlog',
  'vorab_formulare',
  'leads_status_history',
  'kalender_termine',
  'email_logs',
  'angebot_handwerker',
  'rechnungen',
  'formular_eintraege',
  'auftrag_timeline',
  'nachtraege',
  'punch_list',
  'vor_baubeginn_protokolle',
  'baustopps',
  'buergschaften',
  'einbehalte',
  'eingangsrechnungen',
  'auftrag_handwerker',
  'auftraege',
  'angebote',
  'leads',
  'kunden',
] as const

/**
 * Löscht CRM-Transaktionsdaten (Leads, Aufträge, Kunden, …).
 * Stammdaten (Gewerke, Handwerker, Formular-Vorlagen, Einstellungen) bleiben erhalten.
 * Es werden keine Ersatz-/Demo-Datensätze angelegt.
 */
export async function wipeCrmTransactionalData(
  admin: SupabaseClient
): Promise<{ ok: true } | { ok: false; message: string }> {
  const errors: string[] = []
  for (const t of TRANSACTIONAL_TABLES) {
    const err = await wipeTable(admin, t)
    if (err) errors.push(err)
  }

  if (errors.length) {
    return { ok: false, message: errors.join('\n') }
  }

  return { ok: true }
}

type LeadRow = {
  id: string
  kunde_id: string | null
  auftraggeber_kunde_id?: string | null
  kontakt_email: string | null
  kontakt_name: string | null
  kontakt_telefon: string | null
  notizen: string | null
  funnel_daten: unknown
  kunden?: { email?: string | null; name?: string | null } | null
}

async function deleteByIds(
  admin: SupabaseClient,
  table: string,
  column: string,
  ids: string[]
): Promise<string | null> {
  if (!ids.length) return null
  const { error } = await admin.from(table).delete().in(column, ids)
  return error ? `${table}: ${error.message}` : null
}

/**
 * Löscht Demo-/E2E-Leads inkl. verknüpfter Angebote, Aufträge und Rechnungen.
 */
export async function purgeLegacyDemoRecords(
  admin: SupabaseClient
): Promise<{ ok: true; deletedLeads: number; deletedKunden: number } | { ok: false; message: string }> {
  const { data: rows, error: loadErr } = await admin
    .from('leads')
    .select(
      'id, kunde_id, auftraggeber_kunde_id, kontakt_email, kontakt_name, kontakt_telefon, notizen, funnel_daten, kunden!kunde_id(email, name)'
    )

  if (loadErr) {
    return { ok: false, message: loadErr.message }
  }

  const demoLeads = (rows ?? []).filter((r) => isLegacyDemoLead(r as LeadRow))
  const leadIds = demoLeads.map((r) => r.id)
  const kundeIdsFromLeads = Array.from(
    new Set([
      ...demoLeads.map((r) => r.kunde_id).filter((id): id is string => !!id),
      ...demoLeads
        .map((r) => (r as LeadRow).auftraggeber_kunde_id)
        .filter((id): id is string => !!id),
    ])
  )

  const { data: kundenRows } = await admin.from('kunden').select('id, name, email')
  const demoKundenOnly = (kundenRows ?? []).filter((k) =>
    isLegacyDemoLead({
      kontakt_email: k.email,
      kontakt_name: k.name,
      kontakt_telefon: null,
      notizen: null,
      funnel_daten: null,
    })
  )
  const demoKundeIds = Array.from(
    new Set([...kundeIdsFromLeads, ...demoKundenOnly.map((k) => k.id)])
  )

  if (!leadIds.length && !demoKundeIds.length) {
    return { ok: true, deletedLeads: 0, deletedKunden: 0 }
  }

  const errors: string[] = []

  let auftragIds: string[] = []
  if (leadIds.length || demoKundeIds.length) {
    let q = admin.from('auftraege').select('id')
    if (leadIds.length && demoKundeIds.length) {
      q = q.or(`lead_id.in.(${leadIds.join(',')}),kunde_id.in.(${demoKundeIds.join(',')})`)
    } else if (leadIds.length) {
      q = q.in('lead_id', leadIds)
    } else {
      q = q.in('kunde_id', demoKundeIds)
    }
    const { data: aufRows, error: aufLoadErr } = await q
    if (aufLoadErr) errors.push(`auftraege/load: ${aufLoadErr.message}`)
    else auftragIds = (aufRows ?? []).map((r) => r.id)
  }

  for (const err of [
    await deleteByIds(admin, 'rechnungen', 'auftrag_id', auftragIds),
    await deleteByIds(admin, 'rechnungen', 'kunde_id', demoKundeIds),
    await deleteByIds(admin, 'kalender_termine', 'auftrag_id', auftragIds),
    await deleteByIds(admin, 'kalender_termine', 'lead_id', leadIds),
    await deleteByIds(admin, 'ki_anfragen_log', 'lead_id', leadIds),
    await deleteByIds(admin, 'angebote', 'lead_id', leadIds),
    await deleteByIds(admin, 'angebote', 'kunde_id', demoKundeIds),
    await deleteByIds(admin, 'auftraege', 'id', auftragIds),
    await deleteByIds(admin, 'leads', 'id', leadIds),
  ]) {
    if (err) errors.push(err)
  }

  let deletedKunden = 0
  for (const kid of demoKundeIds) {
    const { count } = await admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .or(`kunde_id.eq.${kid},auftraggeber_kunde_id.eq.${kid}`)
    if ((count ?? 0) > 0) continue

    const { error: kDel } = await admin.from('kunden').delete().eq('id', kid)
    if (kDel) errors.push(`kunden ${kid}: ${kDel.message}`)
    else deletedKunden += 1
  }

  if (errors.length) {
    return { ok: false, message: errors.join('\n') }
  }

  return { ok: true, deletedLeads: leadIds.length, deletedKunden }
}
