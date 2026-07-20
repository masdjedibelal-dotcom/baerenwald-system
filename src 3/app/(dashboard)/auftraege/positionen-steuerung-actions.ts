'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { istPrivatKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailText, type MailAnrede } from '@/lib/mail/anrede'
import { mailHtmlBase } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { ensureKundenTokenForAuftrag } from '@/lib/projekt/kunden-token'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { gewichteterFortschrittProzent } from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  metaHandwerkerEntfernt,
  metaNeueLeistungMitPartner,
  metaPartnerAenderung,
} from '@/lib/auftraege/partner-vorgang-meta'
import type { AuftragLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import type { AuftragPosition, AuftragPositionNotiz } from '@/lib/types'
import {
  positionPatchBenoetigtVertragSync,
  syncProjektvertragStilleFireAndForget,
} from '@/lib/vertraege/sync-projektvertrag-stille'

/** Fortschritt auf Auftragsebene aus Leistungsstatus + Verkaufspreisen berechnen. */
export async function syncAuftragFortschrittFromPositionen(
  auftragId: string
): Promise<{ ok: true; fortschritt: number } | { ok: false; message: string }> {
  const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate

  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_positionen')
    .select('preis_fix, leistung_status')
    .eq('auftrag_id', auftragId)

  if (error) {
    if (error.code === '42703' || error.message.includes('leistung_status')) {
      const { data: fallback, error: err2 } = await supabase
        .from('auftrag_positionen')
        .select('preis_fix')
        .eq('auftrag_id', auftragId)
      if (err2) return { ok: false, message: err2.message }
      const pct = gewichteterFortschrittProzent(
        (fallback ?? []).map((r) => ({ preis_fix: r.preis_fix, leistung_status: 'offen' } as AuftragPosition))
      )
      const { error: upErr } = await supabase
        .from('auftraege')
        .update({ fortschritt: pct, updated_at: new Date().toISOString() })
        .eq('id', auftragId)
      if (upErr) return { ok: false, message: upErr.message }
      revalidatePath(`/auftraege/${auftragId}`)
      return { ok: true, fortschritt: pct }
    }
    return { ok: false, message: error.message }
  }

  const pct = gewichteterFortschrittProzent((data ?? []) as AuftragPosition[])
  const { error: upErr } = await supabase
    .from('auftraege')
    .update({ fortschritt: pct, updated_at: new Date().toISOString() })
    .eq('id', auftragId)
  if (upErr) return { ok: false, message: upErr.message }
  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return { ok: true, fortschritt: pct }
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

export async function reorderAuftragPositionen(
  auftragId: string,
  orderedIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(auftragId)
  if (!gate.ok) return gate
  const supabase = createClient()
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('auftrag_positionen')
      .update({ sort_order: (i + 1) * 10 })
      .eq('id', orderedIds[i]!)
      .eq('auftrag_id', auftragId)
    if (error) return { ok: false, message: error.message }
  }
  revalidatePath(`/auftraege/${auftragId}`)
  return { ok: true }
}

export async function updateAuftragPositionSteuerung(
  posId: string,
  auftragId: string,
  data: Partial<
    Pick<
      AuftragPosition,
      | 'gewerk_slug'
      | 'gewerk_name'
      | 'gewerk_block_key'
      | 'projekt_phase'
      | 'oberkategorie'
      | 'unterkategorie'
      | 'leistung_name'
      | 'beschreibung'
      | 'einheit'
      | 'menge'
      | 'preis_fix'
      | 'preis_partner'
      | 'lohn_fix'
      | 'material_fix'
      | 'start_datum'
      | 'end_datum'
      | 'handwerker_id'
      | 'leistung_status'
    >
  >
): Promise<{ ok: true; partnerAenderung?: boolean } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) patch[k] = v
  }
  if (!Object.keys(patch).length) return { ok: true }

  const { data: currentRow } = await supabase
    .from('auftrag_positionen')
    .select('handwerker_id, preis_partner, handwerker_status, aenderung_typ, leistung_name, beschreibung')
    .eq('id', posId)
    .maybeSingle()

  const current = currentRow as {
    handwerker_id: string | null
    preis_partner: number | null
    handwerker_status?: string | null
    aenderung_typ?: string | null
    leistung_name?: string | null
    beschreibung?: string | null
  } | null

  if (patch.handwerker_id === null) {
    Object.assign(patch, metaHandwerkerEntfernt())
  } else if (current) {
    const inhaltGeaendert =
      ('leistung_name' in patch &&
        String(patch.leistung_name ?? '') !== String(current.leistung_name ?? '')) ||
      ('beschreibung' in patch &&
        String(patch.beschreibung ?? '') !== String(current.beschreibung ?? ''))

    const partnerMeta = metaPartnerAenderung(current, {
      handwerkerId: 'handwerker_id' in patch ? (patch.handwerker_id as string | null) : undefined,
      preisPartner: 'preis_partner' in patch ? (patch.preis_partner as number | null) : undefined,
      inhaltGeaendert,
    })
    if (partnerMeta) Object.assign(patch, partnerMeta)
  }

  if (patch.preis_partner != null && !('handwerker_id' in patch) && !current?.handwerker_id) {
    patch.preis_partner = null
  }

  let vorherHandwerkerId: string | null = null
  if (positionPatchBenoetigtVertragSync(patch)) {
    vorherHandwerkerId = current?.handwerker_id ? String(current.handwerker_id) : null
  }

  const { error } = await supabase.from('auftrag_positionen').update(patch).eq('id', posId)
  if (error) return { ok: false, message: error.message }

  if (positionPatchBenoetigtVertragSync(patch)) {
    const nachherHandwerkerId =
      patch.handwerker_id !== undefined
        ? patch.handwerker_id
          ? String(patch.handwerker_id)
          : null
        : vorherHandwerkerId
    if (vorherHandwerkerId && vorherHandwerkerId !== nachherHandwerkerId) {
      syncProjektvertragStilleFireAndForget(auftragId, vorherHandwerkerId)
    }
    if (nachherHandwerkerId) {
      syncProjektvertragStilleFireAndForget(auftragId, nachherHandwerkerId)
    }
  }
  if ('leistung_status' in patch || 'preis_fix' in patch) {
    await syncAuftragFortschrittFromPositionen(auftragId)
  } else {
    revalidatePath(`/auftraege/${auftragId}`)
  }
  const partnerAenderung = Boolean(
    current?.handwerker_id &&
      patch.aenderung_typ &&
      patch.aenderung_typ !== 'neu'
  )
  return { ok: true, partnerAenderung }
}

