'use server'

import { revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import {
  buildBautagebuchKundenMail as renderBautagebuchKundenMail,
  defaultBautagebuchKundenNachricht,
  resolveBautagebuchProjektTitel,
} from '@/lib/mail/bautagebuch-kunden-mail'
import {
  kundeAngebotBegruessung,
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { AuftragPosition,Kunde } from '@/lib/types'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { ensureKundenTokenForAuftrag } from '@/lib/projekt/kunden-token'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { sendMail } from '@/lib/mail-service'
import { bautagebuchFotoUrls,resolveBautagebuchFotosForCrm } from '@/lib/auftraege/bautagebuch-fotos'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { normalizeUrlList } from '@/lib/utils'
import { richTextToPlain } from '@/lib/rich-text'
import type { AuftragBautagebuchEintrag } from '@/lib/types'

function bautagebuchDbErrorMessage(message: string): string {
  if (/gewerk_id.*schema cache/i.test(message) || /gewerk_phase_key.*schema cache/i.test(message)) {
    return (
      'Datenbank-Migration fehlt (Gewerk-Spalten). ' +
      'Bitte `npm run db:bautagebuch-gewerk` ausführen oder die Migration ' +
      '`20260601140000_bautagebuch_gewerk_id.sql` im Supabase SQL Editor anwenden.'
    )
  }
  return message
}

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', userId: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftraege', error)
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', userId: null }
  return { ok: true as const, userId: user.id }
}

function mapEintrag(row: Record<string, unknown>): AuftragBautagebuchEintrag {
  const hwRaw = row.handwerker
  const hwOne = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  return {
    id: String(row.id),
    auftrag_id: String(row.auftrag_id),
    timeline_id: row.timeline_id ? String(row.timeline_id) : null,
    titel: String(row.titel),
    beschreibung: row.beschreibung ? String(row.beschreibung) : null,
    datum: String(row.datum).slice(0, 10),
    gewerk_id: row.gewerk_id ? String(row.gewerk_id) : null,
    gewerk_phase_key: row.gewerk_phase_key ? String(row.gewerk_phase_key) : null,
    handwerker_id: row.handwerker_id ? String(row.handwerker_id) : null,
    handwerker: hwOne as AuftragBautagebuchEintrag['handwerker'],
    foto_urls: bautagebuchFotoUrls(normalizeUrlList(row.foto_urls)),
    fuer_kunde_freigegeben: Boolean(row.fuer_kunde_freigegeben),
    freigegeben_at: row.freigegeben_at ? String(row.freigegeben_at) : null,
    an_kunde_gesendet_at: row.an_kunde_gesendet_at ? String(row.an_kunde_gesendet_at) : null,
    sort_order: row.sort_order != null ? Number(row.sort_order) : 0,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }
}

async function enrichEintragForCrm(e: AuftragBautagebuchEintrag): Promise<AuftragBautagebuchEintrag> {
  const foto_display_urls = await resolveBautagebuchFotosForCrm(
    e.foto_urls,
    signedHandwerkerUploadUrl
  )
  return { ...e, foto_display_urls }
}

async function enrichEintragForMail(e: AuftragBautagebuchEintrag): Promise<AuftragBautagebuchEintrag> {
  const foto_display_urls = await resolveBautagebuchFotosForCrm(
    e.foto_urls,
    signedHandwerkerUploadUrl,
    60 * 60 * 24 * 7
  )
  return {
    ...e,
    foto_urls: foto_display_urls.length ? foto_display_urls : e.foto_urls,
    foto_display_urls,
  }
}

export async function listAuftragBautagebuch(
  auftragId: string
): Promise<AuftragBautagebuchEintrag[]> {
  const { data, error } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*, handwerker(id, name, firma)')
    .eq('auftrag_id', auftragId)
    .order('datum', { ascending: false })
    .order('sort_order', { ascending: false })
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftrag_bautagebuch_eintraege', error)

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return []
    console.warn('[listAuftragBautagebuch]', error.message)
    return []
  }
  return Promise.all((data ?? []).map((r) => enrichEintragForCrm(mapEintrag(r as Record<string, unknown>))))
}

