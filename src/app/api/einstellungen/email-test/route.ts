import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendMail } from '@/lib/mail-service'
import { applyEmailTemplateVars, loadEmailPreviewVars } from '@/lib/email-template-preview-vars'

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

  const previewVars = await loadEmailPreviewVars(supabase)
  const betreff = applyEmailTemplateVars(String((row as { betreff: string }).betreff), previewVars)
  const html = applyEmailTemplateVars(String((row as { body_html: string }).body_html), previewVars)

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
