'use server'

import { revalidateAngebotDetail,revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { normalizeAngebotPositionen,summenAusPositionen } from '@/lib/angebot-positionen'
import { sendEmailHtml } from '@/lib/auftraege/emails'
import type { AngebotPosition,Kunde } from '@/lib/types'
import { angebotNachtragMarker } from '@/lib/auftraege/nachtrag-utils'
import { planNachtragStatusWrite } from '@/lib/status/write-nachtrag-status'
import { formatEuroSpanne,formatDatumZeit } from '@/lib/format/geld-datum'

const DEFAULT_MWST = 19

function clientIpFromHeaders(): string {
  const h = headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unbekannt'
  return h.get('x-real-ip')?.trim() || 'unbekannt'
}

export type NachtragPublicPayload = {
  nachtrag: {
    id: string
    token: string
    grund: string
    beschreibung: string | null
    positionen: unknown
    gesamt_min: number | null
    gesamt_max: number | null
    status: string
    kunde_bestaetigt_at: string | null
    handwercher_bestaetigt: boolean
    handwercher_bestaetigt_at: string | null
    gesendet_at: string | null
  }
  kunde: Pick<Kunde, 'name' | 'adresse' | 'plz' | 'ort' | 'telefon'>
  auftragId: string
  handwercherName: string | null
}

export async function loadNachtragPublicByToken(token: string): Promise<NachtragPublicPayload | null> {
  const { data: n, error } = await supabaseAdmin
    .from('nachtraege')
    .select(
      `
      id, token, grund, beschreibung, positionen, gesamt_min, gesamt_max, status,
      kunde_bestaetigt_at, handwercher_bestaetigt, handwercher_bestaetigt_at,
      gesendet_at,
      auftraege(
        id,
        kunden(name, adresse, plz, ort, telefon),
        auftrag_handwerker(
          handwerker(name)
        )
      )
    `
    )
    .eq('token', token)
    .maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)

  if (error || !n) return null

  const row = n as Record<string, unknown>
  const auf = row.auftraege as Record<string, unknown> | Record<string, unknown>[] | null
  const auftrag = Array.isArray(auf) ? auf[0] : auf
  if (!auftrag) return null
  const kRaw = auftrag.kunden as Record<string, unknown> | Record<string, unknown>[] | null
  const kundeObj = Array.isArray(kRaw) ? kRaw[0] : kRaw
  if (!kundeObj) return null

  const hwRows = (auftrag.auftrag_handwerker ?? []) as Record<string, unknown>[]
  const firstHw = hwRows[0]?.handwerker as { name?: string } | { name?: string }[] | undefined
  const hwName = Array.isArray(firstHw) ? firstHw[0]?.name : firstHw?.name

  return {
    nachtrag: {
      id: row.id as string,
      token: row.token as string,
      grund: row.grund as string,
      beschreibung: (row.beschreibung as string | null) ?? null,
      positionen: row.positionen,
      gesamt_min: row.gesamt_min != null ? Number(row.gesamt_min) : null,
      gesamt_max: row.gesamt_max != null ? Number(row.gesamt_max) : null,
      status: row.status as string,
      kunde_bestaetigt_at: (row.kunde_bestaetigt_at as string | null) ?? null,
      handwercher_bestaetigt: Boolean(row.handwercher_bestaetigt),
      handwercher_bestaetigt_at: (row.handwercher_bestaetigt_at as string | null) ?? null,
      gesendet_at: (row.gesendet_at as string | null) ?? null,
    },
    kunde: {
      name: String(kundeObj.name ?? ''),
      adresse: (kundeObj.adresse as string | null) ?? null,
      plz: (kundeObj.plz as string | null) ?? null,
      ort: (kundeObj.ort as string | null) ?? null,
      telefon: (kundeObj.telefon as string | null) ?? null,
    },
    auftragId: auftrag.id as string,
    handwercherName: hwName ?? null,
  }
}

