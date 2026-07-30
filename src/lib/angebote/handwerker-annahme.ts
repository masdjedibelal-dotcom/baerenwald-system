/**
 * Kanonisches HW-Annahme-Vokabular (V1) — CRM + Portal + Token.
 *
 * Zuweisung: angebot_handwerker.status = 'akzeptiert' | 'abgelehnt' | …
 * Angebot-Pipeline: angebote.status = 'handwerker_akzeptiert'
 * Konditionen (separat): hw_status = 'uebernommen' — kein Annahme-Synonym
 */
import { buildInternHandwerkerAntwortMail } from '@/lib/angebote/angebot-mail-templates'
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from '@/lib/angebote/ablehnung-labels'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'
import { sendMail } from '@/lib/mail-service'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const HW_ZUWEISUNG_STATUS_AKZEPTIERT = 'akzeptiert' as const
export const HW_ZUWEISUNG_STATUS_ABGELEHNT = 'abgelehnt' as const
export const ANGEBOT_STATUS_HW_AKZEPTIERT = 'handwerker_akzeptiert' as const

/** Legacy-Schreibweisen, die als Zusage gelten (nur Lesepfad / Migration). */
const LEGACY_AKZEPTIERT = new Set(['akzeptiert', 'angenommen', 'uebernommen', 'übernommen'])

export function normalizeHwZuweisungStatus(raw: string | null | undefined): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

/** Schreibpfad: nur kanonisch „akzeptiert“. */
export function isHwZuweisungAkzeptiert(status: string | null | undefined): boolean {
  return normalizeHwZuweisungStatus(status) === HW_ZUWEISUNG_STATUS_AKZEPTIERT
}

/** Lesepfad während Migration: Legacy-Aliase tolerieren. */
export function isHwZuweisungAkzeptiertLenient(status: string | null | undefined): boolean {
  return LEGACY_AKZEPTIERT.has(normalizeHwZuweisungStatus(status))
}

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

export type AcceptHandwerkerZuweisungInput = {
  zuweisungId: string
  angebotId?: string | null
  /** akzeptiert | abgelehnt */
  antwort: 'akzeptiert' | 'abgelehnt'
  notiz?: string | null
  ablehnungGrund?: string | null
  /** Quelle für Timeline-Titel */
  quelle: 'token' | 'crm' | 'portal'
  /** Wenn gesetzt: Ownership-Check gegen handwerker_id */
  handwerkerId?: string | null
  /** Intern-Mail + Timeline (Standard true) */
  notify?: boolean
}

export type AcceptHandwerkerZuweisungResult =
  | { ok: true; status: 'akzeptiert' | 'abgelehnt'; already?: boolean }
  | { ok: false; message: string; httpStatus?: number }

/**
 * Einzige Schreibquelle für HW-Annahme/Ablehnung (Token, CRM, Portal).
 */
