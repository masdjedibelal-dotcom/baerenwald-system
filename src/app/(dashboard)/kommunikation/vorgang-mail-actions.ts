'use server'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { leadVertragsKundeId } from '@/lib/lead-display-helpers'
import type { KommunikationKontextTyp, MailComposeContext } from '@/lib/kommunikation/types'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type VorgangMailIds = {
  kontextTyp: Exclude<KommunikationKontextTyp, 'kunde'>
  leadId?: string | null
  angebotId?: string | null
  auftragId?: string | null
  rechnungId?: string | null
}

/**
 * Kontext für „E-Mail schreiben“ auf einer Vorgangsseite:
 * Empfänger = Vertragskunde (Verwaltung vor Mieter), Vorgang-IDs für E-Mail-Log + Historie.
 */
export async function ladeVorgangMailKontext(
  ids: VorgangMailIds
): Promise<{ ok: true; ctx: MailComposeContext } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }

  let leadId = ids.leadId?.trim() || null
  let angebotId = ids.angebotId?.trim() || null
  let auftragId = ids.auftragId?.trim() || null
  const rechnungId = ids.rechnungId?.trim() || null
  let kundeId: string | null = null

  if (rechnungId) {
    const { data, error } = await supabaseAdmin
      .from('rechnungen')
      .select('kunde_id, auftrag_id, angebot_id')
      .eq('id', rechnungId)
      .maybeSingle()
    if (error) logDbError('kommunikation/vorgang-mail:rechnung', error)
    kundeId = data?.kunde_id ?? null
    auftragId = auftragId || data?.auftrag_id || null
    angebotId = angebotId || data?.angebot_id || null
  }
  if (auftragId) {
    const { data, error } = await supabaseAdmin
      .from('auftraege')
      .select('kunde_id, lead_id, angebot_id')
      .eq('id', auftragId)
      .maybeSingle()
    if (error) logDbError('kommunikation/vorgang-mail:auftrag', error)
    kundeId = kundeId || data?.kunde_id || null
    leadId = leadId || data?.lead_id || null
    angebotId = angebotId || data?.angebot_id || null
  }
  if (angebotId) {
    const { data, error } = await supabaseAdmin
      .from('angebote')
      .select('kunde_id, lead_id')
      .eq('id', angebotId)
      .maybeSingle()
    if (error) logDbError('kommunikation/vorgang-mail:angebot', error)
    kundeId = kundeId || data?.kunde_id || null
    leadId = leadId || data?.lead_id || null
  }

  let kontaktEmail = ''
  let kontaktName = ''
  if (leadId) {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('kunde_id, auftraggeber_kunde_id, kontakt_email, kontakt_name')
      .eq('id', leadId)
      .maybeSingle()
    if (error) logDbError('kommunikation/vorgang-mail:lead', error)
    if (data) {
      kundeId = kundeId || leadVertragsKundeId(data)
      kontaktEmail = String(data.kontakt_email ?? '').trim()
      kontaktName = String(data.kontakt_name ?? '').trim()
    }
  }

  let kunde: { name?: string | null; org_anzeigename?: string | null; email?: string | null; typ?: string | null } | null = null
  if (kundeId) {
    const { data, error } = await supabaseAdmin
      .from('kunden')
      .select('name, org_anzeigename, email, typ')
      .eq('id', kundeId)
      .maybeSingle()
    if (error) logDbError('kommunikation/vorgang-mail:kunde', error)
    kunde = data
  }

  return {
    ok: true,
    ctx: {
      kontextTyp: ids.kontextTyp,
      kundeId: kundeId ?? '',
      kundeName: String(kunde?.org_anzeigename || kunde?.name || kontaktName || '').trim(),
      kundeTyp: kunde?.typ ?? null,
      leadId,
      angebotId,
      auftragId,
      rechnungId,
      defaultTo: String(kunde?.email ?? '').trim() || kontaktEmail,
    },
  }
}

export type VorgangMailZeile = {
  id: string
  richtung: 'gesendet' | 'empfangen'
  betreff: string
  von: string | null
  an: string
  am: string
  status: string
}

/** Alle Mails zum Vorgang (Anfrage + Angebote + Aufträge + Rechnungen) — ohne andere Vorgänge desselben Kunden. */
export async function ladeVorgangMails(ids: VorgangMailIds): Promise<VorgangMailZeile[]> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return []
  const kontext = await ladeVorgangMailKontext(ids)
  if (!kontext.ok) return []
  const leadId = kontext.ctx.leadId
  const angebotIds = new Set<string>([kontext.ctx.angebotId].filter(Boolean) as string[])
  const auftragIds = new Set<string>([kontext.ctx.auftragId].filter(Boolean) as string[])
  const rechnungIds = new Set<string>([kontext.ctx.rechnungId].filter(Boolean) as string[])
  if (leadId) {
    const [ang, auf] = await Promise.all([
      supabaseAdmin.from('angebote').select('id').eq('lead_id', leadId),
      supabaseAdmin.from('auftraege').select('id').eq('lead_id', leadId),
    ])
    for (const r of ang.data ?? []) angebotIds.add(String(r.id))
    for (const r of auf.data ?? []) auftragIds.add(String(r.id))
  }
  if (auftragIds.size) {
    const { data } = await supabaseAdmin.from('rechnungen').select('id').in('auftrag_id', [...auftragIds])
    for (const r of data ?? []) rechnungIds.add(String(r.id))
  }
  const teile = [
    leadId ? `lead_id.eq.${leadId}` : null,
    angebotIds.size ? `angebot_id.in.(${[...angebotIds].join(',')})` : null,
    auftragIds.size ? `auftrag_id.in.(${[...auftragIds].join(',')})` : null,
    rechnungIds.size ? `rechnung_id.in.(${[...rechnungIds].join(',')})` : null,
  ].filter(Boolean) as string[]
  if (!teile.length) return []
  const { data, error } = await supabaseAdmin
    .from('email_log')
    .select('id, richtung, betreff, von_email, an_email, created_at, status, typ')
    .or(teile.join(','))
    .not('typ', 'in', '(intern_hinweis,crm_push,handwerker_anfrage,handwerker_formular,handwerker_portal)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) logDbError('kommunikation/vorgang-mail:liste', error)
  return (data ?? []).map((r) => ({
    id: String(r.id),
    richtung: r.richtung === 'empfangen' ? 'empfangen' : 'gesendet',
    betreff: String(r.betreff ?? '').trim() || '(Kein Betreff)',
    von: (r.von_email as string | null) ?? null,
    an: String(r.an_email ?? ''),
    am: String(r.created_at ?? ''),
    status: String(r.status ?? ''),
  }))
}

/** Inhalt einer Mail zum Lesen. */
export async function ladeMailInhalt(id: string): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data, error } = await supabaseAdmin.from('email_log').select('inhalt_html').eq('id', id).maybeSingle()
  if (error) logDbError('kommunikation/vorgang-mail:inhalt', error)
  if (!data) return { ok: false, message: 'Mail nicht gefunden.' }
  return { ok: true, html: String(data.inhalt_html ?? '') }
}
