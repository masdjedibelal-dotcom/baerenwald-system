import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { kiHubSendMail } from '@/lib/ki-hub/actions/send-mail'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: {
    to?: string
    name?: string
    betreff?: string
    text?: string
    lead_id?: string
    empfehlung_id?: string
    preview?: boolean
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = await kiHubSendMail({
    to: body.to ?? '',
    name: body.name,
    betreff: body.betreff ?? '',
    text: body.text ?? '',
    lead_id: body.lead_id,
    empfehlung_id: body.empfehlung_id,
    preview: body.preview === true,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  return NextResponse.json(result)
}
