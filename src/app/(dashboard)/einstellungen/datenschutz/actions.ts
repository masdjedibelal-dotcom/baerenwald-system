'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  anonymisiereKunde as anonymisiereKundeLib,
  executeDatenschutzLoeschung,
} from '@/lib/datenschutz/execute-loeschung'
import { buildMelderAuskunftText } from '@/lib/datenschutz/melder-leads'
import { loadMelderLeadForAuskunft, searchMelderLeadsByEmail } from '@/lib/datenschutz/queries'
import type { DatenschutzAnfrageKontext, MelderLeadKurz } from '@/lib/datenschutz/types'

async function requireUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function addMonthsIso(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export async function updateDatenschutzFrist(
  id: string,
  input: { frist_monate: number; aktiv: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const { error } = await supabaseAdmin
    .from('datenschutz_fristen')
    .update({ frist_monate: input.frist_monate, aktiv: input.aktiv })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/integration')
  return { ok: true }
}

export async function addDatenschutzAufschub(input: {
  kategorie: string
  referenz_id: string
  begrundung: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }
  if (!input.begrundung.trim()) return { ok: false, message: 'Begründung erforderlich' }

  const { error } = await supabaseAdmin.from('datenschutz_aufschub').insert({
    kategorie: input.kategorie,
    referenz_id: input.referenz_id,
    gueltig_bis: addMonthsIso(12),
    begrundung: input.begrundung.trim(),
    erstellt_von: uid,
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/integration')
  return { ok: true }
}

export async function createDatenschutzAnfrage(input: {
  typ: 'loeschung' | 'auskunft' | 'einschraenkung'
  name: string
  email: string
  beschreibung: string | null
  kontext?: DatenschutzAnfrageKontext | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const { error } = await supabaseAdmin.from('datenschutz_anfragen').insert({
    typ: input.typ,
    name: input.name.trim(),
    email: input.email.trim(),
    beschreibung: input.beschreibung?.trim() || null,
    kontext: input.kontext ?? null,
    status: 'offen',
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/integration')
  return { ok: true }
}

export async function sucheMelderLeads(email: string): Promise<MelderLeadKurz[]> {
  const uid = await requireUserId()
  if (!uid) return []
  return searchMelderLeadsByEmail(email)
}

export async function exportMelderAuskunft(
  leadId: string
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const lead = await loadMelderLeadForAuskunft(leadId)
  if (!lead) return { ok: false, message: 'Lead nicht gefunden' }

  const auftraggeber = lead.auftraggeber as { name?: string | null; org_anzeigename?: string | null } | null
  const kundenObjekte = lead.kunden_objekte as { titel?: string | null; plz?: string | null; ort?: string | null } | null

  const text = buildMelderAuskunftText({
    ...(lead as Parameters<typeof buildMelderAuskunftText>[0]),
    auftraggeber,
    kunden_objekte: kundenObjekte,
  })
  return { ok: true, text }
}

export async function loescheMelderDaten(
  leadId: string,
  kategorie: 'melder_leads_offen' | 'melder_leads_abgeschlossen' | 'melder_fotos',
  grund = 'betroffenenanfrage'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const r = await executeDatenschutzLoeschung({
    kategorie,
    referenz_id: leadId,
    grund,
    userId: uid,
  })
  if (!r.ok) return r
  revalidatePath('/einstellungen/integration')
  revalidatePath(`/anfragen/${leadId}`)
  return { ok: true }
}

/** Kundenstamm anonymisieren (PLZ bleibt); Rechnungen unverändert. */
export async function anonymisiereKunde(
  kundeId: string,
  grund = 'manuell'
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }
  const r = await anonymisiereKundeLib(kundeId, uid, grund)
  if (!r.ok) return r
  revalidatePath('/einstellungen/integration')
  return { ok: true }
}

export async function updateDatenschutzAnfrage(
  id: string,
  input: { notizen: string | null; status: 'offen' | 'in_bearbeitung' | 'erledigt' }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = await requireUserId()
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const patch: Record<string, unknown> = {
    notizen: input.notizen?.trim() || null,
    status: input.status,
  }
  if (input.status === 'erledigt') {
    patch.erledigt_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin.from('datenschutz_anfragen').update(patch).eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/integration')
  return { ok: true }
}
