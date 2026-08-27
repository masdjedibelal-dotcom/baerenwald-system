/**
 * F-179: await sendMail → email_log (Staging), ohne Netlify-UI.
 * Ruft erneutOrgFreigabeAnfordernNachAblehnung über tsx + Path-Alias.
 *
 * Aufruf:
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… MAIL_CATCHER=1 \
 *   npx --yes tsx --tsconfig tsconfig.json scripts/staging/prove-f179-freigabe-mail.ts
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

function loadEnv(file: string) {
  const p = resolve(root, file)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i)
    let v = t.slice(i + 1)
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv('.env.staging')

process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.STAGING_SUPABASE_URL ||
  `https://${process.env.STAGING_PROJECT_REF}.supabase.co`
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.MAIL_CATCHER = '1'

async function main() {
  const LEAD = '6eba4479-f520-4232-9e95-f3708fb0216c'
  const ANGEBOT = '40f62e2e-6f1f-4dc7-ad3c-8b3c076f77c7'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url.includes('soqownnkxmtfgvsbrgsl')) {
    console.error('Refuse: not staging URL', url)
    process.exit(1)
  }

  const db = createClient(url, key, { auth: { persistSession: false } })

  const { erneutOrgFreigabeAnfordernNachAblehnung } = await import(
    '@/lib/org/org-freigabe-logic'
  )

  await db.from('leads').update({ org_freigabe_status: 'abgelehnt' }).eq('id', LEAD)

  const before = await db
    .from('email_log')
    .select('id')
    .eq('typ', 'org_freigabe_angefordert')
  const beforeIds = new Set((before.data ?? []).map((r) => r.id))

  const r = await erneutOrgFreigabeAnfordernNachAblehnung({
    leadId: LEAD,
    angebotId: ANGEBOT,
    anpassungNotiz:
      'ZZTEST F-179 Beweis: Anpassung nach Ablehnung (await sendMail)',
    betragEur: 650,
  })

  console.log('result', r)

  const after = await db
    .from('email_log')
    .select('id, typ, resend_id, betreff, inhalt_html, created_at')
    .eq('typ', 'org_freigabe_angefordert')
    .order('created_at', { ascending: false })
    .limit(5)

  const neu = (after.data ?? []).filter((row) => !beforeIds.has(row.id))
  console.log(
    'new_mails',
    neu.map((m) => ({
      id: m.id,
      resend_id: m.resend_id,
      betreff: m.betreff,
      hasNotiz: /F-179|Anpassung|Ablehnung/i.test(String(m.inhalt_html ?? '')),
    }))
  )

  const ok =
    r.ok === true &&
    (r as { mailOk?: boolean }).mailOk === true &&
    neu.some((m) => String(m.resend_id ?? '').startsWith('staging-catch:'))

  console.log(ok ? 'F-179 PROOF OK' : 'F-179 PROOF FAIL')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
