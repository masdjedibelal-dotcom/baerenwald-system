import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailOrgFreigabeAngefordert } from '@/lib/email/meldung-mail-templates'
import { sendMail } from '@/lib/mail-service'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import type { Kunde, Lead, LeadAnlass, LeadErfassungVon, OrgFreigabeStatus } from '@/lib/types'

type OrgKundePick = Pick<
  Kunde,
  'id' | 'name' | 'email' | 'org_anzeigename' | 'portal_modus' | 'freigabe_modus' | 'freigabe_schwelle_eur' | 'notfall_direkt'
>

type LeadPick = Pick<
  Lead,
  | 'id'
  | 'auftraggeber_kunde_id'
  | 'kunde_id'
  | 'situation'
  | 'funnel_daten'
  | 'org_freigabe_status'
  | 'kunde_objekt_id'
  | 'erfassung_von'
  | 'anlass'
>

function funnelKategorie(funnelDaten: unknown): string | null {
  if (!funnelDaten || typeof funnelDaten !== 'object') return null
  const kat = (funnelDaten as { melde_kategorie?: unknown }).melde_kategorie
  return typeof kat === 'string' ? kat : null
}

export function leadIstNotfall(lead: Pick<Lead, 'situation' | 'funnel_daten'>): boolean {
  if (lead.situation === 'notfall') return true
  return funnelKategorie(lead.funnel_daten) === 'notfall'
}

/** Org-Freigabe nur bei Mieter-Schadenmeldung (Meldeformular), nicht HV/CRM. */
export function leadIstMieterSchadenmeldung(lead: {
  erfassung_von?: LeadErfassungVon | string | null
  anlass?: LeadAnlass | string | null
}): boolean {
  if ((lead.erfassung_von ?? '').trim() !== 'melder') return false
  const anlass = (lead.anlass ?? '').trim()
  return !anlass || anlass === 'meldung'
}

export function orgFreigabeErforderlich(
  org: OrgKundePick | null | undefined,
  lead: LeadPick,
  betragEur: number,
  opts?: { folgearbeit?: boolean }
): boolean {
  if (!org || org.portal_modus !== 'organisation') return false
  if (!resolveOrgKundeIdFuerLead(lead)) return false
  if (org.freigabe_modus !== 'freigabe') return false
  if (
    !opts?.folgearbeit &&
    leadIstMieterSchadenmeldung(lead) &&
    org.notfall_direkt !== false &&
    leadIstNotfall(lead)
  ) {
    return false
  }

  const schwelle = org.freigabe_schwelle_eur
  if (schwelle == null || Number(schwelle) <= 0) return true
  return betragEur > Number(schwelle)
}

export function resolveOrgKundeIdFuerLead(lead: LeadPick): string | null {
  return lead.auftraggeber_kunde_id?.trim() || null
}

async function loadOrgKunde(
  supabase: SupabaseClient,
  orgKundeId: string
): Promise<OrgKundePick | null> {
  const { data } = await supabase
    .from('kunden')
    .select(
      'id, name, email, org_anzeigename, portal_modus, freigabe_modus, freigabe_schwelle_eur, notfall_direkt'
    )
    .eq('id', orgKundeId)
    .maybeSingle()
  return (data as OrgKundePick | null) ?? null
}

async function loadObjektTitel(
  supabase: SupabaseClient,
  objektId: string | null | undefined
): Promise<string> {
  if (!objektId?.trim()) return 'Objekt'
  const { data } = await supabase
    .from('kunden_objekte')
    .select('titel')
    .eq('id', objektId)
    .maybeSingle()
  return String((data as { titel?: string } | null)?.titel ?? 'Objekt').trim() || 'Objekt'
}

function angebotBetragEur(gesamtFix: number | null | undefined, gesamtMax: number | null | undefined): number {
  if (gesamtFix != null && gesamtFix > 0) return gesamtFix
  if (gesamtMax != null && gesamtMax > 0) return gesamtMax
  return 0
}

