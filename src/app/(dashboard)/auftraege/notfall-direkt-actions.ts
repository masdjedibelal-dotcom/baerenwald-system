'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import {
  notifyPartnerUnified,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'
import type { PositionVerguetung } from '@/lib/auftraege/position-lebenszyklus'

export type NotfallDirektInput = {
  auftragId?: string | null
  leadId?: string | null
  handwerkerId: string
  verguetung: PositionVerguetung
  /** Festpreis-Netto oder Stundensatz bei Aufwand */
  betragNetto?: number | null
  geschaetztStd?: number | null
  gewerkName?: string | null
  /** Kein Betragsdeckel (DD-10) — bewusst ohne Cap. */
  ohneDeckel?: true
}

/**
 * Notfall „Direkt beauftragen“ (§4):
 * Partner + Aufwand/Festpreis, ohne Deckel, Auto-Position „Notfalleinsatz [Gewerk]“ (typ=regie),
 * Partner-Notify mit Konditionen-Hinweis, Audit, Banner-Felder am Auftrag.
 */
export async function notfallDirektBeauftragen(
  input: NotfallDirektInput
): Promise<{ ok: true; auftragId: string; positionId: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const hwId = input.handwerkerId?.trim()
  if (!hwId) return { ok: false, message: 'Partner fehlt.' }
  if (input.verguetung !== 'aufwand' && input.verguetung !== 'festpreis') {
    return { ok: false, message: 'Vergütung: Aufwand oder Festpreis wählen.' }
  }

  // DD-10: bewusst kein Betragsdeckel / Cap — auch bei hohen Beträgen erlaubt.
  const betrag =
    input.betragNetto != null && Number.isFinite(Number(input.betragNetto))
      ? Math.max(0, Number(input.betragNetto))
      : null

  let auftragId = input.auftragId?.trim() || ''
  let leadId = input.leadId?.trim() || null
  let kundeId: string | null = null
  let titel = 'Notfall'

  if (auftragId) {
    const { data: auf, error } = await supabaseAdmin
      .from('auftraege')
      .select('id, lead_id, kunde_id, titel')
      .eq('id', auftragId)
      .maybeSingle()
    if (error || !auf) return { ok: false, message: error?.message ?? 'Auftrag nicht gefunden.' }
    leadId = auf.lead_id ? String(auf.lead_id) : leadId
    kundeId = auf.kunde_id ? String(auf.kunde_id) : null
    titel = String(auf.titel ?? 'Notfall')
  } else if (leadId) {
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('id, auftraggeber_kunde_id, kunde_id, melder_einheit, situation')
      .eq('id', leadId)
      .maybeSingle()
    if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }
    kundeId = (lead.auftraggeber_kunde_id || lead.kunde_id)
      ? String(lead.auftraggeber_kunde_id || lead.kunde_id)
      : null

    const { data: existing } = await supabaseAdmin
      .from('auftraege')
      .select('id, titel')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      auftragId = String(existing.id)
      titel = String(existing.titel ?? 'Notfall')
    } else {
      const neuTitel = `Notfalleinsatz — ${String(lead.melder_einheit ?? 'Havarie').trim() || 'Havarie'}`
      const { data: neu, error: aErr } = await supabaseAdmin
        .from('auftraege')
        .insert({
          lead_id: leadId,
          kunde_id: kundeId,
          titel: neuTitel,
          status: 'in_arbeit',
          notizen: 'Notfall Direkt beauftragen (ohne Deckel)',
          ist_notfall: true,
          notfall_verguetung: input.verguetung,
        })
        .select('id, titel')
        .single()
      if (aErr || !neu?.id) {
        // Fallback ohne neue Spalten
        if (/ist_notfall|notfall_verguetung/i.test(aErr?.message ?? '')) {
          const { data: neu2, error: aErr2 } = await supabaseAdmin
            .from('auftraege')
            .insert({
              lead_id: leadId,
              kunde_id: kundeId,
              titel: neuTitel,
              status: 'in_arbeit',
              notizen: 'Notfall Direkt beauftragen (ohne Deckel)',
            })
            .select('id, titel')
            .single()
          if (aErr2 || !neu2?.id) {
            return { ok: false, message: aErr2?.message ?? 'Auftrag konnte nicht angelegt werden.' }
          }
          auftragId = String(neu2.id)
          titel = String(neu2.titel ?? neuTitel)
        } else {
          return { ok: false, message: aErr?.message ?? 'Auftrag konnte nicht angelegt werden.' }
        }
      } else {
        auftragId = String(neu.id)
        titel = String(neu.titel ?? neuTitel)
      }
    }
  } else {
    return { ok: false, message: 'Auftrag oder Lead fehlt.' }
  }

  // Banner-Felder am Auftrag
  const { error: bannerErr } = await supabaseAdmin
    .from('auftraege')
    .update({
      ist_notfall: true,
      notfall_verguetung: input.verguetung,
      status: 'in_arbeit',
      updated_at: new Date().toISOString(),
    })
    .eq('id', auftragId)
  if (bannerErr && !/ist_notfall|notfall_verguetung/i.test(bannerErr.message)) {
    return { ok: false, message: bannerErr.message }
  }

  if (leadId) {
    await supabaseAdmin
      .from('leads')
      .update({
        hv_meldung_status: 'notmassnahme',
        vorgang_phase: 'in_bearbeitung',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
  }

  const { data: zuweisung } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('id')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', hwId)
    .maybeSingle()

  if (!zuweisung?.id) {
    await supabaseAdmin.from('auftrag_handwerker').insert({
      auftrag_id: auftragId,
      handwerker_id: hwId,
      status: 'angefragt',
    })
  }

  const gewerk = (input.gewerkName?.trim() || 'Allgemein').replace(/\s+/g, ' ')
  const leistungName = `Notfalleinsatz ${gewerk}`

  const { data: maxSort } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('sort_order')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const stundensatz =
    input.verguetung === 'aufwand' && betrag != null ? betrag : null
  const festpreis =
    input.verguetung === 'festpreis' && betrag != null ? betrag : null
  const menge =
    input.verguetung === 'aufwand'
      ? Math.max(0.25, Number(input.geschaetztStd) || 1)
      : 1

  const insertPayload: Record<string, unknown> = {
    auftrag_id: auftragId,
    handwerker_id: hwId,
    gewerk_name: gewerk,
    leistung_name: leistungName,
    beschreibung:
      input.verguetung === 'aufwand'
        ? 'Notfall nach Aufwand — ohne Betragsdeckel. Konditionen bei Annahme bestätigen.'
        : 'Notfall Festpreis — ohne Betragsdeckel. Konditionen bei Annahme bestätigen.',
    einheit: input.verguetung === 'aufwand' ? 'Std' : 'Psch',
    menge,
    preis_vk: festpreis,
    preis_partner: festpreis ?? stundensatz,
    lohn_vk: festpreis,
    typ: 'regie',
    verguetung: input.verguetung,
    geschaetzt_std: input.verguetung === 'aufwand' ? menge : null,
    stundensatz,
    leistung_status: 'offen',
    anerkennung_status: 'nicht_noetig',
    handwerker_status: 'angefragt',
    handwerker_angefragt_at: new Date().toISOString(),
    sort_order: Number(maxSort?.sort_order ?? 0) + 1,
  }

  let positionId: string
  const { data: inserted, error: posErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .insert(insertPayload)
    .select('id')
    .single()

  if (posErr || !inserted?.id) {
    if (/typ|verguetung|geschaetzt_std|stundensatz|anerkennung/i.test(posErr?.message ?? '')) {
      const { typ: _t, verguetung: _v, geschaetzt_std: _g, stundensatz: _s, anerkennung_status: _a, ...legacy } =
        insertPayload
      const { data: legacyIns, error: legacyErr } = await supabaseAdmin
        .from('auftrag_positionen')
        .insert(legacy)
        .select('id')
        .single()
      if (legacyErr || !legacyIns?.id) {
        return {
          ok: false,
          message:
            legacyErr?.message ??
            'Migration Positions-Lebenszyklus fehlt — Position konnte nicht angelegt werden.',
        }
      }
      positionId = String(legacyIns.id)
    } else {
      return { ok: false, message: posErr?.message ?? 'Position fehlgeschlagen.' }
    }
  } else {
    positionId = String(inserted.id)
  }

  // Konditionen-Block für Partner-Anzeige (Payload im Audit + Notify)
  const konditionenBlock = {
    art: 'notfall' as const,
    verguetung: input.verguetung,
    ohne_deckel: true as const,
    positionen: [
      {
        position_id: positionId,
        leistung: leistungName,
        beschreibung: String(insertPayload.beschreibung),
        ek_netto: null,
        hw_netto: festpreis ?? stundensatz ?? 0,
        mwst_satz: 19,
        geaendert: false,
        stundensatz,
        geschaetzt_std: input.verguetung === 'aufwand' ? menge : null,
      },
    ],
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'notfall_direkt_beauftragt',
    actorId: user.id,
    actorRolle: 'crm',
    kundeId,
    payload: {
      handwerker_id: hwId,
      position_id: positionId,
      verguetung: input.verguetung,
      ohne_deckel: true,
      konditionen: konditionenBlock,
      lead_id: leadId,
    },
  })

  // Notify — Partner sieht Konditionen später in der App; Felder sind schon geliefert
  await notifyPartnerUnified({
    handwerkerId: hwId,
    typ: 'neu',
    projektName: titel,
    link: partnerVorgangLink(auftragId),
    leistungName,
    auftragId,
    anfrageId: leadId,
    positionIds: [positionId],
    aenderungTyp: 'neu',
  })

  revalidatePath(`/auftraege/${auftragId}`)
  if (leadId) revalidatePath(`/anfragen/${leadId}`)

  return { ok: true, auftragId, positionId }
}
