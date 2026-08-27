#!/usr/bin/env node
/**
 * Staging: A2 (Mieter/HV) → A1 (Privat) → C (Finanz)
 * Mail-Inhalt nicht prüfen. PDFs prüfen.
 *
 * node --env-file=.env.staging scripts/staging/run-a2-a1-finance.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'
import { funnelAdvanceStep } from '../lib/funnel-nav.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const SHOT = path.join(ROOT, 'docs/test/screenshots/a2-a1-finance')
const PDF_DIR = path.join(SHOT, 'pdfs')
const OUT = path.join(ROOT, 'docs/test/TESTREPORT-A2-A1-FINANZ-LIVE.json')
const FOTO = path.join(ROOT, 'docs/test/r2-5-data/ok_small.jpg')

const ADMIN = 'admin@staging.baerenwald.test'
const HV = 'hv-nord@example.test'
const PARTNER = 'partner-sanitaer@example.test'
const PRIVAT = 'familie.berger@example.test'
const PASS = 'StagingTest!2026'
const MELDE = `${WEB}/melden/staging-muster-nord/staging-leopold-10`

fs.mkdirSync(SHOT, { recursive: true })
fs.mkdirSync(PDF_DIR, { recursive: true })

const rows = []
function mark(phase, id, status, note, extra = {}) {
  rows.push({ phase, id, status, note, ...extra, at: new Date().toISOString() })
  const icon = { ok: '✅', warn: '⚠️', fail: '❌', skip: '⏭️' }[status] || '?'
  console.log(`${icon} [${phase}] ${id} — ${note}`)
}

function loadEnv() {
  const p = path.join(ROOT, '.env.staging')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i)
    if (!process.env[k]) process.env[k] = t.slice(i + 1).replace(/^["']|["']$/g, '')
  }
}

async function loginCrm(page, email) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email], input[name=email]').first().fill(email)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
}

async function loginSite(page, email, startPath) {
  await page.goto(`${WEB}${startPath}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(700)
  const emailIn = page.locator('input[type=email], input[name=email]').first()
  if (!(await emailIn.isVisible().catch(() => false))) return page.url()
  await emailIn.fill(email)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden|login|einloggen/i }).first().click()
  await page.waitForTimeout(4500)
  return page.url()
}

async function probePdf(page, id, url) {
  try {
    const res = await page.request.get(url, { timeout: 120000 })
    const buf = Buffer.from(await res.body())
    const ok = buf.subarray(0, 4).toString() === '%PDF'
    if (ok) {
      fs.writeFileSync(path.join(PDF_DIR, `${id}.pdf`), buf)
      mark('PDF', id, 'ok', `HTTP ${res.status()} · ${buf.length} B`, { bytes: buf.length })
    } else {
      mark('PDF', id, 'fail', `HTTP ${res.status()} · ${buf.toString('utf8').slice(0, 140)}`)
    }
    return ok
  } catch (e) {
    mark('PDF', id, 'fail', String(e.message || e))
    return false
  }
}

async function runMelde(page, stamp) {
  const email = `zztest.a2.${stamp}@example.test`
  await page.goto(MELDE, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1000)
  const reject = page.getByRole('button', { name: /ablehnen/i }).first()
  if (await reject.isVisible().catch(() => false)) await reject.click().catch(() => {})

  for (let i = 0; i < 28; i++) {
    await page.waitForTimeout(400)
    const body = await page.locator('body').innerText()
    if (i === 0) {
      mark(
        'A2',
        'branding-melde',
        /musterverwaltung nord/i.test(body) ? 'ok' : 'warn',
        body.slice(0, 110).replace(/\n/g, ' | ')
      )
    }

    const file = page.locator('input[type=file]').first()
    if ((await file.count()) && fs.existsSync(FOTO)) {
      await file.setInputFiles(FOTO).catch(() => {})
    }

    if (/ORT & KONTAKT|Kontaktdaten|Ihre Daten/i.test(body)) {
      const fillPh = (ph, val) =>
        page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(val).catch(() => {})
      await fillPh('Vorname', 'ZZTEST')
      await fillPh('Nachname', `A2${stamp}`)
      await fillPh('Name', `ZZTEST A2 ${stamp}`)
      await fillPh('Straße', 'Leopoldstraße')
      await fillPh('Nr.', '10')
      await fillPh('PLZ', '80802')
      await fillPh('Ort', 'München')
      await fillPh('E-Mail', email)
      await page.locator('input[type=tel]').first().fill('08955559876').catch(() => {})
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count()) await cb.check({ force: true }).catch(() => {})
    }

    if (/BESCHREIBUNG|Was ist passiert|beschreiben/i.test(body)) {
      const ta = page.locator('textarea:visible').first()
      if (await ta.count()) {
        const cur = await ta.inputValue().catch(() => '')
        if ((cur || '').trim().length < 10) {
          await ta.fill(
            'ZZTEST A2 E2E — Wasseraustritt Küche, Schaden klar über 500 Euro, Freigabe-Pfad prüfen.'
          )
        }
      }
    }

    const tiles = page.locator('button.funnel-tile, .funnel-step-tiles-card button, .funnel-tile')
    const n = await tiles.count()
    for (let t = 0; t < Math.min(n, 12); t++) {
      const txt = ((await tiles.nth(t).innerText().catch(() => '')) || '').toLowerCase()
      if (/wasser|bad|sanitär|rohr|feucht|küche|heizung/.test(txt)) {
        await tiles.nth(t).click({ force: true }).catch(() => {})
        await page.waitForTimeout(250)
        break
      }
    }

    const step = await funnelAdvanceStep(page, (m) => console.log(' ', m))
    if (step === 'absenden') {
      await page.getByRole('button', { name: /absenden|melden|senden|abschicken/i }).first().click()
      await page.waitForTimeout(5000)
      break
    }
    if (/bestätigung|eingegangen|status|konto anlegen/i.test(body + page.url()) && i > 4) break
    if (step === 'stuck') {
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count()) await cb.check({ force: true }).catch(() => {})
    }
  }

  await page.screenshot({ path: path.join(SHOT, 'a2-melde-end.png') })
  const body = await page.locator('body').innerText()
  const url = page.url()
  mark(
    'A2',
    'melde-submit',
    /bestätigung|eingegangen|status|konto/i.test(url + body) ? 'ok' : 'warn',
    `url=${url.slice(0, 100)} · ${body.slice(0, 140).replace(/\n/g, ' | ')}`
  )

  const statusA = page.locator('a[href*="status"]').first()
  if (await statusA.count()) {
    const href = await statusA.getAttribute('href')
    await page.goto(href.startsWith('http') ? href : `${WEB}${href}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(SHOT, 'a2-status.png') })
    const st = await page.locator('body').innerText()
    mark(
      'A2',
      'status-branding',
      /musterverwaltung nord/i.test(st) ? 'ok' : 'warn',
      st.slice(0, 120).replace(/\n/g, ' | ')
    )
  } else {
    mark('A2', 'status-branding', 'warn', 'kein Status-Link')
  }
  return email
}

async function main() {
  loadEnv()
  assertStagingWriteTarget({
    supabaseUrl: process.env.STAGING_SUPABASE_URL,
    projectRef: process.env.STAGING_PROJECT_REF || STAGING_PROJECT_REF_CANON,
    projectId: process.env.STAGING_PROJECT_ID,
    dbUrl: process.env.STAGING_DB_URL,
  })

  const sb = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('dialog', async (d) => {
    console.log('DIALOG', d.message().slice(0, 80))
    await d.dismiss().catch(() => {})
  })

  const stamp = Date.now().toString().slice(-6)
  let leadId = null
  let angebotId = null
  let auftragId = null
  let rechnungId = null

  try {
    console.log('\n=== A2 ===\n')
    const meldeEmail = await runMelde(page, stamp)

    const { data: leads } = await sb
      .from('leads')
      .select('id, status, org_freigabe_status, hv_meldung_status, kontakt_email, created_at')
      .ilike('kontakt_email', meldeEmail)
      .order('created_at', { ascending: false })
      .limit(3)
    leadId = leads?.[0]?.id || null
    mark(
      'A2',
      'lead-db',
      leadId ? 'ok' : 'fail',
      leadId
        ? `${leadId} status=${leads[0].status} freigabe=${leads[0].org_freigabe_status}`
        : `kein Lead ${meldeEmail}`
    )

    await page.context().clearCookies()
    await loginCrm(page, ADMIN)

    if (leadId) {
      await page.goto(`${CRM}/anfragen/${leadId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(1800)
      await page.screenshot({ path: path.join(SHOT, 'a2-crm-lead.png') })
      let body = await page.locator('body').innerText()
      mark(
        'A2',
        'crm-kontext',
        /muster|leopold|zztest|staging/i.test(body) ? 'ok' : 'warn',
        body.slice(0, 160).replace(/\n/g, ' | ')
      )

      const { data: angs } = await sb
        .from('angebote')
        .select('id, status, created_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(3)
      angebotId = angs?.[0]?.id || null
      mark(
        'A2',
        'angebot-db',
        angebotId ? 'ok' : 'warn',
        angebotId ? `${angebotId} ${angs[0].status}` : 'kein Angebot am Lead'
      )
      if (angebotId) {
        await probePdf(page, 'a2-angebot', `${CRM}/api/angebote/${angebotId}/pdf`)
        await page.goto(`${CRM}/angebote/${angebotId}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(1200)
        body = await page.locator('body').innerText()
        mark('A2', 'freigabe-ui', /freigabe/i.test(body) ? 'ok' : 'warn', body.slice(0, 120).replace(/\n/g, ' | '))
      }
    }

    await page.context().clearCookies()
    const hvUrl = await loginSite(page, HV, '/portal/login')
    await page.screenshot({ path: path.join(SHOT, 'a2-hv-portal.png') })
    let body = await page.locator('body').innerText()
    mark(
      'A2',
      'hv-login',
      /vorgang|meldung|dashboard|freigabe|objekt|portal/i.test(body) || !hvUrl.includes('/login')
        ? 'ok'
        : 'warn',
      `url=${hvUrl.slice(0, 110)} · ${body.slice(0, 120).replace(/\n/g, ' | ')}`
    )

    if (leadId) {
      await page
        .goto(`${WEB}/portal?section=vorgaenge&id=${leadId}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        })
        .catch(() => {})
      await page.waitForTimeout(2000)
      await page.screenshot({ path: path.join(SHOT, 'a2-hv-vorgang.png') })
      body = await page.locator('body').innerText()
      const freigeben = page.getByRole('button', { name: /freigeben|erteilen|zustimmen/i }).first()
      mark(
        'A2',
        'hv-freigabe-buttons',
        (await freigeben.isVisible().catch(() => false)) ? 'ok' : 'warn',
        body.slice(0, 140).replace(/\n/g, ' | ')
      )
      if (await freigeben.isVisible().catch(() => false)) {
        await freigeben.click()
        await page.waitForTimeout(2000)
        const { data: after } = await sb
          .from('leads')
          .select('org_freigabe_status')
          .eq('id', leadId)
          .maybeSingle()
        mark(
          'A2',
          'hv-freigabe-result',
          after?.org_freigabe_status === 'freigegeben' ? 'ok' : 'warn',
          `org_freigabe_status=${after?.org_freigabe_status}`
        )
      }

      const { data: gate } = await sb
        .from('leads')
        .select('org_freigabe_status, hv_meldung_status')
        .eq('id', leadId)
        .maybeSingle()
      mark(
        'A2',
        'partner-gate-state',
        gate ? 'ok' : 'fail',
        `freigabe=${gate?.org_freigabe_status} hv=${gate?.hv_meldung_status}`
      )
    }

    await page.context().clearCookies()
    const pUrl = await loginSite(page, PARTNER, '/partner')
    body = await page.locator('body').innerText()
    await page.screenshot({ path: path.join(SHOT, 'a2-partner.png') })
    mark(
      'A2',
      'partner-login',
      /auftrag|vorgang|zuweisung|offen|dashboard|partner/i.test(body) ? 'ok' : 'warn',
      `url=${pUrl.slice(0, 100)} · ${body.slice(0, 120).replace(/\n/g, ' | ')}`
    )

    console.log('\n=== A1 ===\n')
    await page.context().clearCookies()
    await page.goto(`${WEB}/rechner`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(SHOT, 'a1-rechner.png') })
    body = await page.locator('body').innerText()
    mark(
      'A1',
      'rechner',
      /rechner|bad|kosten|raum|renov/i.test(body) ? 'ok' : 'warn',
      body.slice(0, 100).replace(/\n/g, ' | ')
    )

    for (let i = 0; i < 18; i++) {
      await page.waitForTimeout(350)
      body = await page.locator('body').innerText()
      if (/kontakt|e-mail|ihre daten|absenden|anfrage/i.test(body)) {
        await page
          .locator('input[type=email]')
          .first()
          .fill(`zztest.a1.${stamp}@example.test`)
          .catch(() => {})
        await page
          .locator('input[name=name], input[placeholder*=Name]')
          .first()
          .fill(`ZZTEST A1 ${stamp}`)
          .catch(() => {})
        await page.locator('input[type=tel]').first().fill('0891234567').catch(() => {})
        const cb = page.locator('input[type=checkbox]').first()
        if (await cb.count()) await cb.check({ force: true }).catch(() => {})
      }
      const step = await funnelAdvanceStep(page, () => {})
      if (step === 'absenden') {
        await page
          .getByRole('button', { name: /absenden|anfrage|senden/i })
          .first()
          .click()
          .catch(() => {})
        await page.waitForTimeout(4000)
        break
      }
    }
    await page.screenshot({ path: path.join(SHOT, 'a1-rechner-end.png') })
    body = await page.locator('body').innerText()
    mark(
      'A1',
      'rechner-submit',
      /danke|eingegangen|bestätig|anfrage/i.test(body + page.url()) ? 'ok' : 'warn',
      `${page.url().slice(0, 80)} · ${body.slice(0, 120).replace(/\n/g, ' | ')}`
    )

    const { data: privatLeads } = await sb
      .from('leads')
      .select('id, status, kontakt_email, created_at')
      .ilike('kontakt_email', `zztest.a1.${stamp}@example.test`)
      .order('created_at', { ascending: false })
      .limit(2)
    const privatLeadId = privatLeads?.[0]?.id || null
    mark(
      'A1',
      'lead-db',
      privatLeadId ? 'ok' : 'warn',
      privatLeadId ? `${privatLeadId} ${privatLeads[0].status}` : 'kein Privat-Lead'
    )

    await page.context().clearCookies()
    await loginCrm(page, ADMIN)

    const { data: anyAng } = await sb
      .from('angebote')
      .select('id, status, lead_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8)
    const ang = anyAng?.find((a) => a.lead_id === privatLeadId) || anyAng?.[0]
    if (ang) {
      if (!angebotId) angebotId = ang.id
      await probePdf(page, 'a1-angebot', `${CRM}/api/angebote/${ang.id}/pdf`)
      await page.goto(`${CRM}/angebote/${ang.id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      mark('A1', 'angebot-detail', 'ok', `${ang.id.slice(0, 8)} ${ang.status}`)
    } else {
      mark('A1', 'angebot-detail', 'fail', 'kein Angebot')
    }

    const { data: aufs } = await sb
      .from('auftraege')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    auftragId = aufs?.[0]?.id || null
    if (auftragId) {
      await page.goto(`${CRM}/auftraege/${auftragId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      mark('A1', 'auftrag', 'ok', `${auftragId.slice(0, 8)} ${aufs[0].status}`)
      await probePdf(
        page,
        'a1-abschluss',
        `${CRM}/api/auftraege/${auftragId}/abschlussdokumentation/pdf`
      )
    } else {
      mark('A1', 'auftrag', 'warn', 'kein Auftrag')
    }

    await page.context().clearCookies()
    const privUrl = await loginSite(page, PRIVAT, '/portal/login')
    body = await page.locator('body').innerText()
    mark(
      'A1',
      'privat-portal',
      /vorgang|angebot|projekt|dashboard|mein/i.test(body) ? 'ok' : 'warn',
      `url=${privUrl.slice(0, 100)} · ${body.slice(0, 100).replace(/\n/g, ' | ')}`
    )

    console.log('\n=== C Finanz ===\n')
    await page.context().clearCookies()
    await loginCrm(page, ADMIN)

    const { data: res } = await sb
      .from('rechnungen')
      .select('id, rechnungsnummer, status, beleg_typ, brutto, created_at')
      .order('created_at', { ascending: false })
      .limit(15)

    const reOk = res?.find((r) => r.status === 'gesendet' && r.beleg_typ !== 'gutschrift')
    const reGs = res?.find((r) => r.beleg_typ === 'gutschrift' || /gs-/i.test(r.rechnungsnummer || ''))
    const reDraft = res?.find((r) => r.status === 'entwurf')

    if (reOk) {
      rechnungId = reOk.id
      await probePdf(page, 'c-re-query', `${CRM}/api/rechnung-pdf?rechnungId=${reOk.id}`)
      await probePdf(page, 'c-re-id', `${CRM}/api/rechnungen/${reOk.id}/pdf`)
      await page.goto(`${CRM}/rechnungen/${reOk.id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1400)
      body = await page.locator('body').innerText()
      mark(
        'C',
        're-detail',
        /rechnung|brutto|gesendet/i.test(body) ? 'ok' : 'warn',
        `${reOk.rechnungsnummer} ${reOk.brutto}`
      )

      const more = page
        .locator('button[aria-label="Weitere Aktionen"], button[aria-label*="Weitere"]')
        .first()
      if (await more.isVisible().catch(() => false)) {
        await more.click()
        await page.waitForTimeout(400)
        const storno = page.getByText(/storno|gutschrift|korrektur/i).first()
        mark(
          'C',
          'storno-menu',
          (await storno.isVisible().catch(() => false)) ? 'ok' : 'warn',
          '⋯ Storno/Gutschrift'
        )
        await page.keyboard.press('Escape').catch(() => {})
      } else {
        mark('C', 'storno-menu', 'warn', '⋯ nicht gefunden')
      }

      const bez = page.getByRole('button', { name: /als bezahlt/i }).first()
      if (await bez.isVisible().catch(() => false)) {
        await bez.click()
        await page.waitForTimeout(1500)
        const { data: after } = await sb
          .from('rechnungen')
          .select('status')
          .eq('id', reOk.id)
          .maybeSingle()
        mark('C', 'als-bezahlt', after?.status === 'bezahlt' ? 'ok' : 'warn', `status=${after?.status}`)
        await sb.from('rechnungen').update({ status: 'gesendet' }).eq('id', reOk.id)
        mark('C', 'als-bezahlt-revert', 'ok', 'zurück gesendet')
      } else {
        mark('C', 'als-bezahlt', 'warn', 'Button fehlt')
      }
    } else {
      mark('C', 're-detail', 'fail', 'keine gesendete RE')
    }

    if (reGs) {
      await probePdf(page, 'c-gs-query', `${CRM}/api/rechnung-pdf?rechnungId=${reGs.id}`)
      await probePdf(page, 'c-gs-id', `${CRM}/api/rechnungen/${reGs.id}/pdf`)
    } else {
      mark('C', 'gutschrift', 'skip', 'keine GS in Top-15')
    }

    if (reDraft) {
      await page.goto(`${CRM}/rechnungen/${reDraft.id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(800)
      body = await page.locator('body').innerText()
      mark(
        'C',
        're-entwurf',
        /entwurf|position|speichern/i.test(body) ? 'ok' : 'warn',
        reDraft.id.slice(0, 8)
      )
    }

    const { data: angSent } = await sb
      .from('angebote')
      .select('id, status')
      .in('status', ['gesendet_kunde', 'gesendet', 'versendet'])
      .order('created_at', { ascending: false })
      .limit(1)
    if (angSent?.[0]) {
      await page.goto(`${CRM}/angebote/${angSent[0].id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      await probePdf(page, 'c-angebot-gesendet', `${CRM}/api/angebote/${angSent[0].id}/pdf`)
      body = await page.locator('body').innerText()
      mark(
        'C',
        'angebot-gesendet',
        /angebot|gesendet|ersetzt/i.test(body) ? 'ok' : 'warn',
        angSent[0].status
      )
    }

    if (auftragId) {
      await page.goto(`${CRM}/auftraege/${auftragId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(900)
      const tab = page.getByRole('tab', { name: /zahlung|zahlplan|rechnung/i }).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(700)
        body = await page.locator('body').innerText()
        mark(
          'C',
          'zahlplan',
          /abschlag|schluss|zahlung|rechnung|plan/i.test(body) ? 'ok' : 'warn',
          body.slice(0, 90).replace(/\n/g, ' ')
        )
      } else {
        mark('C', 'zahlplan', 'warn', 'kein Tab')
      }
    }

    const { data: obj } = await sb
      .from('kunden_objekte')
      .select('id')
      .eq('melde_slug', 'staging-leopold-10')
      .maybeSingle()
    if (obj?.id) await probePdf(page, 'c-aushang', `${CRM}/api/objekte/${obj.id}/aushang-pdf`)
  } catch (e) {
    mark('RUN', 'crash', 'fail', String(e?.stack || e).slice(0, 500))
  } finally {
    await browser.close()
  }

  const summary = rows.reduce((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1
    return a
  }, {})
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        finished_at: new Date().toISOString(),
        summary,
        ids: { leadId, angebotId, auftragId, rechnungId, stamp },
        rows,
      },
      null,
      2
    )
  )
  console.log('\n=== SUMMARY ===', summary)
  console.log('wrote', OUT)
  process.exit(summary.fail ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