async function syncTimelineFromEintrag(
  eintrag: AuftragBautagebuchEintrag,
  userId: string | null,
  publish: boolean
): Promise<{ ok: true; timelineId: string } | { ok: false; message: string }> {
  const now = new Date().toISOString()
  const beschreibungPlain = richTextToPlain(eintrag.beschreibung).trim()
  const payload = {
    typ: 'bautagebuch',
    titel: eintrag.titel.trim(),
    beschreibung: eintrag.beschreibung?.trim() || beschreibungPlain || null,
    foto_urls: normalizeUrlList(eintrag.foto_urls),
    fuer_kunde_freigegeben: publish,
    freigegeben_at: publish ? now : null,
    sichtbar_fuer_kunde: publish,
  }

  if (eintrag.timeline_id) {
    const { error } = await supabaseAdmin
      .from('auftrag_timeline')
      .update(payload)
      .eq('id', eintrag.timeline_id)
      .eq('auftrag_id', eintrag.auftrag_id)
    if (error) logDbError('app/auftraege/bautagebuch-actions:auftrag_timeline', error)
    if (error) return { ok: false, message: bautagebuchDbErrorMessage(error.message) }
    return { ok: true, timelineId: eintrag.timeline_id }
  }

  const ins = await insertAuftragTimelineEvent({
    auftrag_id: eintrag.auftrag_id,
    typ: 'bautagebuch',
    titel: payload.titel,
    beschreibung: payload.beschreibung,
    foto_urls: payload.foto_urls,
    erstellt_von: userId,
    fuer_kunde_freigegeben: publish,
    freigegeben_at: publish ? now : null,
    sichtbar_fuer_kunde: publish,
  })
  if (!ins.ok) return ins
  const timelineId = ins.id!
  const { error: __dbErr1 } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .update({ timeline_id: timelineId, updated_at: now })
    .eq('id', eintrag.id)
  if (__dbErr1) logDbError('app/auftraege/bautagebuch-actions:auftrag_bautagebuch_eintraege', __dbErr1)
  return { ok: true, timelineId }
}

async function loadBautagebuchMailKontext(auftragId: string, anredeOverride?: AngebotMailAnrede) {
  const { data: auf, error } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunde_id, lead_id, kunden(name, email, typ, vorname, nachname, ansprechpartner), angebote(leistungsumfang, notizen)')
    .eq('id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftraege', error)
  if (!auf) return { ok: false as const, message: 'Auftrag nicht gefunden' }

  const kundeRaw = (Array.isArray(auf.kunden) ? auf.kunden[0] : auf.kunden) as Kunde | null
  if (!kundeRaw?.email?.trim()) return { ok: false as const, message: 'Keine Kunden-E-Mail' }

  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kundeRaw)
  const anrede: AngebotMailAnrede = 'sie'
  const begruessung = kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger))

  const angRaw = auf.angebote
  const angebot = Array.isArray(angRaw) ? angRaw[0] : angRaw
  const projektTitel = resolveBautagebuchProjektTitel({
    auftragTitel: auf.titel as string | null,
    angebot: angebot ?? null,
    kundeName: empfaenger.name,
  })

  const { data: posRows, error: error2 } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })
  if (error2) logDbError('app/auftraege/bautagebuch-actions:auftrag_positionen', error2)

  const { data: gwRows } = await supabaseAdmin.from('gewerke').select('id, name, slug').eq('aktiv', true)
  if (error2) logDbError('app/auftraege/bautagebuch-actions:gewerke', error2)

  return {
    ok: true as const,
    anrede,
    begruessung,
    kundeEmail: empfaenger.email!.trim(),
    kundeName: empfaenger.name,
    kundeId: (auf.kunde_id as string | null) ?? null,
    leadId: (auf.lead_id as string | null) ?? null,
    projektTitel,
    positionen: (posRows ?? []) as AuftragPosition[],
    gewerke: (gwRows ?? []) as { id: string; name: string; slug: string }[],
  }
}

export async function getBautagebuchMailDefaults(
  auftragId: string,
  eintragId: string
): Promise<
  | {
      ok: true
      defaultAnrede: AngebotMailAnrede
      defaultBetreff: string
      defaultNachricht: string
      defaultTo: string[]
      projektTitel: string
    }
  | { ok: false; message: string }
> {
  const ctx = await loadBautagebuchMailKontext(auftragId)
  if (!ctx.ok) return ctx

  const { data: eintragRow, error } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', eintragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftrag_bautagebuch_eintraege', error)
  if (!eintragRow) return { ok: false, message: 'Eintrag nicht gefunden' }

  const eintrag = mapEintrag(eintragRow as Record<string, unknown>)
  const eintragMail = await enrichEintragForMail(eintrag)
  const branding = await getMailBranding(supabaseAdmin)
  const nachricht = defaultBautagebuchKundenNachricht(ctx.anrede, eintragMail, ctx.projektTitel)
  const { betreff } = renderBautagebuchKundenMail(
    {
      anrede: ctx.anrede,
      begruessung: ctx.begruessung,
      nachricht,
      projektTitel: ctx.projektTitel,
      positionen: ctx.positionen,
      gewerke: ctx.gewerke,
      eintrag: eintragMail,
      previewMode: true,
    },
    branding
  )

  return {
    ok: true,
    defaultAnrede: ctx.anrede,
    defaultBetreff: betreff,
    defaultNachricht: nachricht,
    defaultTo: [ctx.kundeEmail],
    projektTitel: ctx.projektTitel,
  }
}

async function buildBautagebuchKundenMail(input: {
  auftragId: string
  eintragId: string
  betreff: string
  nachricht: string
  anrede: AngebotMailAnrede
}): Promise<
  | {
      ok: true
      html: string
      betreff: string
      kundeEmail: string
      kundeName: string
      kundeId: string | null
      leadId: string | null
    }
  | { ok: false; message: string }
