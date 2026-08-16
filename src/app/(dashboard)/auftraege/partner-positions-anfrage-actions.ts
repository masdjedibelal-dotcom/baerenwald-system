'use server'

import { revalidatePath } from 'next/cache'

import { createNachtragManuell } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { setWeitereArbeitAnerkennung } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { neuePositionsId, normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import {
  notifyPartnerUnified,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
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
  preis_partner?: number | null
  stundensatz?: number | null
  menge?: number | null
  einheit?: string | null
  foto_urls?: string[]
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
      'id, leistung_name, beschreibung, handwerker_id, anerkennung_status, typ, verguetung, preis_partner, stundensatz, menge, einheit, created_at, handwerker:handwerker_id(name)'
    )
    .eq('auftrag_id', auftragId)
    .eq('anerkennung_status', 'in_pruefung')
    .order('created_at', { ascending: false })

  const rows = data ?? []
  if (!rows.length) return []

  const ids = rows.map((r) => String(r.id))
  const fotoByPos = new Map<string, string[]>()

  const { data: eintraege } = await supabaseAdmin
    .from('position_eintraege')
    .select('position_id, eintrag_fotos(storage_path)')
    .in('position_id', ids)

  for (const e of eintraege ?? []) {
    const posId = String(e.position_id)
    const fotosRaw = Array.isArray(e.eintrag_fotos) ? e.eintrag_fotos : []
    for (const f of fotosRaw) {
      const path = String(
        (f as { storage_path?: string | null }).storage_path ?? ''
      ).trim()
      if (!path) continue
      const url =
        (await signedHandwerkerUploadUrl(path)) ??
        (/^https?:\/\//i.test(path) ? path : null)
      if (!url) continue
      const list = fotoByPos.get(posId) ?? []
      if (!list.includes(url)) list.push(url)
      fotoByPos.set(posId, list)
    }
  }

  return rows.map((r) => {
    const hw = r.handwerker as { name?: string | null } | { name?: string | null }[] | null
    const name = Array.isArray(hw) ? hw[0]?.name : hw?.name
    const id = String(r.id)
    return {
      id,
      leistung_name: String(r.leistung_name ?? ''),
      beschreibung: (r.beschreibung as string | null) ?? null,
      handwerker_id: (r.handwerker_id as string | null) ?? null,
      handwerker_name: name ?? null,
      created_at: String(r.created_at ?? ''),
      preis_partner: r.preis_partner != null ? Number(r.preis_partner) : null,
      stundensatz: r.stundensatz != null ? Number(r.stundensatz) : null,
      menge: r.menge != null ? Number(r.menge) : null,
      einheit: (r.einheit as string | null) ?? null,
      foto_urls: fotoByPos.get(id) ?? [],
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
 * Angenommene Partner-Nacharbeit auch ins verknüpfte Angebot schreiben,
 * damit „Angebot bearbeiten“ / Wizard die Position zum Kundenversand hat.
 */
async function appendLeistungZuAngebot(opts: {
  auftragId: string
  titel: string
  beschreibung?: string | null
  gewerkName: string
  gewerkSlug: string
  handwerkerId?: string | null
  preisNetto?: number | null
  menge?: number | null
  einheit?: string | null
}): Promise<boolean> {
  const { data: auftrag } = await supabaseAdmin
    .from('auftraege')
    .select('angebot_id')
    .eq('id', opts.auftragId)
    .maybeSingle()
  const angebotId = String(auftrag?.angebot_id ?? '').trim()
  if (!angebotId) return false

  const { data: ang } = await supabaseAdmin
    .from('angebote')
    .select('positionen')
    .eq('id', angebotId)
    .maybeSingle()
  if (!ang) return false

  const existing = normalizeAngebotPositionen(ang.positionen)
  const titleKey = opts.titel.trim().toLowerCase()
  if (
    existing.some(
      (p) =>
        String(p.leistung_name ?? p.leistung ?? '')
          .trim()
          .toLowerCase() === titleKey
    )
  ) {
    return true
  }

  const preis =
    opts.preisNetto != null && Number.isFinite(opts.preisNetto) && opts.preisNetto > 0
      ? Math.round(opts.preisNetto * 100) / 100
      : 0
  const menge =
    opts.menge != null && Number.isFinite(opts.menge) && opts.menge > 0 ? opts.menge : 1
  const einheit = opts.einheit?.trim() || (opts.menge && opts.menge > 1 ? 'Min' : 'pauschal')

  const neu: AngebotPosition = {
    id: neuePositionsId(),
    gewerk_id: '',
    gewerk_name: opts.gewerkName,
    gewerk_slug: opts.gewerkSlug,
    leistung: opts.titel,
    leistung_name: opts.titel,
    beschreibung: opts.beschreibung?.trim() || opts.titel,
    lohn_netto: preis,
    material_netto: 0,
    vk_netto: preis,
    gesamt_min: Math.round(preis * menge * 100) / 100,
    gesamt_max: Math.round(preis * menge * 100) / 100,
    menge,
    einheit,
    preis_typ: 'fix',
    position_quelle: 'frei',
    handwerker_id: opts.handwerkerId?.trim() || undefined,
    notiz_intern: 'Aus Handwerker-Nacharbeit übernommen',
  }

  const { error } = await supabaseAdmin
    .from('angebote')
    .update({
      positionen: [...existing, neu],
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  if (error) {
    console.error('[appendLeistungZuAngebot]', error.message)
    return false
  }
  revalidatePath(`/angebote/${angebotId}`)
  return true
}

/**
 * Pfad A: Nacharbeit vom Partner annehmen → Position am Auftrag.
 * Keine klassische Nachreichung: der Handwerker hat selbst gemeldet und muss
 * nicht erneut im Portal „Änderungen bestätigen“.
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

  const schaetzungEur =
    input.preisPartner ??
    (anfrage.schaetzung_eur != null ? Number(anfrage.schaetzung_eur) : null)
  // HW hat die Nacharbeit selbst eingereicht → bereits „angenommen“, keine Portal-Nachreichung
  const partnerMeta = {
    aenderung_typ: null,
    preis_alt: null,
    handwerker_status: 'bestaetigt',
    ...(schaetzungEur != null && Number.isFinite(schaetzungEur) && schaetzungEur > 0
      ? { preis_partner: Math.round(schaetzungEur * 100) / 100 }
      : {}),
  }

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
      ]
        .filter(Boolean)
        .join('\n\n'),
      einheit: anfrage.schaetzung_minuten ? 'Min' : 'pauschal',
      menge: anfrage.schaetzung_minuten ? Number(anfrage.schaetzung_minuten) : 1,
      typ: 'lv',
      verguetung: anfrage.schaetzung_eur ? 'festpreis' : 'aufwand',
      leistung_status: 'offen',
      anerkennung_status: 'anerkannt',
      preis_kunde:
        schaetzungEur != null && Number.isFinite(schaetzungEur) && schaetzungEur > 0
          ? Math.round(schaetzungEur * 100) / 100
          : null,
      sort_order: Number(last?.sort_order ?? 0) + 10,
      ...partnerMeta,
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

  await appendLeistungZuAngebot({
    auftragId,
    titel,
    beschreibung: anfrage.begruendung ? String(anfrage.begruendung) : null,
    gewerkName,
    gewerkSlug,
    handwerkerId,
    preisNetto: schaetzungEur,
    menge: anfrage.schaetzung_minuten ? Number(anfrage.schaetzung_minuten) : 1,
    einheit: anfrage.schaetzung_minuten ? 'Min' : 'pauschal',
  })

  const projekt = await auftragTitel(auftragId)
  await notifyPartnerUnified({
    handwerkerId,
    typ: 'erinnerung',
    projektName: projekt,
    link: partnerVorgangLink(auftragId),
    leistungName: titel,
    auftragId,
    positionIds: [String(pos.id)],
    sendMail: true,
  })

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_angenommen',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, position_id: pos.id },
  })

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'nachtrag_akzeptiert',
    titel: `Nacharbeit angenommen: ${titel}`,
    beschreibung: anfrage.begruendung ? String(anfrage.begruendung) : null,
    erstellt_von: auth.userId,
    handwerker_id: handwerkerId,
    sichtbar_fuer_kunde: true,
    fuer_kunde_freigegeben: true,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return {
    ok: true,
    message:
      'Nacharbeit angenommen — unter Leistungen. Partner muss nicht erneut bestätigen.',
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
    .select(
      'id, auftrag_id, handwerker_id, leistung_name, beschreibung, preis_partner, preis_kunde, menge, einheit, gewerk_name, gewerk_slug'
    )
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

  /* Hausmeister-/Kunden-Portal: Entscheidung sichtbar in Timeline */
  if (pos?.auftrag_id) {
    const name = String(pos.leistung_name ?? 'Nachtrag').trim() || 'Nachtrag'
    const preisNum =
      pos.preis_partner != null && Number(pos.preis_partner) > 0
        ? Number(pos.preis_partner)
        : null
    const preis =
      preisNum != null
        ? preisNum.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
        : null
    const zeit =
      pos.menge != null && Number(pos.menge) > 0
        ? `${Number(pos.menge)} ${String(pos.einheit ?? 'Std').trim() || 'Std'}`
        : null
    const meta = [preis, zeit].filter(Boolean).join(' · ')
    const begruendung = String(pos.beschreibung ?? '')
      .replace(/\n*Nachtrag\s*\/\s*Regie\s*[—\-–]\s*wartet auf Freigabe durch Bärenwald\.?\s*$/i, '')
      .trim()

    if (input.status === 'anerkannt') {
      if (
        (pos.preis_kunde == null || Number(pos.preis_kunde) <= 0) &&
        preisNum != null
      ) {
        await supabaseAdmin
          .from('auftrag_positionen')
          .update({ preis_kunde: preisNum })
          .eq('id', pos.id)
      }
      await appendLeistungZuAngebot({
        auftragId: String(pos.auftrag_id),
        titel: name,
        beschreibung: begruendung || null,
        gewerkName: String(pos.gewerk_name ?? 'Regie').trim() || 'Regie',
        gewerkSlug: String(pos.gewerk_slug ?? 'regie').trim() || 'regie',
        handwerkerId: pos.handwerker_id ? String(pos.handwerker_id) : null,
        preisNetto: preisNum,
        menge: pos.menge != null ? Number(pos.menge) : 1,
        einheit: String(pos.einheit ?? 'Std'),
      })
    }

    await insertAuftragTimelineEvent({
      auftrag_id: String(pos.auftrag_id),
      typ: input.status === 'anerkannt' ? 'nachtrag_akzeptiert' : 'nachtrag_abgelehnt',
      titel:
        input.status === 'anerkannt'
          ? `Nacharbeit angenommen: ${name}`
          : `Nacharbeit abgelehnt: ${name}`,
      beschreibung: [meta || null, begruendung || null, input.notiz?.trim() || null]
        .filter(Boolean)
        .join('\n\n'),
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      handwerker_id: pos.handwerker_id ? String(pos.handwerker_id) : null,
    })
    revalidatePath(`/auftraege/${pos.auftrag_id}`)
  }

  return {
    ok: true,
    message:
      input.status === 'anerkannt'
        ? 'Angenommen — unter Leistungen. Angebot enthält die Position (bearbeiten & an Kunden senden).'
        : 'Abgelehnt — Partner informiert.',
  }
}
