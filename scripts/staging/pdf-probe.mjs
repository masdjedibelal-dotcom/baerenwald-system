#!/usr/bin/env node
/**
 * Staging: PDF-Pflichtliste + kurze Status-Stichproben (ohne Mail-Inhalt).
 * Output: docs/test/pdf-probe-results.json + screenshots/pdf-probe/
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const OUT_DIR = path.join(ROOT, 'docs/test/screenshots/pdf-probe')
const OUT = path.join(ROOT, 'docs/test/pdf-probe-results.json')

const ADMIN = 'admin@staging.baerenwald.test'
const PASS = 'StagingTest!2026'

/** bekannte Staging-IDs (Seed / Abnahme) */
const ANGEBOT_ID = '40f62e2e-6f1f-4dc7-ad3c-8b3c076f77c7' // gesendet_kunde
const RE_OK = 'c770d2da-ce85-462a-859d-585c072906f8' // STG-R2-0001 gesendet
const RE_GS = '537d9dbf-fe58-4690-b987-c6e76d523820' // GS-RE2026-2069 gutschrift
const RE_LEGACY = '25e91a9e-c4ce-42eb-aa43-96800533ab8f' // RE2026-2116

fs.mkdirSync(OUT_DIR, { recursive: true })

const results = []
function mark(id, status, note, extra = {}) {
  const row = { id, status, note, ...extra, at: new Date().toISOString() }
  results.push(row)
  const icon = { ok: '✅', warn: '⚠️', fail: '❌', skip: '⏭️' }[status] || '?'
  console.log(`${icon} ${id} — ${note}`)
}

async function login(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email], input[name=email]').first().fill(ADMIN)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
}

async function probePdf(page, id, url) {
  const res = await page.request.get(url, { timeout: 120000 })
  const ct = (res.headers()['content-type'] || '').toLowerCase()
  const buf = Buffer.from(await res.body())
  const head = buf.subarray(0, 8).toString('utf8')
  const isPdf = ct.includes('pdf') || head.startsWith('%PDF')
  const textSnippet = !isPdf ? buf.subarray(0, 400).toString('utf8') : null
  if (res.ok() && isPdf) {
    const file = path.join(OUT_DIR, `${id}.pdf`)
    fs.writeFileSync(file, buf)
    mark(id, 'ok', `HTTP ${res.status} PDF ${buf.length} B`, { bytes: buf.length, file })
  } else {
    mark(id, 'fail', `HTTP ${res.status} ct=${ct} head=${JSON.stringify(head)}`, {
      bytes: buf.length,
      body: textSnippet,
    })
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await login(page)
    mark('login', 'ok', `CRM eingeloggt als ${ADMIN}`)

    await probePdf(page, 'D1-angebot', `${CRM}/api/angebote/${ANGEBOT_ID}/pdf`)
    await probePdf(page, 'D1b-angebot-query', `${CRM}/api/angebot-pdf?angebotId=${ANGEBOT_ID}`)
    await probePdf(page, 'D2-rechnung', `${CRM}/api/rechnungen/${RE_OK}/pdf`)
    await probePdf(page, 'D2b-rechnung-query', `${CRM}/api/rechnung-pdf?rechnungId=${RE_OK}`)
    await probePdf(page, 'D2c-rechnung-legacy', `${CRM}/api/rechnungen/${RE_LEGACY}/pdf`)
    await probePdf(page, 'D3-gutschrift', `${CRM}/api/rechnungen/${RE_GS}/pdf`)

    // CRM Detail-Seiten laden (Status-Sicht)
    for (const [id, pathUrl] of [
      ['UI-angebot', `/angebote/${ANGEBOT_ID}`],
      ['UI-rechnung', `/rechnungen/${RE_OK}`],
      ['UI-gutschrift', `/rechnungen/${RE_GS}`],
    ]) {
      const res = await page.goto(`${CRM}${pathUrl}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(1500)
      const title = await page.title()
      const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 500)
      await page.screenshot({ path: path.join(OUT_DIR, `${id}.png`), fullPage: false })
      if (res && res.ok()) mark(id, 'ok', `geladen · ${title}`, { snippet: bodyText.slice(0, 160) })
      else mark(id, 'warn', `status=${res?.status()} · ${title}`)
    }

    // Website Melde-Einstieg (kein Submit)
    const melde = await page.goto(`${WEB}/melden`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(OUT_DIR, 'web-melden.png'), fullPage: false })
    if (!melde) mark('A2-melde-route', 'fail', 'Navigation fehlgeschlagen')
    else if (melde.status() === 404)
      mark('A2-melde-route', 'fail', 'HTTP 404 — Pfad prüfen (org/objekt-Slug nötig?)')
    else mark('A2-melde-route', melde.ok() ? 'ok' : 'warn', `HTTP ${melde.status()} url=${page.url()}`)

    // HV-Portal Login-Seite
    const hv = await page.goto(`${WEB}/portal`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(OUT_DIR, 'web-portal.png'), fullPage: false })
    mark('portal-route', hv.ok() ? 'ok' : 'warn', `HTTP ${hv.status()} url=${page.url()}`)
  } catch (e) {
    mark('crash', 'fail', String(e?.message || e))
  } finally {
    await browser.close()
  }

  const summary = results.reduce((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1
    return a
  }, {})
  const payload = { finished_at: new Date().toISOString(), summary, results }
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
  console.log('\n=== pdf-probe ===', summary)
  console.log('wrote', OUT)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
