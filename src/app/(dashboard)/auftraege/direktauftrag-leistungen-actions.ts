'use server'

import { revalidateAuftragDetail, revalidateLeadDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { leadIstHavarie } from '@/lib/org/hv-lead-helpers'
import { leadVertragsKundeId } from '@/lib/lead-display-helpers'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { createAngebot } from '@/app/(dashboard)/angebote/actions'
import { acceptAngebotAndCreateAuftrag } from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { posBoardLinesToAngebotPositionen } from '@/lib/posboard/pos-board-line'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import type { PosBoardLine } from '@/lib/posboard/pos-board-line'

/**
 * Direkt beauftragen: Angebot aus den Leistungen anlegen und sofort annehmen (ohne Kunden-Mail).
 * Partner danach über „Einsatz“ im Auftrag.
 */
export async function createDirektauftragMitLeistungen(input: {
  leadId: string
  positionen: PosBoardLine[]
  titel?: string | null
}): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const leadId = input.leadId?.trim()
  if (!leadId) return { ok: false, message: 'Anfrage fehlt.' }

  const lines = (input.positionen ?? []).filter((l) => l.name?.trim())
  if (!lines.length) {
    return { ok: false, message: 'Mindestens eine Leistung mit Bezeichnung erforderlich.' }
  }

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from('leads')
    .select(
      'id, kunde_id, auftraggeber_kunde_id, situation, funnel_daten, freigabe_bypass_grund, melder_einheit, bereiche, hv_meldung_status'
    )
    .eq('id', leadId)
    .maybeSingle()
  if (leadErr) logDbError('app/auftraege/direktauftrag-leistungen-actions:leads', leadErr)
  if (leadErr || !lead) return { ok: false, message: leadErr?.message ?? 'Anfrage nicht gefunden.' }

  const kundeId = leadVertragsKundeId(lead)
  if (!kundeId) return { ok: false, message: 'Kein Kunde an der Anfrage.' }

  const { data: existing, error: error2 } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error2) logDbError('app/auftraege/direktauftrag-leistungen-actions:auftraege', error2)
  if (existing?.id) {
    return {
      ok: false,
      message: 'Zu dieser Anfrage existiert bereits ein Auftrag.',
    }
  }

  const istAkut = leadIstHavarie(lead)
  const gewerk =
    Array.isArray(lead.bereiche) && lead.bereiche[0]
      ? String(lead.bereiche[0]).trim()
      : ''
  const titel =
    input.titel?.trim() ||
    (istAkut
      ? `Direktauftrag — ${String(lead.melder_einheit ?? (gewerk || 'Einsatz')).trim() || 'Einsatz'}`
      : `Direktauftrag${gewerk ? ` — ${gewerk}` : ''}`
    ).slice(0, 240)

  // Flow-Vereinfachung 30.09.2026: ein Weg zum Auftrag. Direktauftrag = Angebot mit den Leistungen,
  // sofort angenommen (ohne Kunden-Mail). So hat jeder Auftrag ein Angebot — Summen, Rechnung und
  // Portal laufen über dieselbe Kette.
  const positionen = posBoardLinesToAngebotPositionen(lines)
  const summen = summenAusPositionen(positionen, 19)
  const angebotRes = await createAngebot(
    {
      lead_id: leadId,
      kunde_id: kundeId,
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: istAkut ? 'Direktauftrag (Akut)' : 'Direktauftrag',
      leistungsumfang: titel,
    },
    { asSystem: true }
  )
  if (!angebotRes.ok) return angebotRes

  const annahme = await acceptAngebotAndCreateAuftrag(angebotRes.id, {
    start_datum: new Date().toISOString().slice(0, 10),
    end_datum: null,
    send_kunden_email: false,
    // Wie bisher beim Direktauftrag: keine Freigabe-Prüfung; Akut-Bypass setzt der Lead-Update unten
    asSystem: true,
  })
  if (!annahme.ok) return annahme
  const auftragId = annahme.auftragId

  const auftragPatch: Record<string, unknown> = { titel, betreuer_id: user.id }
  if (istAkut) {
    auftragPatch.ist_notfall = true
    auftragPatch.notfall_verguetung = 'aufwand'
  }
  const { error: patchErr } = await supabaseAdmin.from('auftraege').update(auftragPatch).eq('id', auftragId)
  if (patchErr) logDbError('app/auftraege/direktauftrag-leistungen-actions:auftraege', patchErr)

  const leadUpdate: Record<string, unknown> = {
    vorgang_phase: 'in_bearbeitung',
    updated_at: new Date().toISOString(),
  }
  if (istAkut) {
    leadUpdate.hv_meldung_status = 'notmassnahme'
    leadUpdate.org_freigabe_status = 'nicht_noetig'
    leadUpdate.freigabe_bypass_grund = 'akut'
  }
  const { error: __dbErr2 } = await supabaseAdmin.from('leads').update(leadUpdate).eq('id', leadId)
  if (__dbErr2) logDbError('app/auftraege/direktauftrag-leistungen-actions:leads', __dbErr2)

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz',
    titel: 'Direktauftrag angelegt',
    beschreibung: `${lines.length} Leistung${lines.length === 1 ? '' : 'en'}. Partner über „Einsatz“ beauftragen.`,
    erstellt_von: user.id,
    sichtbar_fuer_kunde: false,
  })

  try {
    const { spiegelLeadBefundNachAuftrag } = await import('@/lib/org/spiegel-lead-befund')
    const sp = await spiegelLeadBefundNachAuftrag({ leadId, auftragId })
    if (!sp.ok) console.warn('[createDirektauftragMitLeistungen] befund-spiegel:', sp.message)
  } catch (e) {
    console.warn('[createDirektauftragMitLeistungen] befund-spiegel:', e)
  }

  // Informative Direktauftrag-Mail nur bei Akut-Bypass ohne vorherige HV-Aktion.
  // Nach „Direkt Bärenwald“ / „Hausmeister“ kommt die Portal-Mail „Wir kümmern uns …“.
  const { hvHatBereitsMeldungGewaehlt } = await import(
    '@/lib/email/meldung-mail-templates'
  )
  if (istAkut && !hvHatBereitsMeldungGewaehlt(lead.hv_meldung_status)) {
    try {
      const { mailOrgNotfallDirektInfo } = await import('@/lib/email/meldung-mail-templates')
      const { sendMail } = await import('@/lib/mail-service')
      const { getMailBranding } = await import('@/lib/get-mail-branding')
      const { buildPortalLoginLink } = await import('@/lib/portal-utils')
      const branding = await getMailBranding(supabaseAdmin)
      const { data: hv, error } = await supabaseAdmin
        .from('kunden')
        .select('id, name, email, org_anzeigename, portal_modus')
        .eq('id', kundeId)
        .maybeSingle()
      if (error) logDbError('app/auftraege/direktauftrag-leistungen-actions:kunden', error)
      const email = hv?.email?.trim()
      if (email && hv?.portal_modus === 'organisation') {
        const orgName =
          hv.org_anzeigename?.trim() || hv.name?.trim() || 'Auftraggeber'
        const tpl = mailOrgNotfallDirektInfo(
          {
            orgName,
            objektTitel: String(lead.melder_einheit ?? titel),
            portalLink: buildPortalLoginLink(),
          },
          branding
        )
        await sendMail({
          typ: 'org_notfall_info',
          an: email,
          anName: orgName,
          betreff: tpl.betreff,
          html: tpl.html,
          kundeId,
          leadId,
          auftragId,
        })
      }
    } catch (e) {
      console.warn('[createDirektauftragMitLeistungen] HV-Mail:', e)
    }
  }

  try {
    const { notifyPortalAuftragBestaetigtFromCrm } = await import(
      '@/lib/portal/notify-portal-auftrag-bestaetigt'
    )
    await notifyPortalAuftragBestaetigtFromCrm({
      leadId,
      auftragId,
      titel,
    })
  } catch (e) {
    console.warn('[createDirektauftragMitLeistungen] Portal-Notify:', e)
  }

  revalidateAuftragDetail(auftragId)
  revalidateLeadDetail(leadId)
  return { ok: true, auftragId }
}
