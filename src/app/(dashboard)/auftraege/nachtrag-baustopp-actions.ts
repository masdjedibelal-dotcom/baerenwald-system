'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { sendEmailHtml } from '@/lib/auftraege/emails'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailNachtrag } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import type { AngebotPosition, Kunde } from '@/lib/types'
import { getPublicAppUrl } from '@/lib/utils'

const DEFAULT_MWST = 19

function clientIpFromHeaders(): string {
  const h = headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() || 'unbekannt'
  return h.get('x-real-ip')?.trim() || 'unbekannt'
}

function absUrl(path: string) {
  return `${getPublicAppUrl()}${path.startsWith('/') ? path : `/${path}`}`
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
  const { data: auf } = await supabaseAdmin.from('auftraege').select('angebot_id').eq('id', auftragId).maybeSingle()
  const angebotId = auf?.angebot_id as string | null
  if (!angebotId) return

  const { data: ang } = await supabaseAdmin.from('angebote').select('positionen').eq('id', angebotId).maybeSingle()
  if (!ang) return

  const existing = normalizeAngebotPositionen(ang.positionen ?? [])
  const extra = normalizeAngebotPositionen(positionenNachtrag ?? [])
  const merged = [...existing, ...extra]
  const summen = summenAusPositionen(merged, DEFAULT_MWST)

  await supabaseAdmin
    .from('angebote')
    .update({
      positionen: merged as unknown as Record<string, unknown>[],
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)
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
    .update({
      status: 'akzeptiert',
      akzeptiert_at: now,
      kunde_bestaetigt_at: now,
      kunde_ip: ip,
    })
    .eq('id', n.id)
    .eq('token', token)

  if (upErr) return { ok: false, message: upErr.message }

  await mergeNachtragIntoAngebot(payload.auftragId, n.positionen)

  const summeTxt =
    n.gesamt_min != null && n.gesamt_max != null
      ? `${n.gesamt_min.toLocaleString('de-DE')} – ${n.gesamt_max.toLocaleString('de-DE')} €`
      : '—'

  await insertAuftragTimelineEvent({
    auftrag_id: payload.auftragId,
    typ: 'nachtrag_akzeptiert',
    titel: 'Nachtrag vom Kunden bestätigt',
    beschreibung: `${new Date(now).toLocaleString('de-DE')} · ${summeTxt} · IP ${ip}`,
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
    const { data: links } = await supabaseAdmin
      .from('auftrag_handwerker')
      .select('handwerker(email, name)')
      .eq('auftrag_id', payload.auftragId)

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

  revalidatePath(`/auftraege/${payload.auftragId}`)
  return { ok: true as const }
}

export async function createNachtragManuell(input: {
  auftragId: string
  grund: string
  beschreibung: string
  positionen: AngebotPosition[]
  handwercher_bestaetigt: boolean
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const pos = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(pos, DEFAULT_MWST)

  const { data: row, error } = await supabaseAdmin
    .from('nachtraege')
    .insert({
      auftrag_id: input.auftragId,
      grund: input.grund.trim(),
      beschreibung: input.beschreibung.trim() || null,
      positionen: pos,
      gesamt_min: summen.bruttoMin,
      gesamt_max: summen.bruttoMax,
      status: 'entwurf',
      handwercher_bestaetigt: input.handwercher_bestaetigt,
      handwercher_bestaetigt_at: input.handwercher_bestaetigt ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !row) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'nachtrag_entwurf',
    titel: 'Nachtrag angelegt',
    beschreibung: input.grund.slice(0, 500),
    erstellt_von: user.id,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, id: row.id as string }
}

export async function updateNachtragHandwercherBestaetigt(
  nachtragId: string,
  auftragId: string,
  bestaetigt: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const { error } = await supabaseAdmin
    .from('nachtraege')
    .update({
      handwercher_bestaetigt: bestaetigt,
      handwercher_bestaetigt_at: bestaetigt ? new Date().toISOString() : null,
    })
    .eq('id', nachtragId)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function markNachtragGesendet(
  nachtragId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const { error } = await supabaseAdmin
    .from('nachtraege')
    .update({ status: 'gesendet', gesendet_at: new Date().toISOString() })
    .eq('id', nachtragId)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'nachtrag_gesendet',
    titel: 'Nachtrag an Kundin gesendet',
    beschreibung: 'Link zur Bestätigung versendet.',
    erstellt_von: user.id,
    sichtbar_fuer_kunde: true,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function sendNachtragEmailAnKunde(
  nachtragId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const { data: n, error } = await supabaseAdmin
    .from('nachtraege')
    .select(
      'token, grund, positionen, gesamt_min, gesamt_max, auftraege(kunden(email, name, typ))'
    )
    .eq('id', nachtragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (error || !n) return { ok: false, message: 'Nachtrag nicht gefunden' }

  const row = n as Record<string, unknown>
  const auf = row.auftraege as {
    kunden?: { email?: string | null; name?: string; typ?: string | null } | null
  } | null
  const email = auf?.kunden?.email?.trim()
  if (!email) return { ok: false, message: 'Kunden-E-Mail fehlt' }

  const token = String(row.token)
  const link = absUrl(`/nachtrag/${token}`)
  const pos = normalizeAngebotPositionen(row.positionen ?? [])
  const name = auf?.kunden?.name?.trim() || 'Kundin/Kunde'

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailNachtrag(
    {
      name,
      kundeTyp: auf?.kunden?.typ ?? null,
      grund: String(row.grund ?? ''),
      positionen: pos.map((p) => ({
        beschreibung: p.beschreibung,
        gesamt_min: p.gesamt_min * p.menge,
        gesamt_max: p.gesamt_max * p.menge,
      })),
      gesamt_min: Number(row.gesamt_min ?? 0),
      gesamt_max: Number(row.gesamt_max ?? 0),
      bestaetigungsLink: link,
    },
    branding
  )
  const mail = await sendMail({
    typ: 'nachtrag',
    an: email,
    anName: name,
    betreff: tpl.betreff,
    html: tpl.html,
    auftragId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Mail fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'mail_kunde',
    titel: 'Nachtrag: E-Mail an Kundin',
    beschreibung: `Link: ${link}`,
    erstellt_von: user.id,
    sichtbar_fuer_kunde: true,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function sendNachtragErinnerungAnKunde(
  nachtragId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const { data: n, error } = await supabaseAdmin
    .from('nachtraege')
    .select('token, grund, positionen, gesamt_min, gesamt_max, auftraege(kunden(email, name, typ))')
    .eq('id', nachtragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (error || !n) return { ok: false, message: 'Nachtrag nicht gefunden' }
  const row = n as Record<string, unknown>
  const auf = row.auftraege as {
    kunden?: { email?: string | null; name?: string; typ?: string | null } | null
  } | null
  const email = auf?.kunden?.email?.trim()
  if (!email) return { ok: false, message: 'Kunden-E-Mail fehlt' }

  const link = absUrl(`/nachtrag/${String(row.token)}`)
  const pos = normalizeAngebotPositionen(row.positionen ?? [])
  const name = auf?.kunden?.name?.trim() || 'Kundin/Kunde'

  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailNachtrag(
    {
      name,
      kundeTyp: auf?.kunden?.typ ?? null,
      grund: `Erinnerung: ${String(row.grund ?? '')}`,
      positionen: pos.map((p) => ({
        beschreibung: p.beschreibung,
        gesamt_min: p.gesamt_min * p.menge,
        gesamt_max: p.gesamt_max * p.menge,
      })),
      gesamt_min: Number(row.gesamt_min ?? 0),
      gesamt_max: Number(row.gesamt_max ?? 0),
      bestaetigungsLink: link,
    },
    branding
  )
  const mail = await sendMail({
    typ: 'nachtrag',
    an: email,
    anName: name,
    betreff: `Erinnerung — ${tpl.betreff}`,
    html: tpl.html,
    auftragId,
  })
  if (!mail.success) return { ok: false, message: mail.error ?? 'Mail fehlgeschlagen' }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz_intern',
    titel: 'Nachtrag: Erinnerung versendet',
    beschreibung: link,
    erstellt_von: user.id,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export type BaustoppTyp = 'witterung' | 'material' | 'zugang' | 'sonstiges'

export async function createBaustopp(input: {
  auftragId: string
  typ: BaustoppTyp
  grund: string
  beginn_datum: string
  ende_datum: string | null
  neues_enddatum: string
  kunde_informiert: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id ?? null
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const { data: auf, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .select('end_datum, kunden(name, email)')
    .eq('id', input.auftragId)
    .maybeSingle()

  if (aErr || !auf) return { ok: false, message: 'Auftrag nicht gefunden' }

  const altes = (auf.end_datum as string | null) ?? input.neues_enddatum
  const neuEnd = new Date(input.neues_enddatum.includes('T') ? input.neues_enddatum : `${input.neues_enddatum}T12:00:00`)
  const verzug = Math.max(0, Math.round((neuEnd.getTime() - new Date(altes ?? input.neues_enddatum).getTime()) / 86400000))

  const { error: ins } = await supabaseAdmin.from('baustopps').insert({
    auftrag_id: input.auftragId,
    typ: input.typ,
    grund: input.grund.trim(),
    beginn_datum: input.beginn_datum,
    ende_datum: input.ende_datum,
    verzoegerung_tage: verzug,
    altes_enddatum: altes,
    neues_enddatum: input.neues_enddatum,
    kunde_informiert: input.kunde_informiert,
    erstellt_von: uid,
  })

  if (ins) return { ok: false, message: ins.message }

  await supabaseAdmin
    .from('auftraege')
    .update({ end_datum: input.neues_enddatum, updated_at: new Date().toISOString() })
    .eq('id', input.auftragId)

  const typLabel =
    input.typ === 'witterung'
      ? 'Witterung'
      : input.typ === 'material'
        ? 'Material'
        : input.typ === 'zugang'
          ? 'Zugang'
          : 'Sonstiges'

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'baustopp',
    titel: `Baustopp: ${typLabel}`,
    beschreibung: `${input.grund}\nVerzögerung ca. ${verzug} Tage\nNeues Enddatum: ${input.neues_enddatum}`,
    erstellt_von: uid,
    sichtbar_fuer_kunde: input.kunde_informiert,
  })

  const kRaw = auf.kunden as { name?: string; email?: string | null } | { name?: string; email?: string | null }[] | null
  const k = Array.isArray(kRaw) ? kRaw[0] : kRaw
  if (input.kunde_informiert && k?.email?.trim()) {
    const vorname = k.name?.split(/\s+/)[0] ?? k.name ?? 'Kundin'
    await sendEmailHtml({
      to: k.email.trim(),
      subject: 'Kurze Info zu Ihrem Projekt — Bärenwald München',
      typ: 'termin',
      html: `<p>Guten Tag ${vorname},</p>
        <p>aufgrund von <strong>${typLabel}</strong> müssen wir die Arbeiten vorübergehend unterbrechen.</p>
        <p>${input.grund.replace(/</g, '&lt;')}</p>
        <p>Neues voraussichtliches Ende: <strong>${input.neues_enddatum}</strong></p>
        <p>Wir halten Sie auf dem Laufenden.</p>`,
    })
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  revalidatePath('/')
  return { ok: true }
}

export async function beendeBaustopp(
  baustoppId: string,
  auftragId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const uid = (await createClient().auth.getUser()).data.user?.id ?? null
  if (!uid) return { ok: false, message: 'Nicht angemeldet' }

  const heute = new Date().toISOString().slice(0, 10)

  const { data: b, error: lErr } = await supabaseAdmin
    .from('baustopps')
    .select('beginn_datum, grund, typ')
    .eq('id', baustoppId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (lErr || !b) return { ok: false, message: 'Baustopp nicht gefunden' }

  const { error } = await supabaseAdmin
    .from('baustopps')
    .update({ ende_datum: heute })
    .eq('id', baustoppId)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }

  const beginn = new Date(String(b.beginn_datum))
  const ende = new Date(heute)
  const tage = Math.max(1, Math.round((ende.getTime() - beginn.getTime()) / 86400000))

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'baustopp_beendet',
    titel: 'Baustopp beendet',
    beschreibung: `Nach ca. ${tage} Tag(en). ${String(b.grund ?? '').slice(0, 200)}`,
    erstellt_von: uid,
  })

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/')
  return { ok: true }
}
