/**
 * Org-Freigabe: Berechnung an EINER Stelle, Ergebnis am Angebot persistiert (V2).
 * Objekt überschreibt Org (A5).
 *
 * Einfache Regel (kein Kleinreparatur-Pfad):
 * - Immer Angebot (außer Akut-Direkt ohne Angebot).
 * - Freigabe-System aktiv (freigabe|direkt) + unter Schwelle → keine HV-Freigabe (Info),
 *   Primary „Direkt Auftrag“ im CRM (kein stiller Auto-Accept).
 * - Über Schwelle → Freigabe/Annahme abwarten.
 * - System nicht aktiv → nur Angebot, auf Annahme warten.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import {
  mailOrgFreigabeAngefordert,
  mailOrgAngebotZurInfo,
} from '@/lib/email/meldung-mail-templates'
import { sendMail } from '@/lib/mail-service'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { leadIstHavarie } from '@/lib/org/hv-lead-helpers'
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
  | 'freigabe_bypass_grund'
>

type ObjektFreigabePick = {
  freigabe_schwelle_eur?: number | null
  notfall_direkt?: boolean | null
}

export function leadIstNotfall(
  lead: Pick<Lead, 'situation' | 'funnel_daten' | 'freigabe_bypass_grund'>
): boolean {
  return leadIstHavarie(lead)
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

/** Effektive Freigabe-Regeln: Objekt-Felder überschreiben Org (NULL = erben). */
export function resolveEffektiveFreigabeRegeln(
  org: OrgKundePick | null | undefined,
  objekt?: ObjektFreigabePick | null
): {
  freigabe_modus: string | null | undefined
  freigabe_schwelle_eur: number | null | undefined
  notfall_direkt: boolean | null | undefined
} {
  if (!org) {
    return { freigabe_modus: null, freigabe_schwelle_eur: null, notfall_direkt: null }
  }
  return {
    freigabe_modus: org.freigabe_modus,
    freigabe_schwelle_eur:
      objekt?.freigabe_schwelle_eur != null ? Number(objekt.freigabe_schwelle_eur) : org.freigabe_schwelle_eur,
    notfall_direkt:
      objekt?.notfall_direkt != null ? Boolean(objekt.notfall_direkt) : org.notfall_direkt,
  }
}

export type FreigabeBypassGrund = 'schwelle' | 'akut' | null

/** Warum Freigabe entfällt — für Portal-Info und Auswertung (Q5). */
export function resolveFreigabeBypassGrund(
  org: OrgKundePick | null | undefined,
  lead: LeadPick,
  betragEur: number,
  opts?: { folgearbeit?: boolean; objekt?: ObjektFreigabePick | null }
): FreigabeBypassGrund {
  if (!org || org.portal_modus !== 'organisation') return null
  if (!resolveOrgKundeIdFuerLead(lead)) return null

  const regeln = resolveEffektiveFreigabeRegeln(org, opts?.objekt)
  if (regeln.freigabe_modus !== 'freigabe') return null

  if (
    !opts?.folgearbeit &&
    leadIstMieterSchadenmeldung(lead) &&
    regeln.notfall_direkt !== false &&
    leadIstNotfall(lead)
  ) {
    return 'akut'
  }

  const schwelle = regeln.freigabe_schwelle_eur
  if (schwelle != null && Number(schwelle) > 0 && betragEur <= Number(schwelle)) {
    return 'schwelle'
  }
  return null
}

