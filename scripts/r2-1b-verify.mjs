/**
 * R2-1B — Nachtest Verify + E2E (Staging)
 * Regeln: Confirms dismiss, ZZTEST-Wegwerf, Seeds tabu, funnel-nav.mjs
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
const SHOT = path.join(__dirname, '../docs/test/screenshots/r2-1b')
const LOG = path.join(__dirname, '../docs/test/r2-1b-log.txt')

const CRM_USER = 'admin@staging.baerenwald.test'
const CRM_PASS = 'StagingTest!2026'
const HV_USER = 'hv-nord@example.test'
const PARTNER_USER = 'partner-elektro@example.test'
const PORTAL_PASS = 'StagingTest!2026'

const RE_ID = 'c770d2da-ce85-462a-859d-585c072906f8'
const SEED_AUFTRAG = '231716aa-0215-4560-9253-1492632981de'

const results = []
const zztest = []
let fundN = 170

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

async function loginCrm(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1200)
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email], input[name=email]').first().fill(CRM_USER)
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

async function runMeldeFunnel(page, tag) {
  const email = `zztest.r2.1b.${tag}@example.test`
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await dismissCookies(page)

  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(400)
    const body = await page.locator('body').innerText()

    const file = page.locator('input[type=file]').first()
    if (await file.count()) {
      const foto = path.join(__dirname, '../docs/test/r2-5-data/ok_small.jpg')
      if (fs.existsSync(foto)) await file.setInputFiles(foto).catch(() => {})
    }

    if (/ORT & KONTAKT|Kontaktdaten/i.test(body)) {
      const fill = (ph, v) =>
        page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(v).catch(() => {})
      await fill('Vorname', 'ZZTEST')
      await fill('Nachname', `R1B${tag}`)
      await fill('Straße', 'Leopoldstraße')
      await fill('Nr.', '10')
      await fill('PLZ', '80802')
      await fill('Ort', 'München')
      await fill('E-Mail', email)
      await page.locator('input.funnel-input[type=tel]').first().fill('08999991111').catch(() => {})
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count() && !(await cb.isChecked().catch(() => false))) await cb.check({ force: true })
    }

    if (/BESCHREIBUNG|Was ist passiert/i.test(body)) {
      const desc = page.locator('textarea:visible').first()
      if (await desc.count()) {
        const cur = await desc.inputValue().catch(() => '')
        if ((cur || '').trim().length < 10)
          await desc.fill(
            'ZZTEST-R2-1B HV-Durchstich — undichtes Rohr Küche, Wasser auf Parkett, bitte zeitnah.'
          )
      }
    }

    const step = await funnelAdvanceStep(page, log)
    if (step === 'absenden') {
      await page.getByRole('button', { name: /absenden|melden|senden|abschicken/i }).first().click()
      await page.waitForTimeout(5000)
      break
    }
    if (step === 'weiter') continue
    if (/bestätigung|eingegangen|konto anlegen/i.test(body)) break
    if (step === 'stuck') break
  }

  return { url: page.url(), body: await page.locator('body').innerText(), email }
}

;(async () => {
  fs.mkdirSync(SHOT, { recursive: true })
  fs.writeFileSync(LOG, `R2-1B started ${new Date().toISOString()}\n`)

  const db = loadStagingDb()

  // --- Vorbedingungen ---
  if (db) {
    const { data: logs } = await db
      .from('email_log')
      .select('resend_id, typ, created_at')
      .like('resend_id', 'staging-catch:%')
      .order('created_at', { ascending: false })
      .limit(5)
    const crmCatch = (logs ?? []).some((r) => !String(r.resend_id).includes('website-'))
    const webCatch = (logs ?? []).some((r) => String(r.resend_id).includes('website-'))
    record(
      'PRE-1',
      crmCatch ? '✅' : '⚠️',
      `email_log staging-catch CRM=${crmCatch} Website=${webCatch} (n=${logs?.length ?? 0})`
    )
    if (!webCatch) {
      record(`F-${fundN++}`, '⚠️', 'Kein staging-catch:website- Eintrag in email_log (Website-Catcher unbelegt)')
    }

    const { data: auf } = await db.from('auftraege').select('id, status').eq('id', SEED_AUFTRAG).maybeSingle()
    const { data: re } = await db
      .from('rechnungen')
      .select('id, rechnungsnummer, status')
      .eq('rechnungsnummer', 'STG-R2-0001')
      .maybeSingle()
    record(
      'PRE-3',
      auf?.status === 'in_arbeit' && re?.status === 'gesendet' ? '✅' : '❌',
      `Seed Auftrag=${auf?.status} RE=${re?.rechnungsnummer}/${re?.status}`
    )
  } else {
    record('PRE-DB', '🚫', '.env.staging fehlt — SQL-Vorbedingungen übersprungen')
  }

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ctx.on('dialog', async (d) => {
    log(`DIALOG dismiss: ${d.message().slice(0, 120)}`)
    await d.dismiss()
  })

  const page = await ctx.newPage()

  // F-160 / R2-V-F1
  await loginCrm(page)
  await page.goto(`${CRM}/rechnungen/${RE_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  const editBtn = page.getByRole('button', { name: /rechnung bearbeiten/i }).first()
  const title = await editBtn.getAttribute('title').catch(() => null)
  const disabled = await editBtn.isDisabled().catch(() => false)
  await page.screenshot({ path: `${SHOT}/f160-re.png`, fullPage: false })
  const f160ok = disabled && title?.includes('Storno')
  record('R2-V-F1', f160ok ? '✅' : '❌', `RE edit disabled=${disabled} title=${title ?? 'null'}`, {
    fund: f160ok ? null : `F-${fundN++}`,
  })

  // F-161 / R2-V-F6 — single-object org
  await page.goto(`${WEB}/melden/staging-muster-nord?hinweis=objekt_nicht_gefunden`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await dismissCookies(page)
  await page.waitForTimeout(1500)
  const f161body = await page.locator('body').innerText()
  const f161hint = /objekt nicht gefunden/i.test(f161body)
  await page.screenshot({ path: `${SHOT}/f161-hint.png`, fullPage: true })
  record('R2-V-F6', f161hint ? '✅' : '❌', `Amber-Hinweis sichtbar=${f161hint}`, {
    fund: f161hint ? null : `F-${fundN++}`,
  })

  // P3-8 / F-8 — anthrazit on melde (org_primary_color null)
  const btn = page.locator('.mieter-wl-btn--primary, button.funnel-footer-next, .funnel-footer-next').first()
  let bg = null
  if (await btn.count()) {
    bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor)
  }
  await page.screenshot({ path: `${SHOT}/f8-color.png`, fullPage: false })
  const anthra = bg && (bg.includes('54, 59, 65') || bg.includes('54,59,65') || bg.includes('#363'))
  record('R2-V-F8', anthra ? '✅' : '⚠️', `Primary button bg=${bg} (Anthrazit≈rgb(54,59,65))`, {
    fund: anthra ? null : `F-${fundN++}`,
  })

  // F-167/168 — 9MB upload attempt
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await dismissCookies(page)
  for (let i = 0; i < 8; i++) {
    const body = await page.locator('body').innerText()
    if (await page.locator('input[type=file]').count()) break
    await funnelAdvanceStep(page, log)
    if (/Foto|Bild|Anhang/i.test(body)) break
  }
  const nineMb = path.join(__dirname, '../docs/test/r2-5-data/nine_mb.jpg')
  if (!fs.existsSync(nineMb)) {
    fs.writeFileSync(nineMb, Buffer.alloc(9 * 1024 * 1024, 0xff))
  }
  const fileIn = page.locator('input[type=file]').first()
  let f167toast = false
  if (await fileIn.count()) {
    await fileIn.setInputFiles(nineMb).catch(() => {})
    await page.waitForTimeout(1500)
    const after = await page.locator('body').innerText()
    f167toast = /max\.?\s*8\s*MB|zu groß/i.test(after)
  }
  await page.screenshot({ path: `${SHOT}/f167-upload.png`, fullPage: false })
  record('R2-V-F12', f167toast ? '✅' : '⚠️', `9MB client error visible=${f167toast}`, {
    fund: f167toast ? null : `F-${fundN++}`,
  })

  // Teil 1 .1 — E2E Melde → Bestätigung
  const melde = await runMeldeFunnel(page, 'hv')
  await page.screenshot({ path: `${SHOT}/e2e-01-confirm.png`, fullPage: true })
  const confirmUrl = melde.url
  const refVisible = /referenznummer|referenz/i.test(melde.body)
  const neutralCta = /konto anlegen/i.test(melde.body) && !/zu bärenwald registr/i.test(melde.body)
  const stagingNext =
    !/baerenwald\.netlify\.app\/portal\/registrieren\?.*next=https%3A%2F%2Fbaerenwald\.netlify\.app/i.test(
      await page.content()
    )
  record('T1-.1', confirmUrl.includes('bestaetigung') ? '✅' : '⚠️', `Confirm url=${confirmUrl}`)
  record('T1-.1-F163', refVisible ? '✅' : '❌', `Referenz sichtbar=${refVisible}`, {
    fund: refVisible ? null : `F-${fundN++}`,
  })
  record('T1-.1-F162', stagingNext ? '✅' : '❌', `next= nicht prod-hardcoded=${stagingNext}`, {
    fund: stagingNext ? null : `F-${fundN++}`,
  })
  record('T1-.1-CTA', neutralCta ? '✅' : '❌', `Neutraler Konto-CTA=${neutralCta}`)

  // CRM: find new lead
  let leadId = null
  let leadUrl = null
  await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  const search = page.locator('input[type=search], input[placeholder*="Such"]').first()
  if (await search.count()) {
    await search.fill('ZZTEST-R2-1B')
    await page.waitForTimeout(2500)
  }
  const leadLink = page.locator('a[href*="/anfragen/"]').filter({ hasText: /ZZTEST|R1B/i }).first()
  if (await leadLink.count()) {
    await leadLink.click()
    await page.waitForTimeout(2500)
    leadUrl = page.url()
    leadId = leadUrl.match(/anfragen\/([a-f0-9-]+)/i)?.[1] ?? null
    zztest.push({ type: 'lead', id: leadId, url: leadUrl })
  }
  const leadBody = await page.locator('body').innerText()
  await page.screenshot({ path: `${SHOT}/e2e-02-lead.png`, fullPage: false })

  const meldDetails = /meldungsdetails/i.test(leadBody)
  const hvBadge = /hv-meldung/i.test(leadBody)
  record('T1-.2', leadId ? '✅' : '❌', `Lead gefunden id=${leadId}`)
  record('T1-.2-F165', meldDetails ? '✅' : '❌', `Meldungsdetails-Karte=${meldDetails}`, {
    fund: meldDetails ? null : `F-${fundN++}`,
  })
  record('T1-.2-badge', hvBadge ? '✅' : '⚠️', `HV-Meldung Badge=${hvBadge}`)

  // T1 .2b — HV Warte Sheet
  const warteBtn = page.getByRole('button', { name: /warte auf hv/i }).first()
  let sheetOpen = false
  if (await warteBtn.count()) {
    await warteBtn.click()
    await page.waitForTimeout(1200)
    const afterClick = await page.locator('body').innerText()
    sheetOpen = /nächste schritte|angebot_einfordern|hausmeister|auftraggeber-portal/i.test(afterClick)
    await page.screenshot({ path: `${SHOT}/e2e-02b-sheet.png`, fullPage: false })
    await page.keyboard.press('Escape').catch(() => {})
  }
  record('T1-.2b-F166', sheetOpen ? '✅' : '⚠️', `HvWarteFreigabeSheet=${sheetOpen}`, {
    fund: sheetOpen ? null : `F-${fundN++}`,
  })

  // HV Portal freigeben (if lead exists)
  if (leadId) {
    const hvPage = await ctx.newPage()
    hvPage.on('dialog', async (d) => await d.dismiss())
    await loginPortal(hvPage, HV_USER)
    await hvPage.goto(`${WEB}/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    })
    await hvPage.waitForTimeout(3000)
    await hvPage.screenshot({ path: `${SHOT}/e2e-hv-vorgang.png`, fullPage: false })
    const hvBody = await hvPage.locator('body').innerText()
    const baerenwaldBtn = hvPage.getByRole('button', { name: /bärenwald übergeben|an bärenwald|übergeben/i }).first()
    if (await baerenwaldBtn.count()) {
      await baerenwaldBtn.click()
      await hvPage.waitForTimeout(2000)
      record('T1-.2b-HV', '✅', 'HV „An Bärenwald übergeben“ geklickt')
    } else {
      record('T1-.2b-HV', '⚠️', `HV-Aktion nicht gefunden; body=${hvBody.slice(0, 200)}`)
    }
    await hvPage.close()

    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    const afterHv = await page.locator('body').innerText()
    const angebotCta = /angebot erstellen/i.test(afterHv)
    await page.screenshot({ path: `${SHOT}/e2e-02c-angebot-cta.png`, fullPage: false })
    record('T1-.2b-CRM', angebotCta ? '✅' : '⚠️', `Nach HV-Freigabe Angebot-CTA=${angebotCta}`)
  }

  // Block A/B/C — mark as not fully automated in this run
  for (const id of [
    'T1-.3',
    'T1-.4',
    'T1-.5',
    'T1-A1',
    'T1-A2',
    'T1-A3',
    'T1-A4',
    'T1-A5',
    'T1-.6',
    'T1-.7',
    'T1-A6',
    'T1-A7',
    'T1-B1',
    'T1-B2',
    'T1-B3',
    'T1-B4',
    'T1-B5',
    'T1-B6',
    'T1-.8',
    'T1-.9',
    'T1-.10',
    'T1-.11',
    'T1-D2',
    'Block-C',
    'E7',
    'E8',
    'E9',
    'F7',
    'F9',
    'N-block',
  ]) {
    record(id, '🚫', 'In dieser Automation-Session nicht vollständig durchgespielt — manuell/Nachlauf')
  }

  await browser.close()

  fs.writeFileSync(
    path.join(__dirname, '../docs/test/r2-1b-results.json'),
    JSON.stringify({ results, zztest, fundNext: fundN }, null, 2)
  )
  log('DONE')
})().catch((e) => {
  log(`FATAL ${e.stack || e}`)
  process.exit(1)
})
