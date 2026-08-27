#!/usr/bin/env node
/** A2-Mittelteil Fortsetzung — Wizard + Meldung 2 + Freigabe-Flow */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { funnelAdvanceStep } from '../lib/funnel-nav.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const SHOT = path.join(ROOT, 'docs/test/screenshots/a2-mittelteil')
const OUT = path.join(ROOT, 'docs/test/a2-mittelteil-p2.json')
const FOTO = path.join(ROOT, 'docs/test/r2-5-data/ok_small.jpg')

const LEAD_FE37 = 'fe37acab-e6ef-43ad-8bfc-2f72ecf5f5af'
const ADMIN = 'admin@staging.baerenwald.test'
const HV_NORD = 'hv-nord@example.test'
const PASS = 'StagingTest!2026'
const MELDE = `${WEB}/melden/staging-muster-nord/staging-leopold-10`

const rows = []
const mark = (id, status, note) => {
  rows.push({ id, status, note })
  console.log(`${status === 'ok' ? '✅' : status === 'fail' ? '❌' : '⚠️'} ${id} — ${note}`)
}

function loadEnv() {
  for (const line of fs.readFileSync(path.join(ROOT, '.env.staging'), 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    if (!process.env[t.slice(0, i)]) process.env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '')
  }
}

async function loginCrm(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email]').first().fill(ADMIN)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
}

async function loginPortal(page) {
  await page.goto(`${WEB}/portal/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(800)
  if (!(await page.locator('input[type=password]').isVisible().catch(() => false))) return
  await page.locator('input[type=email]').first().fill(HV_NORD)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForTimeout(3500)
}

async function wizardWeiter(page) {
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.app-flow-screen button')]
    const w = btns.find((b) => /^Weiter$/i.test((b.textContent || '').trim()))
    w?.click()
  })
  await page.waitForTimeout(1800)
}

async function createAngebot(page, leadId) {
  await loginCrm(page)
  await page.goto(`${CRM}/anfragen/${leadId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: /Angebot erstellen/i }).first().click()
  await page.waitForSelector('.app-flow-screen', { state: 'visible', timeout: 45000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOT}/wizard-p2-open.png` })

  // Schritt 1: erste Position öffnen + Netto setzen
  await page.evaluate(() => {
    const row = document.querySelector('.pos-board-row, [data-pos-index="0"], .dok-zeile')
    if (row instanceof HTMLElement) row.click()
  })
  await page.waitForTimeout(800)
  const netto = page.locator('input[name="vk_netto"], input[placeholder*="Netto" i]').first()
  if (await netto.isVisible().catch(() => false)) await netto.fill('514.62').catch(() => {})
  const bez = page.locator('input[name="bezeichnung"], input[placeholder*="Bezeichnung" i]').first()
  if (await bez.isVisible().catch(() => false)) await bez.fill('ZZTEST Sanitär Reparatur').catch(() => {})
  const savePos = page.getByRole('button', { name: /^Speichern$/i }).last()
  if (await savePos.isVisible().catch(() => false)) await savePos.click().catch(() => {})
  await page.waitForTimeout(1000)

  await wizardWeiter(page) // → Finalisieren
  await wizardWeiter(page) // → Handwerker
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOT}/wizard-p2-hw.png` })

  // Handwerker zuweisen — erste Checkbox / erste Zeile
  const hwRow = page.locator('.app-flow-screen input[type=checkbox]').first()
  if (await hwRow.count()) await hwRow.check({ force: true }).catch(() => {})
  await page.waitForTimeout(500)

  // Speichern (Checkmark-Popover)
  const check = page.locator('[aria-label="Speichern oder senden"]').first()
  if (await check.count()) {
    await check.click()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: /^Speichern$/i }).first().click()
  } else {
    await page.getByRole('button', { name: /speichern/i }).first().click()
  }
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${SHOT}/wizard-p2-done.png` })

  const link = page.getByRole('link', { name: /Zum Angebot/i }).first()
  if (await link.count()) {
    const href = await link.getAttribute('href')
    const m = href?.match(/([0-9a-f-]{36})/i)
    if (m) return m[1]
  }
  const m2 = page.url().match(/angebote\/([0-9a-f-]{36})/i)
  return m2?.[1] ?? null
}

async function setBetrag(db, page, angebotId, leadId, netto) {
  await db.from('angebote').update({ gesamt_fix: netto, gesamt_max: netto, gesamt_min: netto }).eq('id', angebotId)
  await page.goto(`${CRM}/angebote/${angebotId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  const bearb = page.getByRole('button', { name: /bearbeiten/i }).first()
  if (await bearb.isVisible().catch(() => false)) {
    await bearb.click()
    await page.waitForSelector('.app-flow-screen', { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const check = page.locator('[aria-label="Speichern oder senden"]').first()
    if (await check.count()) {
      await check.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /^Speichern$/i }).first().click()
    }
    await page.waitForTimeout(4000)
  }
  const { data } = await db.from('leads').select('org_freigabe_status').eq('id', leadId).maybeSingle()
  return data?.org_freigabe_status
}

async function partnerSend(page, angebotId, label) {
  await page.goto(`${CRM}/angebote/${angebotId}#angebot-versand-handwerker`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2500)
  const wa = page.getByRole('button', { name: /WhatsApp-Link/i }).first()
  if (await wa.isVisible().catch(() => false)) await wa.click()
  else await page.getByRole('button', { name: /Partner anfragen/i }).first().click().catch(() => {})
  await page.waitForTimeout(3000)
  const toast = (await page.locator('[data-sonner-toast]').allInnerTexts().catch(() => [])).join(' ')
  const blocked = /Wartet auf Org-Freigabe|abgelehnt/i.test(toast)
  mark(`partner-${label}`, blocked ? 'ok' : toast.includes('kopiert') || toast.includes('gesendet') ? 'ok' : 'warn', toast.slice(0, 140) || 'kein Toast')
  return { blocked, toast }
}

