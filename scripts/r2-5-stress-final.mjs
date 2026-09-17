/**
 * R2-5 final: kunde create (correct placeholders), B7, cleanup
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { funnelAdvanceStep } from './lib/funnel-nav.mjs'

const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const S = 'docs/test/screenshots/r2-5'
const D = 'docs/test/r2-5-data'
const LEAD = '6eba4479-f520-4232-9e95-f3708fb0216c'
const STRESS_LEAD = '8abb24da-77b3-499b-8de4-8f82ef43da2b'
const out = []
const log = (m) => {
  console.log(m)
  out.push(String(m))
}
const ids = { kundeId: null, leadId: STRESS_LEAD, created: [`lead:${STRESS_LEAD}`], cleanup: [] }

async function ensureStaff(page) {
  await page.goto(`${CRM}/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  if (page.url().includes('/login')) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@staging.baerenwald.test')
    await page.locator('input[type=password]').fill('StagingTest!2026')
    await page.getByRole('button', { name: /anmelden|login/i }).first().click()
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 })
  }
}

async function safeClickSave(page, label) {
  const btn = page.locator('button.note-send').first()
  if (!(await btn.count()) || (await btn.isDisabled().catch(() => true))) {
    log(`${label} save_skip`)
    return false
  }
  await btn.click()
  return true
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  let allowConfirm = false
  ctx.on('dialog', async (d) => {
    log(`DIALOG allow=${allowConfirm} ${d.type()} ${(d.message() || '').slice(0, 100)}`)
    if (allowConfirm && d.type() === 'confirm') await d.accept()
    else await d.dismiss()
  })
  const page = await ctx.newPage()
  await ensureStaff(page)

  // Kunde
  await page.goto(`${CRM}/neu?art=kunde`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  await page.locator('input[placeholder="Maria"]').fill('ZZTEST')
  await page.locator('input[placeholder="Koch"]').fill('R2-STRESS')
  await page.locator('input[placeholder="089 123 456"]').fill('089111222')
  await page.locator('input[placeholder="kontakt@…"]').fill('zztest.r2.stress@example.test')
  await page.locator('input[placeholder="Leopoldstraße"]').fill('Stressweg')
  await page.locator('input[placeholder="42"]').fill('1')
  await page.locator('input[placeholder="80796"]').fill('80331')
  await page.locator('input[placeholder="München"]').fill('München')
  await page.screenshot({ path: `${S}/kunde-filled.png`, fullPage: false })
  // find primary in sheet footer
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 30)
  )
  log(`buttons=${JSON.stringify(btns)}`)
  const primary =
    page.getByRole('button', { name: /kunde anlegen|anlegen|speichern/i }).filter({ hasNotText: /neu erstellen/i }).first()
  // Prefer exact
  const exact = page.locator('button').filter({ hasText: /^Kunde anlegen$|^Anlegen$|^Speichern$/ }).first()
  if (await exact.count()) {
    await exact.click({ force: true })
  } else if (await primary.count()) {
    await primary.click({ force: true })
  }
  await page.waitForTimeout(5000)
  log(`after_kunde url=${page.url()}`)
  let m = page.url().match(/\/kunden\/([0-9a-f-]{36})/i)
  if (!m) {
    await page.goto(`${CRM}/kunden`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    const s = page.locator('input[placeholder*="Such"]').first()
    if (await s.count()) {
      await s.fill('R2-STRESS')
      await page.waitForTimeout(2500)
    }
    await page.screenshot({ path: `${S}/kunde-search.png`, fullPage: false })
    const link = page.locator('a[href*="/kunden/"]').filter({ hasText: /R2-STRESS/i }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForTimeout(2000)
      m = page.url().match(/\/kunden\/([0-9a-f-]{36})/i)
    }
  }
  if (m) {
    ids.kundeId = m[1]
    ids.created.push(`kunde:${m[1]}`)
  }
  log(`kundeId=${ids.kundeId}`)

  // Freigabe-Schwelle 0 / leer if org tab
  if (ids.kundeId) {
    await page.goto(`${CRM}/kunden/${ids.kundeId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1500)
    const org = page.getByRole('tab', { name: /org|organisation/i }).first()
    if (await org.isVisible().catch(() => false)) {
      await org.click()
      await page.waitForTimeout(800)
    }
    const body = await page.locator('body').innerText()
    log(`B2 org_schwelle_visible=${/schwelle|Freigabe/i.test(body)}`)
    await page.screenshot({ path: `${S}/b2-kunde.png`, fullPage: false })
  }

  // Melde with cookie dismiss + category chips carefully
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'networkidle',
    timeout: 120000,
  }).catch(() => {})
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${S}/melde-start.png`, fullPage: false })
  for (const label of [/alle ablehnen|ablehnen/i, /akzeptieren/i]) {
    const b = page.getByRole('button', { name: label }).first()
    if (await b.isVisible().catch(() => false)) {
      await b.click().catch(() => {})
      await page.waitForTimeout(400)
    }
  }
  // wait for funnel content
  await page.waitForTimeout(1500)
  const meldeText = await page.locator('body').innerText()
  log(`melde_body_snip=${meldeText.split('\n').slice(0, 15).join('|').slice(0, 200)}`)
  for (let i = 0; i < 15; i++) {
    const fc = await page.locator('input[type=file]').count()
    if (fc) {
      log(`melde_file_at_step=${i}`)
      break
    }
    const step = await funnelAdvanceStep(page, log)
    if (step === 'stuck') break
    if (step === 'absenden') break
  }
  if (await page.locator('input[type=file]').count()) {
    const f = page.locator('input[type=file]').first()
    await f.setInputFiles(path.join(D, 'over8mb.bin'))
    await page.waitForTimeout(1500)
    log(`melde_over8=${/10\s*MB|8\s*MB|zu groß/i.test(await page.locator('body').innerText())}`)
    await page.screenshot({ path: `${S}/b5-melde-over8.png`, fullPage: false })
    await f.setInputFiles(path.join(D, 'ok_small.jpg'))
    await page.waitForTimeout(800)
    log('melde_small_ok')
  } else {
    log('melde_still_no_file')
    await page.screenshot({ path: `${S}/b5-melde-stuck.png`, fullPage: false })
  }

  // B7
  const t2 = await ctx.newPage()
  await ensureStaff(t2)
  for (const p of [page, t2]) {
    await p.goto(`${CRM}/anfragen/${LEAD}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await p.waitForTimeout(1000)
    const tab = p.getByText(/^Notizen$/i).first()
    if (await tab.isVisible().catch(() => false)) await tab.click()
    await p.waitForTimeout(500)
  }
  const ta1 = page.locator('textarea').first()
  const ta2 = t2.locator('textarea').first()
  if ((await ta1.isVisible().catch(() => false)) && (await ta2.isVisible().catch(() => false))) {
    await ta1.fill(`ZZTEST-R2-STRESS Tab1 ${Date.now()}`)
    await ta2.fill(`ZZTEST-R2-STRESS Tab2 ${Date.now()}`)
    await safeClickSave(page, 'B7t1')
    await page.waitForTimeout(900)
    await safeClickSave(t2, 'B7t2')
    await t2.waitForTimeout(1200)
    await page.reload()
    await page.waitForTimeout(1200)
    const tab = page.getByText(/^Notizen$/i).first()
    if (await tab.isVisible().catch(() => false)) await tab.click()
    const final = await page.locator('body').innerText()
    log(`B7 Tab1=${/Tab1/.test(final)} Tab2=${/Tab2/.test(final)} both=${/Tab1/.test(final) && /Tab2/.test(final)}`)
    await page.screenshot({ path: `${S}/b7-concurrency.png`, fullPage: false })
  } else log('B7 missing textarea')
  await t2.close()

  // Cleanup lead — soft: open + try storno
  await page.goto(`${CRM}/anfragen/${STRESS_LEAD}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  const leadBody = await page.locator('body').innerText()
  log(`stress_lead_open=${!/nicht gefunden|404/i.test(leadBody)} xss_visible=${leadBody.includes('<b>x</b>') || leadBody.includes('DROP')}`)
  await page.screenshot({ path: `${S}/cleanup-lead.png`, fullPage: true })
  // overflow
  await page.locator('button').filter({ hasText: '⋯' }).first().click().catch(() => {})
  await page.waitForTimeout(400)
  const del = page.getByRole('menuitem', { name: /löschen|storn/i }).or(page.getByRole('button', { name: /löschen|storn/i }))
  log(`lead_del=${await del.count()}`)
  if (await del.count()) {
    await del.first().click()
    await page.waitForTimeout(800)
    allowConfirm = true
    const conf = page.getByRole('button', { name: /löschen|bestätigen|stornieren/i }).last()
    if (await conf.count()) {
      await conf.click()
      await page.waitForTimeout(2500)
      ids.cleanup.push(`lead:${STRESS_LEAD}:ui_attempt`)
    }
    allowConfirm = false
  } else ids.cleanup.push(`lead:${STRESS_LEAD}:NO_DELETE_UI`)

  if (ids.kundeId) {
    await page.goto(`${CRM}/kunden/${ids.kundeId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1500)
    await page.locator('button').filter({ hasText: '⋯' }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    const kd = page.getByRole('button', { name: /löschen/i }).or(page.getByText(/kunde löschen/i))
    log(`kunde_del=${await kd.count()}`)
    if (await kd.count()) {
      await kd.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${S}/cleanup-modal.png`, fullPage: false })
      const tip = page.locator('input[type=text], input.input').last()
      if (await tip.isVisible().catch(() => false)) {
        const t = await page.locator('h1').first().innerText().catch(() => 'ZZTEST R2-STRESS')
        await tip.fill(t.trim())
      }
      allowConfirm = true
      const conf = page.getByRole('button', { name: /löschen|endgültig|bestätigen/i }).last()
      if (await conf.count()) {
        await conf.click()
        await page.waitForTimeout(2500)
        ids.cleanup.push(`kunde:${ids.kundeId}:ui_attempt`)
        log(`cleanup_kunde_url=${page.url()}`)
      }
      allowConfirm = false
    } else ids.cleanup.push(`kunde:${ids.kundeId}:NO_DELETE_UI`)
  }

  // Code-level MwSt probe note in log
  log('CODE summenAusPositionen: Math.max(0, netto) → negative Zeilen werden nicht explizit geclampt vor Aggregation; End-Netto floored at 0')
  log('CODE PhotoUpload website MAX 10MB; CRM notiz-foto + meldung-storage MAX 8MB')

  fs.appendFileSync(`${S}/stress-log.txt`, '\n--- final ---\n' + out.join('\n'))
  fs.writeFileSync(`${S}/created-ids.json`, JSON.stringify(ids, null, 2))
  await browser.close()
  console.log('DONE', JSON.stringify(ids))
})().catch((e) => {
  console.error('FAIL', e)
  fs.appendFileSync(`${S}/stress-log.txt`, '\nFAIL ' + String(e))
  process.exit(1)
})
