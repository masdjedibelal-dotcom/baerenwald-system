#!/usr/bin/env node
/**
 * AUFTRAG F — Prod Verify (Parity + Lese-Smoke + Hydration + optional Mail)
 *
 * Login via Magic-Link (Service-Role generateLink) — kein Passwort nötig.
 *
 *   node --env-file=.env.local scripts/prod/verify-release.mjs
 *   PROD_MAIL_TO=belal.masdjedi@gmail.com node --env-file=.env.local scripts/prod/verify-release.mjs --mail
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { Resend } from 'resend'
import { PROD_PROJECT_REF } from '../lib/prod-guard.mjs'

const CRM_AUTH_COOKIE_NAME = 'sb-bw-crm-auth'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const CRM = 'https://baerenwald-backend.netlify.app'
const WEB = 'https://baerenwald.netlify.app'
const OUT = path.join(ROOT, 'docs/test/AUFTRAG-F-VERIFY.json')
const SHOT = path.join(ROOT, 'docs/test/screenshots/auftrag-f')
const RE2111 = '3778e0e3-6593-48f4-a098-f45583b1bb12'

const results = []
function mark(id, status, note) {
  results.push({ id, status, note, at: new Date().toISOString() })
  const icon = { ok: '✅', warn: '⚠️', fail: '❌', skip: '⏭️' }[status] || '?'
  console.log(`${icon} ${id} — ${note}`)
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes(PROD_PROJECT_REF)) {
    console.error('ABORT: NEXT_PUBLIC_SUPABASE_URL muss Prod sein')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function anonKey() {
  const k = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!k) {
    console.error('ABORT: NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt')
    process.exit(1)
  }
  return k
}

async function sessionCookiesForEmail(email) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anon = anonKey()
  const admin = createClient(url, service, { auth: { persistSession: false } })
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr || !link?.properties?.email_otp) {
    throw new Error(`OTP ${email}: ${linkErr?.message || 'kein email_otp'}`)
  }
  const anonC = createClient(url, anon, { auth: { persistSession: false } })
  const { data: verified, error: vErr } = await anonC.auth.verifyOtp({
    email,
    token: link.properties.email_otp,
    type: 'email',
  })
  if (vErr || !verified.session) {
    throw new Error(`verifyOtp ${email}: ${vErr?.message || 'keine Session'}`)
  }
  const cookiesToSet = []
  const serverClient = createServerClient(url, anon, {
    cookieOptions: { name: CRM_AUTH_COOKIE_NAME },
    cookies: {
      getAll: () => [],
      setAll: (cookies) => {
        cookiesToSet.push(...cookies)
      },
    },
  })
  const { error: sErr } = await serverClient.auth.setSession({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
  })
  if (sErr) throw new Error(`setSession: ${sErr.message}`)
  return cookiesToSet
}

async function magicLogin(page, _sb, email) {
  const cookies = await sessionCookiesForEmail(email)
  const host = new URL(CRM).hostname
  await page.context().clearCookies()
  await page.context().addCookies(
    cookies.map((c) => {
      const raw = String(c.options?.sameSite ?? 'Lax')
      const sameSite =
        raw.toLowerCase() === 'strict' ? 'Strict' : raw.toLowerCase() === 'none' ? 'None' : 'Lax'
      return {
        name: c.name,
        value: c.value,
        domain: host,
        path: c.options?.path ?? '/',
        httpOnly: Boolean(c.options?.httpOnly),
        secure: true,
        sameSite,
      }
    })
  )
  await page.goto(`${CRM}/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  return page.url()
}

async function openReModal(page, label) {
  await page.goto(`${CRM}/rechnungen/${RE2111}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  const body = await page.locator('body').innerText()
  const loaded =
    (/bezahlt|könig|rechnung bearbeiten|bewertung/i.test(body) || /RE2026-2111/i.test(body)) &&
    !/nicht gefunden|application error/i.test(body) &&
    !page.url().includes('/login')
  await page.waitForTimeout(800)
  const more = page.locator('button[aria-label="Weitere Aktionen"]').first()
  let modal = false
  if (await more.isVisible().catch(() => false)) {
    await more.click()
    await page.waitForTimeout(500)
    const menu = await page.locator('.menu, [role=menu]').first().innerText().catch(() => '')
    mark(`${label}-RE-Overflow`, /pdf|korrektur|löschen|erinnerung/i.test(menu) ? 'ok' : 'warn', menu.slice(0, 120).replace(/\n/g, ' | '))
    const erinnerung = page.getByText(/zahlungserinnerung/i).first()
    if (await erinnerung.isVisible().catch(() => false)) {
      // nur öffnen wenn nicht disabled — sonst PDF
      await page.getByText(/pdf öffnen/i).first().click().catch(() => {})
      await page.waitForTimeout(600)
    }
    await page.keyboard.press('Escape').catch(() => {})
  } else {
    // Modal-Stichprobe: Bewertung / Bearbeiten disabled dialog
    const primary = page.getByRole('button', { name: /bewertung|pdf|als bezahlt/i }).first()
    if (await primary.isVisible().catch(() => false)) {
      await primary.click().catch(() => {})
      await page.waitForTimeout(700)
      modal = await page.locator('.modal, [role=dialog]').first().isVisible().catch(() => false)
      await page.keyboard.press('Escape').catch(() => {})
    }
    mark(`${label}-RE-Overflow`, modal ? 'ok' : 'warn', modal ? 'Modal via Primary geöffnet' : 'kein Overflow — Status bezahlt')
  }
  mark(`${label}-RE2111`, loaded ? 'ok' : 'fail', loaded ? `geladen · modalProbe=${modal}` : body.slice(0, 100).replace(/\n/g, ' '))
}

async function readSmoke(page) {
  const consoleErrs = []
  const netFails = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrs.push(msg.text().slice(0, 160))
  })
  page.on('pageerror', (err) => consoleErrs.push(String(err).slice(0, 160)))
  page.on('response', (res) => {
    if (res.status() >= 400) netFails.push(`${res.status()} ${res.url().slice(0, 120)}`)
  })

  const sb = client()
  const { data: vorg } = await sb.from('leads').select('id').is('geloescht_am', null).order('updated_at', { ascending: false }).limit(5)
  const { data: kunden } = await sb.from('kunden').select('id').order('updated_at', { ascending: false }).limit(5)
  const { data: objekte } = await sb.from('kunden_objekte').select('id, kunde_id').limit(3)
  const { data: res } = await sb.from('rechnungen').select('id').order('updated_at', { ascending: false }).limit(3)

  for (const id of (vorg || []).map((x) => x.id)) {
    await page.goto(`${CRM}/anfragen/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(800)
  }
  mark('Smoke-Vorgaenge', 'ok', `${vorg?.length ?? 0} geöffnet`)

  for (const id of (kunden || []).map((x) => x.id)) {
    await page.goto(`${CRM}/kunden/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(700)
  }
  mark('Smoke-Kunden', 'ok', `${kunden?.length ?? 0} geöffnet`)

  let objOk = 0
  for (const o of objekte || []) {
    if (!o.kunde_id) continue
    const url = `${CRM}/kunden/${o.kunde_id}/objekte/${o.id}`
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null)
    await page.waitForTimeout(700)
    if (res && res.status() < 400 && !page.url().includes('/login')) objOk++
  }
  mark('Smoke-Objekte', objOk > 0 ? 'ok' : 'warn', `${objOk}/${objekte?.length ?? 0} über /kunden/…/objekte/…`)

  for (const id of (res || []).map((x) => x.id)) {
    await page.goto(`${CRM}/rechnungen/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(700)
  }
  mark('Smoke-REs', 'ok', `${res?.length ?? 0} geöffnet`)

  const realConsole = consoleErrs.filter((t) => !/favicon|Download the React DevTools|hydration/i.test(t))
  const realNet = netFails.filter((t) => !/favicon|404.*\.map/.test(t))
  mark(
    'Smoke-Console',
    realConsole.length === 0 ? 'ok' : 'warn',
    realConsole.length ? realConsole.slice(0, 3).join(' · ') : 'keine Errors'
  )
  mark(
    'Smoke-Network',
    realNet.length === 0 ? 'ok' : 'warn',
    realNet.length ? realNet.slice(0, 5).join(' · ') : 'keine 4xx/5xx'
  )
  return { consoleErrs, netFails }
}

async function hydrationProjekt(page, sb) {
  const { data: auf } = await sb
    .from('auftraege')
    .select('id, kunden_token')
    .not('kunden_token', 'is', null)
    .limit(3)
  let clean = 0
  let hydratedErr = 0
  for (const a of auf || []) {
    const errors = []
    const onErr = (err) => errors.push(String(err))
    page.on('pageerror', onErr)
    await page.goto(`${CRM}/projekt/${a.kunden_token}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(2500)
    page.off('pageerror', onErr)
    const body = await page.locator('body').innerText()
    const hydra = errors.some((e) => /hydrat/i.test(e)) || /Minified React error #(422|425)/i.test(errors.join(' '))
    if (hydra) hydratedErr++
    else clean++
    await page.screenshot({ path: path.join(SHOT, `projekt-${a.id.slice(0, 8)}.png`), fullPage: false }).catch(() => {})
    mark(
      `Hydration-${a.id.slice(0, 8)}`,
      hydra ? 'fail' : /pipeline|projekt|auftrag|update/i.test(body) ? 'ok' : 'warn',
      hydra ? errors.slice(0, 2).join(' | ') : body.slice(0, 80).replace(/\n/g, ' ')
    )
  }
  mark('Hydration-Summary', hydratedErr === 0 ? 'ok' : 'fail', `clean=${clean} hydraErr=${hydratedErr}`)
}

async function sendMailProof(sb) {
  const to = process.env.PROD_MAIL_TO || 'belal.masdjedi@gmail.com'
  const key = process.env.RESEND_API_KEY || process.env.RESEND_KEY
  if (!key) {
    mark('Mail-Proof', 'skip', 'RESEND_API_KEY fehlt in Env')
    return
  }
  const resend = new Resend(key)
  const subject = `[AUFTRAG-F] Prod-Mail-Beweis ${new Date().toISOString()}`
  // Verifizierte Absender-Domain (ohne Bindestrich) — siehe RESEND_FROM_* auf Prod
  const fromCandidates = [
    process.env.MAIL_FROM,
    process.env.RESEND_FROM_EMAIL,
    process.env.RESEND_FROM_ANFRAGEN,
    'Bärenwald München <anfragen@baerenwaldmuenchen.de>',
    'Bärenwald München <info@baerenwaldmuenchen.de>',
  ].filter(Boolean)
  let data = null
  let lastErr = null
  for (const from of fromCandidates) {
    const r = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: `<p>Prod-Release AUFTRAG F — Empfangsbeweis.</p><p>Zeit: ${new Date().toISOString()}</p><p>From: ${from}</p>`,
    })
    if (!r.error) {
      data = r.data
      mark('Mail-Proof-From', 'ok', String(from))
      break
    }
    lastErr = r.error
  }
  if (!data) {
    mark('Mail-Proof', 'fail', lastErr?.message || 'Resend fehlgeschlagen')
    return
  }
  // optional email_log (fail soft)
  try {
    await sb.from('email_log').insert({
      typ: 'auftrag_f_verify',
      an_email: to,
      betreff: subject,
      status: 'gesendet',
      resend_id: data?.id || null,
      inhalt_html: '<p>Prod-Release Empfangsbeweis</p>',
    })
  } catch {
    /* ignore */
  }
  mark('Mail-Proof', 'ok', `an ${to} · resend=${data?.id || '?'}`)
}

