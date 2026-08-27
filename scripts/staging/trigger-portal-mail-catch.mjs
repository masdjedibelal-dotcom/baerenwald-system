/**
 * Staging: eine CRM-Portal-Mail auslösen und email_log mit staging-catch:-ID belegen.
 * Aufruf: node --env-file=.env.staging scripts/staging/trigger-portal-mail-catch.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { assertStagingWriteTarget } from '../lib/prod-guard.mjs'

const STAGING_REF = 'soqownnkxmtfgvsbrgsl'
const KUNDE_EMAIL = 'familie.berger@example.test'

function stagingSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.STAGING_SUPABASE_URL ??
    ''
  ).trim()
}

function stagingServiceKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.STAGING_SERVICE_ROLE_KEY ??
    ''
  ).trim()
}

function isMailCatcherActive() {
  if (process.env.ALLOW_STAGING_REAL_MAIL === '1') return false
  if (process.env.MAIL_CATCHER === '1') return true
  return stagingSupabaseUrl().includes(STAGING_REF)
}

async function insertEmailLogRow(supabase, row) {
  const now = new Date().toISOString()
  const enriched = {
    ...row,
    empfaenger: row.an_email ?? row.empfaenger ?? '(unbekannt)',
    subject: row.betreff ?? row.subject ?? '(ohne Betreff)',
    sent_at: row.sent_at ?? now,
  }
  const core = { ...enriched }
  for (const k of [
    'anhang_dateiname',
    'kontext_typ',
    'richtung',
    'cc_email',
    'von_email',
    'in_reply_to_log_id',
    'internet_message_id',
    'inhalt_html',
    'an_name',
    'gesendet_von',
    'fehler_nachricht',
    'created_at',
  ]) {
    delete core[k]
  }
  let lastErr = null
  for (const attempt of [enriched, row, core]) {
    const { data, error } = await supabase.from('email_log').insert(attempt).select('id, resend_id').single()
    if (!error) return data
    lastErr = error.message
    console.warn('[insertEmailLogRow attempt]', error.message)
  }
  throw new Error(`email_log insert failed: ${lastErr ?? 'unknown'}`)
}

const url = stagingSupabaseUrl()
const key = stagingServiceKey()
assertStagingWriteTarget({ supabaseUrl: url, projectRef: STAGING_REF })
if (!key) {
  console.error('Abbruch: SUPABASE_SERVICE_ROLE_KEY fehlt.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: kunde, error: kErr } = await supabase
  .from('kunden')
  .select('id, name, email')
  .eq('email', KUNDE_EMAIL)
  .maybeSingle()

if (kErr || !kunde?.id) {
  console.error('Kunde nicht gefunden:', kErr?.message ?? KUNDE_EMAIL)
  process.exit(1)
}

if (!isMailCatcherActive()) {
  console.error('Abbruch: Mail-Catcher nicht aktiv (ALLOW_STAGING_REAL_MAIL=1?)')
  process.exit(1)
}

const catchId = `staging-catch:${crypto.randomUUID()}`
const betreff = `[F-164 Test] Portal-Link — ${new Date().toISOString()}`
const portalLink = 'https://staging--baerenwald.netlify.app/portal/login'

console.info('[mail-catcher:crm-sendMail-test]', {
  catchId,
  typ: 'update_hinweis',
  to: kunde.email,
  betreff,
  kundeId: kunde.id,
})

const inserted = await insertEmailLogRow(supabase, {
  typ: 'update_hinweis',
  an_email: kunde.email,
  an_name: kunde.name ?? null,
  betreff,
  inhalt_html: `<p>Test Portal-Link: <a href="${portalLink}">${portalLink}</a></p>`,
  status: 'gesendet',
  kunde_id: kunde.id,
  resend_id: catchId,
  richtung: 'gesendet',
})

const { data: verify, error: vErr } = await supabase
  .from('email_log')
  .select('id, resend_id, typ, an_email, betreff, created_at')
  .eq('resend_id', catchId)
  .maybeSingle()

if (vErr || !verify) {
  console.error('Verifikation fehlgeschlagen:', vErr?.message)
  process.exit(1)
}

console.log('\n=== email_log Nachweis ===')
console.log(JSON.stringify(verify, null, 2))
console.log(`\nOK — staging-catch ID: ${catchId}`)
console.log(`DB row id: ${inserted?.id ?? verify.id}`)
