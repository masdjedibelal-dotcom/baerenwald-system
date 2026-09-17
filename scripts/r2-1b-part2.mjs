/**
 * R2-1B Teil 2 — Deploy-Verify, F-176, Aufräumen, E2E-Fortsetzung
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { funnelAdvanceStep } from './lib/funnel-nav.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const SHOT = path.join(__dirname, '../docs/test/screenshots/r2-1b/p2')
const LOG = path.join(__dirname, '../docs/test/r2-1b-p2-log.txt')
const OUT = path.join(__dirname, '../docs/test/r2-1b-p2-results.json')

const CRM_USER = 'admin@staging.baerenwald.test'
const CRM_PASS = 'StagingTest!2026'
const HV_USER = 'hv-nord@example.test'
const STAFF2 = 'staff2@staging.baerenwald.test'
const PORTAL_PASS = 'StagingTest!2026'

const LEAD_E2E = '6eba4479-f520-4232-9e95-f3708fb0216c'
const DEL_LEADS = [
  '23547a2c-2b8d-4be3-898b-dfbaf97a3786',
  '130d4aa3-5a33-4ac0-87ed-cdbf8ede1fb3',
]

const results = []
let fundN = 177
let emailLogBefore = []

const log = (m) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`
  console.log(line)
  fs.appendFileSync(LOG, line + '\n')
}

function record(id, status, note, extra = {}) {
  results.push({ id, status, note, ...extra })
  log(`${id} ${status} — ${note}`)
}

function loadStagingDb() {
  const envPath = path.join(__dirname, '../.env.staging')
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq <= 0) continue
      const k = t.slice(0, eq)
      if (!process.env[k]) process.env[k] = t.slice(eq + 1)
    }
  }
  const url = process.env.STAGING_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.includes('soqownnkxmtfgvsbrgsl') || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function loginCrm(page, user = CRM_USER) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1000)
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email]').first().fill(user)
  await page.locator('input[type=password]').fill(CRM_PASS)
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 })
}

async function loginPortal(page, email) {
  await page.goto(`${WEB}/portal/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1000)
  const pw = page.locator('input[type=password]')
  if (!(await pw.isVisible().catch(() => false))) return
  await page.locator('input[type=email]').first().fill(email)
  await pw.fill(PORTAL_PASS)
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForTimeout(3000)
}

async function dismissCookies(page) {
  const btn = page.getByRole('button', { name: /ablehnen/i }).first()
  if (await btn.isVisible().catch(() => false)) {
    await btn.click()
    await page.waitForTimeout(400)
  }
}

async function runMeldeToAbsenden(page, tag, { withPhoto = true } = {}) {
  const email = `zztest.r2.1b.p2.${tag}@example.test`
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await dismissCookies(page)

  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(350)
    const body = await page.locator('body').innerText()

    const file = page.locator('input[type=file]').first()
    if (withPhoto && (await file.count())) {
      const foto = path.join(__dirname, '../docs/test/r2-5-data/ok_small.jpg')
      if (fs.existsSync(foto)) await file.setInputFiles(foto).catch(() => {})
    }

    if (/ORT & KONTAKT|Kontaktdaten/i.test(body)) {
      const fill = (ph, v) =>
        page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(v).catch(() => {})
      await fill('Vorname', 'ZZTEST')
      await fill('Nachname', `P2${tag}`)
      await fill('Straße', 'Leopoldstraße')
      await fill('Nr.', '10')
      await fill('PLZ', '80802')
      await fill('Ort', 'München')
      await fill('E-Mail', email)
      await page.locator('input.funnel-input[type=tel]').first().fill('08999993333').catch(() => {})
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count() && !(await cb.isChecked().catch(() => false)))
        await cb.check({ force: true })
    }

    if (/BESCHREIBUNG|Was ist passiert/i.test(body)) {
      const desc = page.locator('textarea:visible').first()
      if (await desc.count()) {
        const cur = await desc.inputValue().catch(() => '')
        if ((cur || '').trim().length < 10)
          await desc.fill(
            'ZZTEST R2-1B Teil2 Meldung — undichtes Rohr Küche, Wasser auf Parkett, bitte zeitnah prüfen.'
          )
      }
    }

    const step = await funnelAdvanceStep(page, log)
    if (step === 'absenden') {
      await page.getByRole('button', { name: /absenden|melden|senden|abschicken/i }).first().click()
      return { email, clicked: true }
    }
    if (/bestätigung|eingegangen|konto anlegen/i.test(body)) break
    if (step === 'stuck') break
  }
  return { email, clicked: false }
}

async function waitForBestaetigung(page, timeoutMs = 90000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const url = page.url()
    if (url.includes('/melden/bestaetigung')) return { ok: true, url, body: await page.locator('body').innerText() }
    await page.waitForTimeout(1500)
  }
  return { ok: false, url: page.url(), body: await page.locator('body').innerText() }
}

async function deleteLeadViaVorgaenge(page, leadId) {
  await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const search = page.locator('input[type=search], input[placeholder*="Such"]').first()
  if (await search.count()) {
    await search.fill(leadId.slice(0, 8))
    await page.waitForTimeout(2500)
  }
  const row = page.locator('.vg-row').first()
  if (!(await row.count())) return { ok: false, note: 'row not found' }
  await row.locator('.vg-check').click({ force: true })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^Löschen$/ }).first().click()
  await page.waitForTimeout(800)
  const modalTitle = await page.locator('.mock-modal-title, [class*="modal"] h2, h2').first().innerText().catch(() => '')
  const modalBody = await page.locator('body').innerText()
  const hasModal = /Vorgang löschen\?|Vorgänge löschen/i.test(modalBody)
  await page.screenshot({ path: `${SHOT}/del-${leadId.slice(0, 8)}-modal.png`, fullPage: false })
  if (!hasModal) return { ok: false, note: 'no MockModal', modalTitle }
  await page.getByRole('button', { name: /^Löschen$/ }).last().click()
  await page.waitForTimeout(3000)
  const toast = /gelöscht/i.test(await page.locator('body').innerText())
  return { ok: toast, note: `modal=${hasModal} toast=${toast}`, modalTitle }
}

;(async () => {
  fs.mkdirSync(SHOT, { recursive: true })
  fs.writeFileSync(LOG, `R2-1B-P2 ${new Date().toISOString()}\n`)

  const db = loadStagingDb()
  if (db) {
    const { data: logs } = await db
      .from('email_log')
      .select('resend_id, typ, created_at')
      .like('resend_id', 'staging-catch:%')
      .order('created_at', { ascending: false })
      .limit(10)
    emailLogBefore = logs ?? []
  }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ctx.on('dialog', async (d) => {
    log(`DIALOG dismiss: ${d.message().slice(0, 80)}`)
    await d.dismiss()
  })

  const page = await ctx.newPage()

  // --- Schritt 1a: F-161 ---
  await page.goto(`${WEB}/melden/staging-muster-nord?hinweis=objekt_nicht_gefunden`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await dismissCookies(page)
  await page.waitForTimeout(1500)
  const f161 = /objekt nicht gefunden/i.test(await page.locator('body').innerText())
  await page.screenshot({ path: `${SHOT}/f161-banner.png`, fullPage: true })
  record('P2-F161', f161 ? '✅' : '❌', `Amber-Banner sichtbar=${f161}`, { fund: f161 ? null : `F-${fundN++}` })

  // --- Schritt 1b: F-167 9MB (non-image to skip compression) ---
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
  })
  await dismissCookies(page)
  for (let i = 0; i < 10; i++) {
    if (await page.locator('input[type=file]').count()) break
    await funnelAdvanceStep(page, log)
  }
  const ninePdf = path.join(__dirname, '../docs/test/r2-5-data/nine_mb.pdf')
  if (!fs.existsSync(ninePdf)) fs.writeFileSync(ninePdf, Buffer.alloc(9 * 1024 * 1024, 0x25))
  await page.locator('input[type=file]').first().setInputFiles(ninePdf).catch(() => {})
  await page.waitForTimeout(2000)
  const f167body = await page.locator('body').innerText()
  const f167 = /max\.?\s*8\s*MB|zu groß \(max\. 8 MB\)/i.test(f167body)
  await page.screenshot({ path: `${SHOT}/f167-9mb.png`, fullPage: false })
  record('P2-F167', f167 ? '✅' : '❌', `9MB Toast/Error=${f167}`, { fund: f167 ? null : `F-${fundN++}` })

  // --- Schritt 1c+d+e: Melde absenden → Bestätigung (F-163, F-162, F-170) ---
  await runMeldeToAbsenden(page, 'deploy1', { withPhoto: true })
  const conf = await waitForBestaetigung(page, 90000)
  await page.screenshot({ path: `${SHOT}/confirm-deploy1.png`, fullPage: true })
  const html = await page.content()
  const refOk = /referenznummer|referenz/i.test(conf.body) && /ref=/i.test(conf.url + html)
  const nextOk =
    !/baerenwald\.netlify\.app/i.test(html) ||
    (/next=/i.test(html) && /staging--baerenwald\.netlify\.app/i.test(html))
  const ctaOk = /konto anlegen/i.test(conf.body)
  record('P2-F163', conf.ok && refOk ? '✅' : conf.ok ? '⚠️' : '❌', `confirm=${conf.ok} ref=${refOk} url=${conf.url}`, {
    fund: conf.ok && refOk ? null : `F-${fundN++}`,
  })
  record('P2-F162', conf.ok && nextOk ? '✅' : '⚠️', `next staging/relativ=${nextOk}`, {
    fund: conf.ok && nextOk ? null : `F-${fundN++}`,
  })
  record('P2-CTA', ctaOk ? '✅' : '⚠️', `neutral CTA=${ctaOk}`)

  if (db) {
    await page.waitForTimeout(3000)
    const { data: logsAfter } = await db
      .from('email_log')
      .select('resend_id, typ, created_at, betreff')
      .like('resend_id', 'staging-catch:%')
      .order('created_at', { ascending: false })
      .limit(10)
    const webCatch = (logsAfter ?? []).some((r) => String(r.resend_id).includes('website-'))
    const newWeb = (logsAfter ?? []).filter(
      (r) =>
        String(r.resend_id).includes('website-') &&
        !emailLogBefore.some((b) => b.resend_id === r.resend_id)
    )
    record('P2-F170', webCatch ? '✅' : '❌', `website-catch=${webCatch} new=${newWeb.length}`, {
      fund: webCatch ? null : `F-${fundN++}`,
    })
  }

  // --- Schritt 2: F-176 ×3 ---
  const f176 = []
  for (let n = 1; n <= 3; n++) {
    await runMeldeToAbsenden(page, `f176-${n}`, { withPhoto: n !== 2 })
    const r = await waitForBestaetigung(page, 75000)
    f176.push(r.ok)
    await page.screenshot({ path: `${SHOT}/f176-run${n}.png`, fullPage: true })
    log(`F176 run${n} ok=${r.ok} url=${r.url}`)
    await page.waitForTimeout(2000)
  }
  const f176ok = f176.every(Boolean)
  record(
    'P2-F176',
    f176ok ? '✅' : f176.filter(Boolean).length >= 2 ? '⚠️' : '❌',
    `3× Redirect bestaetigung: ${f176.map((x, i) => `#${i + 1}=${x}`).join(', ')}`,
    { fund: f176ok ? null : `F-${fundN++}` }
  )

  // --- Schritt 3: Aufräumen (Confirms OK für diese Leads) ---
  await loginCrm(page)
  for (const lid of DEL_LEADS) {
    const r = await deleteLeadViaVorgaenge(page, lid)
    let dbGone = null
    if (db) {
      const { data } = await db.from('leads').select('id').eq('id', lid).maybeSingle()
      dbGone = !data
    }
    record(`P2-DEL-${lid.slice(0, 8)}`, r.ok && dbGone ? '✅' : '⚠️', `${r.note} dbGone=${dbGone}`)
  }

  // --- Schritt 4a: HV-Übergabe am E2E-Lead ---
  const hvPage = await ctx.newPage()
  hvPage.on('dialog', async (d) => await d.dismiss())
  await loginPortal(hvPage, HV_USER)
  await hvPage.goto(`${WEB}/portal?section=vorgaenge&id=${encodeURIComponent(LEAD_E2E)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await hvPage.waitForTimeout(4000)
  await hvPage.screenshot({ path: `${SHOT}/hv-vorgang.png`, fullPage: false })
  const uebergeben = hvPage.getByRole('button', { name: /bärenwald übergeben|an bärenwald/i }).first()
  if (await uebergeben.count()) {
    await uebergeben.click()
    await hvPage.waitForTimeout(1500)
    const confirmBtn = hvPage.getByRole('button', { name: /übergeben|bestätigen|ja/i }).last()
    if (await confirmBtn.count()) await confirmBtn.click()
    await hvPage.waitForTimeout(3000)
    record('P2-4a-HV', '✅', 'HV „An Bärenwald übergeben“ geklickt')
  } else {
    record('P2-4a-HV', '⚠️', 'Übergabe-Button nicht gefunden — evtl. bereits übergeben')
  }
  await hvPage.close()

  await page.goto(`${CRM}/anfragen/${LEAD_E2E}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const crmBody = await page.locator('body').innerText()
  const angebotCta = /angebot erstellen|angebot senden/i.test(crmBody)
  await page.screenshot({ path: `${SHOT}/crm-after-hv.png`, fullPage: false })
  record('P2-4a-CRM', angebotCta ? '✅' : '⚠️', `Angebot-CTA nach HV=${angebotCta}`)

  // Block A/B/C/E2E .6-.11 — mark remaining as not completed in automation window
  for (const id of [
    'P2-4a-wizard',
    'P2-4b-A1',
    'P2-4b-A2',
    'P2-4b-A3',
    'P2-4b-A4',
    'P2-4b-A5',
    'P2-4b-A6',
    'P2-4b-A7',
    'P2-4b-A8',
    'P2-4c-B1',
    'P2-4c-B2',
    'P2-4c-B3',
    'P2-4c-B4',
    'P2-4c-B5',
    'P2-4c-B6',
    'P2-4d-C1',
    'P2-4d-C2',
    'P2-4d-C3',
    'P2-4d-C4',
    'P2-4d-C5',
    'P2-4d-C6',
    'P2-4e-E2E',
    'P2-4f-E8',
    'P2-4f-E9',
    'P2-4f-F7',
    'P2-4f-F9',
    'P2-4g-N',
  ]) {
    record(id, '🚫', 'In Teil-2-Automation nicht vollständig durchgespielt — Nachlauf')
  }

  // E8 quick attempt if time — staff2 notiz on lead
  try {
    const s2 = await ctx.newPage()
    await loginCrm(s2, STAFF2)
    await s2.goto(`${CRM}/anfragen/${LEAD_E2E}`, { waitUntil: 'domcontentloaded' })
    await s2.waitForTimeout(2000)
    const notizTab = s2.getByRole('tab', { name: /akte|notiz/i }).first()
    if (await notizTab.count()) await notizTab.click()
    await s2.waitForTimeout(1000)
    const delBtn = s2.locator('[aria-label="Notiz löschen"]').first()
    const hasDel = await delBtn.count()
    record('P2-4f-E8', hasDel ? '⚠️' : '🚫', `Staff2 Notiz-Löschen sichtbar=${hasDel} (Berechtigung nicht voll geprüft)`)
    await s2.close()
  } catch (e) {
    record('P2-4f-E8', '🚫', `E8 Fehler: ${e.message}`)
  }

  await browser.close()

  fs.writeFileSync(OUT, JSON.stringify({ results, fundNext: fundN, f176Runs: f176 }, null, 2))
  log('DONE')
})().catch((e) => {
  log(`FATAL ${e.stack || e}`)
  process.exit(1)
})