export function orgFreigabeErforderlich(
  org: OrgKundePick | null | undefined,
  lead: LeadPick,
  betragEur: number,
  opts?: { folgearbeit?: boolean; objekt?: ObjektFreigabePick | null }
): boolean {
  if (!org || org.portal_modus !== 'organisation') return false
  if (!resolveOrgKundeIdFuerLead(lead)) return false

  const regeln = resolveEffektiveFreigabeRegeln(org, opts?.objekt)
  if (regeln.freigabe_modus !== 'freigabe') return false

  return resolveFreigabeBypassGrund(org, lead, betragEur, opts) == null
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

async function loadObjektFreigabe(
  supabase: SupabaseClient,
  objektId: string | null | undefined
): Promise<ObjektFreigabePick | null> {
  if (!objektId?.trim()) return null
  const { data } = await supabase
    .from('kunden_objekte')
    .select('freigabe_schwelle_eur, notfall_direkt')
    .eq('id', objektId)
    .maybeSingle()
  return (data as ObjektFreigabePick | null) ?? null
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

/** Zuletzt freigegebene / angeforderte Summe — Basis für Refreeze nach AG-Korrektur. */
async function loadLetzterFreigegebenerBetrag(leadId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('org_freigabe_log')
    .select('aktion, betrag_eur, created_at')
    .eq('lead_id', leadId)
    .in('aktion', ['freigegeben', 'angefordert'])
    .order('created_at', { ascending: false })
    .limit(30)

  const rows = data ?? []
  const freig = rows.find(
    (r) => r.aktion === 'freigegeben' && r.betrag_eur != null && Number(r.betrag_eur) > 0
  )
  if (freig?.betrag_eur != null) return Number(freig.betrag_eur)
  const anf = rows.find(
    (r) => r.aktion === 'angefordert' && r.betrag_eur != null && Number(r.betrag_eur) > 0
  )
  if (anf?.betrag_eur != null) return Number(anf.betrag_eur)
  return 0
}

async function persistAngebotFreigabeFlag(
  angebotId: string,
  erforderlich: boolean
): Promise<void> {
  const now = new Date().toISOString()
  await supabaseAdmin
    .from('angebote')
    .update({
      org_freigabe_erforderlich: erforderlich,
      org_freigabe_berechnet_at: now,
      updated_at: now,
    })
    .eq('id', angebotId)
}

/** Setzt Org-Freigabe nach Angebotserstellung/-Update; persistiert Flag am Angebot. */
export async function syncOrgFreigabeNachAngebot(input: {
  leadId: string
  angebotId: string
  betragEur?: number
  gesamtFix?: number | null
  gesamtMax?: number | null
}): Promise<
  | { ok: true; status: OrgFreigabeStatus; erforderlich: boolean; autoAuftragId?: string }
  | { ok: false; message: string }
> {
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
  if (!orgKundeId) {
    await persistAngebotFreigabeFlag(angebotId, false)
    return { ok: true, status: (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus, erforderlich: false }
  }

  const org = await loadOrgKunde(supabaseAdmin, orgKundeId)
  const objekt = await loadObjektFreigabe(supabaseAdmin, lead.kunde_objekt_id)
  const betrag =
    input.betragEur ??
    angebotBetragEur(input.gesamtFix ?? null, input.gesamtMax ?? null)

  const erforderlich = orgFreigabeErforderlich(org, lead, betrag, { objekt })
  const bypassGrund = resolveFreigabeBypassGrund(org, lead, betrag, { objekt })
  await persistAngebotFreigabeFlag(angebotId, erforderlich)

  const aktuell = (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus

  // Abgelehnt bleibt eingefroren (wie Nachtrag) — Korrektur öffnet keine neue Freigabe.
  if (aktuell === 'abgelehnt') {
    return { ok: true, status: aktuell, erforderlich }
  }

  // Bereits freigegeben: nur neu öffnen, wenn Betrag über Schwelle UND höher als freigegebene Summe.
  if (aktuell === 'freigegeben') {
    if (erforderlich) {
      const freigegebenBetrag = await loadLetzterFreigegebenerBetrag(leadId)
      if (betrag > freigegebenBetrag) {
        const now = new Date().toISOString()
        const { error: reopenErr } = await supabaseAdmin
          .from('leads')
          .update({
            org_freigabe_status: 'ausstehend',
            freigabe_bypass_grund: null,
            updated_at: now,
          })
          .eq('id', leadId)
        if (reopenErr) return { ok: false, message: reopenErr.message }

        await supabaseAdmin.from('org_freigabe_log').insert({
          lead_id: leadId,
          angebot_id: angebotId,
          auftraggeber_kunde_id: orgKundeId,
          aktion: 'angefordert',
          betrag_eur: betrag > 0 ? betrag : null,
          notiz: 'AG-Korrektur: Betrag über freigegebener Summe — erneute Freigabe',
          erstellt_von: 'crm',
        })

        const objektTitel = await loadObjektTitel(supabaseAdmin, lead.kunde_objekt_id)
        const orgEmail = org?.email?.trim()
        const orgName = org?.org_anzeigename?.trim() || org?.name?.trim() || 'Auftraggeber'
        if (orgEmail) {
          const branding = await getMailBranding(supabaseAdmin)
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

        return { ok: true, status: 'ausstehend', erforderlich: true }
      }
    }
    return { ok: true, status: aktuell, erforderlich }
  }

  const objektTitel = await loadObjektTitel(supabaseAdmin, lead.kunde_objekt_id)
  const orgEmail = org?.email?.trim()
  const orgName = org?.org_anzeigename?.trim() || org?.name?.trim() || 'Auftraggeber'

  if (!erforderlich) {
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('leads')
      .update({
        org_freigabe_status: 'nicht_noetig',
        freigabe_bypass_grund: bypassGrund,
        updated_at: now,
      })
      .eq('id', leadId)

    const regeln = resolveEffektiveFreigabeRegeln(org, objekt)
    // Freigabe/Schwellen-System aktiv? Sonst: nur Angebot, auf Annahme warten (kein Auto-Auftrag).
    const systemAktiv =
      regeln.freigabe_modus === 'freigabe' || regeln.freigabe_modus === 'direkt'
    if (!systemAktiv) {
      return { ok: true, status: 'nicht_noetig', erforderlich: false }
    }

    // Aktiv + unter Schwelle (oder Modus „direkt“): keine HV-Freigabe, nur Info.
    // Auftrag legt der Nutzer per Primary „Direkt Auftrag“ an (kein stiller Auto-Accept).
    await sendOrgAngebotInfoOnce({
      leadId,
      angebotId,
      orgKundeId,
      orgEmail,
      orgName,
      objektTitel,
      betrag,
    })

    return {
      ok: true,
      status: 'nicht_noetig',
      erforderlich: false,
    }
  }

  if (aktuell === 'ausstehend') {
    return { ok: true, status: 'ausstehend', erforderlich: true }
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('leads')
    .update({
      org_freigabe_status: 'ausstehend',
      freigabe_bypass_grund: null,
      updated_at: now,
    })
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

  if (orgEmail) {
    const branding = await getMailBranding(supabaseAdmin)
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

  return { ok: true, status: 'ausstehend', erforderlich: true }
}

async function sendOrgAngebotInfoOnce(input: {
  leadId: string
  angebotId: string
  orgKundeId: string
  orgEmail?: string
  orgName: string
  objektTitel: string
  betrag: number
}): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('org_freigabe_log')
    .select('id')
    .eq('angebot_id', input.angebotId)
    .eq('aktion', 'info_gesendet')
    .limit(1)
    .maybeSingle()
  if (existing?.id) return

  await supabaseAdmin.from('org_freigabe_log').insert({
    lead_id: input.leadId,
    angebot_id: input.angebotId,
    auftraggeber_kunde_id: input.orgKundeId,
    aktion: 'info_gesendet',
    betrag_eur: input.betrag > 0 ? input.betrag : null,
    erstellt_von: 'crm',
  })

  if (!input.orgEmail) return
  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailOrgAngebotZurInfo(
    {
      orgName: input.orgName,
      objektTitel: input.objektTitel,
      betragEur: input.betrag,
      portalLink: buildPortalLoginLink(),
    },
    branding
  )
  void sendMail({
    typ: 'org_angebot_info',
    an: input.orgEmail,
    anName: input.orgName,
    betreff: tpl.betreff,
    html: tpl.html,
    leadId: input.leadId,
    kundeId: input.orgKundeId,
  })
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
  const objekt = await loadObjektFreigabe(supabaseAdmin, lead.kunde_objekt_id)
  const erforderlich = orgFreigabeErforderlich(org, lead, input.nachtragBetragEur, {
    folgearbeit: true,
    objekt,
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

/**
 * CRM: Nach HV-Ablehnung Freigabe erneut anfordern (Pflicht-Kommentar → Log + Mail).
 * Einfacher als Diff „Angebot seit Ablehnung geändert“ — kein Snapshot nötig.
 */
export async function erneutOrgFreigabeAnfordernNachAblehnung(input: {
  leadId: string
  angebotId: string
  anpassungNotiz: string
  betragEur?: number
  gesamtFix?: number | null
  gesamtMax?: number | null
}): Promise<{ ok: true; status: 'ausstehend' } | { ok: false; message: string }> {
  const leadId = input.leadId?.trim()
  const angebotId = input.angebotId?.trim()
  const anpassung = input.anpassungNotiz?.trim() ?? ''
  if (!leadId || !angebotId) return { ok: false, message: 'Lead oder Angebot fehlt.' }
  if (!anpassung) return { ok: false, message: 'Bitte kurz beschreiben, was angepasst wurde.' }

  const { data: leadRaw, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select(
      'id, auftraggeber_kunde_id, kunde_id, situation, funnel_daten, org_freigabe_status, kunde_objekt_id, erfassung_von, anlass'
    )
    .eq('id', leadId)
    .maybeSingle()

  if (leadErr || !leadRaw) return { ok: false, message: leadErr?.message ?? 'Lead nicht gefunden.' }
  const lead = leadRaw as LeadPick

  const aktuell = (lead.org_freigabe_status ?? 'nicht_noetig') as OrgFreigabeStatus
  if (aktuell !== 'abgelehnt') {
    return { ok: false, message: 'Freigabe ist nicht abgelehnt — erneutes Anfordern nicht möglich.' }
  }

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
  if (!orgKundeId) return { ok: false, message: 'Kein Auftraggeber (Organisation) am Vorgang.' }

  const org = await loadOrgKunde(supabaseAdmin, orgKundeId)
  let betrag =
    input.betragEur ??
    angebotBetragEur(input.gesamtFix ?? null, input.gesamtMax ?? null)
  if (!(betrag > 0)) {
    const { data: ang } = await supabaseAdmin
      .from('angebote')
      .select('gesamt_fix, gesamt_max')
      .eq('id', angebotId)
      .maybeSingle()
    const a = ang as { gesamt_fix?: number | null; gesamt_max?: number | null } | null
    betrag = angebotBetragEur(a?.gesamt_fix, a?.gesamt_max)
  }

  const now = new Date().toISOString()
  const { error: updErr } = await supabaseAdmin
    .from('leads')
    .update({
      org_freigabe_status: 'ausstehend',
      freigabe_bypass_grund: null,
      updated_at: now,
    })
    .eq('id', leadId)
  if (updErr) return { ok: false, message: updErr.message }

  const notiz = `erneut angefordert nach Ablehnung: ${anpassung}`
  await supabaseAdmin.from('org_freigabe_log').insert({
    lead_id: leadId,
    angebot_id: angebotId,
    auftraggeber_kunde_id: orgKundeId,
    aktion: 'angefordert',
    betrag_eur: betrag > 0 ? betrag : null,
    notiz,
    erstellt_von: 'crm',
  })

  const objektTitel = await loadObjektTitel(supabaseAdmin, lead.kunde_objekt_id)
  const orgEmail = org?.email?.trim()
  const orgName = org?.org_anzeigename?.trim() || org?.name?.trim() || 'Auftraggeber'
  if (orgEmail) {
    const branding = await getMailBranding(supabaseAdmin)
    const tpl = mailOrgFreigabeAngefordert(
      {
        orgName,
        objektTitel,
        betragEur: betrag,
        portalLink: buildPortalLoginLink(),
        anpassungNotiz: anpassung,
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
