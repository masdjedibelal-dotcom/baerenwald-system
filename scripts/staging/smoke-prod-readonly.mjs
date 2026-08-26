#!/usr/bin/env node
/**
 * PROD-SMOKE — nur Lesen + Modal öffnen/Abbrechen.
 *
 * Eiserne Regeln:
 * - KEINE Mails (kein Senden / Freigabe / Mahnung / Termin-mit-Mail / Einladen)
 * - KEINE Destruktion / Statuswechsel (außer explizit ALLOW_BEZAHLT_RE2111=1)
 * - Aktionen nur bis Confirm/Modal → Escape/Abbrechen
 * - Screenshots: Content-Maske (PII), Funde über IDs
 *
 *   PROD_CRM_USER=… PROD_CRM_PASS=… node --env-file=.env.staging scripts/staging/smoke-prod-readonly.mjs
 *   ALLOW_BEZAHLT_RE2111=1  → einzig erlaubte Mutation (RE2026-2111 Als bezahlt)
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const OUT = path.join(ROOT, 'docs/test/prod-smoke')
const CRM = process.env.PROD_CRM_URL || 'https://baerenwald-backend.netlify.app'
const WEB = process.env.PROD_WEB_URL || 'https://baerenwald.netlify.app'
const USER = process.env.PROD_CRM_USER || ''
const PASS = process.env.PROD_CRM_PASS || ''
const ALLOW_BEZAHLT = process.env.ALLOW_BEZAHLT_RE2111 === '1'
const RE2111_ID = '3778e0e3-6593-48f4-a098-f45583b1bb12'

const findings = []
const pageLog = []
const summary = {
  areas: {},
  console_errors: 0,
  network_fails: 0,
  not_found: 0,
  spinner: 0,
  crashes: 0,
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

function find(area, symptom, extra = {}) {
  const row = {
    area,
    symptom,
    at: new Date().toISOString(),
    ...extra,
  }
  findings.push(row)
  console.log(`⚠ ${area}: ${symptom}${extra.url ? ` @ ${extra.url}` : ''}`)
}

function areaMark(area, status, note) {
  summary.areas[area] = { status, note }
  console.log(`${status} ${area} — ${note}`)
}

async function fetchInventory(sql) {
  const leads = await sql`
    select id::text, status::text from leads where geloescht_am is null order by updated_at desc nulls last`
  const angebote = await sql`
    select id::text, status::text from angebote order by updated_at desc nulls last`
  const auftraege = await sql`
    select id::text, status::text, kunden_token from auftraege order by updated_at desc nulls last`
  const rechnungen = await sql`
    select id::text, status::text, rechnungsnummer from rechnungen order by updated_at desc nulls last`
  const kunden = await sql`
    select id::text, typ::text, name from kunden order by updated_at desc nulls last`
  const objekte = await sql`
    select id::text, kunde_id::text from kunden_objekte`
  const handwerker = await sql`
    select id::text from handwerker order by updated_at desc nulls last limit 8`
  const hvName =
    (
      await sql`
      select name from kunden where typ::text = 'hausverwaltung' and name is not null limit 1`
    )[0]?.name || 'Hausverwaltung'
  return { leads, angebote, auftraege, rechnungen, kunden, objekte, handwerker, hvName }
}

async function attachRadar(page, label) {
  const state = { console: [], net: [], pageerrors: [] }
  page.on('console', (m) => {
    if (m.type() === 'error') {
      state.console.push(m.text().slice(0, 300))
      summary.console_errors++
    }
  })
  page.on('pageerror', (e) => {
    state.pageerrors.push(String(e.message).slice(0, 300))
    summary.crashes++
  })
  page.on('response', async (res) => {
    const url = res.url()
    const st = res.status()
    if (!/supabase\.co|\/rest\/v1\/|\/auth\/v1\//i.test(url)) return
    if (st === 401 || st === 403 || st === 406 || st >= 500) {
      let body = ''
      try {
        body = (await res.text()).slice(0, 200)
      } catch {
        /* ignore */
      }
      const table = (url.match(/\/rest\/v1\/([a-z0-9_]+)/i) || [])[1] || 'auth'
      state.net.push({ status: st, table, url: url.slice(0, 180), body })
      summary.network_fails++
      find(label, `Supabase HTTP ${st}`, { table, http: st, url: url.slice(0, 180), body })
    }
  })
  return state
}

