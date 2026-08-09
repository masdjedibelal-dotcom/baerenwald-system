import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendAuftragHandwerkerZuweisungMail } from '@/lib/auftraege/send-auftrag-handwerker-zuweisung-mail'

type Body = {
  handwerker_id: string
  position_id?: string
  position_ids?: string[]
  send_email: boolean
  preview_only?: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const auftragId = params.id?.trim()
  const handwerkerId = body.handwerker_id?.trim()
  if (!auftragId || !handwerkerId) {
    return NextResponse.json({ error: 'auftragId oder handwerker_id fehlt' }, { status: 400 })
  }

  const sent = await sendAuftragHandwerkerZuweisungMail({
    auftragId,
    handwerkerId,
    positionId: body.position_id,
    positionIds: body.position_ids,
    sendEmail: Boolean(body.send_email),
    previewOnly: Boolean(body.preview_only),
    betreff: body.betreff,
    to: body.to,
    cc: body.cc,
  })

  if (!sent.ok) {
    const status = sent.message.includes('E-Mail') || sent.message.includes('RESEND') ? 502 : 400
    return NextResponse.json(
      { error: sent.message, portalLink: sent.portalLink },
      { status }
    )
  }

  if (body.preview_only) {
    return NextResponse.json({
      portalLink: sent.portalLink,
      gesendet: false,
      html: sent.html,
      betreff: sent.betreff,
      defaultTo: sent.defaultTo,
      defaultCc: sent.defaultCc,
    })
  }

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath('/auftraege')
  return NextResponse.json({ portalLink: sent.portalLink, gesendet: sent.gesendet })
}
