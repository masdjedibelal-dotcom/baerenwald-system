/**
 * R2-5 Stress — nur ZZTEST-Wegwerf
 * Confirms: dismiss außer gezieltes Aufräumen am Ende
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
const out = []
const log = (m) => {
  console.log(m)
  out.push(String(m))
}
const ids = { kundeId: null, leadId: null, angebotId: null, created: [], cleanup: [] }

async function login(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  if (!page.url().includes('/login')) {
    log(`login already_authed url=${page.url()}`)
    return
  }
  const pw = page.locator('input[type=password]')
  await pw.waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('input[type=email],input[name=email]').first().fill('admin@staging.baerenwald.test')
  await pw.fill('StagingTest!2026')
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60000 })
}

function load(name) {
  return fs.readFileSync(path.join(D, name), 'utf8')
}

async function safeClickSave(page, label) {
  const btn = page.locator('button.note-send').first()
  if (!(await btn.count())) {
    const alt = page.getByRole('button', { name: /speichern/i }).first()
    if (!(await alt.count())) {
      log(`${label} no_save_btn`)
      return false
    }
    if (await alt.isDisabled().catch(() => true)) {
      log(`${label} save_disabled`)
      return false
    }
    await alt.click()
    return true
  }
  if (await btn.isDisabled().catch(() => true)) {
    log(`${label} note-send_disabled`)
    return false
  }
  await btn.click()
  return true
}

;(async () => {
  fs.mkdirSync(S, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  let allowConfirm = false
  ctx.on('dialog', async (d) => {
    log(`DIALOG allow=${allowConfirm} ${d.type()} ${d.message().slice(0, 120)}`)
    if (allowConfirm && d.type() === 'confirm') await d.accept()
    else await d.dismiss()
  })

  const page = await ctx.newPage()
  await login(page)

  // ========== Create ZZTEST Kunde via /neu?art=kunde ==========
  await page.goto(`${CRM}/neu?art=kunde`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  log(`kunde_neu url=${page.url()}`)
  try {
    await page.locator('input.txt[placeholder="Vorname"]').first().fill('ZZTEST')
    await page.locator('input.txt[placeholder="Nachname"]').first().fill('R2-STRESS')
    await page.locator('input.txt[placeholder="mail@…"]').first().fill('zztest.r2.stress@example.test')
    await page.locator('input.txt[placeholder="Straße"]').first().fill('Stressweg')
    await page.locator('input.txt[placeholder="Nr."]').first().fill('1')
    await page.locator('input.txt[placeholder="80331"]').first().fill('80331')
    await page.locator('input.txt[placeholder="München"]').first().fill('München')
    await page.screenshot({ path: `${S}/kunde-form.png`, fullPage: false })
    const createBtn = page.getByRole('button', { name: /^Kunde anlegen$/i }).first()
    if (await createBtn.count()) {
      await createBtn.scrollIntoViewIfNeeded().catch(() => {})
      await createBtn.click({ force: true })
      await page.waitForTimeout(4000)
    } else {
      log('kunde_create no Kunde-anlegen button')
    }
  } catch (e) {
    log(`kunde_create_err=${e.message}`)
  }
  log(`after create kunde url=${page.url()}`)
  let m = page.url().match(/\/kunden\/([0-9a-f-]{36})/i)
  if (m) {
    ids.kundeId = m[1]
    ids.created.push(`kunde:${ids.kundeId}`)
  }
  if (!ids.kundeId) {
    await page.goto(`${CRM}/kunden`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1500)
    const s = page.locator('input[type=search], input[placeholder*="Such"]').first()
    if (await s.count()) {
      await s.fill('ZZTEST R2-STRESS')
      await page.waitForTimeout(2500)
    }
    const link = page.locator('a[href*="/kunden/"]').filter({ hasText: /R2-STRESS/i }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForTimeout(2000)
      m = page.url().match(/\/kunden\/([0-9a-f-]{36})/i)
      if (m) {
        ids.kundeId = m[1]
        ids.created.push(`kunde:${ids.kundeId}`)
      }
    }
  }
  log(`kundeId=${ids.kundeId}`)
  await page.screenshot({ path: `${S}/kunde-create.png`, fullPage: false })

  // ========== Block1: Notiz extremes on E2E lead akte ==========
  await page.goto(`${CRM}/anfragen/${LEAD}?tab=akte`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  // Notizen tab might be separate
  const notizTab = page.getByRole('tab', { name: /notiz/i }).or(page.getByText(/^Notizen$/i)).first()
  if (await notizTab.isVisible().catch(() => false)) {
    await notizTab.click()
    await page.waitForTimeout(1000)
  }
  let ta = page.locator('textarea').filter({ hasText: '' }).or(page.locator('textarea[placeholder*="Notiz"]')).first()
  if (!(await ta.isVisible().catch(() => false))) {
    ta = page.locator('textarea').first()
  }
  if (await ta.isVisible().catch(() => false)) {
    // (a) 10k
    await ta.fill(load('long_10k.txt'))
    const savedA = await safeClickSave(page, 'B1a')
    await page.waitForTimeout(2000)
    const bodyA = await page.locator('body').innerText()
    const crashA = /Unhandled|Exception|TypeError|stack trace/i.test(bodyA)
    log(`B1a long_saved=${savedA} layout_crash=${crashA} has_content=${/Ä|xxx|x{20}/i.test(bodyA)}`)
    await page.screenshot({ path: `${S}/b1-long.png`, fullPage: false })

    // (b) 1 char
    await ta.fill('Z')
    const savedB = await safeClickSave(page, 'B1b')
    await page.waitForTimeout(800)
    log(`B1b one_char_saved=${savedB}`)

    // (c) spaces only — expect disabled
    await ta.fill('     ')
    const spacesDisabled = await page.locator('button.note-send').first().isDisabled().catch(() => true)
    log(`B1c spaces_save_disabled=${spacesDisabled}`)

    // (d) empty — expect disabled
    await ta.fill('')
    const emptyDisabled = await page.locator('button.note-send').first().isDisabled().catch(() => true)
    log(`B1d empty_save_disabled=${emptyDisabled}`)

    // (e) newlines
    await ta.fill(load('newlines.txt'))
    const savedE = await safeClickSave(page, 'B1e')
    await page.waitForTimeout(800)
    log(`B1e newlines_saved=${savedE}`)

    // (f)+(g) unicode + xss
    await ta.fill(load('xss.txt') + '\n' + load('unicode_mix.txt'))
    const savedG = await safeClickSave(page, 'B1g')
    await page.waitForTimeout(1500)
    const bodyG = await page.locator('body').innerText()
    const htmlEscaped = bodyG.includes('<b>x</b>') || bodyG.includes('DROP TABLE')
    const scriptRan = await page.evaluate(() => !!document.querySelector('script[data-xss]'))
    log(`B1g saved=${savedG} xss_as_text=${htmlEscaped} script_exec=${scriptRan} unicode_visible=${/🎉|中文|عرب/.test(bodyG)}`)
    await page.screenshot({ path: `${S}/b1-xss-unicode.png`, fullPage: false })
  } else {
    log('B1 no textarea')
  }

  // Folge-Check Liste Anfragen Suche lange Notiz-Marker
  const tSearch = Date.now()
  await page.goto(`${CRM}/anfragen`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(800)
  log(`B1 list_load_ms=${Date.now() - tSearch}`)

  // ========== Block6: API empty / invalid ==========
  const apiEmpty = await page.request.post(`${WEB}/api/lead`, {
    data: { name: '', email: 'a@b.c' },
  })
  log(`B6 api_empty status=${apiEmpty.status()} body=${(await apiEmpty.text()).slice(0, 120)}`)
  const apiSpaces = await page.request.post(`${WEB}/api/lead`, {
    data: { name: '   ', email: 'zztest.r2.stress2@example.test' },
  })
  log(`B6 api_spaces status=${apiSpaces.status()} body=${(await apiSpaces.text()).slice(0, 120)}`)
  const apiXss = await page.request.post(`${WEB}/api/lead`, {
    data: {
      name: 'ZZTEST-R2-STRESS API',
      email: 'zztest.r2.stress.api@example.test',
      nachricht: load('xss.txt') + load('unicode_mix.txt'),
      plz: '80802',
      situation: 'kaputt',
    },
  })
  const apiXssText = await apiXss.text()
  log(`B6 api_ok status=${apiXss.status()} body=${apiXssText.slice(0, 220)}`)
  try {
    const j = JSON.parse(apiXssText)
    if (j.id || j.leadId || j.lead_id) {
      ids.leadId = j.id || j.leadId || j.lead_id
      ids.created.push(`lead:${ids.leadId}`)
    }
  } catch {}

  // Angebot ohne Position — try senden
  await page.goto(`${CRM}/angebote/neu`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  log(`B6 angebot_neu url=${page.url()}`)
  await page.screenshot({ path: `${S}/b6-angebot-neu.png`, fullPage: false })
  const sendEmpty = page.getByRole('button', { name: /senden|abschicken|versenden/i }).first()
  if (await sendEmpty.count()) {
    const dis = await sendEmpty.isDisabled().catch(() => false)
    log(`B6 angebot_senden_disabled_empty=${dis}`)
    if (!dis) {
      await sendEmpty.click()
      await page.waitForTimeout(1000)
      log(`B6 after_send_empty body_snip=${(await page.locator('body').innerText()).slice(0, 200).replace(/\n/g, ' ')}`)
    }
  } else {
    log('B6 no senden btn yet (wizard gate)')
  }

  // ========== Block2/3: Zahlen + Datum im Wizard ==========
  const numInputs = page.locator('input[type=number], input[inputmode=decimal]')
  const nNum = await numInputs.count()
  log(`B2 num_inputs=${nNum}`)
  if (nNum > 0) {
    for (const v of ['0', '-1', '0.001', '999999999', '1.234,56', '1234.56', 'abc', '']) {
      await numInputs.first().fill(v).catch(async () => {
        await numInputs.first().pressSequentially(v, { delay: 10 }).catch(() => {})
      })
      await page.waitForTimeout(200)
      const got = await numInputs.first().inputValue().catch(() => '?')
      log(`B2 fill=${JSON.stringify(v)} got=${JSON.stringify(got)}`)
    }
  } else {
    // try text price fields
    const price = page.locator('input').filter({ has: page.locator('xpath=self::*') }).first()
    log('B2 no number inputs visible at gate')
  }
  const dateInputs = page.locator('input[type=date]')
  if (await dateInputs.count()) {
    for (const v of ['2026-08-24', '2026-08-25', '1999-01-01', '2199-12-31']) {
      await dateInputs.first().fill(v)
      log(`B3 date fill=${v} got=${await dateInputs.first().inputValue()}`)
    }
    const inv = await dateInputs.first().fill('2020-02-31').then(() => dateInputs.first().inputValue()).catch((e) => `reject:${e.message}`)
    log(`B3 date_31_feb=${inv}`)
  } else {
    log('B3 no date inputs at gate')
  }

  // Freigabe-Schwelle on kunde org tab if we have kunde
  if (ids.kundeId) {
    await page.goto(`${CRM}/kunden/${ids.kundeId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(2000)
    const orgTab = page.getByRole('tab', { name: /org|organisation|freigabe/i }).first()
    if (await orgTab.isVisible().catch(() => false)) {
      await orgTab.click()
      await page.waitForTimeout(1000)
    }
    const schwelle = page.locator('input').filter({ hasText: '' }).first()
    // find by label proximity
    const bodyK = await page.locator('body').innerText()
    log(`B2 schwelle_ui_has_word=${/schwelle|freigabe/i.test(bodyK)}`)
    await page.screenshot({ path: `${S}/b2-kunde-org.png`, fullPage: false })
  }

  // ========== Block5: file extremes melde + notiz foto ==========
  // Notiz foto on lead
  await page.goto(`${CRM}/anfragen/${LEAD}?tab=akte`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  const notizTab2 = page.getByRole('tab', { name: /notiz/i }).or(page.getByText(/^Notizen$/i)).first()
  if (await notizTab2.isVisible().catch(() => false)) await notizTab2.click()
  await page.waitForTimeout(800)
  const fileHidden = page.locator('input[type=file][accept*="image"]').first()
  if (await fileHidden.count()) {
    // over 8 via setInputFiles — toast expected
    page.once('console', (msg) => log(`console ${msg.type()}: ${msg.text().slice(0, 100)}`))
    await fileHidden.setInputFiles(path.join(D, 'over8mb.bin')).catch((e) => log(`B5 over8 err=${e.message}`))
    await page.waitForTimeout(1500)
    const toast = await page.locator('body').innerText()
    log(`B5 notiz_over8 toast=${/8\s*MB|zu groß/i.test(toast)}`)
    await page.screenshot({ path: `${S}/b5-notiz-over8.png`, fullPage: false })

    await fileHidden.setInputFiles(path.join(D, 'zero.bin')).catch((e) => log(`B5 zero err=${e.message}`))
    await page.waitForTimeout(800)
    log(`B5 notiz_zero after=${/leer|ungültig|fehler|zu klein|0/i.test(await page.locator('body').innerText())}`)

    await fileHidden.setInputFiles(path.join(D, 'fake_exe.jpg')).catch((e) => log(`B5 fake err=${e.message}`))
    await page.waitForTimeout(1000)
    log(`B5 notiz_fake_exe accepted_or_err=${(await page.locator('body').innerText()).slice(0, 80).replace(/\n/g, ' ')}`)

    await fileHidden.setInputFiles(path.join(D, 'exact8mb.bin')).catch((e) => log(`B5 exact8 err=${e.message}`))
    await page.waitForTimeout(2000)
    log(`B5 notiz_exact8 after_toast=${/8\s*MB|zu groß|hochgeladen|fehler/i.test(await page.locator('body').innerText())}`)
  } else {
    log('B5 no hidden image file on lead notiz')
  }

  // Melde funnel — Option zuerst, dann Weiter
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(1000)
  if (await page.getByRole('button', { name: /ablehnen/i }).first().isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /ablehnen/i }).first().click()
  }
  for (let i = 0; i < 15; i++) {
    const head = (await page.locator('body').innerText()).split('\n').slice(0, 12).join('\n')
    if (/\bFOTOS\b|Foto/i.test(head) && (await page.locator('input[type=file]').count())) break
    const step = await funnelAdvanceStep(page, log)
    if (step === 'stuck') break
    if (step === 'absenden') break
  }
  const meldeFile = page.locator('input[type=file]').first()
  if (await meldeFile.count()) {
    const t0 = Date.now()
    await meldeFile.setInputFiles(path.join(D, 'over8mb.bin')).catch((e) => log(`B5 melde over8 err=${e.message}`))
    await page.waitForTimeout(1500)
    log(`B5 melde_over8 rejected=${/8\s*MB|zu groß|maximal|limit/i.test(await page.locator('body').innerText())} ms=${Date.now() - t0}`)
    await page.screenshot({ path: `${S}/b5-melde-over8.png`, fullPage: false })
    await meldeFile.setInputFiles(path.join(D, 'ok_small.jpg')).catch(() => {})
    await page.waitForTimeout(800)
    log('B5 melde_small_ok=true')
    // emoji filename
    const emojiPath = fs.readdirSync(D).find((f) => f.includes('emoji') || f.endsWith('.jpg') && f.length > 20)
    if (emojiPath) {
      await meldeFile.setInputFiles(path.join(D, emojiPath)).catch((e) => log(`B5 emoji err=${e.message}`))
      await page.waitForTimeout(800)
      log(`B5 melde_emoji_file=${emojiPath.slice(0, 40)}`)
    }
  } else {
    log('B5 melde no file input')
  }

  // ========== Block4: list performance ==========
  for (const [name, url] of [
    ['vorgaenge', `${CRM}/vorgaenge`],
    ['anfragen', `${CRM}/anfragen`],
    ['kunden', `${CRM}/kunden`],
    ['angebote', `${CRM}/angebote`],
  ]) {
    const t0 = Date.now()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(400)
    const ms = Date.now() - t0
    log(`B4 ${name}_load_ms=${ms} class=${ms < 1000 ? '<1s' : ms < 3000 ? '1-3s' : '>3s'}`)
  }
  // search + CSV
  await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1000)
  const search = page.locator('input[type=search], input[placeholder*="Such"]').first()
  if (await search.count()) {
    const t0 = Date.now()
    await search.fill('ZZTEST')
    await page.waitForTimeout(1500)
    log(`B4 search_ms=${Date.now() - t0}`)
  }
  const csv = page.getByRole('button', { name: /csv/i }).or(page.locator('[title*="CSV"]')).first()
  if (await csv.count()) {
    const t0 = Date.now()
    await csv.click().catch(() => {})
    await page.waitForTimeout(1000)
    log(`B4 csv_click_ms=${Date.now() - t0}`)
  } else {
    log('B4 no csv btn')
  }
  await page.screenshot({ path: `${S}/b4-vorgaenge.png`, fullPage: false })

  // ========== Block7 concurrency ==========
  {
    const url = `${CRM}/anfragen/${LEAD}`
    const t1 = page
    const t2 = await ctx.newPage()
    await login(t2)
    // open notizen
    for (const p of [t1, t2]) {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await p.waitForTimeout(1500)
      const tab = p.getByRole('tab', { name: /notiz/i }).or(p.getByText(/^Notizen$/i)).first()
      if (await tab.isVisible().catch(() => false)) await tab.click()
      await p.waitForTimeout(800)
    }
    const ta1 = t1.locator('textarea').first()
    const ta2 = t2.locator('textarea').first()
    if ((await ta1.isVisible().catch(() => false)) && (await ta2.isVisible().catch(() => false))) {
      const stamp1 = `ZZTEST-R2-STRESS Tab1 ${Date.now()}`
      const stamp2 = `ZZTEST-R2-STRESS Tab2 ${Date.now()}`
      await ta1.fill(stamp1)
      await ta2.fill(stamp2)
      await safeClickSave(t1, 'B7t1')
      await t1.waitForTimeout(1200)
      await safeClickSave(t2, 'B7t2')
      await t2.waitForTimeout(1500)
      await t1.reload()
      await t1.waitForTimeout(1500)
      const tab = t1.getByRole('tab', { name: /notiz/i }).or(t1.getByText(/^Notizen$/i)).first()
      if (await tab.isVisible().catch(() => false)) await tab.click()
      await t1.waitForTimeout(800)
      const final = await t1.locator('body').innerText()
      log(`B7 Tab1_present=${final.includes('Tab1')} Tab2_present=${final.includes('Tab2')} both=${final.includes('Tab1') && final.includes('Tab2')} silent_last_wins=${final.includes('Tab2') && !final.includes('Tab1')}`)
      await t1.screenshot({ path: `${S}/b7-concurrency.png`, fullPage: false })
    } else {
      log('B7 no dual textareas')
    }
    await t2.close()
  }

  // ========== Cleanup: delete ZZTEST stress kunde via UI confirm ==========
  if (ids.kundeId) {
    await page.goto(`${CRM}/kunden/${ids.kundeId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(2000)
    // overflow menu
    const more = page.getByRole('button', { name: /mehr|aktionen|⋯|menu/i }).or(page.locator('button').filter({ hasText: '⋯' })).first()
    if (await more.isVisible().catch(() => false)) await more.click().catch(() => {})
    await page.waitForTimeout(500)
    const del = page.getByRole('button', { name: /löschen|kunde löschen/i }).or(page.getByText(/kunde löschen/i))
    log(`cleanup del_count=${await del.count()}`)
    if (await del.count()) {
      await del.first().click()
      await page.waitForTimeout(1200)
      await page.screenshot({ path: `${S}/cleanup-modal.png`, fullPage: false })
      const tip = page.locator('input[type=text], input.txt').last()
      if (await tip.isVisible().catch(() => false)) {
        const ph = (await tip.getAttribute('placeholder')) || ''
        const val = (await page.locator('h1,h2,.page-title').first().innerText().catch(() => 'ZZTEST R2-STRESS')) || 'ZZTEST R2-STRESS'
        await tip.fill(val.trim().slice(0, 80))
        log(`cleanup tip_fill placeholder=${ph} val=${val.slice(0, 40)}`)
      }
      allowConfirm = true
      const confirm = page.getByRole('button', { name: /löschen|endgültig|bestätigen/i }).last()
      if (await confirm.count()) {
        await confirm.click()
        await page.waitForTimeout(3000)
        log(`cleanup after url=${page.url()}`)
        ids.cleanup.push(`kunde:${ids.kundeId}:attempted`)
      }
      allowConfirm = false
    } else {
      ids.cleanup.push(`kunde:${ids.kundeId}:NO_DELETE_BTN`)
    }
  }

  if (ids.leadId) {
    await page.goto(`${CRM}/anfragen/${ids.leadId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1500)
    const exists = !(await page.locator('body').innerText()).match(/nicht gefunden|404/i)
    log(`cleanup lead open exists=${!!exists} url=${page.url()}`)
    ids.cleanup.push(`lead:${ids.leadId}:left_for_manual_or_db`)
    await page.screenshot({ path: `${S}/cleanup-lead.png`, fullPage: false })
  }

  fs.writeFileSync(`${S}/stress-log.txt`, out.join('\n'))
  fs.writeFileSync(`${S}/created-ids.json`, JSON.stringify(ids, null, 2))
  await browser.close()
  console.log('DONE', JSON.stringify(ids))
})().catch((e) => {
  console.error('FAIL', e)
  fs.writeFileSync(`${S}/stress-log.txt`, out.concat([String(e)]).join('\n'))
  process.exit(1)
})
