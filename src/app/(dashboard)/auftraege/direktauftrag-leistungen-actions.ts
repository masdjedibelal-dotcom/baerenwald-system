'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { leadIstHavarie } from '@/lib/org/hv-lead-helpers'
import { leadVertragsKundeId } from '@/lib/lead-display-helpers'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { replaceAuftragPositionenFromPosBoard } from '@/app/(dashboard)/auftraege/auftrag-posboard-actions'
import type { PosBoardLine } from '@/lib/posboard/pos-board-line'

/**
 * Direkt beauftragen: Auftrag aus Anfrage mit PosBoard-Leistungen (ohne Angebot, ohne HW).
 * Handwerker-Zuweisung danach im Auftrag unter Leistungen.
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
  if (leadErr || !lead) return { ok: false, message: leadErr?.message ?? 'Anfrage nicht gefunden.' }

  const kundeId = leadVertragsKundeId(lead)
  if (!kundeId) return { ok: false, message: 'Kein Kunde an der Anfrage.' }

  const { data: existing } = await supabaseAdmin
    .from('auftraege')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
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

  const kundenToken = randomBytes(32).toString('hex')
  const insertRow: Record<string, unknown> = {
    angebot_id: null,
    lead_id: leadId,
    kunde_id: kundeId,
    status: 'offen',
    titel,
    notizen: istAkut ? 'Direktauftrag (Akut) — Leistungen ohne Angebot' : 'Direktauftrag — Leistungen ohne Angebot',
    start_datum: null,
    end_datum: null,
    kunden_token: kundenToken,
    fortschritt: 0,
    betreuer_id: user.id,
    erstellt_von: user.id,
  }
  if (istAkut) {
    insertRow.ist_notfall = true
    insertRow.notfall_verguetung = 'aufwand'
  }

  let { data: auftrag, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .insert(insertRow)
    .select('id')
    .single()

  if (aErr && /ist_notfall|notfall_verguetung/i.test(aErr.message)) {
    delete insertRow.ist_notfall
    delete insertRow.notfall_verguetung
    const retry = await supabaseAdmin.from('auftraege').insert(insertRow).select('id').single()
    auftrag = retry.data
    aErr = retry.error
  }

  if (aErr || !auftrag?.id) {
    return { ok: false, message: aErr?.message ?? 'Auftrag konnte nicht angelegt werden.' }
  }

  const auftragId = String(auftrag.id)
  const posRes = await replaceAuftragPositionenFromPosBoard(auftragId, lines)
  if (!posRes.ok) {
    await supabaseAdmin.from('auftraege').delete().eq('id', auftragId)
    return posRes
  }

  const leadUpdate: Record<string, unknown> = {
    vorgang_phase: 'in_bearbeitung',
    updated_at: new Date().toISOString(),
  }
  if (istAkut) {
    leadUpdate.hv_meldung_status = 'notmassnahme'
    leadUpdate.org_freigabe_status = 'nicht_noetig'
    leadUpdate.freigabe_bypass_grund = 'akut'
  }
  await supabaseAdmin.from('leads').update(leadUpdate).eq('id', leadId)

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz',
    titel: 'Direktauftrag angelegt',
    beschreibung: `${lines.length} Leistung${lines.length === 1 ? '' : 'en'} — Handwerker unter Leistungen zuweisen.`,
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
      const { data: hv } = await supabaseAdmin
        .from('kunden')
        .select('id, name, email, org_anzeigename, portal_modus')
        .eq('id', kundeId)
        .maybeSingle()
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

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/auftraege')
  revalidatePath('/vorgaenge')
  return { ok: true, auftragId }
}
