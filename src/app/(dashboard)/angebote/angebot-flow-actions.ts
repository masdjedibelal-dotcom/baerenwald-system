'use server'

<<<<<<< Updated upstream
import { revalidateAngebotDetail, revalidateAuftragDetail, revalidateLeadDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
=======
import { logDbError } from '@/lib/errors/log-db-error'
import { revalidatePath } from 'next/cache'
>>>>>>> Stashed changes
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { sendAngebotToKunde, createAuftragFromAngebot, sendAngebotNachfassManuell, markLeadAngeboteAbgelehnt } from '@/app/(dashboard)/angebote/actions'
import { erledigeInterneNachfassTodos } from '@/lib/kalender-auto-termine'
import { addDaysYmd, heuteYmd } from '@/lib/angebot-einfach'
import { isKundeAblehnungGrund, KUNDE_ABLEHNUNG_GRUND_LABELS } from '@/lib/angebote/ablehnung-labels'
import {
  angebotDarfDirektAuftragOhneHvFreigabe,
  resolveAnfrageFreigabeRegeln,
} from '@/lib/anfragen/anfrage-akut-schwelle'
import { writeLeadStatus } from '@/lib/status/write-lead-status'
import {
  writeAngebotStatus,
  writeAngebotStatusEinfach,
} from '@/lib/status/write-angebot-status'

async function insertAngebotTimeline(
  leadId: string | null,
  angebotId: string,
  titel: string,
  beschreibung?: string | null
) {
  if (!leadId) return
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error: __dbErr1 } = await supabase.from('lead_timeline').insert({
    lead_id: leadId,
    angebot_id: angebotId,
    typ: 'angebot',
    titel,
    beschreibung: beschreibung ?? null,
    erstellt_von: user?.id ?? null,
  })
  if (__dbErr1) logDbError('app/angebote/angebot-flow-actions:lead_timeline', __dbErr1)
}

export async function sendAngebotEinfach(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sent = await sendAngebotToKunde(angebotId)
  if (!sent.ok) return sent

  const now = new Date().toISOString()
  const gueltig = addDaysYmd(heuteYmd(), 30)
  const supabase = createClient()
  const { data: row, error } = await supabase
    .from('angebote')
    .select('lead_id, kunden(email, name)')
    .eq('id', angebotId)
    .maybeSingle()
  if (error) logDbError('app/angebote/angebot-flow-actions:angebote', error)

<<<<<<< Updated upstream
  const { error: error2 } = await writeAngebotStatus(supabase, angebotId, 'gesendet_kunde', {
    status_einfach: 'gesendet',
    gesendet_am: now,
    gesendet_kunde_at: now,
    gueltig_bis: gueltig,
  })
=======
  const { error: error2 } = await supabase
    .from('angebote')
    .update({
      status_einfach: 'gesendet',
      status: 'gesendet_kunde',
      gesendet_am: now,
      gesendet_kunde_at: now,
      gueltig_bis: gueltig,
      updated_at: now,
    })
    .eq('id', angebotId)
>>>>>>> Stashed changes
  if (error2) logDbError('app/angebote/angebot-flow-actions:angebote', error2)
  if (error2) return { ok: false, message: error2.message }

  revalidateAngebotDetail(angebotId)
  if (row?.lead_id) revalidateLeadDetail(row.lead_id)
  return { ok: true }
}

export async function sendAngebotNachfassManuellAction(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  return sendAngebotNachfassManuell(angebotId)
}

