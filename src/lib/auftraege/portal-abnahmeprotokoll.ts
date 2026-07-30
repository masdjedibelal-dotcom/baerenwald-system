/**
 * Portal → CRM: Abnahmeprotokoll nach Kunden-Signatur + Bestätigen/Versenden.
 */
import {
  getAbnahmeprotokollMailDefaults,
  loadAbnahmeprotokollSummary,
  saveAbnahmeprotokollPdfOnly,
  saveAndSendAbnahmeprotokoll,
} from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import type { AbnahmeMangel, AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import {
  emptyAbnahmeProtokollMeta,
  normalizeAbnahmeProtokollMeta,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { notifyPartnerUnified } from '@/lib/partner/notify-partner-unified'
import { partnerVorgangRelativeLink } from '@/lib/portal-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type PortalAbnahmeNachSignaturBody = {
  abnahme_datum: string
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  notizen?: string | null
  meta?: Partial<AbnahmeProtokollMeta> | null
}

async function assertPartnerOwnsAuftrag(
  auftragId: string,
  handwerkerId: string
): Promise<boolean> {
  const { data: hw } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('auftrag_id')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .limit(1)
  if (hw?.length) return true

  const { data: pos } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('id')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .limit(1)
  return Boolean(pos?.length)
}

function partnerAbnahmeLink(auftragId: string, protokollId: string): string {
  const base = partnerVorgangRelativeLink(auftragId)
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}focus=abnahme&protokoll=${encodeURIComponent(protokollId)}`
}

export async function getPortalAbnahmeStatus(
  auftragId: string,
  handwerkerId: string,
  protokollId?: string | null
): Promise<
  | {
      ok: true
      protokoll_id: string | null
      pdf_url: string | null
      abnahme_datum: string | null
      punkte_count: number
      maengel_count: number
      an_kunde_gesendet_at: string | null
      handwerker_bestaetigt_at: string | null
      abnahme_ergebnis: string | null
    }
  | { ok: false; message: string }
> {
  if (!(await assertPartnerOwnsAuftrag(auftragId, handwerkerId))) {
    return { ok: false, message: 'Kein Zugriff auf diesen Auftrag.' }
  }

  const summary = await loadAbnahmeprotokollSummary(auftragId, protokollId)
  if (!summary) {
    return {
      ok: true,
      protokoll_id: null,
      pdf_url: null,
      abnahme_datum: null,
      punkte_count: 0,
      maengel_count: 0,
      an_kunde_gesendet_at: null,
      handwerker_bestaetigt_at: null,
      abnahme_ergebnis: null,
    }
  }

  return {
    ok: true,
    protokoll_id: summary.id,
    pdf_url: summary.pdf_url,
    abnahme_datum: summary.abnahme_datum,
    punkte_count: summary.punkte.length,
    maengel_count: summary.maengel.filter(
      (m) => (m.status ?? 'offen') !== 'behoben' && (m.status ?? 'offen') !== 'abgenommen'
    ).length,
    an_kunde_gesendet_at: summary.an_kunde_gesendet_at,
    handwerker_bestaetigt_at: summary.meta.handwerker_bestaetigt_at ?? null,
    abnahme_ergebnis: summary.meta.abnahme_ergebnis ?? null,
  }
}

export async function createPortalAbnahmeNachSignatur(
  auftragId: string,
  handwerkerId: string,
  body: PortalAbnahmeNachSignaturBody
): Promise<
  | { ok: true; protokoll_id: string; pdf_url: string }
  | { ok: false; message: string }
> {
  if (!(await assertPartnerOwnsAuftrag(auftragId, handwerkerId))) {
    return { ok: false, message: 'Kein Zugriff auf diesen Auftrag.' }
  }

  const punkte = Array.isArray(body.punkte) ? body.punkte : []
  if (!punkte.length) {
    return { ok: false, message: 'Mindestens eine abgeschlossene Leistung erforderlich.' }
  }

  const maengel = Array.isArray(body.maengel) ? body.maengel : []
  const abnahmeDatum = String(body.abnahme_datum ?? '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(abnahmeDatum)) {
    return { ok: false, message: 'Abnahmedatum ungültig.' }
  }

  const meta = emptyAbnahmeProtokollMeta({
    ...normalizeAbnahmeProtokollMeta(body.meta ?? {}),
    abnahme_ergebnis: maengel.length > 0 ? 'mit_vorbehalt' : 'abgenommen',
  })

  const saved = await saveAbnahmeprotokollPdfOnly({
    auftragId,
    abnahmeDatum,
    punkte,
    maengel,
    notizen: body.notizen?.trim() || null,
    meta,
  })
  if (!saved.ok) return { ok: false, message: saved.message }

  const summary = await loadAbnahmeprotokollSummary(auftragId)
  const protokollId = summary?.id
  if (!protokollId) {
    return { ok: false, message: 'Protokoll konnte nicht geladen werden.' }
  }

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('titel')
    .eq('id', auftragId)
    .maybeSingle()
  const projektName = String(auf?.titel ?? '').trim() || 'Auftrag'

  await notifyPartnerUnified({
    handwerkerId,
    typ: 'erinnerung',
    projektName,
    leistungName: 'Abnahmeprotokoll bereit — bitte bestätigen',
    link: partnerAbnahmeLink(auftragId, protokollId),
    auftragId,
  })

  return {
    ok: true,
    protokoll_id: protokollId,
    pdf_url: saved.publicUrl,
  }
}

export async function bestaetigePortalAbnahme(
  auftragId: string,
  handwerkerId: string,
  protokollId?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await assertPartnerOwnsAuftrag(auftragId, handwerkerId))) {
    return { ok: false, message: 'Kein Zugriff auf diesen Auftrag.' }
  }

  const summary = await loadAbnahmeprotokollSummary(auftragId, protokollId)
  if (!summary) return { ok: false, message: 'Kein Abnahmeprotokoll gefunden.' }

  const now = new Date().toISOString()
  const meta = {
    ...summary.meta,
    handwerker_bestaetigt_at: summary.meta.handwerker_bestaetigt_at || now,
    handwerker_bestaetigt_von: handwerkerId,
  }

  const { error } = await supabaseAdmin
    .from('auftrag_abnahmeprotokolle')
    .update({ meta, updated_at: now })
    .eq('id', summary.id)
  if (error) return { ok: false, message: error.message }

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'notiz',
    titel: 'Partner hat Abnahmeprotokoll bestätigt',
    beschreibung: 'Handwerker hat das Abnahmeprotokoll im Portal bestätigt (ohne Versand).',
    erstellt_von: null,
    sichtbar_fuer_kunde: false,
  })

  return { ok: true }
}

export async function versendePortalAbnahme(
  auftragId: string,
  handwerkerId: string,
  protokollId?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await assertPartnerOwnsAuftrag(auftragId, handwerkerId))) {
    return { ok: false, message: 'Kein Zugriff auf diesen Auftrag.' }
  }

  const summary = await loadAbnahmeprotokollSummary(auftragId, protokollId)
  if (!summary) return { ok: false, message: 'Kein Abnahmeprotokoll gefunden.' }

  if (!summary.meta.handwerker_bestaetigt_at) {
    const confirm = await bestaetigePortalAbnahme(auftragId, handwerkerId, summary.id)
    if (!confirm.ok) return confirm
  }

  if (summary.an_kunde_gesendet_at) {
    return { ok: true }
  }

  const mailDefaults = await getAbnahmeprotokollMailDefaults(auftragId)
  if (!mailDefaults.ok) return { ok: false, message: mailDefaults.message }

  const refreshed = await loadAbnahmeprotokollSummary(auftragId, summary.id)
  if (!refreshed) return { ok: false, message: 'Protokoll nicht gefunden.' }

  const sent = await saveAndSendAbnahmeprotokoll({
    auftragId,
    abnahmeDatum: refreshed.abnahme_datum,
    punkte: refreshed.punkte,
    maengel: refreshed.maengel,
    notizen: refreshed.notizen,
    betreff: mailDefaults.defaultBetreff,
    nachricht: mailDefaults.defaultNachricht,
    anrede: mailDefaults.defaultAnrede,
  })
  if (!sent.ok) return { ok: false, message: sent.message }
  return { ok: true }
}
