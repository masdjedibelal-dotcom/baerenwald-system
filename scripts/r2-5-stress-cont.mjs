/**
 * R2-5 Stress continuation — kunde create, melde files, B7, cleanup lead
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

async function login(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1200)
  if (!page.url().includes('/login')) return
  await page.waitForSelector('input[type=password]', { timeout: 30000 })
  await page.locator('input[type=email],input[name=email]').first().fill('admin@staging.baerenwald.test')
  await page.locator('input[type=password]').fill('StagingTest!2026')
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 })
}

async function safeClickSave(page, label) {
  const btn = page.locator('button.note-send').first()
  if (!(await btn.count()) || (await btn.isDisabled().catch(() => true))) {
    log(`${label} save_disabled_or_missing`)
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
    log(`DIALOG allow=${allowConfirm} ${d.type()} ${(d.message() || '').slice(0, 120)}`)
    if (allowConfirm && d.type() === 'confirm') await d.accept()
    else await d.dismiss()
  })
  const page = await ctx.newPage()
  await login(page)

  // --- Kunde create: dump form fields ---
  await page.goto(`${CRM}/neu?art=kunde`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3000)
  const fields = await page.evaluate(() => {
    return [...document.querySelectorAll('input,select,textarea')].slice(0, 40).map((el) => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      ph: el.getAttribute('placeholder'),
      cls: (el.className || '').toString().slice(0, 40),
      label: el.closest('label')?.innerText?.slice(0, 40) || el.previousElementSibling?.textContent?.slice(0, 40),
    }))
  })
  log(`kunde_fields=${JSON.stringify(fields)}`)
  await page.screenshot({ path: `${S}/kunde-form2.png`, fullPage: true })

  // Fill by scanning labels in MockField
  await page.evaluate(() => {
    const byLabel = (lab, val) => {
      const labs = [...document.querySelectorAll('.mock-field, .form-field, label, div')].filter(
        (n) => (n.childNodes?.[0]?.textContent || n.textContent || '').trim().startsWith(lab)
      )
      for (const n of labs) {
        const inp = n.querySelector('input,textarea,select') || n.parentElement?.querySelector('input')
        if (inp && inp.tagName === 'INPUT') {
          inp.focus()
          inp.value = val
          inp.dispatchEvent(new Event('input', { bubbles: true }))
          inp.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false
    }
    byLabel('Vorname', 'ZZTEST')
    byLabel('Nachname', 'R2-STRESS')
    byLabel('E-Mail', 'zztest.r2.stress@example.test')
    byLabel('Straße', 'Stressweg')
    byLabel('Hausnummer', '1')
    byLabel('PLZ', '80331')
    byLabel('Ort', 'München')
  })
  // Also try react-friendly fill via playwright on visible text inputs in sheet
  const sheetInputs = page.locator('.editor-sheet input.txt, .editor-sheet-overlay input.txt, input.txt')
  const n = await sheetInputs.count()
  log(`sheet_inputs=${n}`)
  // Heuristic order from NeuErstellenClient: vorname, nachname, tel, mail, strasse, hausnr, plz, ort
  const vals = ['ZZTEST', 'R2-STRESS', '089111', 'zztest.r2.stress@example.test', 'Stressweg', '1', '80331', 'München']
  for (let i = 0; i < Math.min(n, vals.length); i++) {
    const el = sheetInputs.nth(i)
    const ph = (await el.getAttribute('placeholder')) || ''
    const typ = (await el.getAttribute('type')) || 'text'
    if (typ === 'hidden') continue
    // map by placeholder when possible
    if (/Vorname/i.test(ph)) await el.fill('ZZTEST')
    else if (/Nachname/i.test(ph)) await el.fill('R2-STRESS')
    else if (/mail/i.test(ph)) await el.fill('zztest.r2.stress@example.test')
    else if (/Straße/i.test(ph)) await el.fill('Stressweg')
    else if (/Nr/i.test(ph)) await el.fill('1')
    else if (/80331|PLZ/i.test(ph)) await el.fill('80331')
    else if (/München|Ort/i.test(ph)) await el.fill('München')
    else if (/089/i.test(ph)) await el.fill('089111')
    else await el.fill(vals[i])
  }
  await page.screenshot({ path: `${S}/kunde-filled.png`, fullPage: false })
  const createBtn = page.getByRole('button', { name: /^Kunde anlegen$/i }).first()
  log(`kunde_anlegen_count=${await createBtn.count()} disabled=${await createBtn.isDisabled().catch(() => '?')}`)
  if (await createBtn.count()) {
    await createBtn.click({ force: true })
    await page.waitForTimeout(5000)
  }
  log(`after_kunde url=${page.url()}`)
  let m = page.url().match(/\/kunden\/([0-9a-f-]{36})/i)
  if (m) {
    ids.kundeId = m[1]
    ids.created.push(`kunde:${m[1]}`)
  }
  if (!ids.kundeId) {
    await page.goto(`${CRM}/kunden`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    const s = page.locator('input[type=search], input[placeholder*="Such"]').first()
    if (await s.count()) {
      await s.fill('R2-STRESS')
      await page.waitForTimeout(2000)
    }
    const link = page.locator('a[href*="/kunden/"]').filter({ hasText: /R2-STRESS|ZZTEST/i }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForTimeout(2000)
      m = page.url().match(/\/kunden\/([0-9a-f-]{36})/i)
      if (m) {
        ids.kundeId = m[1]
        ids.created.push(`kunde:${m[1]}`)
      }
    }
  }
  log(`kundeId=${ids.kundeId}`)

  // --- Kundename extreme rename if created ---
  if (ids.kundeId) {
    await page.goto(`${CRM}/kunden/${ids.kundeId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1500)
    const edit = page.getByRole('button', { name: /bearbeiten|ändern/i }).first()
    if (await edit.count()) {
      await edit.click()
      await page.waitForTimeout(800)
      const nameInp = page.locator('input').filter({ hasText: '' }).first()
      // try long name
      const longName = 'ZZTEST-' + 'Ä'.repeat(200)
      const vor = page.locator('input').nth(0)
      await vor.fill(longName.slice(0, 80)).catch(() => {})
      log(`B1 kundename_long_try`)
    }
  }

  // --- Melde file: navigate carefully ---
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(1200)
  if (await page.getByRole('button', { name: /ablehnen/i }).first().isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /ablehnen/i }).first().click()
    await page.waitForTimeout(500)
  }
  for (let step = 0; step < 15; step++) {
    const files = await page.locator('input[type=file]').count()
    const text = await page.locator('body').innerText()
    log(`melde_step=${step} files=${files} head=${text.split('\n').slice(0, 6).join('|').slice(0, 120)}`)
    if (files > 0) break
    const adv = await funnelAdvanceStep(page, log)
    if (adv === 'stuck') break
    if (adv === 'absenden') break
  }
  const meldeFile = page.locator('input[type=file]').first()
  if (await meldeFile.count()) {
    await meldeFile.setInputFiles(path.join(D, 'over8mb.bin')).catch((e) => log(`melde_over8_err=${e.message}`))
    await page.waitForTimeout(1500)
    log(`melde_over8_msg=${/10\s*MB|8\s*MB|zu groß|maximal/i.test(await page.locator('body').innerText())}`)
    await page.screenshot({ path: `${S}/b5-melde-over8.png`, fullPage: false })
    await meldeFile.setInputFiles(path.join(D, 'ok_small.jpg')).catch(() => {})
    await page.waitForTimeout(800)
    log('melde_small_ok')
  } else {
    log('melde_no_file')
    await page.screenshot({ path: `${S}/b5-melde-nofile.png`, fullPage: false })
  }

  // --- B7 concurrency ---
  const t1 = page
  const t2 = await ctx.newPage()
  await login(t2)
  for (const p of [t1, t2]) {
    await p.goto(`${CRM}/anfragen/${LEAD}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await p.waitForTimeout(1200)
    const tab = p.getByRole('tab', { name: /notiz/i }).or(p.getByText(/^Notizen$/i)).first()
    if (await tab.isVisible().catch(() => false)) await tab.click()
    await p.waitForTimeout(600)
  }
  const ta1 = t1.locator('textarea').first()
  const ta2 = t2.locator('textarea').first()
  if ((await ta1.isVisible().catch(() => false)) && (await ta2.isVisible().catch(() => false))) {
    const stamp1 = `ZZTEST-R2-STRESS Tab1 ${Date.now()}`
    const stamp2 = `ZZTEST-R2-STRESS Tab2 ${Date.now()}`
    await ta1.fill(stamp1)
    await ta2.fill(stamp2)
    await safeClickSave(t1, 'B7t1')
    await t1.waitForTimeout(1000)
    await safeClickSave(t2, 'B7t2')
    await t2.waitForTimeout(1200)
    await t1.reload()
    await t1.waitForTimeout(1200)
    const tab = t1.getByRole('tab', { name: /notiz/i }).or(t1.getByText(/^Notizen$/i)).first()
    if (await tab.isVisible().catch(() => false)) await tab.click()
    const final = await t1.locator('body').innerText()
    log(
      `B7 Tab1=${final.includes('Tab1')} Tab2=${final.includes('Tab2')} both=${final.includes('Tab1') && final.includes('Tab2')}`
    )
    await t1.screenshot({ path: `${S}/b7-concurrency.png`, fullPage: false })
  } else log('B7 no textareas')
  await t2.close()

  // --- RE bezahlt dual tab (soft: open same RE, try mark paid cancel) ---
  const RE = 'c770d2da' // STG-R2-0001 partial id search
  await page.goto(`${CRM}/rechnungen`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1200)
  const reLink = page.locator('a[href*="/rechnungen/"]').filter({ hasText: /STG-R2-0001|R2/i }).first()
  if (await reLink.count()) {
    await reLink.click()
    await page.waitForTimeout(1500)
    log(`B7 re_url=${page.url()}`)
    await page.screenshot({ path: `${S}/b7-re.png`, fullPage: false })
    const paid = page.getByRole('button', { name: /bezahlt|als bezahlt/i }).first()
    log(`B7 re_bezahlt_btn=${await paid.count()}`)
  } else log('B7 no RE link (seed)')

  // --- Cleanup stress lead if delete exists ---
  await page.goto(`${CRM}/anfragen/${STRESS_LEAD}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${S}/cleanup-lead.png`, fullPage: false })
  const more = page.locator('button').filter({ hasText: '⋯' }).first()
  if (await more.isVisible().catch(() => false)) await more.click().catch(() => {})
  const delLead = page.getByRole('button', { name: /löschen|stornieren/i })
  log(`cleanup_lead_btns=${await delLead.count()} body_has=${/ZZTEST-R2-STRESS API|8abb24da/i.test(await page.locator('body').innerText())}`)
  if (await delLead.count()) {
    await delLead.first().click()
    await page.waitForTimeout(800)
    allowConfirm = true
    const conf = page.getByRole('button', { name: /löschen|bestätigen|stornieren/i }).last()
    if (await conf.count()) {
      await conf.click()
      await page.waitForTimeout(2000)
      ids.cleanup.push(`lead:${STRESS_LEAD}:attempted`)
    }
    allowConfirm = false
  } else {
    ids.cleanup.push(`lead:${STRESS_LEAD}:NO_UI_DELETE`)
  }

  // Cleanup kunde
  if (ids.kundeId) {
    await page.goto(`${CRM}/kunden/${ids.kundeId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1500)
    const del = page.getByRole('button', { name: /löschen|kunde löschen/i })
    log(`cleanup_kunde_btns=${await del.count()}`)
    if (await del.count()) {
      await del.first().click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: `${S}/cleanup-modal.png`, fullPage: false })
      const tip = page.locator('input[type=text], input.txt').last()
      if (await tip.isVisible().catch(() => false)) {
        const title = await page.locator('h1').first().innerText().catch(() => 'ZZTEST R2-STRESS')
        await tip.fill(title.trim())
      }
      allowConfirm = true
      const conf = page.getByRole('button', { name: /löschen|endgültig|bestätigen/i }).last()
      if (await conf.count()) {
        await conf.click()
        await page.waitForTimeout(2500)
        ids.cleanup.push(`kunde:${ids.kundeId}:attempted`)
      }
      allowConfirm = false
    }
  }

  fs.appendFileSync(`${S}/stress-log.txt`, '\n--- cont ---\n' + out.join('\n'))
  fs.writeFileSync(`${S}/created-ids.json`, JSON.stringify(ids, null, 2))
  await browser.close()
  console.log('DONE', JSON.stringify(ids))
})().catch((e) => {
  console.error('FAIL', e)
  fs.appendFileSync(`${S}/stress-log.txt`, '\nFAIL ' + String(e))
  process.exit(1)
})