> {
  const ctx = await loadBautagebuchMailKontext(input.auftragId, input.anrede)
  if (!ctx.ok) return ctx

  const { data: eintragRow, error } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftrag_bautagebuch_eintraege', error)
  if (!eintragRow) return { ok: false, message: 'Eintrag nicht gefunden' }

  const eintrag = mapEintrag(eintragRow as Record<string, unknown>)
  const eintragMail = await enrichEintragForMail(eintrag)
  const token = await ensureKundenTokenForAuftrag(input.auftragId)
  const updateId = eintrag.timeline_id?.trim() || null
  const statusLink = token ? projektUrlFromToken(token, { updateId }) : ''
  const branding = await getMailBranding(supabaseAdmin)

  const tpl = renderBautagebuchKundenMail(
    {
      anrede: input.anrede,
      begruessung: ctx.begruessung,
      nachricht: input.nachricht,
      projektTitel: ctx.projektTitel,
      positionen: ctx.positionen,
      gewerke: ctx.gewerke,
      eintrag: eintragMail,
      statusLink,
      previewMode: !statusLink,
    },
    branding
  )

  return {
    ok: true,
    html: tpl.html,
    betreff: input.betreff.trim() || tpl.betreff,
    kundeEmail: ctx.kundeEmail,
    kundeName: ctx.kundeName,
    kundeId: ctx.kundeId,
    leadId: ctx.leadId,
  }
}

export async function sendBautagebuchAnKunde(input: {
  auftragId: string
  eintragId: string
  betreff: string
  nachricht: string
  anrede: AngebotMailAnrede
  to?: string[]
  cc?: string[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data: row, error } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftrag_bautagebuch_eintraege', error)
  if (!row) return { ok: false, message: 'Eintrag nicht gefunden' }

  let eintrag = mapEintrag(row as Record<string, unknown>)
  const sync = await syncTimelineFromEintrag(eintrag, gate.userId, true)
  if (!sync.ok) return sync

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .update({
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
      an_kunde_gesendet_at: now,
      timeline_id: sync.timelineId,
      updated_at: now,
    })
    .eq('id', input.eintragId)

  const built = await buildBautagebuchKundenMail(input)
  if (!built.ok) return built

  const toList = input.to?.map((v) => v.trim()).filter(Boolean) ?? [built.kundeEmail]
  if (!toList.length) return { ok: false, message: 'Bitte mindestens eine An-Adresse eingeben.' }
  const ccList = input.cc?.map((v) => v.trim()).filter(Boolean)

  const sent = await sendMail({
    typ: 'projekt_update',
    an: toList.length === 1 ? toList[0]! : toList,
    anName: built.kundeName,
    cc: ccList?.length ? ccList : undefined,
    betreff: built.betreff,
    html: built.html,
    kundeId: built.kundeId,
    leadId: built.leadId,
    auftragId: input.auftragId,
    kontextTyp: 'auftrag',
  })
  if (!sent.success) {
    return { ok: false, message: sent.error ?? 'E-Mail fehlgeschlagen' }
  }

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'mail_kunde',
    titel: 'Bautagebuch an Kunde gesendet',
    beschreibung: `${eintrag.titel} — ${built.betreff}`,
    sichtbar_fuer_kunde: false,
    erstellt_von: gate.userId,
    email_log_id: sent.emailLogId ?? null,
  })

  try {
    const { notifyPortalBautagebuchFromCrm } = await import(
      '@/lib/portal/notify-portal-bautagebuch'
    )
    await notifyPortalBautagebuchFromCrm({
      auftragId: input.auftragId,
      eintragTitel: eintrag.titel,
    })
  } catch (e) {
    console.warn('[sendBautagebuchAnKunde] Portal-Notify:', e)
  }

  revalidateAuftragDetail(input.auftragId)
  return { ok: true }
}

/** CRM: Eintrag auf Kunden-Projektseite live stellen — ohne E-Mail. */
export async function freigebenBautagebuchEintrag(input: {
  auftragId: string
  eintragId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data: row, error } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/bautagebuch-actions:auftrag_bautagebuch_eintraege', error)
  if (!row) return { ok: false, message: 'Eintrag nicht gefunden' }

  let eintrag = mapEintrag(row as Record<string, unknown>)
  const sync = await syncTimelineFromEintrag(eintrag, gate.userId, true)
  if (!sync.ok) return sync

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .update({
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
      timeline_id: sync.timelineId,
      updated_at: now,
    })
    .eq('id', input.eintragId)

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'bautagebuch',
    titel: 'Bautagebuch freigegeben',
    beschreibung: `${eintrag.titel} — auf Kunden-Projektseite sichtbar (ohne E-Mail).`,
    sichtbar_fuer_kunde: false,
    erstellt_von: gate.userId,
  })

  try {
    const { notifyPortalBautagebuchFromCrm } = await import(
      '@/lib/portal/notify-portal-bautagebuch'
    )
    await notifyPortalBautagebuchFromCrm({
      auftragId: input.auftragId,
      eintragTitel: eintrag.titel,
    })
  } catch (e) {
    console.warn('[freigebenBautagebuchEintrag] Portal-Notify:', e)
  }

  revalidateAuftragDetail(input.auftragId)
  return { ok: true }
}
