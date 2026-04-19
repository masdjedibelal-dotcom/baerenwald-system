import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mail-service'

const SAMPLE: Record<string, string> = {
  kundenname: 'Maria Muster',
  betrag: '12.450,00',
  datum: '17.04.2026',
  link: 'https://example.com/angebot/demo',
  rechnungsnummer: 'RE-2026-0042',
  handwerkername: 'Max Mustermann',
  gewerk: 'Bad & Sanitär',
  startdatum: '01.05.2026',
  enddatum: '30.06.2026',
}

function applyVars(text: string) {
  let out = text
  for (const [k, v] of Object.entries(SAMPLE)) {
    out = out.split(`{{${k}}}`).join(v)
  }
  return out
}

export async function POST(req: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const body = (await req.json()) as { template_id?: string; to?: string }
  const to = body.to?.trim()
  if (!to) {
    return NextResponse.json({ error: 'E-Mail-Adresse fehlt' }, { status: 400 })
  }
  if (!body.template_id) {
    return NextResponse.json({ error: 'template_id fehlt' }, { status: 400 })
  }

  const { data: row, error } = await supabase
    .from('email_templates')
    .select('betreff, body_html')
    .eq('id', body.template_id)
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? 'Template nicht gefunden' }, { status: 404 })
  }

  const betreff = applyVars(String((row as { betreff: string }).betreff))
  const html = applyVars(String((row as { body_html: string }).body_html))

  const mail = await sendMail({
    typ: 'sonstiges',
    an: to,
    betreff: `[Test] ${betreff}`,
    html,
  })
  if (!mail.success) {
    return NextResponse.json({ error: mail.error ?? 'Versand fehlgeschlagen' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
