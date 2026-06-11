'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
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
import type { AuftragPosition, Kunde } from '@/lib/types'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { ensureKundenTokenForAuftrag } from '@/lib/projekt/kunden-token'
import { auftragBautagebuchEintragUrl, projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { sendMail } from '@/lib/mail-service'
import { BAUTAGEBUCH_MAX_FOTOS, bautagebuchFotoUrls, resolveBautagebuchFotosForCrm } from '@/lib/auftraege/bautagebuch-fotos'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { normalizeUrlList } from '@/lib/utils'
import { richTextToPlain } from '@/lib/rich-text'
import type { AuftragBautagebuchEintrag } from '@/lib/types'

const GEWERK_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function gewerkPhaseFromSelection(selected: string | null | undefined): {
  gewerk_id: string | null
  gewerk_phase_key: string | null
} {
  const v = selected?.trim()
  if (!v) return { gewerk_id: null, gewerk_phase_key: null }
  if (GEWERK_UUID_RE.test(v)) return { gewerk_id: v, gewerk_phase_key: null }
  return { gewerk_id: null, gewerk_phase_key: v }
}

async function assertAuftrag(auftragId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet', userId: null }
  const { data, error } = await supabase.from('auftraege').select('id').eq('id', auftragId).maybeSingle()
  if (error || !data) return { ok: false as const, message: 'Auftrag nicht gefunden', userId: null }
  return { ok: true as const, userId: user.id }
}

function normalizeBautagebuchFotoInput(
  urls: string[] | null | undefined
): string[] | { ok: false; message: string } {
  const list = bautagebuchFotoUrls(normalizeUrlList(urls))
  if (list.length > BAUTAGEBUCH_MAX_FOTOS) {
    return { ok: false, message: `Maximal ${BAUTAGEBUCH_MAX_FOTOS} Fotos pro Bautagebuch-Eintrag.` }
  }
  return list
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
  await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .update({ timeline_id: timelineId, updated_at: now })
    .eq('id', eintrag.id)
  return { ok: true, timelineId }
}

export async function createAuftragBautagebuchEintrag(input: {
  auftragId: string
  titel: string
  beschreibung?: string | null
  datum: string
  gewerk_phase?: string | null
  foto_urls?: string[]
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate
  const titel = input.titel.trim()
  if (!titel) return { ok: false, message: 'Titel fehlt' }
  const phase = gewerkPhaseFromSelection(input.gewerk_phase)
  const fotos = normalizeBautagebuchFotoInput(input.foto_urls)
  if (!Array.isArray(fotos)) return fotos

  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_bautagebuch_eintraege')
    .insert({
      auftrag_id: input.auftragId,
      titel,
      beschreibung: input.beschreibung?.trim() || null,
      datum: input.datum.slice(0, 10),
      gewerk_id: phase.gewerk_id,
      gewerk_phase_key: phase.gewerk_phase_key,
      foto_urls: fotos,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { ok: false, message: bautagebuchDbErrorMessage(error?.message ?? 'Speichern fehlgeschlagen') }
  }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, id: data.id as string }
}

export async function updateAuftragBautagebuchEintrag(input: {
  auftragId: string
  eintragId: string
  titel?: string
  beschreibung?: string | null
  datum?: string
  gewerk_phase?: string | null
  foto_urls?: string[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.titel !== undefined) patch.titel = input.titel.trim()
  if (input.beschreibung !== undefined) patch.beschreibung = input.beschreibung?.trim() || null
  if (input.datum !== undefined) patch.datum = input.datum.slice(0, 10)
  if (input.gewerk_phase !== undefined) {
    const phase = gewerkPhaseFromSelection(input.gewerk_phase)
    patch.gewerk_id = phase.gewerk_id
    patch.gewerk_phase_key = phase.gewerk_phase_key
  }
  if (input.foto_urls !== undefined) {
    const fotos = normalizeBautagebuchFotoInput(input.foto_urls)
    if (!Array.isArray(fotos)) return fotos
    patch.foto_urls = fotos
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_bautagebuch_eintraege')
    .update(patch)
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)

  if (error) return { ok: false, message: bautagebuchDbErrorMessage(error.message) }

  const { data: row } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .maybeSingle()

  if (row && (row as { fuer_kunde_freigegeben?: boolean }).fuer_kunde_freigegeben) {
    const e = mapEintrag(row as Record<string, unknown>)
    await syncTimelineFromEintrag(e, gate.userId, true)
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function deleteAuftragBautagebuchEintrag(input: {
  auftragId: string
  eintragId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data: row } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('timeline_id')
    .eq('id', input.eintragId)
    .maybeSingle()

  const supabase = createClient()
  const { error } = await supabase
    .from('auftrag_bautagebuch_eintraege')
    .delete()
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)

  if (error) return { ok: false, message: bautagebuchDbErrorMessage(error.message) }

  const tlId = (row as { timeline_id?: string } | null)?.timeline_id
  if (tlId) {
    await supabaseAdmin.from('auftrag_timeline').delete().eq('id', tlId)
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

async function loadBautagebuchMailKontext(auftragId: string, anredeOverride?: AngebotMailAnrede) {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunde_id, lead_id, kunden(name, email, typ, vorname, nachname, ansprechpartner), angebote(leistungsumfang, notizen)')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) return { ok: false as const, message: 'Auftrag nicht gefunden' }

  const kundeRaw = (Array.isArray(auf.kunden) ? auf.kunden[0] : auf.kunden) as Kunde | null
  if (!kundeRaw?.email?.trim()) return { ok: false as const, message: 'Keine Kunden-E-Mail' }

  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kundeRaw)
  const anrede: AngebotMailAnrede =
    anredeOverride ?? (istPrivatKundeTyp(kundeRaw.typ) ? 'du' : 'sie')
  const begruessung = kundeAngebotBegruessung(anrede, kundeAnredeKontextFromEmpfaenger(empfaenger))

  const angRaw = auf.angebote
  const angebot = Array.isArray(angRaw) ? angRaw[0] : angRaw
  const projektTitel = resolveBautagebuchProjektTitel({
    auftragTitel: auf.titel as string | null,
    angebot: angebot ?? null,
    kundeName: empfaenger.name,
  })

  const { data: posRows } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: true })

  const { data: gwRows } = await supabaseAdmin.from('gewerke').select('id, name, slug').eq('aktiv', true)

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

  const { data: eintragRow } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', eintragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
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

export async function previewBautagebuchKundenMail(input: {
  auftragId: string
  eintragId: string
  betreff: string
  nachricht: string
  anrede: AngebotMailAnrede
}): Promise<
  | { ok: true; html: string; defaultTo: string[]; defaultCc: string[] }
  | { ok: false; message: string }
> {
  const built = await buildBautagebuchKundenMail(input)
  if (!built.ok) return built
  return {
    ok: true,
    html: built.html,
    defaultTo: [built.kundeEmail],
    defaultCc: [],
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

  const { data: eintragRow } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
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

  const { data: row } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
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

  await sendMail({
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

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'mail_kunde',
    titel: 'Bautagebuch an Kunde gesendet',
    beschreibung: `${eintrag.titel} — ${built.betreff}`,
    sichtbar_fuer_kunde: false,
    erstellt_von: gate.userId,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

/** CRM: Eintrag auf Kunden-Projektseite live stellen — ohne E-Mail. */
export async function freigebenBautagebuchEintrag(input: {
  auftragId: string
  eintragId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const { data: row } = await supabaseAdmin
    .from('auftrag_bautagebuch_eintraege')
    .select('*')
    .eq('id', input.eintragId)
    .eq('auftrag_id', input.auftragId)
    .maybeSingle()
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

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function anfrageHandwerkerBautagebuchEintrag(input: {
  auftragId: string
  handwerkerId: string
  notiz?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId.trim())
  if (!gate.ok) return { ok: false, message: gate.message }

  const { sendHandwerkerBautagebuchAnfrage } = await import(
    '@/lib/auftraege/send-bautagebuch-anfrage-handwerker'
  )

  const res = await sendHandwerkerBautagebuchAnfrage({
    auftragId: input.auftragId.trim(),
    handwerkerId: input.handwerkerId.trim(),
    notiz: input.notiz,
    angefordertVonUserId: gate.userId,
  })
  if (!res.ok) return res

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId.trim(),
    typ: 'mail_handwerker',
    titel: 'Tagebucheintrag angefordert',
    beschreibung: 'Partner per E-Mail zur Bautagebuch-Dokumentation aufgefordert.',
    sichtbar_fuer_kunde: false,
    erstellt_von: gate.userId,
  })

  revalidatePath(`/auftraege/${input.auftragId.trim()}`)
  return { ok: true }
}
