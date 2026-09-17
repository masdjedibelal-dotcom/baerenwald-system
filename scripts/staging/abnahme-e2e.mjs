#!/usr/bin/env node
/**
 * Abnahme E2E-Nachzug: Melde (Ort&Kontakt) + CRM .2/.2b + Stichproben Mahnung/Notfall/Portal/Partner
 * + Fortsetzung an Lead 6eba4479 wo möglich
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
const SHOT = path.join(ROOT, 'docs/test/screenshots/abnahme')
const OUT = path.join(ROOT, 'docs/test/abnahme-e2e-results.json')
const EXISTING = '6eba4479-f520-4232-9e95-f3708fb0216c'
const RE_FOREIGN = 'a1100000-0000-4000-8000-000000000023'

const ADMIN = 'admin@staging.baerenwald.test'
const STAFF2 = 'staff2@staging.baerenwald.test'
const PASS = 'StagingTest!2026'

const results = []
function mark(block, id, status, note) {
  results.push({ block, id, status, note, at: new Date().toISOString() })
  const icon = { ok: '✅', warn: '⚠️', fail: '❌', skip: '⏭️', crash: '💥' }[status] || '?'
  console.log(`${icon} [${block}] ${id} — ${note}`)
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env.staging')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq)
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).replace(/^["']|["']$/g, '')
  }
}

async function login(page, email) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(500)
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email], input[name=email]').first().fill(email)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
}

async function meldeFull(page, stamp) {
  const email = `zztest.abnahme.${stamp}@example.test`
  await page.goto(`${WEB}/melden/staging-muster-nord/staging-leopold-10`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(1200)
  const ablehnen = page.getByRole('button', { name: /ablehnen/i }).first()
  if (await ablehnen.isVisible().catch(() => false)) await ablehnen.click()

  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(450)
    const body = await page.locator('body').innerText()
    console.log(`funnel ${i}: ${body.slice(0, 100).replace(/\n/g, ' | ')}`)

    const file = page.locator('input[type=file]').first()
    if (await file.count()) {
      const foto = path.join(ROOT, 'docs/test/r2-5-data/ok_small.jpg')
      if (fs.existsSync(foto)) await file.setInputFiles(foto).catch(() => {})
    }

    if (/ORT & KONTAKT|Kontaktdaten/i.test(body)) {
      const fillPh = (ph, val) =>
        page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(val).catch(() => {})
      await fillPh('Vorname', 'ZZTEST')
      await fillPh('Nachname', `Abnahme${stamp}`)
      await fillPh('Name', `ZZTEST Abnahme ${stamp}`)
      await fillPh('Straße', 'Leopoldstraße')
      await fillPh('Nr.', '10')
      await fillPh('PLZ', '80802')
      await fillPh('Ort', 'München')
      await fillPh('E-Mail', email)
      await page.locator('input.funnel-input[type=tel]').first().fill('08955551212').catch(() => {})
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count() && !(await cb.isChecked().catch(() => false))) {
        await cb.check({ force: true }).catch(() => {})
      }
    }

    if (/BESCHREIBUNG|Was ist passiert/i.test(body)) {
      const desc = page.locator('textarea:visible').first()
      if (await desc.count()) {
        const cur = await desc.inputValue().catch(() => '')
        if ((cur || '').trim().length < 10) {
          await desc.fill(
            'ZZTEST Abnahme E2E — Wasser tropft stark in der Küche, Sanitär-Großschaden, bitte Angebot über 500 Euro.'
          )
        }
      }
    }

    // Prefer Wasser / Sanitär for >500 path
    const tiles = page.locator('button.funnel-tile, .funnel-step-tiles-card button, .funnel-tile')
    const n = await tiles.count()
    for (let t = 0; t < Math.min(n, 12); t++) {
      const txt = ((await tiles.nth(t).innerText().catch(() => '')) || '').toLowerCase()
      if (/wasser|bad|sanitär|rohr|feucht|heizung|küche/.test(txt)) {
        await tiles.nth(t).click({ force: true }).catch(() => {})
        await page.waitForTimeout(300)
        break
      }
    }

    const step = await funnelAdvanceStep(page, console.log)
    if (step === 'absenden') {
      const absenden = page.getByRole('button', { name: /absenden|melden|senden|abschicken/i }).first()
      await absenden.click()
      await page.waitForTimeout(4500)
      break
    }
    if (/bestätigung|eingegangen|konto anlegen/i.test(body + page.url())) break
    if (step === 'stuck' && i > 3) {
      // try checkbox consent blocking weiter
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count()) await cb.check({ force: true }).catch(() => {})
    }
  }

  await page.screenshot({ path: path.join(SHOT, 'e2e-melde-end.png'), fullPage: false })
  const body = await page.locator('body').innerText()
  const url = page.url()
  const confirm =
    /bestätigung|eingegangen|konto anlegen, um ihre meldungen/i.test(url + body) &&
    !/zu bärenwald/i.test(body)
  mark(
    'E2E',
    '.1-Melde-Confirm',
    confirm ? 'ok' : /meldung wird gesendet|absenden/i.test(body) ? 'warn' : 'fail',
    confirm ? 'Confirm/CTA ok' : `url=${url.slice(0, 90)} · ${body.slice(0, 120).replace(/\n/g, ' | ')}`
  )
  if (confirm) {
    mark('R2-3', 'R-11-CTA', /konto anlegen/i.test(body) ? 'ok' : 'warn', body.slice(0, 80).replace(/\n/g, ' '))
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
  fs.mkdirSync(SHOT, { recursive: true })
  const sb = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Ensure RE gesendet for Mahnung
  await sb.from('rechnungen').update({ status: 'gesendet' }).eq('id', RE_FOREIGN)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('dialog', async (d) => {
    console.log('DIALOG', d.message().slice(0, 80))
    await d.dismiss()
  })

  const stamp = Date.now()
  try {
    // ——— Melde ———
    const email = await meldeFull(page, stamp)
    const { data: leads } = await sb
      .from('leads')
      .select('id, status, kontakt_name, kontakt_email, created_at')
      .ilike('kontakt_email', email)
      .order('created_at', { ascending: false })
      .limit(3)
    const lead = leads?.[0]
    mark('E2E', '.1-Lead-DB', lead ? 'ok' : 'fail', lead ? `${lead.id} ${lead.status}` : 'kein Lead')

    await page.context().clearCookies()
    await login(page, ADMIN)

    const leadId = lead?.id || EXISTING
    await page.goto(`${CRM}/anfragen/${leadId}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    let body = await page.locator('body').innerText()
    mark(
      'E2E',
      '.2-CRM',
      /muster|leopold|zztest|hv/i.test(body) ? 'ok' : 'warn',
      body.slice(0, 140).replace(/\n/g, ' | ')
    )

    const warte = page.getByRole('button', { name: /warte auf hv|hausmeister/i }).first()
    if (await warte.isVisible().catch(() => false)) {
      await warte.click()
      await page.waitForTimeout(900)
      const sheet = await page.locator('[role=dialog], .sheet, .editor-sheet, .modal').first().innerText().catch(() => '')
      mark(
        'E2E',
        '.2b-HV-Sheet',
        /freigabe|portal|schritt|hausverwaltung/i.test(sheet) ? 'ok' : 'warn',
        sheet.slice(0, 120).replace(/\n/g, ' | ')
      )
      await page.keyboard.press('Escape').catch(() => {})
    } else {
      mark('E2E', '.2b-HV-Sheet', 'warn', 'Primary nicht sichtbar — Lead ggf. schon weiter')
    }

    // Angebot an EXISTING lead
    await page.goto(`${CRM}/anfragen/${EXISTING}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    body = await page.locator('body').innerText()
    const angLink = page.locator('a[href*="/angebote/"]').first()
    if (await angLink.isVisible().catch(() => false)) {
      await angLink.click()
      await page.waitForTimeout(1500)
      body = await page.locator('body').innerText()
      const over500 = /5\s*0{2}|[6-9]\d{2}|[1-9]\d{3,}/.test(body.replace(/\./g, ''))
      mark(
        'E2E',
        '.3-Angebot',
        /angebot|gesendet|position/i.test(body) ? (over500 ? 'ok' : 'warn') : 'fail',
        over500 ? 'Angebot sichtbar, Betragshinweis' : body.slice(0, 120).replace(/\n/g, ' | ')
      )
    } else {
      mark('E2E', '.3-Angebot', 'warn', 'kein Angebot-Link am Lead 6eba')
    }

    // Freigabe UI Stichprobe am halb-Lead
    await page.goto(`${CRM}/anfragen/a1100000-0000-4000-8000-000000000060`, {
      waitUntil: 'domcontentloaded',
    })
    await page.waitForTimeout(1200)
    body = await page.locator('body').innerText()
    const freigabeBtns = {
      anfordern: await page.getByRole('button', { name: /freigabe anfordern|anfordern/i }).count(),
      erteilen: await page.getByRole('button', { name: /erteilen|freigeben/i }).count(),
      ablehnen: await page.getByRole('button', { name: /ablehnen/i }).count(),
    }
    mark(
      'E2E',
      '.5-Freigabe-UI',
      /freigabe/i.test(body) ? 'ok' : 'warn',
      `Label+Buttons counts ${JSON.stringify(freigabeBtns)}`
    )

    // Partner / HW seed auftrag
    await page.goto(`${CRM}/auftraege/231716aa-0000-4000-8000-000000000001`, {
      waitUntil: 'domcontentloaded',
    }).catch(() => {})
    // try find real seed auftrag
    const { data: aufs } = await sb
      .from('auftraege')
      .select('id, status')
      .order('created_at', { ascending: false })
      .limit(5)
    const auf = aufs?.[0]
    if (auf) {
      await page.goto(`${CRM}/auftraege/${auf.id}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)
      body = await page.locator('body').innerText()
      mark(
        'E2E',
        '.4-Partner-Auftrag',
        /handwerker|partner|zuweisung|position/i.test(body) ? 'ok' : 'warn',
        `${auf.id.slice(0, 8)} ${auf.status} · ${body.slice(0, 80).replace(/\n/g, ' ')}`
      )
      // Abnahme tab?
      const abnahme = page.getByRole('tab', { name: /abnahme/i }).or(page.getByText(/abnahme/i)).first()
      if (await abnahme.isVisible().catch(() => false)) {
        await abnahme.click().catch(() => {})
        await page.waitForTimeout(800)
        body = await page.locator('body').innerText()
        mark(
          'E2E',
          '.9-Abnahme',
          /abnahme|mängel|protokoll/i.test(body) ? 'ok' : 'warn',
          body.slice(0, 100).replace(/\n/g, ' ')
        )
      } else {
        mark('E2E', '.9-Abnahme', 'skip', 'kein Abnahme-Tab am aktuellen Auftrag')
      }
    }

    // ——— A–D Nachzug ———
    await page.goto(`${CRM}/rechnungen/${RE_FOREIGN}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const more = page.locator('button[aria-label="Weitere Aktionen"]').first()
    await more.click()
    await page.waitForTimeout(400)
    const erinnerung = page.getByText(/^Zahlungserinnerung$/i).first()
    const remDisabled = await erinnerung.evaluate((el) => {
      const item = el.closest('.menu-item, [role=menuitem], button')
      return item?.classList.contains('disabled') || item?.getAttribute('aria-disabled') === 'true'
    }).catch(() => true)
    if (!remDisabled) {
      await erinnerung.click()
      await page.waitForTimeout(900)
      const modal = page.locator('.modal, [role=dialog]').filter({ hasText: /erinnerung|mahnung/i }).first()
      const vis = await modal.isVisible().catch(() => false)
      mark('A-D', 'B1-Mahnung-Modal', vis ? 'ok' : 'fail', vis ? 'Modal offen' : 'kein Modal')
      await page.keyboard.press('Escape').catch(() => {})
    } else {
      mark('A-D', 'B1-Mahnung-Modal', 'fail', 'Zahlungserinnerung noch disabled')
    }

    // Notfall: set situation via UI or find ist_notfall auftrag
    const { data: nfAuf } = await sb
      .from('auftraege')
      .select('id, ist_notfall, status')
      .eq('ist_notfall', true)
      .limit(3)
    if (nfAuf?.[0]) {
      await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
      const search = page.getByPlaceholder(/suchen|filter/i).first()
      if (await search.isVisible().catch(() => false)) {
        await search.fill(nfAuf[0].id.slice(0, 8))
        await page.waitForTimeout(1000)
      }
      const badge = await page.locator('.badge-notfall, [class*="notfall"], text=Notfall').count()
      mark('A-D', 'A3-Notfall-Badge', badge > 0 ? 'ok' : 'warn', `ist_notfall Auftrag ${nfAuf[0].id.slice(0, 8)} badges=${badge}`)
    } else {
      // Try lead situation mark via CRM Akut if available
      mark('A-D', 'A3-Notfall-Badge', 'warn', 'kein ist_notfall-Auftrag in DB')
    }

    // Staff2 Als bezahlt + toast
    await page.context().clearCookies()
    await login(page, STAFF2)
    await page.goto(`${CRM}/rechnungen/${RE_FOREIGN}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const bez = page.getByRole('button', { name: /als bezahlt/i }).first()
    if (await bez.isVisible().catch(() => false)) {
      await bez.click()
      await page.waitForTimeout(1500)
      const toast = await page.locator('[data-sonner-toast], [class*=toast]').first().innerText().catch(() => '')
      body = await page.locator('body').innerText()
      mark(
        'ALTDATEN-B',
        'LEGACY-fremd-AlsBezahlt-Staff2',
        /bezahlt/i.test(toast + body) ? 'ok' : 'warn',
        (toast || 'ok').slice(0, 100)
      )
      const back = page.getByRole('button', { name: /zurücknehmen|unbezahlt/i }).first()
      if (await back.isVisible().catch(() => false)) {
        await back.click()
        await page.waitForTimeout(800)
      } else {
        // leave as bezahlt then revert via SQL
        await sb.from('rechnungen').update({ status: 'gesendet' }).eq('id', RE_FOREIGN)
      }
    } else {
      mark('ALTDATEN-B', 'LEGACY-fremd-AlsBezahlt-Staff2', 'fail', 'Button fehlt')
    }

    // Portal Abnahme-Karte
    await page.context().clearCookies()
    await page.goto(`${WEB}/portal/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    if (await page.locator('input[type=password]').isVisible().catch(() => false)) {
      await page.locator('input[type=email], input[name=email]').first().fill('hv-nord@example.test')
      await page.locator('input[type=password]').fill(PASS)
      await page.getByRole('button', { name: /anmelden|login/i }).first().click()
      await page.waitForTimeout(3500)
    }
    body = await page.locator('body').innerText()
    // search abnahme in portal
    const abnLink = page.getByText(/abnahme/i).first()
    if (await abnLink.isVisible().catch(() => false)) {
      await abnLink.click().catch(() => {})
      await page.waitForTimeout(1200)
      body = await page.locator('body').innerText()
    }
    mark(
      'A-D',
      'A9-Abnahme-Portal',
      /abnahme/i.test(body) ? 'ok' : 'warn',
      /abnahme/i.test(body) ? 'Abnahme-Text im Portal' : body.slice(0, 100).replace(/\n/g, ' ')
    )

    // Partner longer wait
    await page.context().clearCookies()
    await page.goto(`${WEB}/partner`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(800)
    if (await page.locator('input[type=password]').isVisible().catch(() => false)) {
      await page.locator('input[type=email], input[name=email]').first().fill('partner-elektro@example.test')
      await page.locator('input[type=password]').fill(PASS)
      await page.getByRole('button', { name: /anmelden|login/i }).first().click()
    }
    await page.waitForTimeout(8000)
    body = await page.locator('body').innerText()
    mark(
      'R2-3',
      'R-10-Partner',
      /auftrag|vorgang|zuweisung|steckdose|offen/i.test(body) ? 'ok' : 'warn',
      body.slice(0, 120).replace(/\n/g, ' | ')
    )

    // R-04 Notiz + R-06 Mobile quick
    await page.context().clearCookies()
    await login(page, ADMIN)
    await page.goto(`${CRM}/anfragen/${EXISTING}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    const noteTab = page.getByRole('tab', { name: /notiz/i }).first()
    if (await noteTab.isVisible().catch(() => false)) await noteTab.click()
    await page.waitForTimeout(600)
    const ta = page.locator('textarea').first()
    mark('R2-3', 'R-04-Notiz', (await ta.isVisible().catch(() => false)) ? 'ok' : 'warn', 'Notiz-Textarea')

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
    const sw = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    mark(
      'R2-3',
      'R-06-Mobile',
      sw.scrollWidth <= sw.clientWidth + 2 ? 'ok' : 'warn',
      `sw=${sw.scrollWidth} cw=${sw.clientWidth}`
    )
    await page.setViewportSize({ width: 1440, height: 900 })

    // email_log content sample
    const { data: mails } = await sb
      .from('email_log')
      .select('id, typ, betreff, an_email, status, created_at')
      .order('created_at', { ascending: false })
      .limit(12)
    const types = [...new Set((mails || []).map((m) => m.typ))].join(',')
    mark(
      'E2E',
      '.10-email_log',
      (mails?.length ?? 0) > 0 ? 'ok' : 'fail',
      `${mails?.length ?? 0} Einträge · Typen: ${types}`
    )

    // Remaining E2E steps that need full >500 Durchstich
    for (const id of ['.6-Korrektur-Refreeze', '.7-HW-Tausch-BT', '.8-Nachtrag', '.11-Abschlag-Schluss']) {
      mark('E2E', id, 'skip', 'voller >500€ Freigabe-Durchstich nicht in diesem Lauf — Blocker F-176/Zeit')
    }

    // Cleanup new leads
    if (lead?.id) {
      await sb.from('leads').update({ geloescht_am: new Date().toISOString() }).eq('id', lead.id)
      mark('CLEANUP', 'Soft-Delete-Lead', 'ok', lead.id)
    }

    // Ensure RE back to gesendet
    await sb.from('rechnungen').update({ status: 'gesendet' }).eq('id', RE_FOREIGN)
  } catch (e) {
    mark('RUN', 'crash', 'crash', e instanceof Error ? e.message : String(e))
  } finally {
    await browser.close()
    const by = {}
    for (const r of results) by[r.status] = (by[r.status] || 0) + 1
    fs.writeFileSync(OUT, JSON.stringify({ finished_at: new Date().toISOString(), by, results }, null, 2))
    console.log('\n=== abnahme-e2e bilanz ===', by)
    console.log('Wrote', OUT)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