async function mergeNachtragIntoAngebot(auftragId: string, positionenNachtrag: unknown): Promise<void> {
  const { data: auf, error } = await supabaseAdmin.from('auftraege').select('angebot_id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:auftraege', error)
  const angebotId = auf?.angebot_id as string | null
  if (!angebotId) return

  const { data: ang, error: error2 } = await supabaseAdmin.from('angebote').select('positionen').eq('id', angebotId).maybeSingle()
  if (error2) logDbError('app/auftraege/nachtrag-baustopp-actions:angebote', error2)
  if (!ang) return

  const existing = normalizeAngebotPositionen(ang.positionen ?? [])
  const extra = normalizeAngebotPositionen(positionenNachtrag ?? [])
  const merged = [...existing, ...extra]
  const summen = summenAusPositionen(merged, DEFAULT_MWST)

  const { error: __dbErr1 } = await supabaseAdmin
    .from('angebote')
    .update({
      positionen: merged as unknown as Record<string, unknown>[],
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)
  if (__dbErr1) logDbError('app/auftraege/nachtrag-baustopp-actions:angebote', __dbErr1)
}

export async function acceptNachtragByToken(token: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const ip = clientIpFromHeaders()
  const payload = await loadNachtragPublicByToken(token)
  if (!payload) return { ok: false, message: 'Dieser Link ist nicht mehr gültig.' }

  const n = payload.nachtrag
  if (n.kunde_bestaetigt_at) {
    return { ok: false, message: 'Bereits bestätigt.' }
  }
  if (n.status === 'abgelehnt') {
    return { ok: false, message: 'Dieser Nachtrag wurde abgelehnt.' }
  }

  const now = new Date().toISOString()

  const { error: upErr } = await supabaseAdmin
    .from('nachtraege')
    .update(
      planNachtragStatusWrite('akzeptiert', {
        akzeptiert_at: now,
        kunde_bestaetigt_at: now,
        kunde_ip: ip,
      })
    )
    .eq('id', n.id)
    .eq('token', token)
  if (upErr) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', upErr)

  if (upErr) return { ok: false, message: upErr.message }

  await mergeNachtragIntoAngebot(payload.auftragId, n.positionen)

  const summeTxt =
    n.gesamt_min != null && n.gesamt_max != null
      ? `${formatEuroSpanne(n.gesamt_min, n.gesamt_max)}`
      : '—'

  await insertAuftragTimelineEvent({
    auftrag_id: payload.auftragId,
    typ: 'nachtrag_akzeptiert',
    titel: 'Nachtrag vom Kunden bestätigt',
    beschreibung: `${formatDatumZeit(now)} · ${summeTxt} · IP ${ip}`,
    sichtbar_fuer_kunde: true,
  })

  const internTo = process.env.INTERNE_RECHNUNG_WARNUNG_EMAIL ?? process.env.INTERNE_WARNUNG_EMAIL
  if (internTo) {
    await sendEmailHtml({
      to: internTo,
      subject: `Nachtrag bestätigt: ${payload.kunde.name}`,
      html: `<p>Nachtrag akzeptiert für Auftrag <strong>${payload.auftragId.slice(0, 8)}</strong>.</p>
        <p>Kundin: ${payload.kunde.name}<br/>Summe: ${summeTxt}<br/>IP: ${ip}</p>`,
    })
  }

  if (!n.handwercher_bestaetigt) {
    const { data: links, error } = await supabaseAdmin
      .from('auftrag_handwerker')
      .select('handwerker(email, name)')
      .eq('auftrag_id', payload.auftragId)
    if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:auftrag_handwerker', error)

    for (const row of links ?? []) {
      const hw = row as { handwerker?: { email?: string | null; name?: string } | { email?: string | null; name?: string }[] }
      const h = Array.isArray(hw.handwerker) ? hw.handwerker[0] : hw.handwerker
      const em = h?.email?.trim()
      if (!em) continue
      await sendEmailHtml({
        to: em,
        subject: 'Nachtrag: Kundenfreigabe liegt vor',
        html: `<p>Guten Tag ${h?.name ?? ''},</p>
          <p>die Kundin hat einen Nachtrag bestätigt. Bitte prüfen Sie die Mehrkosten in der Baustelle / im CRM.</p>
          <p>Auftrag: ${payload.auftragId.slice(0, 8)}</p>`,
      })
    }
  }

  revalidateAuftragDetail(payload.auftragId)
  return { ok: true as const }
}

/** Nachtrags-Zeile zum Angebots-Dokument (Marker in beschreibung). */
export async function findNachtragRowByAngebotId(angebotId: string): Promise<{
  id: string
  auftrag_id: string
  status: string
} | null> {
  const id = angebotId.trim()
  if (!id) return null
  const marker = angebotNachtragMarker(id)
  const { data, error } = await supabaseAdmin
    .from('nachtraege')
    .select('id, auftrag_id, status')
    .ilike('beschreibung', `%${marker}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)
  if (!data?.id || !data.auftrag_id) return null
  return {
    id: String(data.id),
    auftrag_id: String(data.auftrag_id),
    status: String(data.status ?? ''),
  }
}

/**
 * Nachtrags-Angebot angenommen → Positionen in bestehenden Auftrag mergen (kein 2. Auftrag).
 */
export async function applyNachtragsAngebotAnAuftrag(
  angebotId: string
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const angId = angebotId.trim()
  if (!angId) return { ok: false, message: 'Angebot fehlt.' }

  const nachtrag = await findNachtragRowByAngebotId(angId)
  if (!nachtrag) {
    return { ok: false, message: 'Kein Nachtrag zu diesem Angebot gefunden.' }
  }

  const { data: ang, error: angErr } = await supabaseAdmin
    .from('angebote')
    .select('id, positionen, status')
    .eq('id', angId)
    .maybeSingle()
  if (angErr) logDbError('app/auftraege/nachtrag-baustopp-actions:angebote', angErr)
  if (angErr || !ang) return { ok: false, message: angErr?.message ?? 'Angebot nicht gefunden.' }

  const { syncAngebotPositionenZuAuftrag } = await import(
    '@/lib/auftraege/sync-angebot-zu-auftrag'
  )
  const { data: hwRows, error: error2 } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('id, handwerker_id, gewerk_id, status')
    .eq('angebot_id', angId)
  if (error2) logDbError('app/auftraege/nachtrag-baustopp-actions:angebot_handwerker', error2)

  const sync = await syncAngebotPositionenZuAuftrag({
    auftragId: nachtrag.auftrag_id,
    angebotPositionen: (ang.positionen as AngebotPosition[]) ?? [],
    angebotHandwerker: (hwRows ?? []) as never,
    appendOnly: true,
  })
  if (!sync.ok) return sync

  await mergeNachtragIntoAngebot(nachtrag.auftrag_id, ang.positionen)

  const now = new Date().toISOString()
  if (nachtrag.status !== 'akzeptiert') {
    const { error: __dbErr2 } = await supabaseAdmin
      .from('nachtraege')
      .update(
        planNachtragStatusWrite('akzeptiert', {
          akzeptiert_at: now,
          kunde_bestaetigt_at: now,
        })
      )
      .eq('id', nachtrag.id)
      .eq('auftrag_id', nachtrag.auftrag_id)
    if (__dbErr2) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', __dbErr2)
  }

  await insertAuftragTimelineEvent({
    auftrag_id: nachtrag.auftrag_id,
    typ: 'nachtrag_akzeptiert',
    titel: 'Nachtrags-Angebot angenommen',
    beschreibung: `Positionen in Auftrag übernommen (+${sync.neu} neu, ${sync.aktualisiert} aktualisiert)`,
    sichtbar_fuer_kunde: true,
  })

  revalidateAuftragDetail(nachtrag.auftrag_id)
  revalidateAngebotDetail(angId)
  return { ok: true, auftragId: nachtrag.auftrag_id }
}

/**
 * N3: Nachtrags-Angebot aus dem Wizard → nachtraege[] am Auftrag upserten
 * (Marker in beschreibung, da kein angebot_id-Feld am Schema).
 */
export async function upsertNachtragEntwurfFromAngebotWizard(input: {
  auftragId: string
  angebotId: string
  grund: string
  beschreibung?: string | null
  positionen: AngebotPosition[]
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const pos = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(pos, DEFAULT_MWST)
  const marker = angebotNachtragMarker(input.angebotId)
  const baseDesc = (input.beschreibung ?? '').trim()
  const beschreibung = baseDesc.includes(marker)
    ? baseDesc
    : [baseDesc, marker].filter(Boolean).join('\n\n')

  const { data: existing, error } = await supabaseAdmin
    .from('nachtraege')
    .select('id, status')
    .eq('auftrag_id', input.auftragId)
    .eq('status', 'entwurf')
    .ilike('beschreibung', `%${marker}%`)
    .maybeSingle()
  if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from('nachtraege')
      .update({
        grund: input.grund.trim() || 'Nachtrag',
        beschreibung,
        positionen: pos,
        gesamt_min: summen.bruttoMin,
        gesamt_max: summen.bruttoMax,
      })
      .eq('id', existing.id)
      .eq('auftrag_id', input.auftragId)
    if (error) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error)
    if (error) return { ok: false, message: error.message }
    revalidateAuftragDetail(input.auftragId)
    return { ok: true, id: existing.id as string }
  }

  const { data: row, error: error2 } = await supabaseAdmin
    .from('nachtraege')
    .insert({
      auftrag_id: input.auftragId,
      grund: input.grund.trim() || 'Nachtrag',
      beschreibung,
      positionen: pos,
      gesamt_min: summen.bruttoMin,
      gesamt_max: summen.bruttoMax,
      status: 'entwurf',
      handwercher_bestaetigt: false,
    })
    .select('id')
    .single()
  if (error2) logDbError('app/auftraege/nachtrag-baustopp-actions:nachtraege', error2)

  if (error2 || !row) return { ok: false, message: error2?.message ?? 'Nachtrag speichern fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'nachtrag_entwurf',
    titel: 'Nachtrag aus Angebot',
    beschreibung: input.grund.slice(0, 500),
    erstellt_von: user.id,
  })

  revalidateAuftragDetail(input.auftragId)
  return { ok: true, id: row.id as string }
}
