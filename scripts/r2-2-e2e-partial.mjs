/**
 * R2-2: Melde → CRM Stichprobe
 * Confirms: immer dismiss
 * Funnel: an jedem Options-Schritt erst Kachel wählen, dann Weiter.
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { funnelAdvanceStep } from './lib/funnel-nav.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const SHOT = 'docs/test/screenshots/r2-2'
const MAIL = 'docs/test/r2-2-mails'
const out = []
const log = (m) => {
  console.log(m)
  out.push(String(m))
}

async function loginCrm(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1200)
  if (!page.url().includes('/login')) return
  await page.waitForSelector('input[type=password]', { timeout: 60000 })
  await page.locator('input[type=email], input[name=email]').first().fill('admin@staging.baerenwald.test')
  await page.locator('input[type=password]').fill('StagingTest!2026')
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 })
}

;(async () => {
  fs.mkdirSync(SHOT, { recursive: true })
  fs.mkdirSync(MAIL, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ctx.on('dialog', async (d) => {
    log(`DIALOG dismiss: ${d.message().slice(0, 100)}`)
    await d.dismiss()
  })

  const page = await ctx.newPage()
  let funnelAborted = false

  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(1500)
  const ablehnen = page.getByRole('button', { name: /ablehnen/i }).first()
  if (await ablehnen.isVisible().catch(() => false)) {
    await ablehnen.click()
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: `${SHOT}/e2e-rerun-01-start.png`, fullPage: false })

  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(400)
    const body = await page.locator('body').innerText()
    log(`funnel step${i}: ${body.slice(0, 140).replace(/\n/g, ' | ')}`)
    await page.screenshot({ path: `${SHOT}/e2e-rerun-step-${i}.png`, fullPage: false })

    const file = page.locator('input[type=file]').first()
    if (await file.count()) {
      const foto = path.join(__dirname, '../docs/test/r2-5-data/ok_small.jpg')
      if (fs.existsSync(foto)) {
        await file.setInputFiles(foto).catch(() => {})
        await page.waitForTimeout(800)
        log('foto uploaded')
      }
    }

    for (const sel of [
      'input[name="name"], input[placeholder*="Name"], input[autocomplete="name"]',
      'input[type=email], input[name="email"]',
      'input[type=tel], input[name="telefon"]',
      'textarea',
      'input[placeholder*="Einheit"], input[placeholder*="Adresse"], input[placeholder*="Straße"]',
      'input[placeholder*="PLZ"]',
      'input[placeholder*="Ort"]',
    ]) {
      const el = page.locator(sel).first()
      if (!(await el.isVisible().catch(() => false))) continue
      const ph = ((await el.getAttribute('placeholder')) || '').toLowerCase()
      if (sel.includes('name') && !ph.includes('einheit')) await el.fill('ZZTEST-R2 E2E Mieter')
      else if (sel.includes('email')) await el.fill('zztest.r2.e2e.rerun@example.test')
      else if (sel.includes('tel')) await el.fill('089 9999 2222')
      else if (sel.includes('textarea')) {
        const cur = await el.inputValue().catch(() => '')
        if ((cur || '').trim().length < 10)
          await el.fill('ZZTEST-R2 E2E Rerun — Wasser tropft in der Küche, bitte prüfen.')
      } else if (ph.includes('einheit')) await el.fill('ZZTEST WE R2')
      else if (ph.includes('straße') || ph.includes('adresse')) await el.fill('Leopoldstraße 10')
      else if (ph.includes('plz')) await el.fill('80802')
      else if (ph.includes('ort')) await el.fill('München')
    }

    // Ort & Kontakt — `.funnel-input` (PortalFunnelHost)
    if (/ORT & KONTAKT|Kontaktdaten/i.test(body)) {
      const fillPh = (ph, val) =>
        page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(val).catch(() => {})
      await fillPh('Vorname', 'ZZTEST')
      await fillPh('Nachname', 'R2E2E')
      await fillPh('Name', 'ZZTEST R2E2E Mieter')
      await fillPh('Straße', 'Leopoldstraße')
      await fillPh('Nr.', '10')
      await fillPh('PLZ', '80802')
      await fillPh('Ort', 'München')
      await fillPh('E-Mail', 'zztest.r2.e2e.rerun@example.test')
      await page.locator('input.funnel-input[type=tel]').first().fill('08999992222').catch(() => {})
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count() && !(await cb.isChecked().catch(() => false))) {
        await cb.check({ force: true })
      }
      await page.waitForTimeout(300)
    }

    // Beschreibung — gezielt das sichtbare Textarea
    if (/BESCHREIBUNG|Was ist passiert/i.test(body)) {
      const desc = page.locator('textarea:visible').first()
      if (await desc.count()) {
        const cur = await desc.inputValue().catch(() => '')
        if ((cur || '').trim().length < 10) {
          await desc.fill(
            'ZZTEST-R2 E2E Rerun — Wasser tropft in der Küche, bitte zeitnah prüfen und melden.'
          )
        }
      }
    }

    const step = await funnelAdvanceStep(page, log)
    if (step === 'absenden') {
      const absenden = page.getByRole('button', { name: /absenden|melden|senden|abschicken/i }).first()
      await absenden.click()
      await page.waitForTimeout(4000)
      log(`after absenden url=${page.url()}`)
      break
    }
    if (step === 'weiter') continue
    if (/bestätigung|eingegangen|status|vielen dank/i.test(body)) {
      log('funnel done (confirm-like)')
      break
    }
    log('stuck — no weiter')
    funnelAborted = true
    break
  }

  await page.waitForTimeout(1500)
  const pageText = await page.locator('body').innerText()
  const reachedConfirm = /bestätigung|eingegangen|konto anlegen|status|ABSCHLUSS|Prüfen & absenden|meldung.*(eingegangen|gesendet)/i.test(
    pageText
  )
  if (reachedConfirm) {
    log(`CONFIRM url=${page.url()}`)
    log(`CONFIRM CTA bw=${/zu bärenwald|bärenwald registr/i.test(pageText)} konto=${/konto anlegen/i.test(pageText)}`)
    log(`CONFIRM ref=${/referenz|ref\.?\s*nr|vorgang/i.test(pageText)}`)
    log(`CONFIRM text=${pageText.slice(0, 500).replace(/\n/g, ' | ')}`)
    await page.screenshot({ path: `${SHOT}/e2e-rerun-confirm.png`, fullPage: true })

    const statusLink = page.locator('a[href*="/melden/status/"], a[href*="/status/"]').first()
    if (await statusLink.count()) {
      const statusUrl = await statusLink.getAttribute('href')
      log(`statusLink=${statusUrl}`)
      await statusLink.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: `${SHOT}/e2e-rerun-status.png`, fullPage: false })
    }
  } else {
    log('CONFIRM skipped — funnel aborted before confirm page')
  }

  const crm = await ctx.newPage()
  await loginCrm(crm)
  log(`crm login ${crm.url()}`)

  if (!funnelAborted) {
    await crm.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await crm.waitForTimeout(2000)
    const search = crm.locator('input[type=search], input[placeholder*="Such"]').first()
    if (await search.count()) {
      await search.fill('ZZTEST-R2')
      await crm.waitForTimeout(2000)
    }
    const link = crm.locator('a[href*="/anfragen/"]').filter({ hasText: /ZZTEST-R2|R2E2E|R2 E2E/i }).first()
    if (await link.count()) {
      await link.click()
      await crm.waitForTimeout(2500)
    }
    const leadText = await crm.locator('body').innerText()
    log(`LEAD url=${crm.url()}`)
    log(`LEAD HV-Meldung=${/HV-Meldung/i.test(leadText)} Leopold=${/Leopold/i.test(leadText)}`)
    await crm.screenshot({ path: `${SHOT}/e2e-rerun-lead.png`, fullPage: true })
  } else {
    log('LEAD skipped — funnel aborted')
  }

  fs.writeFileSync(`${MAIL}/e2e-partial-log.txt`, out.join('\n'))
  await browser.close()
  console.log('DONE aborted=' + funnelAborted)
})().catch((e) => {
  console.error('FAIL', e)
  process.exit(1)
})
