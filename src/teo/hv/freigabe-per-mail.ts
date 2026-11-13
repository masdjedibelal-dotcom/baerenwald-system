import 'server-only'

import { randomBytes } from 'crypto'

import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { crmBasisUrl } from '@/lib/crm-basis-url'
import { logDbError } from '@/lib/errors/log-db-error'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Freigabe über der Grenze per Mail-Link — ohne Arbeitsplatz-Login.
 * Gleiches Muster wie Einsatz annehmen/ablehnen: geheimer Schlüssel je Vorgang,
 * der Link öffnet eine Bestätigungsseite, erst der Klick dort entscheidet
 * (Mail-Scanner öffnen Links automatisch).
 */

export type FreigabeAntwort = 'freigegeben' | 'abgelehnt'

export function verifyFreigabeTokenFormat(token: string): boolean {
  return /^[0-9a-f]{48}$/.test(token)
}

export function freigabeLink(token: string, aktion?: FreigabeAntwort): string {
  return `${crmBasisUrl()}/freigabe/${encodeURIComponent(token)}${aktion ? `?aktion=${aktion}` : ''}`
}

/** Schlüssel des Vorgangs (einmal erzeugt, bleibt gleich — der Status entscheidet, ob er noch wirkt). */
export async function freigabeTokenFuerLead(leadId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('leads').select('freigabe_token').eq('id', leadId).maybeSingle()
  if (error) {
    logDbError('teo/hv/freigabe-per-mail:token-laden', error)
    return null
  }
  const vorhanden = (data as { freigabe_token?: string | null } | null)?.freigabe_token?.trim()
  if (vorhanden && verifyFreigabeTokenFormat(vorhanden)) return vorhanden
  const neu = randomBytes(24).toString('hex')
  const { error: upErr } = await supabaseAdmin.from('leads').update({ freigabe_token: neu }).eq('id', leadId)
  if (upErr) {
    logDbError('teo/hv/freigabe-per-mail:token-speichern', upErr)
    return null
  }
  return neu
}

/** Empfänger der Freigabe-Mail: Haupt-Mail der Verwaltung + Personen mit „darf freigeben“. */
export async function freigabeEmpfaenger(orgKundeId: string, orgEmail?: string | null): Promise<string[]> {
  const liste = new Set<string>()
  const haupt = orgEmail?.trim().toLowerCase()
  if (haupt) liste.add(haupt)
  const { data, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('email')
    .eq('kunde_id', orgKundeId)
    .eq('aktiv', true)
    .eq('darf_freigeben', true)
  if (error) logDbError('teo/hv/freigabe-per-mail:empfaenger', error)
  for (const r of (data ?? []) as { email?: string | null }[]) {
    const e = r.email?.trim().toLowerCase()
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) liste.add(e)
  }
  return [...liste]
}

export type FreigabePerToken = {
  leadId: string
  orgKundeId: string | null
  orgName: string
  status: string
  objektTitel: string
  titel: string
  betragEur: number | null
  angebotsnr: string | null
  pdfUrl: string | null
}