export async function updateAuftragPositionLeistungStatus(input: {
  auftragId: string
  positionId: string
  status: AuftragLeistungStatus
}): Promise<{ ok: true } | { ok: false; message: string }> {
  return updateAuftragPositionSteuerung(input.positionId, input.auftragId, {
    leistung_status: input.status,
  })
}

export async function updateAuftragGewerkBlockMeta(input: {
  auftragId: string
  positionIds: string[]
  gewerk_name?: string
  gewerk_slug?: string | null
  projekt_phase?: string | null
  start_datum?: string | null
  end_datum?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!input.positionIds.length) return { ok: false, message: 'Keine Positionen' }
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  if (input.gewerk_name !== undefined) patch.gewerk_name = input.gewerk_name
  if (input.gewerk_slug !== undefined) patch.gewerk_slug = input.gewerk_slug
  if (input.projekt_phase !== undefined) patch.projekt_phase = input.projekt_phase?.trim() || null
  if (input.start_datum !== undefined) patch.start_datum = input.start_datum || null
  if (input.end_datum !== undefined) patch.end_datum = input.end_datum || null
  if (!Object.keys(patch).length) return { ok: true }
  const { error } = await supabase
    .from('auftrag_positionen')
    .update(patch)
    .in('id', input.positionIds)
    .eq('auftrag_id', input.auftragId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function addAuftragPositionNotiz(input: {
  positionId: string
  auftragId: string
  datum: string
  text: string
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const text = input.text.trim()
  if (!text) return { ok: false, message: 'Text fehlt' }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auftrag_position_notizen')
    .insert({
      position_id: input.positionId,
      datum: input.datum.slice(0, 10),
      text,
    })
    .select('id')
    .single()
  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, id: data.id as string }
}

export async function updateAuftragPositionNotiz(input: {
  notizId: string
  auftragId: string
  datum?: string
  text?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {}
  if (input.datum !== undefined) patch.datum = input.datum.slice(0, 10)
  if (input.text !== undefined) patch.text = input.text.trim()
  const { error } = await supabase.from('auftrag_position_notizen').update(patch).eq('id', input.notizId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function deleteAuftragPositionNotiz(input: {
  notizId: string
  auftragId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('auftrag_position_notizen').delete().eq('id', input.notizId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export type KundeInformierenScope =
  | { type: 'phase'; phase: string; label: string }
  | { type: 'gewerk'; phase: string; gewerkName: string; positionIds: string[] }
  | { type: 'leistung'; positionId: string; leistungName: string }

export async function getKundeInformierenMailDefaults(
  auftragId: string
): Promise<{ ok: true; defaultAnrede: MailAnrede } | { ok: false; message: string }> {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, kunden(typ)')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }
  const typ = (auf.kunden as { typ?: string | null } | null)?.typ
  return { ok: true, defaultAnrede: istPrivatKundeTyp(typ) ? 'du' : 'sie' }
}

export async function previewKundeInformierenMail(input: {
  auftragId: string
  scope: KundeInformierenScope
  betreff: string
  nachricht: string
  anrede: 'du' | 'sie'
}): Promise<{ ok: true; html: string } | { ok: false; message: string }> {
  const built = await buildKundeInformierenMail(input)
  if (!built.ok) return built
  return { ok: true, html: built.html }
}

async function buildKundeInformierenMail(input: {
  auftragId: string
  scope: KundeInformierenScope
  betreff: string
  nachricht: string
  anrede: 'du' | 'sie'
}): Promise<
  | { ok: true; html: string; betreff: string; kundeEmail: string; kundeName: string }
  | { ok: false; message: string }
> {
  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(name, email)')
    .eq('id', input.auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }
  const kunde = auf.kunden as { name?: string; email?: string } | null
  const email = kunde?.email?.trim()
  if (!email) return { ok: false, message: 'Keine Kunden-E-Mail' }

  const vorname = (kunde?.name ?? 'Guten Tag').trim().split(/\s+/)[0] || 'Guten Tag'
  const anrede =
    input.anrede === 'du'
      ? `Hallo ${vorname},`
      : `Guten Tag ${kunde?.name?.trim() || vorname},`

  let scopeLine = ''
  if (input.scope.type === 'phase') {
    scopeLine = `<p style="font-size:13px;color:#6B7280;margin:0 0 12px;"><strong>Phase:</strong> ${escapeHtml(input.scope.label)}</p>`
  } else if (input.scope.type === 'gewerk') {
    scopeLine = `<p style="font-size:13px;color:#6B7280;margin:0 0 12px;"><strong>Gewerk:</strong> ${escapeHtml(input.scope.gewerkName)}</p>`
  } else {
    scopeLine = `<p style="font-size:13px;color:#6B7280;margin:0 0 12px;"><strong>Leistung:</strong> ${escapeHtml(input.scope.leistungName)}</p>`
  }

  const textHtml = escapeHtml(input.nachricht.trim()).replace(/\n/g, '<br/>')
  const branding = await getMailBranding(supabaseAdmin)
  const html = mailHtmlBase(
    `${anrede}<br/><br/>${textHtml}${scopeLine}<p style="font-size:13px;color:#6B7280;margin:16px 0 0;">${mailText(
      input.anrede,
      'Notizen und Fotos zu diesem Abschnitt findest du auf deiner Projekt-Statusseite.',
      'Notizen und Fotos zu diesem Abschnitt finden Sie auf Ihrer Projekt-Statusseite.'
    )}</p>`,
    input.betreff.trim(),
    branding,
    undefined,
    { anrede: input.anrede }
  )

  return {
    ok: true,
    html,
    betreff: input.betreff.trim(),
    kundeEmail: email,
    kundeName: kunde?.name?.trim() || vorname,
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendKundeInformierenMail(input: {
  auftragId: string
  scope: KundeInformierenScope
  betreff: string
  nachricht: string
  anrede: 'du' | 'sie'
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAuftrag(input.auftragId)
  if (!gate.ok) return gate

  const built = await buildKundeInformierenMail(input)
  if (!built.ok) return built

  const token = await ensureKundenTokenForAuftrag(input.auftragId)
  const statusLink = token ? projektUrlFromToken(token) : ''

  await sendMail({
    typ: 'projekt_update',
    an: built.kundeEmail,
    anName: built.kundeName,
    betreff: built.betreff,
    html: built.html.replace(
      'Projekt-Statusseite.',
      `<a href="${statusLink}" style="color:#2E7D52;">Projekt-Statusseite</a>.`
    ),
    auftragId: input.auftragId,
  })

  const scopeTitel =
    input.scope.type === 'phase'
      ? `Phase: ${input.scope.label}`
      : input.scope.type === 'gewerk'
        ? `Gewerk: ${input.scope.gewerkName}`
        : `Leistung: ${input.scope.leistungName}`

  await insertAuftragTimelineEvent({
    auftrag_id: input.auftragId,
    typ: 'mail_kunde',
    titel: 'Kunde informiert',
    beschreibung: `${scopeTitel} — ${built.betreff}`,
    sichtbar_fuer_kunde: true,
    erstellt_von: gate.userId,
  })

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true }
}

export async function loadPositionNotizen(
  positionId: string
): Promise<AuftragPositionNotiz[]> {
  const { data } = await supabaseAdmin
    .from('auftrag_position_notizen')
    .select('*')
    .eq('position_id', positionId)
    .order('datum', { ascending: false })
  return (data ?? []) as AuftragPositionNotiz[]
}