export async function resendAngebotEinfach(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sent = await sendAngebotToKunde(angebotId)
  if (!sent.ok) return sent

  const now = new Date().toISOString()
  const gueltig = addDaysYmd(heuteYmd(), 30)
  const supabase = createClient()
  const { data: row, error } = await supabase
    .from('angebote')
    .select('lead_id, kunden(email)')
    .eq('id', angebotId)
    .maybeSingle()
  if (error) logDbError('app/angebote/angebot-flow-actions:angebote', error)

<<<<<<< Updated upstream
  const { error: error2 } = await writeAngebotStatusEinfach(supabase, angebotId, 'gesendet', {
    gesendet_am: now,
    gesendet_kunde_at: now,
    gueltig_bis: gueltig,
    nachgefasst_am: null,
  })
=======
  const { error: error2 } = await supabase
    .from('angebote')
    .update({
      status_einfach: 'gesendet',
      gesendet_am: now,
      gesendet_kunde_at: now,
      gueltig_bis: gueltig,
      nachgefasst_am: null,
      updated_at: now,
    })
    .eq('id', angebotId)
>>>>>>> Stashed changes
  if (error2) logDbError('app/angebote/angebot-flow-actions:angebote', error2)
  if (error2) return { ok: false, message: error2.message }

  revalidateAngebotDetail(angebotId)
  if (row?.lead_id) revalidateLeadDetail(row.lead_id)
  return { ok: true }
}

export async function markAngebotAbgelehntEinfach(input: {
  angebotId: string
  grund: string
  notiz?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isKundeAblehnungGrund(input.grund)) {
    return { ok: false, message: 'Ungültiger Ablehnungsgrund.' }
  }
  const id = input.angebotId?.trim()
  if (!id) return { ok: false, message: 'Angebot nicht gefunden.' }

  const auth = createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: row, error: loadErr } = await supabaseAdmin
    .from('angebote')
    .select('lead_id')
    .eq('id', id)
    .maybeSingle()
  if (loadErr) logDbError('app/angebote/angebot-flow-actions:angebote', loadErr)
  if (loadErr) return { ok: false, message: loadErr.message }
  if (!row) return { ok: false, message: 'Angebot nicht gefunden.' }

  const grundLabel = KUNDE_ABLEHNUNG_GRUND_LABELS[input.grund] ?? input.grund
  const now = new Date().toISOString()

<<<<<<< Updated upstream
  const { error: error2 } = await writeAngebotStatus(supabaseAdmin, id, 'abgelehnt', {
    status_einfach: 'abgelehnt',
    ablehnung_grund: input.grund,
    ablehnung_notiz: input.notiz?.trim() || null,
  })
=======
  const { error: error2 } = await supabaseAdmin
    .from('angebote')
    .update({
      status_einfach: 'abgelehnt',
      status: 'abgelehnt',
      ablehnung_grund: input.grund,
      ablehnung_notiz: input.notiz?.trim() || null,
      updated_at: now,
    })
    .eq('id', id)
>>>>>>> Stashed changes
  if (error2) logDbError('app/angebote/angebot-flow-actions:angebote', error2)
  if (error2) return { ok: false, message: error2.message }

  if (row.lead_id) {
    await erledigeInterneNachfassTodos(row.lead_id)
    const { error: __dbErr2 } = await writeLeadStatus(supabaseAdmin, row.lead_id, 'abgebrochen')
    if (__dbErr2) logDbError('app/angebote/angebot-flow-actions:leads', __dbErr2)
    const { error: __dbErr3 } = await supabaseAdmin
      .from('leads')
      .update({
        org_freigabe_status: 'abgelehnt',
        updated_at: now,
      })
      .eq('id', row.lead_id)
      .in('org_freigabe_status', ['ausstehend', 'beschluss_ausstehend', 'freigegeben'])
    if (__dbErr3) logDbError('app/angebote/angebot-flow-actions:leads', __dbErr3)
    await insertAngebotTimeline(
      row.lead_id,
      id,
      'Angebot abgelehnt',
      grundLabel + (input.notiz?.trim() ? ` — ${input.notiz.trim()}` : '')
    )
    revalidateLeadDetail(row.lead_id)
  }

  revalidateAngebotDetail(id)
  return { ok: true }
}

export type AcceptAngebotAndCreateAuftragOptions = {
  start_datum?: string | null
  end_datum?: string | null
  send_kunden_email?: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
  /**
   * Unter HV-Schwelle: keine Kunden-Bestätigungsmail, Lead ohne Freigabe
   * (`nicht_noetig` + Bypass schwelle).
   */
  direktOhneHvFreigabe?: boolean
}