async function runMelde(page, tag) {
  await page.context().clearCookies()
  const email = `zztest.mittelteil.over.${tag}@example.test`
  await page.goto(MELDE, { waitUntil: 'domcontentloaded', timeout: 90000 })
  const reject = page.getByRole('button', { name: /ablehnen/i }).first()
  if (await reject.isVisible().catch(() => false)) await reject.click().catch(() => {})
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(450)
    const body = await page.locator('body').innerText()
    if (/ORT & KONTAKT|Kontaktdaten/i.test(body)) {
      const fill = (ph, v) => page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(v).catch(() => {})
      await fill('Vorname', 'ZZTEST')
      await fill('Nachname', `Over${tag}`)
      await fill('Straße', 'Leopoldstraße')
      await fill('Nr.', '10')
      await fill('PLZ', '80802')
      await fill('Ort', 'München')
      await fill('E-Mail', email)
      await page.locator('input[type=tel]').first().fill('08955559999').catch(() => {})
      await page.locator('input[type=checkbox]').first().check({ force: true }).catch(() => {})
    }
    if (/BESCHREIBUNG/i.test(body)) {
      await page.locator('textarea:visible').first().fill('ZZTEST Over500 Wasserschaden Küche deutlich über 500 Euro.').catch(() => {})
    }
    const tiles = page.locator('button.funnel-tile, .funnel-tile')
    for (let t = 0; t < Math.min(await tiles.count(), 10); t++) {
      const txt = ((await tiles.nth(t).innerText().catch(() => '')) || '').toLowerCase()
      if (/wasser|bad|sanitär|küche/.test(txt)) { await tiles.nth(t).click({ force: true }); break }
    }
    if (fs.existsSync(FOTO)) await page.locator('input[type=file]').first().setInputFiles(FOTO).catch(() => {})
    const step = await funnelAdvanceStep(page)
    if (step === 'absenden') {
      await page.getByRole('button', { name: /absenden|melden|senden/i }).first().click()
      await page.waitForTimeout(6000)
      break
    }
  }
  await page.screenshot({ path: `${SHOT}/melde-over-${tag}.png`, fullPage: true })
  return email
}

loadEnv()
const db = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('dialog', async (d) => await d.accept())

  // fe37: Angebot 450 netto (klar unter 500)
  const ang1 = await createAngebot(page, LEAD_FE37)
  mark('wizard-fe37', ang1 ? 'ok' : 'fail', ang1 ?? 'kein Angebot')
  if (ang1) {
    const st450 = await setBetrag(db, page, ang1, LEAD_FE37, 450)
    mark('freigabe-450', st450 === 'nicht_noetig' ? 'ok' : 'warn', `org_freigabe=${st450}`)
    await partnerSend(page, ang1, '450-unter')
  }

  const email = await runMelde(page, Date.now().toString().slice(-5))
  const { data: lead2 } = await db.from('leads').select('id, melde_tracking_token').ilike('kontakt_email', email).maybeSingle()
  mark('melde-over', lead2?.id ? 'ok' : 'fail', lead2?.id ?? email)

  if (lead2?.id) {
    await loginPortal(page)
    await page.goto(`${WEB}/portal?section=vorgaenge&id=${lead2.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: /direkt bärenwald/i }).first().click()
    await page.waitForTimeout(2500)

    const ang2 = await createAngebot(page, lead2.id)
    mark('wizard-over', ang2 ? 'ok' : 'fail', ang2 ?? '—')
    if (ang2) {
      const st687 = await setBetrag(db, page, ang2, lead2.id, 687.9)
      mark('freigabe-687', st687 === 'ausstehend' ? 'ok' : 'fail', `org_freigabe=${st687}`)
      const b1 = await partnerSend(page, ang2, '687-block')
      mark('block-687-live', b1.blocked ? 'ok' : 'fail', b1.toast)

      await loginPortal(page)
      await page.goto(`${WEB}/portal?section=vorgaenge&id=${lead2.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(2000)
      await page.getByRole('button', { name: /^Ablehnen$/i }).first().click()
      await page.waitForTimeout(2500)
      const stAb = (await db.from('leads').select('org_freigabe_status').eq('id', lead2.id).maybeSingle()).data?.org_freigabe_status
      mark('hv-ablehnen', stAb === 'abgelehnt' ? 'ok' : 'warn', `status=${stAb}`)

      await setBetrag(db, page, ang2, lead2.id, 612)
      await loginPortal(page)
      await page.goto(`${WEB}/portal?section=vorgaenge&id=${lead2.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(2000)
      await page.getByRole('button', { name: /^Freigeben$/i }).first().click()
      await page.waitForTimeout(2500)
      const stFg = (await db.from('leads').select('org_freigabe_status').eq('id', lead2.id).maybeSingle()).data?.org_freigabe_status
      mark('hv-freigeben', stFg === 'freigegeben' ? 'ok' : 'warn', `status=${stFg}`)
      const b2 = await partnerSend(page, ang2, '612-nach-fg')
      mark('partner-nach-fg', !b2.blocked ? 'ok' : 'fail', b2.toast)
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(rows, null, 2))
  await browser.close()
})()
