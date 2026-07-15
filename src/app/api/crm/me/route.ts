import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { isCrmAdmin } from '@/lib/auth/crm-access'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, isAdmin: false }, { status: 401 })
  return NextResponse.json({ ok: true, isAdmin: isCrmAdmin(user) })
}
