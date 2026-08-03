'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import {
  notifyPartnerUnified,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'

export type NotfallDirektInput = {
  auftragId?: string | null
  leadId?: string | null
  handwerkerId: string
  /** Spec Q3 / Phase 9: nur Aufwand — Festpreis-Normalweg = Angebot annehmen. */
  verguetung?: 'aufwand'
  /** Stundensatz netto (Pflicht) */
  betragNetto?: number | null
  /** Materialaufschlag in Prozent (optional) */
  materialaufschlagPct?: number | null
  /** Stichpunkte Leistungsumfang */
  leistungsumfang?: string[] | null
  /** @deprecated Stunden werden nicht mehr vorab erfasst — Abrechnung über BT/Rechnung. */
  geschaetztStd?: number | null
  gewerkName?: string | null
}

/**
 * Notfall „Direkt beauftragen“ / „Notfall melden“:
 * Handwerker + Aufwand-Position ohne Angebot (typ=regie, notfall_verguetung=aufwand).
 * Kein Festpreis-Zweig in diesem Flow.
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

  // Spec Q3: nur Aufwand
  const verguetung = 'aufwand' as const

  // Spec: nur Aufwand; kein Cap in der Logik
  const betrag =
    input.betragNetto != null && Number.isFinite(Number(input.betragNetto))
      ? Math.max(0, Number(input.betragNetto))
      : null
  if (betrag == null || betrag <= 0) {
    return {
      ok: false,
      message: 'Stundensatz fehlt.',
    }
  }

  const matPct =
    input.materialaufschlagPct != null && Number.isFinite(Number(input.materialaufschlagPct))
      ? Math.max(0, Number(input.materialaufschlagPct))
      : null
  const umfangZeilen = (input.leistungsumfang ?? [])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)

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
          notizen: 'Notfall Direktauftrag nach Aufwand',
          ist_notfall: true,
          notfall_verguetung: verguetung,
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
              notizen: 'Notfall Direktauftrag nach Aufwand',
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
      notfall_verguetung: verguetung,
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
        org_freigabe_status: 'nicht_noetig',
        freigabe_bypass_grund: 'akut',
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

  const stundensatz = betrag
  // Platzhalter-Menge 1 — tatsächliche Stunden kommen aus dem Bautagebuch / Rechnung.
  const menge = 1
  const beschreibungTeile = [
    'Notfall / Akut nach Aufwand — Regieposition.',
    `Verrechnung: Stundensatz ${stundensatz.toFixed(2)} € netto/h; tatsächliche Stunden über Bautagebuch; Abrechnung per Rechnung (nach Aufwand).`,
  ]
  if (matPct != null && matPct > 0) {
    beschreibungTeile.push(`Materialaufschlag ${matPct} %.`)
  }
  if (umfangZeilen.length) {
    beschreibungTeile.push(`Leistungsumfang:\n${umfangZeilen.map((z) => `• ${z}`).join('\n')}`)
  }

  const insertPayload: Record<string, unknown> = {
    auftrag_id: auftragId,
    handwerker_id: hwId,
    gewerk_name: gewerk,
    leistung_name: leistungName,
    beschreibung: beschreibungTeile.join('\n'),
    einheit: 'Std',
    menge,
    preis_vk: null,
    preis_partner: stundensatz,
    lohn_vk: null,
    typ: 'regie',
    verguetung,
    geschaetzt_std: null,
    stundensatz,
    leistung_status: 'offen',
    anerkennung_status: 'nicht_noetig',
    handwerker_status: 'angefragt',
    handwerker_angefragt_at: new Date().toISOString(),
    sort_order: Number(maxSort?.sort_order ?? 0) + 1,
    ...(matPct != null && matPct > 0 ? { notizen_intern: `Materialaufschlag ${matPct} %` } : {}),
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

  // Konditionen für Partner — Sprache „nach Aufwand“, nie „Regie“
  const konditionenBlock = {
    art: 'notfall' as const,
    verguetung,
    positionen: [
      {
        position_id: positionId,
        leistung: leistungName,
        beschreibung: String(insertPayload.beschreibung),
        ek_netto: null,
        hw_netto: stundensatz ?? 0,
        mwst_satz: 19,
        geaendert: false,
        stundensatz,
        geschaetzt_std: null,
        materialaufschlag_pct: matPct,
        abrechnung: 'nach Aufwand',
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
      verguetung,
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

  // A3: HV nur zur Information (kein Freigabe-Request)
  if (kundeId) {
    const { data: hv } = await supabaseAdmin
      .from('kunden')
      .select('id, name, email, org_anzeigename, portal_modus')
      .eq('id', kundeId)
      .maybeSingle()
    const hvEmail = (hv as { email?: string | null } | null)?.email?.trim()
    if (hvEmail && (hv as { portal_modus?: string } | null)?.portal_modus === 'organisation') {
      const { getMailBranding } = await import('@/lib/get-mail-branding')
      const { mailOrgNotfallDirektInfo } = await import('@/lib/email/meldung-mail-templates')
      const { sendMail } = await import('@/lib/mail-service')
      const { buildPortalLoginLink } = await import('@/lib/portal-utils')
      const branding = await getMailBranding(supabaseAdmin)
      const orgName =
        (hv as { org_anzeigename?: string; name?: string }).org_anzeigename?.trim() ||
        (hv as { name?: string }).name?.trim() ||
        'Auftraggeber'
      const tpl = mailOrgNotfallDirektInfo(
        {
          orgName,
          objektTitel: titel,
          portalLink: buildPortalLoginLink(),
        },
        branding
      )
      void sendMail({
        typ: 'org_notfall_info',
        an: hvEmail,
        anName: orgName,
        betreff: tpl.betreff,
        html: tpl.html,
        leadId: leadId ?? undefined,
        kundeId,
        auftragId,
      })
    }
  }

  revalidatePath(`/auftraege/${auftragId}`)
  if (leadId) revalidatePath(`/anfragen/${leadId}`)

  return { ok: true, auftragId, positionId }
}
