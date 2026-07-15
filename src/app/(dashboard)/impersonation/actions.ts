'use server'

import { requireCrmAdmin } from '@/lib/auth/crm-access-server'
import {
  createPortalImpersonationUrl,
  type ImpersonationTargetType,
} from '@/lib/portal/create-impersonation-token'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function resolveKundeTarget(kundeId: string): Promise<
  | { ok: true; email: string; roleLabel: string; targetType: ImpersonationTargetType; next: string }
  | { ok: false; message: string }
> {
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .select('id, email, name, portal_modus, auth_user_id')
    .eq('id', kundeId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: error?.message ?? 'Kunde nicht gefunden.' }
  const email = (data.email as string | null)?.trim()
  if (!email) return { ok: false, message: 'Kunde hat keine E-Mail.' }
  if (!(data.auth_user_id as string | null)?.trim()) {
    return {
      ok: false,
      message: 'Kein Portal-Konto verknüpft — zuerst Einladung / Account anlegen.',
    }
  }
  const isOrg = (data.portal_modus as string | null) === 'organisation'
  return {
    ok: true,
    email,
    roleLabel: isOrg
      ? `HV / ${(data.name as string) || 'Organisation'}`
      : `Kunde / ${(data.name as string) || email}`,
    targetType: isOrg ? 'organisation' : 'kunde',
    next: '/portal',
  }
}

async function resolveHandwerkerTarget(handwerkerId: string): Promise<
  | { ok: true; email: string; roleLabel: string; targetType: ImpersonationTargetType; next: string }
  | { ok: false; message: string }
> {
  const { data, error } = await supabaseAdmin
    .from('handwerker')
    .select('id, email, name, firma, auth_user_id')
    .eq('id', handwerkerId)
    .maybeSingle()
  if (error || !data) return { ok: false, message: error?.message ?? 'Handwerker nicht gefunden.' }
  const email = (data.email as string | null)?.trim()
  if (!email) return { ok: false, message: 'Handwerker hat keine E-Mail.' }
  if (!(data.auth_user_id as string | null)?.trim()) {
    return {
      ok: false,
      message: 'Kein Partner-Portal-Konto verknüpft — zuerst Einladung.',
    }
  }
  const label = (data.firma as string)?.trim() || (data.name as string)?.trim() || email
  return {
    ok: true,
    email,
    roleLabel: `Partner / ${label}`,
    targetType: 'handwerker',
    next: '/partner',
  }
}

/** Mieter-Ansicht: Lead ohne Auth — signierter Kurzzeit-Deep-Link zur Statusseite (read-only). */
export async function openMieterStatusPreview(leadId: string): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const gate = await requireCrmAdmin()
  if (!gate.ok) return gate

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, melde_tracking_token, einladung_token, kontakt_email')
    .eq('id', leadId)
    .maybeSingle()
  if (error || !lead) return { ok: false, message: error?.message ?? 'Lead nicht gefunden.' }

  const token =
    (lead.melde_tracking_token as string | null)?.trim() ||
    (lead.einladung_token as string | null)?.trim()
  if (!token) {
    return {
      ok: false,
      message: 'Kein Status-Token am Lead — Mieter-Ansicht nicht verfügbar.',
    }
  }
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
  return { ok: true, url: `${base}/melden/status/${encodeURIComponent(token)}` }
}

export async function openPortalAsKunde(kundeId: string): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const gate = await requireCrmAdmin()
  if (!gate.ok) return gate
  const target = await resolveKundeTarget(kundeId)
  if (!target.ok) return target
  return createPortalImpersonationUrl({
    adminId: gate.user.id,
    adminEmail: gate.user.email ?? '',
    targetType: target.targetType,
    targetId: kundeId,
    targetEmail: target.email,
    roleLabel: target.roleLabel,
    nextPath: target.next,
  })
}

export async function openPortalAsHandwerker(handwerkerId: string): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const gate = await requireCrmAdmin()
  if (!gate.ok) return gate
  const target = await resolveHandwerkerTarget(handwerkerId)
  if (!target.ok) return target
  return createPortalImpersonationUrl({
    adminId: gate.user.id,
    adminEmail: gate.user.email ?? '',
    targetType: target.targetType,
    targetId: handwerkerId,
    targetEmail: target.email,
    roleLabel: target.roleLabel,
    nextPath: target.next,
  })
}
