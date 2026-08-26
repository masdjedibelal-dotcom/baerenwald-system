'use server'

import { revalidatePath } from 'next/cache'
import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { supabaseAdmin } from '@/lib/supabase-admin'

import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import {
  erneutOrgFreigabeAnfordernNachAblehnung as erneutOrgFreigabeCore,
  syncOrgFreigabeNachAngebot,
} from '@/lib/org/org-freigabe-logic'
import { leadIstHavarie } from '@/lib/org/hv-lead-helpers'

async function requireCrmStaffDb() {
  return requireStaffAndServiceRole()
}

async function resolveNotmassnahmeHandwerkerId(explicit?: string): Promise<string | null> {
  const id = explicit?.trim()
  if (id) return id

  const { data: rows } = await supabaseAdmin
    .from('handwerker')
    .select('id, gewerke, name')
    .order('name', { ascending: true })
    .limit(40)

  const list = rows ?? []
  const sanitaer = list.find((h) => {
    const gewerke = (h.gewerke as string[] | null) ?? []
    return gewerke.some((g) => /sanit|shk|heiz/i.test(String(g)))
  })
  if (sanitaer?.id) return String(sanitaer.id)

  const nameHit = list.find((h) => /shk|sanit/i.test(String(h.name ?? '')))
  return nameHit?.id ? String(nameHit.id) : list[0]?.id ? String(list[0].id) : null
}

/** CRM: Notmaßnahme-Disposition vor HV-Freigabe (Havarie). */
export async function disponiereHavarieNotmassnahme(
  leadId: string,
  handwerkerId?: string
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const gate = await requireCrmStaffDb()
  if (!gate.ok) return { ok: false, message: gate.message }
  const db = gate.db
  const id = leadId?.trim()
  if (!id) return { ok: false, message: 'Lead fehlt.' }

  const { data: lead, error } = await db
    .from('leads')
    .select(
      'id, auftraggeber_kunde_id, situation, funnel_daten, hv_meldung_status, org_freigabe_status, melder_einheit, kunde_objekt_id, kontakt_nachricht'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }
  if (!leadIstHavarie(lead)) {
    return { ok: false, message: 'Keine Havarie-Meldung — Notmaßnahme nicht zulässig.' }
  }

  const hwId = await resolveNotmassnahmeHandwerkerId(handwerkerId)
  if (!hwId) {
    return { ok: false, message: 'Kein Partner für Notmaßnahme gefunden.' }
  }

  const uid = gate.user.id
  const now = new Date().toISOString()

  let auftragId: string
  const { data: existingAuftrag } = await db
    .from('auftraege')
    .select('id')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingAuftrag?.id) {
    auftragId = String(existingAuftrag.id)
  } else {
    const titel = `Notmaßnahme — ${String(lead.melder_einheit ?? 'Havarie').trim() || 'Havarie'}`
    const { data: neu, error: aErr } = await db
      .from('auftraege')
      .insert({
        lead_id: id,
        kunde_id: lead.auftraggeber_kunde_id,
        titel,
        status: 'in_arbeit',
        notizen: 'Havarie-Notmaßnahme (vor HV-Freigabe)',
      })
      .select('id')
      .single()

    if (aErr || !neu?.id) {
      return { ok: false, message: aErr?.message ?? 'Auftrag konnte nicht angelegt werden.' }
    }
    auftragId = String(neu.id)
  }

  const { data: zuweisung } = await db
    .from('auftrag_handwerker')
    .select('id')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', hwId)
    .maybeSingle()

  if (!zuweisung?.id) {
    await db.from('auftrag_handwerker').insert({
      auftrag_id: auftragId,
      handwerker_id: hwId,
      status: 'zugewiesen',
    })
  }

  await db
    .from('leads')
    .update({
      hv_meldung_status: 'notmassnahme',
      vorgang_phase: 'in_bearbeitung',
      updated_at: now,
    })
    .eq('id', id)

  await writeAuditEvent({
    entityType: 'lead',
    entityId: id,
    aktion: 'notmassnahme_disponiert',
    actorId: uid,
    actorRolle: 'crm',
    kundeId: lead.auftraggeber_kunde_id ?? null,
    payload: { handwerker_id: hwId, auftrag_id: auftragId },
  })

  revalidatePath(`/anfragen/${id}`)
  return { ok: true, auftragId }
}

/** CRM: Kostenträger-Vorschlag an HV (z. B. Versicherung/SE). */
export async function schlageKostentraegerVor(
  leadId: string,
  kostentraeger: string,
  versicherungsNr?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmStaffDb()
  if (!gate.ok) return { ok: false, message: gate.message }
  const db = gate.db
  const id = leadId?.trim()
  const kt = kostentraeger?.trim()
  if (!id || !kt) return { ok: false, message: 'Lead oder Kostenträger fehlt.' }

  const { data: lead } = await db
    .from('leads')
    .select('id, auftraggeber_kunde_id, kostentraeger')
    .eq('id', id)
    .maybeSingle()

  if (!lead?.auftraggeber_kunde_id) {
    return { ok: false, message: 'Kein HV-Vorgang.' }
  }

  const uid = gate.user.id
  const patch: Record<string, unknown> = {
    kostentraeger: kt,
    kostentraeger_vorgeschlagen: true,
    updated_at: new Date().toISOString(),
  }
  if (versicherungsNr?.trim()) patch.versicherungs_nr = versicherungsNr.trim()

  await db.from('leads').update(patch).eq('id', id)

  await writeAuditEvent({
    entityType: 'lead',
    entityId: id,
    aktion: 'kostentraeger_vorgeschlagen',
    actorId: uid,
    actorRolle: 'crm',
    kundeId: lead.auftraggeber_kunde_id,
    payload: { von: lead.kostentraeger, nach: kt },
  })

  revalidatePath(`/anfragen/${id}`)
  return { ok: true }
}

/** CRM: Angebot erstellt → Org-Freigabe + Audit. */
export async function syncAngebotMitOrgFreigabe(input: {
  leadId: string
  angebotId: string
  betragEur?: number
  gesamtFix?: number | null
  gesamtMax?: number | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireCrmStaffDb()
  if (!gate.ok) return { ok: false, message: gate.message }

  const r = await syncOrgFreigabeNachAngebot(input)
  if (!r.ok) return r
  return { ok: true }
}

/** CRM: Freigabe nach Ablehnung erneut anfordern (Pflicht-Kommentar). */
export async function erneutOrgFreigabeAnfordernNachAblehnung(input: {
  leadId: string
  angebotId: string
  anpassungNotiz: string
  gesamtFix?: number | null
  gesamtMax?: number | null
}): Promise<
  | { ok: true; mailOk?: boolean; mailError?: string }
  | { ok: false; message: string }
> {
  const gate = await requireCrmStaffDb()
  if (!gate.ok) return { ok: false, message: gate.message }
  const uid = gate.user.id

  const r = await erneutOrgFreigabeCore(input)
  if (!r.ok) return r

  await writeAuditEvent({
    entityType: 'lead',
    entityId: input.leadId.trim(),
    aktion: 'org_freigabe_erneut_angefordert',
    actorId: uid,
    actorRolle: 'crm',
    payload: { angebot_id: input.angebotId, notiz: input.anpassungNotiz.trim() },
  })

  revalidatePath(`/anfragen/${input.leadId.trim()}`)
  revalidatePath(`/angebote/${input.angebotId.trim()}`)
  return {
    ok: true,
    mailOk: r.mailOk,
    ...(r.mailError ? { mailError: r.mailError } : {}),
  }
}
