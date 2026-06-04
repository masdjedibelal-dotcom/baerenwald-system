import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { wipeCrmTransactionalData, purgeLegacyDemoRecords } from '@/lib/crm-data-wipe'
import { canWipeCrmData } from '@/lib/can-wipe-crm-data'

export const dynamic = 'force-dynamic'

function resetAllowed(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return process.env.DEMO_RESET_ALLOWED === 'true' || process.env.CRM_DATA_WIPE_ALLOWED === 'true'
}

export async function POST(request: Request) {
  if (!resetAllowed()) {
    return NextResponse.json(
      { ok: false, error: 'Daten-Löschung in dieser Umgebung nicht freigegeben (DEMO_RESET_ALLOWED).' },
      { status: 403 }
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !canWipeCrmData(user.email)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Keine Berechtigung. In Production: Demo-/Test-Account oder CRM_DATA_WIPE_ALLOWED=true.',
      },
      { status: 403 }
    )
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
