/**
 * CRM → Website: vereinheitlichte Partner-Benachrichtigung.
 * @see handwerks-plattform/src/app/api/internal/partner-notify/route.ts
 */

import { partnerVorgangRelativeLink } from '@/lib/portal-utils'

export type PartnerNotifyTyp = 'neu' | 'geaendert' | 'entfernt' | 'erinnerung'

function partnerSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export async function notifyPartnerUnified(input: {
  handwerkerId: string
  typ: PartnerNotifyTyp
  projektName: string
  link: string
  leistungName?: string | null
  anfrageId?: string | null
  auftragId?: string | null
  positionIds?: string[]
  aenderungTyp?: 'neu' | 'geaendert' | 'entfernt' | null
  preisAlt?: number | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) {
    return { ok: false, error: 'PARTNER_INTERNAL_API_SECRET fehlt.' }
  }

  const url = `${partnerSiteBaseUrl()}/api/internal/partner-notify`
  const body: Record<string, unknown> = {
    handwerkerId: input.handwerkerId,
    typ: input.typ,
    projektName: input.projektName,
    link: input.link,
  }
  if (input.leistungName) body.leistungName = input.leistungName
  if (input.anfrageId) body.anfrageId = input.anfrageId
  if (input.auftragId) body.auftragId = input.auftragId
  if (input.positionIds?.length) body.positionIds = input.positionIds
  if (input.aenderungTyp) body.aenderungTyp = input.aenderungTyp
  if (input.preisAlt != null && Number.isFinite(input.preisAlt)) body.preisAlt = input.preisAlt

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    return { ok: false, error: msg }
  }

  let parsed: { ok?: boolean; error?: string } = {}
  try {
    parsed = (await res.json()) as { ok?: boolean; error?: string }
  } catch {
    parsed = {}
  }

  if (!res.ok || !parsed.ok) {
    return { ok: false, error: parsed.error?.trim() || `HTTP ${res.status}` }
  }
  return { ok: true }
}

/** Primärer Deep-Link für Zuweisung/Änderung (Tab Vorgänge). */
export function partnerVorgangLink(auftragId: string): string {
  return partnerVorgangRelativeLink(auftragId)
}

/** @deprecated Legacy — Tab „Offen“. Nutze partnerVorgangLink(auftragId). */
export function partnerOffenLink(anfrageId: string): string {
  return `/partner?section=offen&id=${encodeURIComponent(anfrageId)}`
}