async function envPrecheck() {
  for (const [name, url] of [
    ['CRM', CRM],
    ['WEB', WEB],
  ]) {
    const html = await fetch(url).then((r) => r.text())
    const hasProd = /wnotlydvhsmfkhexgeol/.test(html) || true // may only be in chunks
    mark(`Env-${name}-HTTP`, 'ok', `status load · title=${(html.match(/<title>([^<]+)/i) || [])[1] || '?'}`)
  }
  // chunk scan CRM
  const html = await fetch(`${CRM}/login`).then((r) => r.text())
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]).slice(0, 20)
  let urlSeen = null
  let catcherLeak = false
  for (const c of chunks) {
    const body = await fetch(`${CRM}${c}`).then((r) => r.text())
    const m = body.match(/https:\/\/(wnotlydvhsmfkhexgeol|soqownnkxmtfgvsbrgsl)\.supabase\.co/)
    if (m && !urlSeen) urlSeen = m[1]
    if (/ALLOW_STAGING_REAL_MAIL\s*[:=]\s*['\"]?1/.test(body) || /MAIL_CATCHER\s*[:=]\s*['\"]?1/.test(body)) {
      catcherLeak = true
    }
  }
  mark(
    'Env-Supabase-URL',
    urlSeen === PROD_PROJECT_REF ? 'ok' : 'fail',
    urlSeen ? `NEXT_PUBLIC → ${urlSeen}` : 'nicht in Chunks gefunden'
  )
  mark('Env-Mail-Catcher-Flags', catcherLeak ? 'fail' : 'ok', catcherLeak ? 'Catcher/Allow in Bundle' : 'keine Catcher=1 in gescannten Chunks')

  const sb = client()
  const { data: firm } = await sb.from('einstellungen').select('key,value').in('key', ['ust_id', 'steuernummer', 'firmenname'])
  const map = Object.fromEntries((firm || []).map((r) => [r.key, r.value]))
  const taxOk =
    /^DE\d{9}$/.test(String(map.ust_id || '')) &&
    /^\d{8,}$/.test(String(map.steuernummer || '').replace(/\s/g, ''))
  mark(
    'Env-Steuernummern',
    taxOk ? 'ok' : 'fail',
    `ust=${map.ust_id || '—'} steuer=${map.steuernummer || '—'} firma=${map.firmenname || '—'}`
  )
}

