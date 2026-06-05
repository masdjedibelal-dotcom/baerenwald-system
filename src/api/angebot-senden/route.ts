import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendAngebotToKunde } from '@/app/(dashboard)/angebote/actions'

export const runtime = 'nodejs'

/**
 * POST /api/angebot-senden — PDF + Mail wie `sendAngebotToKunde` (CRM-Auth über Session-Cookie).
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: { angebotId?: string }
  try {
    body = (await request.json()) as { angebotId?: string }
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const angebotId = body.angebotId?.trim()
  if (!angebotId) {
    return NextResponse.json({ error: 'angebotId fehlt' }, { status: 400 })
  }

  const r = await sendAngebotToKunde(angebotId)
  if (!r.ok) {
    return NextResponse.json({ error: r.message }, { status: 502 })
  }

  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/angebote')
  return NextResponse.json({ success: true })
}