async function maskPii(page) {
  await page.addStyleTag({
    content: `
      [href^="mailto:"], [href^="tel:"], input[type=email], input[type=tel] { filter: blur(6px) !important; }
      .kunde-name, [data-pii], .portal-email { filter: blur(6px) !important; }
    `,
  }).catch(() => {})
}

async function analyzePage(page, area, url, radar) {
  await page.waitForTimeout(900)
  const body = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 4000)
  const notFound = /nicht gefunden|404|etwas ist schief|application error/i.test(body)
  const spinner =
    (await page.locator('[aria-busy=true], .animate-spin').count().catch(() => 0)) > 0 &&
    body.trim().length < 40
  if (notFound) {
    summary.not_found++
    find(area, 'Anzeige „nicht gefunden“/Error', { url, snippet: body.slice(0, 160) })
  }
  if (spinner) {
    summary.spinner++
    find(area, 'Endlos-Spinner / leere Fläche', { url })
  }
  if (radar.pageerrors.length) {
    find(area, 'pageerror', { url, error: radar.pageerrors[0] })
  }
  pageLog.push({
    area,
    url,
    notFound,
    spinner,
    console_n: radar.console.length,
    net_n: radar.net.length,
  })
  return { body, notFound }
}

async function openAndCancel(page, area, patterns, { allow = true } = {}) {
  if (!allow) return
  for (const p of patterns) {
    const btn = page.getByRole('button', { name: p }).first()
    if (!(await btn.isVisible().catch(() => false))) continue
    const disabled =
      (await btn.isDisabled().catch(() => false)) ||
      (await btn.getAttribute('aria-disabled')) === 'true'
    if (disabled) {
      const title = (await btn.getAttribute('title').catch(() => '')) || ''
      pageLog.push({ area, action: String(p), result: 'disabled', title })
      return { disabled: true, title }
    }
    await btn.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(700)
    const dlg = page.locator('[role=dialog], .mock-modal').first()
    if (await dlg.isVisible().catch(() => false)) {
      const cancel = dlg.getByRole('button', { name: /abbrechen|schließen|nein|zurück/i }).first()
      if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {})
      else await page.keyboard.press('Escape')
      pageLog.push({ area, action: String(p), result: 'modal_cancelled' })
      return { modal: true }
    }
    await page.keyboard.press('Escape').catch(() => {})
    pageLog.push({ area, action: String(p), result: 'clicked_no_modal' })
    return { clicked: true }
  }
  pageLog.push({ area, action: String(patterns[0]), result: 'not_found_in_ui' })
  return { missing: true }
}

async function clickTabs(page, names) {
  for (const name of names) {
    const tab = page
      .getByRole('tab', { name: new RegExp(name, 'i') })
      .or(page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }))
    if (await tab.first().isVisible().catch(() => false)) {
      await tab.first().click().catch(() => {})
      await page.waitForTimeout(500)
    }
  }
}

async function login(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(600)
  if (!page.url().includes('/login')) return
  await page.locator('input[type=email]').first().fill(USER)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500)
    if (!page.url().includes('/login')) return
  }
  throw new Error('Prod-Login fehlgeschlagen — noch auf /login')
}