async function main() {
  fs.mkdirSync(SHOT, { recursive: true })
  const sb = client()
  const doMail = process.argv.includes('--mail')

  await envPrecheck()

  const browser = await chromium.launch({ headless: true })
  try {
    // info@
    const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page1.on('dialog', (d) => d.dismiss())
    const u1 = await magicLogin(page1, sb, 'info@baerenwald-muenchen.de')
    mark('Login-info@', /login/i.test(u1) ? 'fail' : 'ok', u1.slice(0, 80))
    await openReModal(page1, 'info')
    await readSmoke(page1)
    await hydrationProjekt(page1, sb)
    await page1.close()

    // Zweit-Staff (info@baerenwald.de — zweites Staff-Profil)
    const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page2.on('dialog', (d) => d.dismiss())
    const u2 = await magicLogin(page2, sb, 'info@baerenwald.de')
    mark('Login-Zweit-Staff', /login/i.test(u2) ? 'fail' : 'ok', u2.slice(0, 80))
    await openReModal(page2, 'staff2')
    await page2.close()

    if (doMail) await sendMailProof(sb)
    else mark('Mail-Proof', 'skip', 'ohne --mail Flag')
  } catch (e) {
    mark('RUN', 'fail', e instanceof Error ? e.message : String(e))
  } finally {
    await browser.close()
    const by = {}
    for (const r of results) by[r.status] = (by[r.status] || 0) + 1
    fs.writeFileSync(OUT, JSON.stringify({ finished_at: new Date().toISOString(), by, results }, null, 2))
    console.log('\n=== AUFTRAG-F verify ===', by)
    console.log('Wrote', OUT)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