export async function acceptHandwerkerZuweisung(
  input: AcceptHandwerkerZuweisungInput
): Promise<AcceptHandwerkerZuweisungResult> {
  const zuweisungId = input.zuweisungId?.trim()
  if (!zuweisungId) return { ok: false, message: 'Zuweisung fehlt.', httpStatus: 400 }

  const antwort = input.antwort
  if (antwort !== 'akzeptiert' && antwort !== 'abgelehnt') {
    return { ok: false, message: 'Ungültige Antwort.', httpStatus: 400 }
  }

  if (antwort === 'abgelehnt') {
    const g = input.ablehnungGrund?.trim()
    if (!g || !isHandwerkerAblehnungGrund(g)) {
      return { ok: false, message: 'Ablehnungsgrund fehlt oder ungültig.', httpStatus: 400 }
    }
  }

  const { data: row, error } = await supabaseAdmin
    .from('angebot_handwerker')
    .select(
      `
      id,
      angebot_id,
      gewerk_id,
      handwerker_id,
      status,
      antwort_at,
      handwerker(name),
      gewerke(name),
      angebote(id, lead_id)
    `
    )
    .eq('id', zuweisungId)
    .maybeSingle()

  if (error || !row) {
    return { ok: false, message: 'Zuweisung nicht gefunden.', httpStatus: 404 }
  }

  const raw = row as Record<string, unknown>
  if (input.angebotId?.trim() && String(raw.angebot_id) !== input.angebotId.trim()) {
    return { ok: false, message: 'Zuweisung gehört nicht zu diesem Angebot.', httpStatus: 400 }
  }
  if (input.handwerkerId?.trim() && String(raw.handwerker_id) !== input.handwerkerId.trim()) {
    return { ok: false, message: 'Kein Zugriff auf diese Zuweisung.', httpStatus: 403 }
  }

  const st = normalizeHwZuweisungStatus(raw.status as string)
  if (st === antwort || (antwort === 'akzeptiert' && isHwZuweisungAkzeptiertLenient(st))) {
    return { ok: true, status: antwort, already: true }
  }
  if (st === 'abgelehnt' || st === 'ersetzt') {
    return {
      ok: false,
      message: 'Abgelehnte oder ersetzte Anfragen können nicht geändert werden.',
      httpStatus: 409,
    }
  }
  if (raw.antwort_at && st !== 'ausstehend' && st !== 'angefragt' && st !== 'zugewiesen') {
    return { ok: false, message: 'Anfrage wurde bereits beantwortet.', httpStatus: 409 }
  }

  const now = new Date().toISOString()
  const notiz =
    input.notiz?.trim() ||
    (input.quelle === 'crm'
      ? 'Vom CRM im Namen des Partners bestätigt.'
      : input.quelle === 'portal'
        ? 'Im Partner-Portal bestätigt.'
        : null)
  const ablehnungGrund = antwort === 'abgelehnt' ? input.ablehnungGrund!.trim() : null
  const status = antwort === 'akzeptiert' ? HW_ZUWEISUNG_STATUS_AKZEPTIERT : HW_ZUWEISUNG_STATUS_ABGELEHNT

  const { error: updErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      status,
      antwort_at: now,
      antwort_notiz: notiz,
      ablehnung_grund: ablehnungGrund,
    })
    .eq('id', zuweisungId)

  if (updErr) return { ok: false, message: updErr.message, httpStatus: 500 }

  const angebot = one(raw.angebote as { id: string; lead_id: string | null } | null)
  const leadId = angebot?.lead_id ?? null
  const angebotId = String(raw.angebot_id ?? angebot?.id ?? '')
  const hw = one(raw.handwerker as { name: string } | null)
  const gw = one(raw.gewerke as { name: string } | null)
  const handwerkerName = hw?.name?.trim() || 'Handwerker'
  const gewerkName = gw?.name?.trim() || 'Gewerk'
  const grundLabel =
    ablehnungGrund && isHandwerkerAblehnungGrund(ablehnungGrund)
      ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[ablehnungGrund]
      : null

  const notify = input.notify !== false

  // V1/Q1: Kanonische Angebot-Pipeline
  if (antwort === 'akzeptiert' && angebotId) {
    await supabaseAdmin
      .from('angebote')
      .update({ status: ANGEBOT_STATUS_HW_AKZEPTIERT, updated_at: now })
      .eq('id', angebotId)
      .not('status', 'in', '("kunde_akzeptiert","beauftragt","storniert","abgelehnt")')
  }

  if (antwort === 'akzeptiert' && raw.gewerk_id && angebotId) {
    const { data: parallel } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('id, handwerker_id, status, handwerker(name)')
      .eq('angebot_id', angebotId)
      .eq('gewerk_id', raw.gewerk_id)
      .neq('id', zuweisungId)

    for (const other of parallel ?? []) {
      const otherSt = normalizeHwZuweisungStatus(other.status as string)
      if (
        otherSt === 'akzeptiert' ||
        otherSt === 'abgelehnt' ||
        otherSt === 'ersetzt' ||
        isHwZuweisungAkzeptiertLenient(otherSt)
      ) {
        continue
      }
      await supabaseAdmin
        .from('angebot_handwerker')
        .update({ status: 'ersetzt', antwort_at: now })
        .eq('id', other.id)

      if (notify && leadId) {
        const otherHw = one(
          (other as { handwerker?: { name: string } | { name: string }[] | null }).handwerker
        )
        await insertLeadTimelineEvent(supabaseAdmin, {
          lead_id: leadId,
          angebot_id: angebotId,
          typ: 'handwerker',
          titel: 'Handwerker nicht gewählt',
          beschreibung: `${otherHw?.name?.trim() || 'Handwerker'} · ${gewerkName}`,
        })
      }
    }
  }

  if (notify && leadId && angebotId) {
    // Q3: exakt dieselben Titel wie Legacy-Token (CRM-UI/Filter)
    const titel =
      antwort === 'akzeptiert' ? 'Handwerker hat zugesagt' : 'Handwerker hat abgelehnt'
    const beschreibungExtra =
      input.quelle === 'crm'
        ? ' (CRM)'
        : input.quelle === 'portal'
          ? ' (Portal)'
          : ''

    await insertLeadTimelineEvent(supabaseAdmin, {
      lead_id: leadId,
      angebot_id: angebotId,
      typ: 'handwerker',
      titel,
      beschreibung: [`${handwerkerName} · ${gewerkName}${beschreibungExtra}`, grundLabel, notiz]
        .filter(Boolean)
        .join(' — '),
    })
  }

  if (notify) {
    const { data: einRows } = await supabaseAdmin.from('einstellungen').select('key, value')
    const einMap = new Map((einRows ?? []).map((x) => [x.key as string, String(x.value ?? '')]))
    const internTo = einMap.get('email')?.trim() || 'info@baerenwaldmuenchen.de'
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://crm.baerenwaldmuenchen.de'
    const dashboardUrl = angebotId ? `${baseUrl}/angebote/${angebotId}` : `${baseUrl}/angebote`

    void sendMail({
      an: internTo,
      betreff:
        antwort === 'akzeptiert'
          ? `Handwerker zugesagt: ${gewerkName}`
          : `Handwerker abgelehnt: ${gewerkName}`,
      html: buildInternHandwerkerAntwortMail({
        handwerkerName,
        gewerkName,
        angenommen: antwort === 'akzeptiert',
        ablehnungGrund: grundLabel,
        notiz,
        dashboardUrl,
      }),
      typ: 'system',
    })
  }

  return { ok: true, status: antwort }
}
