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
  kontakt_email: string | null
  kontakt_name: string | null
  kontakt_telefon: string | null
  notizen: string | null
  funnel_daten: unknown
  kunden?: { email?: string | null; name?: string | null } | null
}

/**
 * Löscht nur erkannte Alt-Demo-Leads (example.com, Muster-Namen, …) und verwaiste Demo-Kunden.
 */
export async function purgeLegacyDemoRecords(
  admin: SupabaseClient
): Promise<{ ok: true; deletedLeads: number; deletedKunden: number } | { ok: false; message: string }> {
  const { data: rows, error: loadErr } = await admin
    .from('leads')
    .select(
      'id, kunde_id, kontakt_email, kontakt_name, kontakt_telefon, notizen, funnel_daten, kunden!kunde_id(email, name)'
    )

  if (loadErr) {
    return { ok: false, message: loadErr.message }
  }

  const demoLeads = (rows ?? []).filter((r) => isLegacyDemoLead(r as LeadRow))
  const leadIds = demoLeads.map((r) => r.id)
  const kundeIdsFromLeads = Array.from(
    new Set(demoLeads.map((r) => r.kunde_id).filter((id): id is string => !!id))
  )

  if (!leadIds.length && !kundeIdsFromLeads.length) {
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
    if (!demoKundenOnly.length) {
      return { ok: true, deletedLeads: 0, deletedKunden: 0 }
    }
    const { error: kErr } = await admin
      .from('kunden')
      .delete()
      .in(
        'id',
        demoKundenOnly.map((k) => k.id)
      )
    if (kErr) return { ok: false, message: `kunden: ${kErr.message}` }
    return { ok: true, deletedLeads: 0, deletedKunden: demoKundenOnly.length }
  }

  const errors: string[] = []

  if (leadIds.length) {
    const { error: angErr } = await admin.from('angebote').delete().in('lead_id', leadIds)
    if (angErr) errors.push(`angebote: ${angErr.message}`)

    const { error: leadErr } = await admin.from('leads').delete().in('id', leadIds)
    if (leadErr) errors.push(`leads: ${leadErr.message}`)
  }

  let deletedKunden = 0
  for (const kid of kundeIdsFromLeads) {
    const { count } = await admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('kunde_id', kid)
    if ((count ?? 0) > 0) continue

    const { data: kunde } = await admin.from('kunden').select('id, name, email').eq('id', kid).maybeSingle()
    if (!kunde || !isLegacyDemoLead({
      kontakt_email: kunde.email,
      kontakt_name: kunde.name,
      kontakt_telefon: null,
      notizen: null,
      funnel_daten: null,
    })) {
      continue
    }

    const { error: kDel } = await admin.from('kunden').delete().eq('id', kid)
    if (kDel) errors.push(`kunden ${kid}: ${kDel.message}`)
    else deletedKunden += 1
  }

  if (errors.length) {
    return { ok: false, message: errors.join('\n') }
  }

  return { ok: true, deletedLeads: leadIds.length, deletedKunden }
}