export async function acceptAngebotAndCreateAuftrag(
  angebotId: string,
  opts?: AcceptAngebotAndCreateAuftragOptions & { asSystem?: boolean }
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const id = angebotId?.trim()
  if (!id) return { ok: false, message: 'Angebot nicht gefunden.' }

  /*
   * Detail-Seite lädt oft über createClient (Admin bei RLS-Problemen).
   * Annahme/Direktauftrag darf denselben Datensatz nicht per User-Client „nicht finden“.
   */
  if (!opts?.asSystem) {
    const gate = await requireStaffAndServiceRole()
    if (!gate.ok) return { ok: false, message: gate.message }
  }

  const { data: ang, error: angErr } = await supabaseAdmin
    .from('angebote')
    .select('id, lead_id, status, gesamt_min, gesamt_max, gesamt_fix')
    .eq('id', id)
    .maybeSingle()
  if (angErr) logDbError('app/angebote/angebot-flow-actions:angebote', angErr)

  if (angErr) return { ok: false, message: angErr.message }
  if (!ang) return { ok: false, message: 'Angebot nicht gefunden.' }

  const direktOhneHv = Boolean(opts?.direktOhneHvFreigabe)
  if (direktOhneHv) {
    const leadIdCheck = (ang.lead_id as string | null)?.trim() ?? ''
    if (!leadIdCheck) {
      return { ok: false, message: 'Direkt Auftrag ohne Lead nicht möglich.' }
    }
    const { data: leadRow, error } = await supabaseAdmin
      .from('leads')
      .select('id, auftraggeber_kunde_id, kunde_objekt_id')
      .eq('id', leadIdCheck)
      .maybeSingle()
    if (error) logDbError('app/angebote/angebot-flow-actions:leads', error)
    const orgId = (leadRow as { auftraggeber_kunde_id?: string | null } | null)
      ?.auftraggeber_kunde_id?.trim()
    if (!orgId) {
      return {
        ok: false,
        message: 'Direkt Auftrag ohne HV-Freigabe nur bei Organisations-Auftraggeber.',
      }
    }
    const { data: org, error: error2 } = await supabaseAdmin
      .from('kunden')
      .select('portal_modus, freigabe_modus, freigabe_schwelle_eur, notfall_direkt')
      .eq('id', orgId)
      .maybeSingle()
    if (error2) logDbError('app/angebote/angebot-flow-actions:kunden', error2)
    const objektId = (leadRow as { kunde_objekt_id?: string | null } | null)
      ?.kunde_objekt_id?.trim()
    const { data: objekt } = objektId
      ? await supabaseAdmin
          .from('kunden_objekte')
          .select('freigabe_schwelle_eur, notfall_direkt')
          .eq('id', objektId)
          .maybeSingle()
      : { data: null }
    const regeln = resolveAnfrageFreigabeRegeln({
      portalModus: (org as { portal_modus?: string | null } | null)?.portal_modus,
      freigabeModus: (org as { freigabe_modus?: string | null } | null)?.freigabe_modus,
      orgSchwelleEur: (org as { freigabe_schwelle_eur?: number | null } | null)
        ?.freigabe_schwelle_eur,
      orgNotfallDirekt: (org as { notfall_direkt?: boolean | null } | null)?.notfall_direkt,
      objektSchwelleEur: (objekt as { freigabe_schwelle_eur?: number | null } | null)
        ?.freigabe_schwelle_eur,
      objektNotfallDirekt: (objekt as { notfall_direkt?: boolean | null } | null)
        ?.notfall_direkt,
    })
    const fix = ang.gesamt_fix != null ? Number(ang.gesamt_fix) : 0
    const max = ang.gesamt_max != null ? Number(ang.gesamt_max) : 0
    const min = ang.gesamt_min != null ? Number(ang.gesamt_min) : 0
    const betrag = fix > 0 ? fix : max > 0 ? max : min > 0 ? min : 0
    const erlaubt = angebotDarfDirektAuftragOhneHvFreigabe({
      portalModus: regeln.portalModus,
      freigabeModus: regeln.freigabeModus,
      schwelleEur: regeln.schwelleEur,
      betragEur: betrag,
      hatAuftraggeber: true,
    })
    if (!erlaubt) {
      return {
        ok: false,
        message:
          'Direkt Auftrag ohne HV-Freigabe nur unter der Freigabeschwelle (oder Modus „direkt“).',
      }
    }
  }
  const sendKundenMail = direktOhneHv ? false : (opts?.send_kunden_email ?? false)

<<<<<<< Updated upstream
  const { error: acceptErr } = await writeAngebotStatus(supabaseAdmin, id, 'kunde_akzeptiert', {
    status_einfach: 'angenommen',
  })
=======
  const { error: acceptErr } = await supabaseAdmin
    .from('angebote')
    .update({
      status_einfach: 'angenommen',
      status: 'kunde_akzeptiert',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
>>>>>>> Stashed changes
  if (acceptErr) logDbError('app/angebote/angebot-flow-actions:angebote', acceptErr)
  if (acceptErr) return { ok: false, message: acceptErr.message }

  const { findNachtragRowByAngebotId } = await import(
    '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
  )
  const nachtragLink = await findNachtragRowByAngebotId(id)

  const leadId = (ang.lead_id as string | null) ?? null
  if (leadId) {
    // Nachtrag: Stamm-Angebot am Auftrag nicht als „ersetzt“ markieren
    if (!nachtragLink) {
      await markLeadAngeboteAbgelehnt(supabaseAdmin, leadId, id)
    }
    if (direktOhneHv) {
      const now = new Date().toISOString()
      const { error: __dbErr4 } = await supabaseAdmin
        .from('leads')
        .update({
          org_freigabe_status: 'nicht_noetig',
          freigabe_bypass_grund: 'schwelle',
          updated_at: now,
        })
        .eq('id', leadId)
      if (__dbErr4) logDbError('app/angebote/angebot-flow-actions:leads', __dbErr4)
    }
  }

  const res = await createAuftragFromAngebot(id, {
    start_datum: opts?.start_datum ?? null,
    end_datum: opts?.end_datum ?? null,
    send_kunden_email: sendKundenMail,
    send_handwerker_email: false,
    betreff: opts?.betreff,
    to: opts?.to,
    cc: opts?.cc,
  })
  if (!res.ok) return res

  if (direktOhneHv && leadId) {
    try {
      const { notifyPortalAuftragBestaetigtFromCrm } = await import(
        '@/lib/portal/notify-portal-auftrag-bestaetigt'
      )
      await notifyPortalAuftragBestaetigtFromCrm({
        leadId,
        auftragId: res.auftragId,
      })
    } catch (e) {
      console.warn('[acceptAngebotAndCreateAuftrag] Portal-Notify Direktauftrag:', e)
    }
  }

  if (ang.lead_id) {
    await erledigeInterneNachfassTodos(ang.lead_id)
    const timelineTitel = nachtragLink
      ? 'Nachtrags-Angebot angenommen — Auftrag erweitert'
      : direktOhneHv
        ? 'Direkt Auftrag (unter Schwelle) — ohne Kundenmail / ohne HV-Freigabe'
        : 'Angebot angenommen — Auftrag erstellt'
    if (opts?.asSystem) {
      const { error: __dbErr5 } = await supabaseAdmin.from('lead_timeline').insert({
        lead_id: ang.lead_id,
        angebot_id: id,
        typ: 'angebot',
        titel: timelineTitel,
        beschreibung: null,
        erstellt_von: null,
      })
      if (__dbErr5) logDbError('app/angebote/angebot-flow-actions:lead_timeline', __dbErr5)
    } else {
      await insertAngebotTimeline(ang.lead_id, id, timelineTitel, null)
      revalidateLeadDetail(ang.lead_id)
    }
  }

  if (!opts?.asSystem) {
    revalidateAngebotDetail(id)
    revalidateAuftragDetail(res.auftragId)
  }

  return { ok: true, auftragId: res.auftragId }
}