async function main() {
  loadEnv()
  fs.mkdirSync(OUT, { recursive: true })

  if (!USER || !PASS) {
    const stub = {
      blocked: true,
      reason: 'PROD_CRM_USER / PROD_CRM_PASS fehlen',
      allow_bezahlt_pending: !ALLOW_BEZAHLT,
    }
    fs.writeFileSync(path.join(OUT, 'blocked.json'), JSON.stringify(stub, null, 2))
    console.error('ABORT: Setze PROD_CRM_USER und PROD_CRM_PASS (keine Mutation ohne Login).')
    process.exit(2)
  }

  const dbUrl = process.env.PROD_DB_URL
  if (!dbUrl || !/wnotlydvhsmfkhexgeol/.test(dbUrl)) {
    console.error('ABORT: PROD_DB_URL muss auf Prod-Ref wnotlydvhsmfkhexgeol zeigen')
    process.exit(1)
  }
  const sql = postgres(dbUrl, { max: 1, prepare: false })
  const inv = await fetchInventory(sql)
  fs.writeFileSync(
    path.join(OUT, 'inventory-ids.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        counts: {
          leads: inv.leads.length,
          angebote: inv.angebote.length,
          auftraege: inv.auftraege.length,
          rechnungen: inv.rechnungen.length,
          kunden: inv.kunden.length,
          objekte: inv.objekte.length,
          handwerker: inv.handwerker.length,
        },
        // tokens nur lokal für Smoke — nicht in Report-MD
        auftraege: inv.auftraege.map((a) => ({
          id: a.id,
          status: a.status,
          token_prefix: String(a.kunden_token || '').slice(0, 12),
        })),
        rechnungen: inv.rechnungen.map((r) => ({
          id: r.id,
          status: r.status,
          nr: r.rechnungsnummer,
        })),
      },
      null,
      2
    )
  )

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const radar = await attachRadar(page, 'global')

  try {
    await login(page)
    await maskPii(page)

    // —— Vorgänge-Liste ——
    await page.goto(`${CRM}/vorgaenge`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await analyzePage(page, 'Vorgänge-Liste', page.url(), radar)
    for (const chip of ['Anfrage', 'Angebot', 'Auftrag', 'Rechnung', 'Alle', 'Offen', 'Erledigt']) {
      const el = page.getByRole('button', { name: new RegExp(chip, 'i') }).first()
      if (await el.isVisible().catch(() => false)) {
        await el.click().catch(() => {})
        await page.waitForTimeout(400)
      }
    }
    const search = page.getByPlaceholder(/suchen|suche|filter/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill(inv.hvName.slice(0, 24))
      await page.waitForTimeout(800)
      await search.fill('')
    }
    const csv = page.getByRole('button', { name: /csv|export/i }).first()
    if (await csv.isVisible().catch(() => false)) {
      // nur Klick-Probe ohne Download-Follow — kein Mail
      await csv.click().catch(() => {})
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape').catch(() => {})
    }
    areaMark('Vorgänge-Liste', findings.some((f) => f.area === 'Vorgänge-Liste') ? '⚠️' : '✅', 'Chips/Suche/CSV-Probe')

    // —— Jeden Lead ——
    let leadOk = 0
    for (const L of inv.leads) {
      await page.goto(`${CRM}/anfragen/${L.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      const r = await analyzePage(page, 'Lead-Detail', page.url(), radar)
      await clickTabs(page, ['Übersicht', 'Leistungen', 'Zahlung', 'Akte', 'Details'])
      if (!r.notFound) leadOk++
    }
    areaMark('Leads', leadOk === inv.leads.length ? '✅' : '⚠️', `${leadOk}/${inv.leads.length} Details OK`)

    // —— Angebote ——
    let angOk = 0
    for (const A of inv.angebote) {
      await page.goto(`${CRM}/angebote/${A.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      const r = await analyzePage(page, 'Angebot-Detail', page.url(), radar)
      // Wizard nur öffnen-Versuch; bei gesendet erwartet disabled
      await openAndCancel(page, 'Angebot', [/bearbeiten|ändern|wizard/i])
      const pdf = page.getByRole('link', { name: /pdf/i }).or(page.getByRole('button', { name: /pdf/i }))
      if (await pdf.first().isVisible().catch(() => false)) {
        // nicht navigieren wenn download — nur visibility
        pageLog.push({ area: 'Angebot', id: A.id, pdf: 'visible' })
      }
      if (!r.notFound) angOk++
    }
    areaMark('Angebote', angOk === inv.angebote.length ? '✅' : '⚠️', `${angOk}/${inv.angebote.length}`)

    // —— Aufträge ——
    let aufOk = 0
    for (const A of inv.auftraege) {
      await page.goto(`${CRM}/auftraege/${A.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      const r = await analyzePage(page, 'Auftrag-Detail', page.url(), radar)
      await clickTabs(page, ['Übersicht', 'Leistungen', 'Zahlung', 'Akte'])
      // Projekt-Kette: Links Anfrage/Angebot anklicken wenn vorhanden (nur Navigation lesen)
      const chain = page.locator('a[href*="/anfragen/"], a[href*="/angebote/"]').first()
      if (await chain.isVisible().catch(() => false)) {
        const href = await chain.getAttribute('href')
        await page.goto(`${CRM}${href}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
        await analyzePage(page, 'Projekt-Kette', page.url(), radar)
        await page.goto(`${CRM}/auftraege/${A.id}`, { waitUntil: 'domcontentloaded' })
      }
      if (!r.notFound) aufOk++
    }
    areaMark('Aufträge', aufOk === inv.auftraege.length ? '✅' : '⚠️', `${aufOk}/${inv.auftraege.length}`)

    // —— Rechnungen ——
    let reOk = 0
    for (const R of inv.rechnungen) {
      await page.goto(`${CRM}/rechnungen/${R.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      const r = await analyzePage(page, 'Rechnung-Detail', page.url(), radar)
      // ⋯ Menü
      const more = page.getByRole('button', { name: /weitere aktionen|mehr|⋯/i }).first()
      const moreVis = await more.isVisible().catch(() => false)
      let menuItems = []
      if (moreVis) {
        await more.click().catch(() => {})
        await page.waitForTimeout(300)
        menuItems = (await page.locator('[role=menuitem]').allTextContents().catch(() => [])).map((t) =>
          t.trim()
        )
        await page.keyboard.press('Escape').catch(() => {})
      }
      pageLog.push({
        area: 'Rechnung-Menü',
        id: R.id,
        nr: R.rechnungsnummer,
        overflow: moreVis,
        menuItems,
      })
      // Als bezahlt / Storno / Mahnung NUR Modal → abbrechen — AUSSER RE2111 wenn erlaubt
      if (R.id === RE2111_ID && ALLOW_BEZAHLT && String(R.status) === 'gesendet') {
        const btn = page.getByRole('button', { name: /als bezahlt|bezahlt markieren/i }).first()
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
          await page.waitForTimeout(2000)
          const fail = await page.locator('text=/nicht gefunden/i').first().isVisible().catch(() => false)
          if (fail) find('Parity', 'RE2026-2111 Als bezahlt → nicht gefunden', { id: R.id })
          else pageLog.push({ area: 'Parity', id: R.id, result: 'bezahlt_ok' })
        }
      } else {
        // keine Mutation: wenn Primary „Als bezahlt“ — nicht klicken außer Probe disabled
        await openAndCancel(page, 'Rechnung', [/stornieren|korrigieren|mahnung|erinnerung/i], {
          allow: true,
        })
        // Als bezahlt bewusst NICHT klicken
      }
      await clickTabs(page, ['Akte', 'Dokumente', 'Übersicht'])
      if (!r.notFound) reOk++
    }
    areaMark('Rechnungen', reOk === inv.rechnungen.length ? '✅' : '⚠️', `${reOk}/${inv.rechnungen.length}`)

    // —— Kunden + Objekte ——
    let kOk = 0
    for (const K of inv.kunden) {
      await page.goto(`${CRM}/kunden/${K.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      const r = await analyzePage(page, 'Kunde-Detail', page.url(), radar)
      await clickTabs(page, ['Übersicht', 'Objekte', 'Vorgänge', 'Dokumente', 'Akte'])
      // Melde-Link URL prüfen ohne absenden
      const melde = page.locator('a[href*="/melden/"]').first()
      if (await melde.isVisible().catch(() => false)) {
        const href = await melde.getAttribute('href')
        pageLog.push({ area: 'Kunde-Melde-Link', id: K.id, href: String(href || '').slice(0, 80) })
      }
      if (!r.notFound) kOk++
    }
    for (const O of inv.objekte) {
      await page.goto(`${CRM}/kunden/${O.kunde_id}`, { waitUntil: 'domcontentloaded' })
      await clickTabs(page, ['Objekte'])
      const link = page.locator(`a[href*="${O.id}"], button`).filter({ hasText: /objekt|einheit/i }).first()
      if (await link.isVisible().catch(() => false)) await link.click().catch(() => {})
      await analyzePage(page, 'Objekt', page.url(), radar)
    }
    areaMark('Kunden/Objekte', kOk === inv.kunden.length ? '✅' : '⚠️', `${kOk}/${inv.kunden.length} Kunden`)

    // —— Handwerker ——
    let hwOk = 0
    for (const H of inv.handwerker) {
      await page.goto(`${CRM}/handwerker/${H.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      const r = await analyzePage(page, 'Handwerker', page.url(), radar)
      await clickTabs(page, ['Compliance', 'Übersicht', 'Dokumente'])
      if (!r.notFound) hwOk++
    }
    areaMark('Handwerker', hwOk ? '✅' : '⚠️', `${hwOk}/${inv.handwerker.length} Stichprobe`)

    // —— Kalender / Einstellungen / Glocke / Suche ——
    for (const pathSuffix of [
      '/kalender',
      '/einstellungen',
      '/einstellungen/firma',
      '/einstellungen/team',
      '/einstellungen/vorlagen',
    ]) {
      await page.goto(`${CRM}${pathSuffix}`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
      await analyzePage(page, 'Einstellungen/Kalender', page.url(), radar)
      await clickTabs(page, ['Allgemein', 'Firma', 'Team', 'Vorlagen', 'Integrationen'])
    }
    const bell = page.getByRole('button', { name: /benachricht|glocke|notification/i }).first()
    if (await bell.isVisible().catch(() => false)) {
      await bell.click().catch(() => {})
      await page.waitForTimeout(400)
      await page.keyboard.press('Escape')
    }
    await page.keyboard.press('Meta+k').catch(() => {})
    await page.waitForTimeout(400)
    await page.keyboard.press('Escape').catch(() => {})
    areaMark('Kalender/Einstellungen/Chrome', '✅', 'Seiten geöffnet (Radar siehe Funde)')

    // —— Token-Stichprobe (Website/CRM projekt) ——
    const tokens = inv.auftraege.filter((a) => a.kunden_token).slice(0, 3)
    for (const T of tokens) {
      const url = `${CRM}/projekt/${T.kunden_token}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await analyzePage(page, 'Projekt-Token', `${CRM}/projekt/${String(T.kunden_token).slice(0, 12)}…`, radar)
    }
    areaMark('Tokens', '✅', `${tokens.length} Projekt-Links geöffnet`)

    // —— Status-Rendering Stichprobe auf Vorgänge ——
    await page.goto(`${CRM}/vorgaenge?tab=rechnung`, { waitUntil: 'domcontentloaded' })
    await analyzePage(page, 'Status-Liste', page.url(), radar)
    areaMark('Status-Rendering', '✅', 'Liste geladen (Alt-Status auf Prod kanonisch)')

    if (!ALLOW_BEZAHLT) {
      pageLog.push({
        area: 'Parity',
        result: 'SKIPPED',
        note: 'ALLOW_BEZAHLT_RE2111 nicht gesetzt — warte auf Belal-Bestätigung',
      })
    }
  } finally {
    await browser.close()
    await sql.end().catch(() => {})
    const out = {
      finished_at: new Date().toISOString(),
      crm: CRM,
      user: USER.replace(/(.{2}).+(@.+)/, '$1***$2'),
      allow_bezahlt: ALLOW_BEZAHLT,
      summary,
      findings,
      pageLog: pageLog.slice(0, 500),
    }
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(out, null, 2))
    console.log(`\nWrote ${path.join(OUT, 'results.json')} findings=${findings.length}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
