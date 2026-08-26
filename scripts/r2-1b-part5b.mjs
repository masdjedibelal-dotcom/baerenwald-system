/**
 * R2-1B Teil5b — gezielte Live-Verify nach Deploy
 * F-177/178 auf /vorgaenge · F-179 auf /angebote/{id}
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { assertStagingWriteTarget } from './lib/prod-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const SHOT = path.join(__dirname, '../docs/test/screenshots/r2-1b/p5')
const OUT = path.join(__dirname, '../docs/test/r2-1b-p5b-results.json')
const LOG = path.join(__dirname, '../docs/test/r2-1b-p5b-log.txt')

const CRM_USER = 'admin@staging.baerenwald.test'
const CRM_PASS = 'StagingTest!2026'
const LEAD = '6eba4479-f520-4232-9e95-f3708fb0216c'
const ANGEBOT = '40f62e2e-6f1f-4dc7-ad3c-8b3c076f77c7'

fs.mkdirSync(SHOT, { recursive: true })
fs.writeFileSync(LOG, '')
const results = []
const log = (m) => {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`
  console.log(line)
  fs.appendFileSync(LOG, line + '\n')
}
const record = (id, status, note) => {
  results.push({ id, status, note })
  log(`${id} ${status} — ${note}`)
}

function loadDb() {
  const envPath = path.join(__dirname, '../.env.staging')
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq)
    if (!process.env[k]) process.env[k] = t.slice(eq + 1)
  }
  const url = process.env.STAGING_SUPABASE_URL
  const key = process.env.STAGING_SERVICE_ROLE_KEY
  assertStagingWriteTarget({ supabaseUrl: url, projectRef: 'soqownnkxmtfgvsbrgsl' })
  return createClient(url, key, { auth: { persistSession: false } })
}

async function loginCrm(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  if (!page.url().includes('/login')) return
  await page.locator('input[type=email]').first().fill(CRM_USER)
  await page.locator('input[type=password]').fill(CRM_PASS)
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
}

async function main() {
  const db = loadDb()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    await loginCrm(page)

    // ——— F-178 ———
    await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2000)
    const search = page.locator('input').filter({ hasText: '' }).first()
    // prefer placeholder search
    const q = page.locator('input[placeholder*="Suche" i], input[placeholder*="suchen" i]').first()
    if (await q.isVisible().catch(() => false)) {
      await q.fill('ZZTEST')
      await page.waitForTimeout(1500)
    }

    const headCheck = page.locator('.vg-row.head .vg-check').first()
    const rowChecks = page.locator('.vg-row:not(.head) .vg-check')
    const nRows = await rowChecks.count()
    log(`vg-rows visible checks=${nRows}`)

    if (await headCheck.isVisible().catch(() => false) && nRows > 0) {
      await headCheck.click()
      await page.waitForTimeout(600)
      const bulkbar = page.locator('text=/gewählt|ausgewählt|Treffer auswählen/i').first()
      const bulkTxt = ((await page.locator('.listcard, body').innerText().catch(() => '')) || '').slice(0, 500)
      const hasAlle = /Alle \d+ Treffer auswählen/i.test(bulkTxt)
      const selCount = (bulkTxt.match(/(\d+)\s*(gewählt|ausgewählt)/i) || [])[1]
      record(
        'F-178-header',
        'OK',
        `Header .vg-check; rows=${nRows}; selHint=${selCount ?? '?'}; Alle-N=${hasAlle}`
      )
      await page.screenshot({ path: path.join(SHOT, 'p5b-f178-header.png') })

      // Filterwechsel leert Selektion
      if (await q.isVisible().catch(() => false)) {
        await q.fill('zzz-f178-nomatch-' + Date.now())
        await page.waitForTimeout(1200)
        const after = ((await page.locator('body').innerText()) || '')
        const stillBulk = /\d+\s*(gewählt|ausgewählt)/i.test(after) && !/0\s*gewählt/i.test(after)
        // bulkbar with selection actions
        const bulkVisible = await page.getByRole('button', { name: /löschen/i }).first().isVisible().catch(() => false)
        record(
          'F-178-clear',
          bulkVisible ? 'FAIL' : 'OK',
          bulkVisible ? 'Bulk-Aktionen nach Filter noch da' : 'Selektion/Bulk nach Filterwechsel weg'
        )
        await page.screenshot({ path: path.join(SHOT, 'p5b-f178-clear.png') })
        await q.fill('ZZTEST')
        await page.waitForTimeout(1000)
      }

      // F-177 Modal: eine Zeile + Löschen
      await headCheck.click().catch(() => {}) // toggle off if on
      await page.waitForTimeout(300)
      await rowChecks.nth(0).click()
      await page.waitForTimeout(400)
      const del = page.getByRole('button', { name: /löschen/i }).first()
      if (await del.isVisible().catch(() => false)) {
        page.once('dialog', (d) => d.dismiss().catch(() => {}))
        await del.click()
        await page.waitForTimeout(800)
        const modal = page.locator('[role=dialog], .modal, .mock-modal').first()
        const mt = ((await modal.textContent().catch(() => '')) || '').replace(/\s+/g, ' ')
        const listsNames = mt.length > 20 && !/keine vorgänge|0 vorgänge/i.test(mt)
        record('F-177-modal', listsNames ? 'OK' : 'WARN', `Modal: ${mt.slice(0, 180)}`)
        await page.screenshot({ path: path.join(SHOT, 'p5b-f177-modal.png') })
        await page.keyboard.press('Escape')
        const cancel = page.getByRole('button', { name: /abbrechen|schließen|cancel/i }).first()
        if (await cancel.isVisible().catch(() => false)) await cancel.click()
      } else {
        record('F-177-modal', 'SKIP', 'Löschen-Button nicht sichtbar')
      }
    } else {
      record('F-178-header', 'FAIL', 'Keine .vg-check auf /vorgaenge')
      await page.screenshot({ path: path.join(SHOT, 'p5b-vorgaenge.png'), fullPage: true })
    }

    // ——— F-179: Angebot-Seite mit Banner ———
    await db.from('leads').update({ org_freigabe_status: 'abgelehnt' }).eq('id', LEAD)
    const before = await db
      .from('email_log')
      .select('id, resend_id, typ, betreff, inhalt_html, created_at')
      .eq('typ', 'org_freigabe_angefordert')
    const beforeIds = new Set((before.data ?? []).map((r) => r.id))

    await page.goto(`${CRM}/angebote/${ANGEBOT}`, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(SHOT, 'p5b-f179-before.png'), fullPage: false })

    const banner = page.getByText(/Freigabe abgelehnt|Org-Freigabe|erneut anfordern/i).first()
    const bannerOk = await banner.isVisible().catch(() => false)
    log(`banner visible=${bannerOk}`)

    const ta = page.locator('textarea').filter({ has: page.locator('..') }).first()
    // label "Was wurde angepasst?"
    const adapt = page.getByLabel(/Was wurde angepasst/i).or(page.locator('textarea').first())
    if (await adapt.isVisible().catch(() => false)) {
      await adapt.fill('ZZTEST Teil5 Deploy-Verify: Anpassung nach Ablehnung für F-179')
      await page.waitForTimeout(400)
      const btn = page.getByRole('button', { name: /Freigabe erneut anfordern/i }).first()
      await btn.click()
      // wait for toast / busy
      await page.waitForTimeout(5000)
      await page.screenshot({ path: path.join(SHOT, 'p5b-f179-after.png') })

      const { data: lead } = await db
        .from('leads')
        .select('org_freigabe_status')
        .eq('id', LEAD)
        .maybeSingle()
      const after = await db
        .from('email_log')
        .select('id, resend_id, typ, betreff, inhalt_html, created_at')
        .eq('typ', 'org_freigabe_angefordert')
        .order('created_at', { ascending: false })
        .limit(8)
      const neu = (after.data ?? []).filter((r) => !beforeIds.has(r.id))
      const hit = neu.find(
        (r) =>
          String(r.resend_id ?? '').startsWith('staging-catch:') &&
          /Teil5|Anpassung|Ablehnung|F-179/i.test(
            String(r.inhalt_html ?? '') + String(r.betreff ?? '')
          )
      )
      record(
        'F-179-verify',
        hit ? 'OK' : neu.length ? 'WARN' : 'FAIL',
        `status=${lead?.org_freigabe_status}; neueMails=${neu.length}; catch=${hit?.resend_id ?? neu[0]?.resend_id ?? '—'}`
      )
      if (neu[0]) {
        log(`mail sample betreff=${neu[0].betreff} resend=${neu[0].resend_id}`)
      }
    } else {
      const body = ((await page.locator('body').innerText()) || '').slice(0, 400)
      record('F-179-verify', 'FAIL', `Kein Anpassungs-Textarea. body≈ ${body.replace(/\s+/g, ' ')}`)
    }

    // restore freigegeben
    await db.from('leads').update({ org_freigabe_status: 'freigegeben' }).eq('id', LEAD)
  } catch (e) {
    record('FATAL', 'FAIL', e instanceof Error ? e.message : String(e))
    console.error(e)
  } finally {
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2))
    await browser.close()
    log(`DONE → ${OUT}`)
  }
}

main()
