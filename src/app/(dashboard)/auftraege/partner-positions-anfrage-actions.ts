'use server'

import { revalidatePath } from 'next/cache'

import { createNachtragManuell } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { setWeitereArbeitAnerkennung } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { neuePositionsId } from '@/lib/angebot-positionen'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { metaNeueLeistungMitPartner } from '@/lib/auftraege/partner-vorgang-meta'
import {
  notifyPartnerUnified,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AngebotPosition } from '@/lib/types'

export type PartnerPositionsAnfrageRow = {
  id: string
  auftrag_id: string
  handwerker_id: string
  titel: string
  begruendung: string | null
  schaetzung_eur: number | null
  schaetzung_minuten: number | null
  status: string
  position_id: string | null
  nachtrag_id: string | null
  created_at: string
  handwerker_name?: string | null
}

export type WeitereArbeitInPruefungRow = {
  id: string
  leistung_name: string
  beschreibung: string | null
  handwerker_id: string | null
  handwerker_name: string | null
  created_at: string
}

async function crmAuth() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet.' }
  return { ok: true as const, userId: user.id }
}

export async function listPartnerPositionsAnfragen(
  auftragId: string
): Promise<PartnerPositionsAnfrageRow[]> {
  const { data, error } = await supabaseAdmin
    .from('partner_positions_anfragen')
    .select(
      'id, auftrag_id, handwerker_id, titel, begruendung, schaetzung_eur, schaetzung_minuten, status, position_id, nachtrag_id, created_at, handwerker:handwerker_id(name)'
    )
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data ?? []).map((r) => {
    const hw = r.handwerker as { name?: string | null } | { name?: string | null }[] | null
    const name = Array.isArray(hw) ? hw[0]?.name : hw?.name
    return {
      id: String(r.id),
      auftrag_id: String(r.auftrag_id),
      handwerker_id: String(r.handwerker_id),
      titel: String(r.titel),
      begruendung: (r.begruendung as string | null) ?? null,
      schaetzung_eur: r.schaetzung_eur != null ? Number(r.schaetzung_eur) : null,
      schaetzung_minuten:
        r.schaetzung_minuten != null ? Number(r.schaetzung_minuten) : null,
      status: String(r.status),
      position_id: (r.position_id as string | null) ?? null,
      nachtrag_id: (r.nachtrag_id as string | null) ?? null,
      created_at: String(r.created_at),
      handwerker_name: name ?? null,
    }
  })
}

export async function listWeitereArbeitInPruefung(
  auftragId: string
): Promise<WeitereArbeitInPruefungRow[]> {
  const { data } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, handwerker_id, anerkennung_status, typ, verguetung, created_at, handwerker:handwerker_id(name)'
    )
    .eq('auftrag_id', auftragId)
    .eq('anerkennung_status', 'in_pruefung')
    .order('created_at', { ascending: false })

  return (data ?? []).map((r) => {
    const hw = r.handwerker as { name?: string | null } | { name?: string | null }[] | null
    const name = Array.isArray(hw) ? hw[0]?.name : hw?.name
    return {
      id: String(r.id),
      leistung_name: String(r.leistung_name ?? ''),
      beschreibung: (r.beschreibung as string | null) ?? null,
      handwerker_id: (r.handwerker_id as string | null) ?? null,
      handwerker_name: name ?? null,
      created_at: String(r.created_at ?? ''),
    }
  })
}

type DecideResult = { ok: true; message?: string } | { ok: false; message: string }

async function loadAnfrage(id: string) {
  const { data } = await supabaseAdmin
    .from('partner_positions_anfragen')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data
}

async function auftragTitel(auftragId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('auftraege')
    .select('titel, projekt_name')
    .eq('id', auftragId)
    .maybeSingle()
  return String(data?.titel ?? data?.projekt_name ?? '').trim() || 'Auftrag'
}

/**
 * Pfad A: Interne Position am Auftrag anlegen, Partner zur Annahme (Nachreichung).
 */
