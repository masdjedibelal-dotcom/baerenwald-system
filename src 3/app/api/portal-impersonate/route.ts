import { NextResponse } from 'next/server'

import { isCrmAdminOrManager } from '@/lib/auth/is-crm-staff'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { createImpersonationToken } from '@/lib/portal/impersonation-token'
import { publicWebsiteBaseUrl } from '@/lib/portal-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Body = {
  targetType?: 'kunde' | 'handwerker' | 'mieter_status'
  targetId?: string
  leadId?: string
}

/** Admin: signiertes Token für Portal-Einloggen als Kunde/Handwerker. */
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !(await isCrmAdminOrManager(supabase, user))) {
    return NextResponse.json({ ok: false, error: 'Keine Berechtigung.' }, { status: 403 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiger Body.' }, { status: 400 })
  }

  const site = publicWebsiteBaseUrl()

  if (body.targetType === 'mieter_status') {
    const leadId = String(body.leadId ?? body.targetId ?? '').trim()
    if (!leadId) {
      return NextResponse.json({ ok: false, error: 'leadId fehlt.' }, { status: 400 })
    }
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('melde_tracking_token')
      .eq('id', leadId)
      .maybeSingle()
    const token = lead?.melde_tracking_token ? String(lead.melde_tracking_token) : ''
    if (!token) {
      return NextResponse.json(
        { ok: false, error: 'Kein Melde-Status-Link für diesen Vorgang.' },
        { status: 422 }
      )
    }
    const url = `${site}/melden/status/${encodeURIComponent(token)}`
    await writeAuditEvent({
      entityType: 'lead',
      entityId: leadId,
      aktion: 'crm_portal_open_mieter_status',
      actorId: user.id,
      actorRolle: 'crm_admin',
      payload: { url },
    })
    return NextResponse.json({ ok: true, url, mode: 'mieter_status' })
  }

  const targetType = body.targetType
  const targetId = String(body.targetId ?? '').trim()
  if ((targetType !== 'kunde' && targetType !== 'handwerker') || !targetId) {
    return NextResponse.json({ ok: false, error: 'targetType/targetId ungültig.' }, { status: 400 })
  }

  let email = ''
  let roleLabel = ''

  if (targetType === 'kunde') {
    const { data: kunde } = await supabaseAdmin
      .from('kunden')
      .select('id, name, email, portal_modus, auth_user_id')
      .eq('id', targetId)
      .maybeSingle()
    if (!kunde?.email?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Kunde ohne E-Mail oder nicht gefunden.' },
        { status: 422 }
      )
    }
    if (!kunde.auth_user_id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Kunde hat noch kein Portal-Konto. Nutze „Mieter-Ansicht“ bei einer Meldung mit Status-Link.',
        },
        { status: 422 }
      )
    }
    email = kunde.email.trim().toLowerCase()
    roleLabel =
      kunde.portal_modus === 'organisation'
        ? `Hausverwaltung: ${kunde.name}`
        : `Kunde: ${kunde.name}`
  } else {
    const { data: hw } = await supabaseAdmin
      .from('handwerker')
      .select('id, name, email, auth_user_id')
      .eq('id', targetId)
      .maybeSingle()
    if (!hw?.email?.trim() || !hw.auth_user_id) {
      return NextResponse.json(
        { ok: false, error: 'Handwerker ohne Portal-Konto oder E-Mail.' },
        { status: 422 }
      )
    }
    email = hw.email.trim().toLowerCase()
    roleLabel = `Partner: ${hw.name}`
  }

  const token = createImpersonationToken({
    email,
    roleLabel,
    targetType,
    targetId,
    adminId: user.id,
    adminEmail: user.email,
  })

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'PARTNER_INTERNAL_API_SECRET fehlt — Token nicht erzeugbar.' },
      { status: 500 }
    )
  }

  const redirectPath = targetType === 'handwerker' ? '/partner' : '/portal'
  const url = `${site}/auth/crm-enter?t=${encodeURIComponent(token)}&next=${encodeURIComponent(redirectPath)}`

  await writeAuditEvent({
    entityType: targetType,
    entityId: targetId,
    aktion: 'crm_portal_impersonate',
    actorId: user.id,
    actorRolle: 'crm_admin',
    payload: { email, roleLabel, redirectPath },
  })

  return NextResponse.json({
    ok: true,
    url,
    mode: 'impersonate',
    roleLabel,
    hint: 'Öffnet das Portal in dieser Rolle. Ein anderer Portal-Login wird ersetzt.',
  })
}