export async function freigabePerToken(token: string): Promise<FreigabePerToken | null> {
  if (!verifyFreigabeTokenFormat(token)) return null
  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, org_freigabe_status, auftraggeber_kunde_id, kunde_id, kunde_objekt_id')
    .eq('freigabe_token', token)
    .maybeSingle()
  if (error) logDbError('teo/hv/freigabe-per-mail:lead', error)
  if (!lead) return null
  const l = lead as {
    id: string
    org_freigabe_status?: string | null
    auftraggeber_kunde_id?: string | null
    kunde_id?: string | null
    kunde_objekt_id?: string | null
  }
  const orgKundeId = l.auftraggeber_kunde_id?.trim() || l.kunde_id?.trim() || null

  const [orgRes, objRes, angRes, logRes] = await Promise.all([
    orgKundeId
      ? supabaseAdmin.from('kunden').select('name, org_anzeigename').eq('id', orgKundeId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    l.kunde_objekt_id
      ? supabaseAdmin.from('kunden_objekte').select('titel, strasse, plz, ort').eq('id', l.kunde_objekt_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('angebote')
      .select('angebotsnr, pdf_url, leistungsumfang, gesendet_kunde_at')
      .eq('lead_id', l.id)
      .not('gesendet_kunde_at', 'is', null)
      .order('gesendet_kunde_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('org_freigabe_log')
      .select('betrag_eur')
      .eq('lead_id', l.id)
      .eq('aktion', 'angefordert')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  for (const r of [orgRes, objRes, angRes, logRes]) if (r.error) logDbError('teo/hv/freigabe-per-mail:details', r.error)

  const org = orgRes.data as { name?: string | null; org_anzeigename?: string | null } | null
  const obj = objRes.data as { titel?: string | null; strasse?: string | null; plz?: string | null; ort?: string | null } | null
  const ang = angRes.data as { angebotsnr?: string | null; pdf_url?: string | null; leistungsumfang?: string | null } | null
  const betrag = (logRes.data as { betrag_eur?: number | null } | null)?.betrag_eur
  const objektTitel =
    obj?.titel?.trim() || [obj?.strasse, [obj?.plz, obj?.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Objekt'

  return {
    leadId: l.id,
    orgKundeId,
    orgName: org?.org_anzeigename?.trim() || org?.name?.trim() || 'Hausverwaltung',
    status: (l.org_freigabe_status ?? '').trim(),
    objektTitel,
    titel: ang?.leistungsumfang?.trim() || 'Angebot',
    betragEur: betrag == null ? null : Number(betrag),
    angebotsnr: ang?.angebotsnr?.trim() || null,
    pdfUrl: ang?.pdf_url && /^https?:\/\//.test(ang.pdf_url) ? ang.pdf_url : null,
  }
}

/** Entscheidung aus dem Mail-Link speichern — gleiche Schritte wie „Freigeben“ im Arbeitsplatz. */
export async function freigabePerTokenEntscheiden(
  token: string,
  aktion: FreigabeAntwort,
  notiz?: string | null
): Promise<{ ok: true; status: FreigabeAntwort } | { ok: false; message: string }> {
  const f = await freigabePerToken(token)
  if (!f) return { ok: false, message: 'Dieser Link ist nicht (mehr) gültig.' }
  if (f.status !== 'ausstehend' && f.status !== 'beschluss_ausstehend') {
    if (f.status === 'freigegeben') return { ok: false, message: 'Dieser Vorgang ist bereits freigegeben.' }
    if (f.status === 'abgelehnt') return { ok: false, message: 'Dieser Vorgang wurde bereits abgelehnt.' }
    return { ok: false, message: 'Für diesen Vorgang ist keine Freigabe offen.' }
  }
  const text = notiz?.trim().slice(0, 1000) || null
  const now = new Date().toISOString()

  // Nur ändern, wenn noch offen (zwei gleichzeitige Klicks → nur einer gewinnt)
  const patch: Record<string, unknown> = {
    org_freigabe_status: aktion,
    beschluss_versammlung_am: null,
    beschluss_protokoll_url: null,
    updated_at: now,
  }
  if (aktion === 'freigegeben') patch.vorgang_phase = 'in_bearbeitung'
  const { data: geaendert, error: updErr } = await supabaseAdmin
    .from('leads')
    .update(patch)
    .eq('id', f.leadId)
    .in('org_freigabe_status', ['ausstehend', 'beschluss_ausstehend'])
    .select('id')
  if (updErr) {
    logDbError('teo/hv/freigabe-per-mail:entscheiden', updErr)
    return { ok: false, message: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' }
  }
  if (!geaendert?.length) return { ok: false, message: 'Dieser Vorgang wurde bereits entschieden.' }

  if (f.orgKundeId) {
    const { error: logErr } = await supabaseAdmin.from('org_freigabe_log').insert({
      lead_id: f.leadId,
      auftraggeber_kunde_id: f.orgKundeId,
      aktion,
      betrag_eur: f.betragEur,
      notiz: text,
      erstellt_von: 'mail-link',
    })
    if (logErr) logDbError('teo/hv/freigabe-per-mail:log', logErr)
  }
  await writeAuditEvent({
    entityType: 'lead',
    entityId: f.leadId,
    aktion: aktion === 'freigegeben' ? 'org_freigabe' : 'org_freigabe_abgelehnt',
    actorRolle: 'hv_mail_link',
    kundeId: f.orgKundeId,
    payload: { betrag_eur: f.betragEur, notiz: text, weg: 'mail-link' },
  })
  const tl = await insertLeadTimelineEvent(supabaseAdmin, {
    lead_id: f.leadId,
    typ: 'org_freigabe',
    titel: aktion === 'freigegeben' ? 'Freigabe erteilt (per E-Mail)' : 'Freigabe abgelehnt (per E-Mail)',
    beschreibung:
      text ||
      (aktion === 'freigegeben'
        ? `${f.orgName} hat über den Link in der E-Mail freigegeben.`
        : `${f.orgName} hat die Freigabe über den Link in der E-Mail abgelehnt.`),
  })
  if (!tl.ok) console.warn('[freigabe-per-mail] timeline', tl.message)

  // Team informieren, Bestätigung an die Verwaltung, nach Freigabe Auftrag anlegen (wie Arbeitsplatz-Weg)
  try {
    const { notifyOrgFreigabeErgebnis } = await import('@/lib/org/org-mail-notify')
    const r = await notifyOrgFreigabeErgebnis({ leadId: f.leadId, aktion, notiz: text, betragEur: f.betragEur })
    if (!r.ok) console.warn('[freigabe-per-mail] notify', r.message)
  } catch (e) {
    console.warn('[freigabe-per-mail] notify', e)
  }
  return { ok: true, status: aktion }
}