/** Setzt Org-Freigabe nach Angebotserstellung/-Update; sendet Freigabe-Mail nur bei Mieter-Meldung. */
export async function syncOrgFreigabeNachAngebot(input: {
  leadId: string
  angebotId: string
  betragEur?: number
  gesamtFix?: number | null
  gesamtMax?: number | null
}): Promise<{ ok: true; status: OrgFreigabeStatus } | { ok: false; message: string }> {
  const leadId = input.leadId?.trim()
  const angebotId = input.angebotId?.trim()
  if (!leadId || !angebotId) return { ok: false, message: 'Lead oder Angebot fehlt.' }

  const { data: leadRaw, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select(
      'id, auftraggeber_kunde_id, kunde_id, situation, funnel_daten, org_freigabe_status, kunde_objekt_id, erfassung_von, anlass'
    )
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !leadRaw) return { ok: false, message: leadErr?.message ?? 'Lead nicht gefunden.' }
  const lead = leadRaw as LeadPick

  let orgKundeId = resolveOrgKundeIdFuerLead(lead)
  if (!orgKundeId && lead.kunde_id) {
    const { data: k } = await supabaseAdmin
      .from('kunden')
      .select('id, portal_modus')
      .eq('id', lead.kunde_id)
      .maybeSingle()
    if ((k as { portal_modus?: string } | null)?.portal_modus === 'organisation') {
      orgKundeId = lead.kunde_id
    }
  }
  if (!orgKundeId) return { ok: true, status: (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus }

  const org = await loadOrgKunde(supabaseAdmin, orgKundeId)
  const betrag =
    input.betragEur ??
    angebotBetragEur(input.gesamtFix ?? null, input.gesamtMax ?? null)

  const erforderlich = orgFreigabeErforderlich(org, lead, betrag)
  const aktuell = (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus

  if (!erforderlich) {
    if (aktuell === 'ausstehend') {
      const now = new Date().toISOString()
      await supabaseAdmin
        .from('leads')
        .update({ org_freigabe_status: 'nicht_noetig', updated_at: now })
        .eq('id', leadId)
      return { ok: true, status: 'nicht_noetig' }
    }
    return { ok: true, status: aktuell }
  }

  if (aktuell === 'freigegeben' || aktuell === 'abgelehnt') {
    return { ok: true, status: aktuell }
  }

  if (aktuell === 'ausstehend') {
    return { ok: true, status: 'ausstehend' }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('leads')
    .update({ org_freigabe_status: 'ausstehend', updated_at: now })
    .eq('id', leadId)

  if (updErr) return { ok: false, message: updErr.message }

  await supabaseAdmin.from('org_freigabe_log').insert({
    lead_id: leadId,
    angebot_id: angebotId,
    auftraggeber_kunde_id: orgKundeId,
    aktion: 'angefordert',
    betrag_eur: betrag > 0 ? betrag : null,
    erstellt_von: 'crm',
  })

  const objektTitel = await loadObjektTitel(supabaseAdmin, lead.kunde_objekt_id)
  const orgEmail = org?.email?.trim()
  if (orgEmail) {
    const branding = await getMailBranding(supabaseAdmin)
    const orgName = org?.org_anzeigename?.trim() || org?.name?.trim() || 'Auftraggeber'
    const tpl = mailOrgFreigabeAngefordert(
      {
        orgName,
        objektTitel,
        betragEur: betrag,
        portalLink: buildPortalLoginLink(),
      },
      branding
    )
    void sendMail({
      typ: 'org_freigabe_angefordert',
      an: orgEmail,
      anName: orgName,
      betreff: tpl.betreff,
      html: tpl.html,
      leadId,
      kundeId: orgKundeId,
    })
  }

  return { ok: true, status: 'ausstehend' }
}

/** Org-Freigabe nach Partner-Nachtrag wenn Summe Schwelle überschreitet. */
export async function syncOrgFreigabeNachNachtrag(input: {
  leadId: string
  nachtragBetragEur: number
}): Promise<{ ok: true; status: OrgFreigabeStatus } | { ok: false; message: string }> {
  const leadId = input.leadId?.trim()
  if (!leadId) return { ok: false, message: 'Lead fehlt.' }

  const { data: leadRaw, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select(
      'id, auftraggeber_kunde_id, kunde_id, situation, funnel_daten, org_freigabe_status, kunde_objekt_id, erfassung_von, anlass'
    )
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !leadRaw) return { ok: false, message: leadErr?.message ?? 'Lead nicht gefunden.' }
  const lead = leadRaw as LeadPick

  const orgKundeId = resolveOrgKundeIdFuerLead(lead)
  if (!orgKundeId) return { ok: true, status: (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus }

  const org = await loadOrgKunde(supabaseAdmin, orgKundeId)
  const erforderlich = orgFreigabeErforderlich(org, lead, input.nachtragBetragEur, {
    folgearbeit: true,
  })
  if (!erforderlich) return { ok: true, status: (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus }

  const aktuell = (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus
  if (aktuell === 'abgelehnt') {
    return { ok: true, status: aktuell }
  }

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('leads')
    .update({ org_freigabe_status: 'ausstehend', updated_at: now })
    .eq('id', leadId)

  await supabaseAdmin.from('org_freigabe_log').insert({
    lead_id: leadId,
    auftraggeber_kunde_id: orgKundeId,
    aktion: 'nachtrag_angefordert',
    betrag_eur: input.nachtragBetragEur,
    erstellt_von: 'partner',
  })

  return { ok: true, status: 'ausstehend' }
}
