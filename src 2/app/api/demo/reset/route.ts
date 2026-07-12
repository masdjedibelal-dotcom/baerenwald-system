import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { wipeCrmTransactionalData, purgeLegacyDemoRecords } from '@/lib/crm-data-wipe'
import { canPurgeLegacyDemoData, canWipeCrmData } from '@/lib/can-wipe-crm-data'
import { crmRoleFromUser } from '@/lib/auth/crm-access'

export const dynamic = 'force-dynamic'

function fullResetAllowed(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return process.env.DEMO_RESET_ALLOWED === 'true' || process.env.CRM_DATA_WIPE_ALLOWED === 'true'
}

async function isCrmAdminOrManager(
  supabase: ReturnType<typeof createClient>,
  user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role === 'admin' || profile?.role === 'manager') return true
  const metaRole = crmRoleFromUser(user)
  return metaRole === 'admin' || metaRole === 'manager'
}

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: 'Nicht angemeldet.' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: 'Service-Role-Key nicht konfiguriert.' }, { status: 500 })
  }

  let scope: 'all' | 'legacy' = 'all'
  try {
    const body = (await request.json()) as { scope?: string }
    if (body.scope === 'legacy') scope = 'legacy'
  } catch {
    // leerer Body → volles Leeren (Demo-Banner)
  }

  if (scope === 'legacy') {
    const staffOk = (await isCrmAdminOrManager(supabase, user)) || canPurgeLegacyDemoData(user)
    if (!staffOk) {
      return NextResponse.json(
        { ok: false, error: 'Keine Berechtigung (CRM Admin/Manager erforderlich).' },
        { status: 403 }
      )
    }
  } else if (!fullResetAllowed() || !canWipeCrmData(user.email)) {
    return NextResponse.json(
      {
        ok: false,
        error: fullResetAllowed()
          ? 'Keine Berechtigung für vollständiges Leeren.'
          : 'Daten-Löschung in dieser Umgebung nicht freigegeben (DEMO_RESET_ALLOWED).',
      },
      { status: 403 }
    )
  }

  if (scope === 'legacy') {
    const result = await purgeLegacyDemoRecords(supabaseAdmin)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 500 })
    }
    return NextResponse.json({
      ok: true,
      deletedLeads: result.deletedLeads,
      deletedKunden: result.deletedKunden,
    })
  }

  const result = await wipeCrmTransactionalData(supabaseAdmin)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
