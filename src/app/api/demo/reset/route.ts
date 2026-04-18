import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runDemoCrmReset } from '@/lib/demo-reset'
import { isDemoTestUserEmail } from '@/lib/is-demo-user'

export const dynamic = 'force-dynamic'

function resetAllowedInEnvironment(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  return process.env.DEMO_RESET_ALLOWED === 'true'
}

export async function POST() {
  if (!resetAllowedInEnvironment()) {
    return NextResponse.json(
      { ok: false, error: 'Demo-Reset in dieser Umgebung nicht freigegeben (DEMO_RESET_ALLOWED).' },
      { status: 403 }
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email || !isDemoTestUserEmail(user.email)) {
    return NextResponse.json({ ok: false, error: 'Nur für Demo-/Test-Accounts.' }, { status: 403 })
  }

  const result = await runDemoCrmReset(supabaseAdmin)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
