'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAngebotToKunde, createAuftragFromAngebot, sendAngebotNachfassManuell, markLeadAngeboteAbgelehnt } from '@/app/(dashboard)/angebote/actions'
import { erledigeInterneNachfassTodos } from '@/lib/kalender-auto-termine'
import { addDaysYmd, heuteYmd } from '@/lib/angebot-einfach'
import { isKundeAblehnungGrund, KUNDE_ABLEHNUNG_GRUND_LABELS } from '@/lib/angebote/ablehnung-labels'

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
  await supabase.from('lead_timeline').insert({
    lead_id: leadId,
    angebot_id: angebotId,
    typ: 'angebot',
    titel,
    beschreibung: beschreibung ?? null,
    erstellt_von: user?.id ?? null,
  })
}

export async function sendAngebotEinfach(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const sent = await sendAngebotToKunde(angebotId)
  if (!sent.ok) return sent

  const now = new Date().toISOString()
  const gueltig = addDaysYmd(heuteYmd(), 30)
  const supabase = createClient()
  const { data: row } = await supabase
    .from('angebote')
    .select('lead_id, kunden(email, name)')
    .eq('id', angebotId)
    .maybeSingle()

  const { error } = await supabase
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
  if (error) return { ok: false, message: error.message }

  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  if (row?.lead_id) revalidatePath(`/anfragen/${row.lead_id}`)
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
  const { data: row } = await supabase
    .from('angebote')
    .select('lead_id, kunden(email)')
    .eq('id', angebotId)
    .maybeSingle()

  const { error } = await supabase
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
  if (error) return { ok: false, message: error.message }

  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  if (row?.lead_id) revalidatePath(`/anfragen/${row.lead_id}`)
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
  const supabase = createClient()
  const { data: row } = await supabase
    .from('angebote')
    .select('lead_id')
    .eq('id', input.angebotId)
    .maybeSingle()
  if (!row) return { ok: false, message: 'Angebot nicht gefunden.' }

  const grundLabel = KUNDE_ABLEHNUNG_GRUND_LABELS[input.grund] ?? input.grund
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('angebote')
    .update({
      status_einfach: 'abgelehnt',
      status: 'abgelehnt',
      ablehnung_grund: input.grund,
      ablehnung_notiz: input.notiz?.trim() || null,
      updated_at: now,
    })
    .eq('id', input.angebotId)
  if (error) return { ok: false, message: error.message }

  if (row.lead_id) {
    await erledigeInterneNachfassTodos(row.lead_id)
    await supabaseAdmin
      .from('leads')
      .update({ status: 'abgebrochen', updated_at: now })
      .eq('id', row.lead_id)
    await insertAngebotTimeline(
      row.lead_id,
      input.angebotId,
      'Angebot abgelehnt',
      grundLabel + (input.notiz?.trim() ? ` — ${input.notiz.trim()}` : '')
    )
    revalidatePath(`/anfragen/${row.lead_id}`)
  }

  revalidatePath('/angebote')
  revalidatePath(`/angebote/${input.angebotId}`)
  return { ok: true }
}

export type AcceptAngebotAndCreateAuftragOptions = {
  start_datum?: string | null
  end_datum?: string | null
  send_kunden_email?: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
}

export async function acceptAngebotAndCreateAuftrag(
  angebotId: string,
  opts?: AcceptAngebotAndCreateAuftragOptions & { asSystem?: boolean }
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()
  const { data: ang } = await supabase
    .from('angebote')
    .select('id, lead_id, status')
    .eq('id', angebotId)
    .maybeSingle()

  if (!ang) return { ok: false, message: 'Angebot nicht gefunden.' }

  await supabase
    .from('angebote')
    .update({
      status_einfach: 'angenommen',
      status: 'kunde_akzeptiert',
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  const leadId = (ang.lead_id as string | null) ?? null
  if (leadId) {
    await markLeadAngeboteAbgelehnt(supabase, leadId, angebotId)
  }

  const res = await createAuftragFromAngebot(angebotId, {
    start_datum: opts?.start_datum ?? null,
    end_datum: opts?.end_datum ?? null,
    send_kunden_email: opts?.send_kunden_email ?? false,
    send_handwerker_email: false,
    betreff: opts?.betreff,
    to: opts?.to,
    cc: opts?.cc,
  })
  if (!res.ok) return res

  if (ang.lead_id) {
    await erledigeInterneNachfassTodos(ang.lead_id)
    if (opts?.asSystem) {
      await supabaseAdmin.from('lead_timeline').insert({
        lead_id: ang.lead_id,
        angebot_id: angebotId,
        typ: 'angebot',
        titel: 'Angebot angenommen — Auftrag erstellt',
        beschreibung: null,
        erstellt_von: null,
      })
    } else {
      await insertAngebotTimeline(
        ang.lead_id,
        angebotId,
        'Angebot angenommen — Auftrag erstellt',
        null
      )
      revalidatePath(`/anfragen/${ang.lead_id}`)
    }
  }

  if (!opts?.asSystem) {
    revalidatePath('/angebote')
    revalidatePath(`/angebote/${angebotId}`)
    revalidatePath('/auftraege')
    revalidatePath(`/auftraege/${res.auftragId}`)
  }

  return { ok: true, auftragId: res.auftragId }
}
