import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailHandwerkerLeistungZuweisung } from '@/lib/mail-templates'
import { sendMail } from '@/lib/mail-service'
import { buildPartnerDashboardLink } from '@/lib/portal-utils'
import { formatDatum } from '@/lib/utils'

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

function formatZeitraum(start?: string | null, end?: string | null): string | undefined {
  const a = start?.trim() ? formatDatum(start) : ''
  const b = end?.trim() ? formatDatum(end) : ''
  if (a && b) return `${a} – ${b}`
  return a || b || undefined
}

export async function sendAuftragHandwerkerZuweisungMail(input: {
  auftragId: string
  handwerkerId: string
  positionId?: string
  positionIds?: string[]
  sendEmail: boolean
  previewOnly?: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
}): Promise<
  | {
      ok: true
      portalLink: string
      gesendet: boolean
      html?: string
      betreff?: string
      defaultTo?: string[]
      defaultCc?: string[]
    }
  | { ok: false; message: string; portalLink?: string }
> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  if (!auftragId || !handwerkerId) {
    return { ok: false, message: 'auftragId oder handwerkerId fehlt' }
  }

  const ids = [
    ...(input.positionId?.trim() ? [input.positionId.trim()] : []),
    ...(input.positionIds ?? []).map((id) => id.trim()).filter(Boolean),
  ]
  const uniquePosIds = Array.from(new Set(ids))

  const { data: hw, error: hwErr } = await supabaseAdmin
    .from('handwerker')
    .select('id, name, email, firma, aktiv')
    .eq('id', handwerkerId)
    .maybeSingle()

  if (hwErr || !hw) return { ok: false, message: hwErr?.message ?? 'Handwerker nicht gefunden' }
  if (hw.aktiv === false) return { ok: false, message: 'Handwerker ist nicht aktiv' }

  const hwEmail = (hw.email as string | null)?.trim() || ''
  const defaultTo = hwEmail ? [hwEmail] : []
  const defaultCc: string[] = []

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, start_datum, end_datum, kunden(plz)')
    .eq('id', auftragId)
    .maybeSingle()

  if (aErr || !auftrag) return { ok: false, message: aErr?.message ?? 'Auftrag nicht gefunden' }

  let posQuery = supabaseAdmin
    .from('auftrag_positionen')
    .select('id, gewerk_name, leistung_name, beschreibung, menge, einheit, start_datum, end_datum')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)

  if (uniquePosIds.length) {
    posQuery = posQuery.in('id', uniquePosIds)
  }

  const { data: posRows, error: pErr } = await posQuery.order('sort_order', { ascending: true })
  if (pErr) return { ok: false, message: pErr.message }

  const auftragZeitraum = formatZeitraum(
    auftrag.start_datum as string | null,
    auftrag.end_datum as string | null
  )

  const leistungen = (posRows ?? []).map((p) => ({
    leistung_name: String(p.leistung_name ?? 'Leistung'),
    gewerk_name: String(p.gewerk_name ?? 'Gewerk'),
    beschreibung: p.beschreibung as string | null,
    von_bis:
      formatZeitraum(p.start_datum as string | null, p.end_datum as string | null) ||
      auftragZeitraum ||
      'Nach Absprache',
  }))

  if (!leistungen.length) {
    return { ok: false, message: 'Keine zugewiesenen Leistungen für die Mail gefunden.' }
  }

  const kunde = one((auftrag as { kunden?: unknown }).kunden) as {
    plz?: string | null
  } | null

  const plz = kunde?.plz?.trim() || ''

  const portalLink = buildPartnerDashboardLink()
  const branding = await getMailBranding(supabaseAdmin)
  const tpl = mailHandwerkerLeistungZuweisung(
    {
      name: (hw.name as string)?.trim() || 'Partner',
      plz,
      leistungen,
      portalLink,
    },
    branding
  )

  const betreff = input.betreff?.trim() || tpl.betreff

  if (input.previewOnly) {
    return {
      ok: true,
      portalLink,
      gesendet: false,
      html: tpl.html,
      betreff,
      defaultTo,
      defaultCc,
    }
  }

  if (!input.sendEmail) {
    return { ok: true, portalLink, gesendet: false, html: tpl.html, betreff, defaultTo, defaultCc }
  }

  const toList = input.to?.map((v) => v.trim()).filter(Boolean) ?? defaultTo
  if (!toList.length) {
    return { ok: false, message: 'Bitte mindestens eine Empfänger-Adresse (An) angeben.', portalLink }
  }

  const mailRes = await sendMail({
    typ: 'handwerker_zuweisung',
    an: toList,
    cc: input.cc?.map((v) => v.trim()).filter(Boolean),
    bcc: [],
    betreff,
    html: tpl.html,
    auftragId,
  })

  if (!mailRes.success) {
    return { ok: false, message: mailRes.error ?? 'E-Mail-Versand fehlgeschlagen', portalLink }
  }

  return { ok: true, portalLink, gesendet: true }
}
