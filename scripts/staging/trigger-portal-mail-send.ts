/**
 * Staging: CRM sendMail (Portal-Link) via mail-service — echte Catcher-Pipeline.
 * Aufruf: node --env-file=.env.staging node_modules/.bin/tsx scripts/staging/trigger-portal-mail-send.ts
 */
import { createClient } from '@supabase/supabase-js'
import { sendMail } from '../src/lib/mail-service'
import { buildPortalLoginLink } from '../src/lib/portal-utils'
import { kundenPortalMailHtml } from '../src/lib/mail-templates'
import { getMailBranding } from '../src/lib/get-mail-branding'

const STAGING_REF = 'soqownnkxmtfgvsbrgsl'
const KUNDE_EMAIL = 'familie.berger@example.test'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!url.includes(STAGING_REF)) {
  console.error('Abbruch: NEXT_PUBLIC_SUPABASE_URL muss Staging sein.')
  process.exit(1)
}

const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const { data: kunde } = await supabase
  .from('kunden')
  .select('id, name, email, typ, portal_modus')
  .eq('email', KUNDE_EMAIL)
  .maybeSingle()

if (!kunde?.id) {
  console.error('Kunde nicht gefunden:', KUNDE_EMAIL)
  process.exit(1)
}

const portalLink = buildPortalLoginLink()
const branding = await getMailBranding(supabase)
const html = kundenPortalMailHtml({
  name: String(kunde.name ?? 'Test'),
  portalLink,
  anrede: 'sie',
  text: 'F-164 Nachweis — Kundenportal-Link (Staging Catcher).',
  branding,
  portalAudience: 'privat',
})

const result = await sendMail({
  typ: 'update_hinweis',
  an: kunde.email!,
  betreff: `[F-164] Portal-Link Test ${new Date().toISOString()}`,
  html,
  kundeId: kunde.id,
})

if (!result.success) {
  console.error('sendMail fehlgeschlagen:', result.error)
  process.exit(1)
}

const catchId = result.resendId
console.log('sendMail OK, resendId:', catchId)

const { data: row } = await supabase
  .from('email_log')
  .select('id, resend_id, typ, an_email, betreff, created_at')
  .eq('resend_id', catchId ?? '')
  .maybeSingle()

console.log('\n=== email_log ===')
console.log(JSON.stringify(row, null, 2))

if (!row?.resend_id?.startsWith('staging-catch:')) {
  console.error('Kein staging-catch:-Eintrag gefunden.')
  process.exit(1)
}

console.log('\nOK — Catcher-Nachweis:', row.resend_id)