export async function decidePartnerPositionsAnfrageIntern(input: {
  anfrageId: string
  gewerkSlug?: string
  gewerkName?: string
  preisPartner?: number | null
  notiz?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const anfrage = await loadAnfrage(input.anfrageId)
  if (!anfrage || anfrage.status !== 'offen') {
    return { ok: false, message: 'Anfrage nicht offen.' }
  }

  const auftragId = String(anfrage.auftrag_id)
  const handwerkerId = String(anfrage.handwerker_id)
  const titel = String(anfrage.titel)

  const { data: siblings } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('gewerk_slug, gewerk_name, sort_order')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sib = siblings?.[0]
  const gewerkSlug =
    input.gewerkSlug?.trim() ||
    String(sib?.gewerk_slug ?? '').trim() ||
    'allgemein'
  const gewerkName =
    input.gewerkName?.trim() ||
    String(sib?.gewerk_name ?? '').trim() ||
    'Allgemein'

  const { data: last } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('sort_order')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const partnerMeta = metaNeueLeistungMitPartner(
    input.preisPartner ??
      (anfrage.schaetzung_eur != null ? Number(anfrage.schaetzung_eur) : null),
    'angefragt'
  )

  const { data: pos, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .insert({
      auftrag_id: auftragId,
      handwerker_id: handwerkerId,
      gewerk_slug: gewerkSlug,
      gewerk_name: gewerkName,
      leistung_name: titel,
      beschreibung: [
        anfrage.begruendung ? String(anfrage.begruendung) : null,
        input.notiz?.trim() || null,
        'Aus Partner-Meldung (interne Freigabe).',
      ]
        .filter(Boolean)
        .join('\n\n'),
      einheit: anfrage.schaetzung_minuten ? 'Min' : 'pauschal',
      menge: anfrage.schaetzung_minuten ? Number(anfrage.schaetzung_minuten) : 1,
      typ: 'lv',
      verguetung: anfrage.schaetzung_eur ? 'festpreis' : 'aufwand',
      leistung_status: 'offen',
      anerkennung_status: 'anerkannt',
      sort_order: Number(last?.sort_order ?? 0) + 10,
      ...partnerMeta,
      handwerker_angefragt_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !pos) {
    return { ok: false, message: error?.message ?? 'Position nicht angelegt.' }
  }

  await supabaseAdmin
    .from('partner_positions_anfragen')
    .update({
      status: 'intern',
      position_id: pos.id,
      crm_notiz: input.notiz?.trim() || null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.anfrageId)

  const projekt = await auftragTitel(auftragId)
  await notifyPartnerUnified({
    handwerkerId,
    typ: 'neu',
    projektName: projekt,
    link: partnerVorgangLink(auftragId),
    leistungName: titel,
    auftragId,
    positionIds: [String(pos.id)],
    aenderungTyp: 'neu',
    sendMail: true,
  })

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_intern',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, position_id: pos.id },
  })

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz_intern',
    titel: 'Partner-Meldung intern freigegeben',
    beschreibung: titel,
    erstellt_von: auth.userId,
    handwerker_id: handwerkerId,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return {
    ok: true,
    message: 'Position angelegt — Partner muss im Portal annehmen.',
  }
}

/**
 * Pfad B: Kunden-Nachtrag-Entwurf anlegen (bestehender Nachtrag-Flow).
 */
export async function decidePartnerPositionsAnfrageNachtrag(input: {
  anfrageId: string
  notiz?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const anfrage = await loadAnfrage(input.anfrageId)
  if (!anfrage || anfrage.status !== 'offen') {
    return { ok: false, message: 'Anfrage nicht offen.' }
  }

  const auftragId = String(anfrage.auftrag_id)
  const titel = String(anfrage.titel)
  const eur =
    anfrage.schaetzung_eur != null && Number.isFinite(Number(anfrage.schaetzung_eur))
      ? Number(anfrage.schaetzung_eur)
      : 0
  const fest = Math.round(Math.max(0, eur) * 100) / 100

  const { data: siblings } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('gewerk_slug, gewerk_name')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', String(anfrage.handwerker_id))
    .limit(1)

  const sib = siblings?.[0]
  const positionen: AngebotPosition[] = [
    {
      id: neuePositionsId(),
      gewerk_id: '',
      gewerk_name: String(sib?.gewerk_name ?? 'Nachtrag'),
      gewerk_slug: String(sib?.gewerk_slug ?? '') || undefined,
      leistung: 'Nachtrag',
      beschreibung:
        String(anfrage.begruendung ?? '').trim() || titel || 'Zusatzleistung',
      lohn_netto: fest,
      material_netto: 0,
      gesamt_min: fest,
      gesamt_max: fest,
      menge: 1,
      einheit: 'Stk.',
      preis_typ: 'fix',
      handwerker_id: String(anfrage.handwerker_id),
    },
  ]

  const nachtrag = await createNachtragManuell({
    auftragId,
    grund: `Partner-Meldung: ${titel}`,
    beschreibung: [
      anfrage.begruendung ? String(anfrage.begruendung) : null,
      input.notiz?.trim() || null,
      anfrage.schaetzung_minuten
        ? `Zeitschätzung Partner: ${anfrage.schaetzung_minuten} Min`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
    positionen,
    handwercher_bestaetigt: false,
  })

  if (!nachtrag.ok) return { ok: false, message: nachtrag.message }

  await supabaseAdmin
    .from('partner_positions_anfragen')
    .update({
      status: 'nachtrag',
      nachtrag_id: nachtrag.id,
      crm_notiz: input.notiz?.trim() || null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.anfrageId)

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_nachtrag',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, nachtrag_id: nachtrag.id },
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return {
    ok: true,
    message: 'Nachtrag-Entwurf angelegt — bitte an Kunden senden.',
  }
}

export async function decidePartnerPositionsAnfrageAblehnen(input: {
  anfrageId: string
  notiz?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const anfrage = await loadAnfrage(input.anfrageId)
  if (!anfrage || anfrage.status !== 'offen') {
    return { ok: false, message: 'Anfrage nicht offen.' }
  }

  const auftragId = String(anfrage.auftrag_id)
  await supabaseAdmin
    .from('partner_positions_anfragen')
    .update({
      status: 'abgelehnt',
      crm_notiz: input.notiz?.trim() || null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.anfrageId)

  const projekt = await auftragTitel(auftragId)
  await notifyPartnerUnified({
    handwerkerId: String(anfrage.handwerker_id),
    typ: 'entfernt',
    projektName: projekt,
    link: partnerVorgangLink(auftragId),
    leistungName: String(anfrage.titel),
    auftragId,
    aenderungTyp: 'entfernt',
    sendMail: true,
  })

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_abgelehnt',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, notiz: input.notiz ?? null },
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true, message: 'Meldung abgelehnt — Partner benachrichtigt.' }
}

/** Regie „Weitere Arbeit“ anerkennen/ablehnen + Partner-Notify. */
export async function decideWeitereArbeitMitNotify(input: {
  positionId: string
  status: 'anerkannt' | 'abgelehnt'
  notiz?: string | null
}): Promise<DecideResult> {
  const base = await setWeitereArbeitAnerkennung({
    positionId: input.positionId,
    status: input.status,
    notiz: input.notiz,
  })
  if (!base.ok) return { ok: false, message: base.message }

  const { data: pos } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('id, auftrag_id, handwerker_id, leistung_name')
    .eq('id', input.positionId)
    .maybeSingle()

  if (pos?.handwerker_id && pos.auftrag_id) {
    const projekt = await auftragTitel(String(pos.auftrag_id))
    await notifyPartnerUnified({
      handwerkerId: String(pos.handwerker_id),
      typ: input.status === 'anerkannt' ? 'erinnerung' : 'entfernt',
      projektName: projekt,
      link: partnerVorgangLink(String(pos.auftrag_id)),
      leistungName: String(pos.leistung_name ?? 'Weitere Arbeit'),
      auftragId: String(pos.auftrag_id),
      positionIds: [String(pos.id)],
      sendMail: true,
    })
  }

  if (pos?.auftrag_id) {
    revalidatePath(`/auftraege/${pos.auftrag_id}`)
  }

  return {
    ok: true,
    message:
      input.status === 'anerkannt'
        ? 'Weitere Arbeit anerkannt.'
        : 'Weitere Arbeit abgelehnt.',
  }
}
