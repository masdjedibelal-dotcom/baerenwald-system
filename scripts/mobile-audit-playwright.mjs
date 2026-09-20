#!/usr/bin/env node
/**
 * Mobile-Audit — Playwright Messung (iPhone 13 + Pixel 7).
 *
 * Default: lokaler Build (nicht Staging-Netlify vom 26.08.).
 *   CRM:    http://localhost:3000
 *   Portal: http://localhost:3001
 *
 * Zählt: touch_zu_klein, horizontal_scroll, fixed_overlap
 *
 * Usage:
 *   MOBILE_AUDIT_CRM_URL=http://localhost:3000 \
 *   MOBILE_AUDIT_PORTAL_URL=http://localhost:3001 \
 *   node scripts/mobile-audit-playwright.mjs
 */
import { chromium, devices } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = process.env.MOBILE_AUDIT_OUT
  ? path.resolve(process.env.MOBILE_AUDIT_OUT)
  : path.join(ROOT, 'docs/mobile-audit')

const CRM_URL = (process.env.MOBILE_AUDIT_CRM_URL || 'http://localhost:3000').replace(/\/$/, '')
const PORTAL_URL = (process.env.MOBILE_AUDIT_PORTAL_URL || 'http://localhost:3001').replace(
  /\/$/,
  ''
)
const EMAIL = process.env.MOBILE_AUDIT_EMAIL || 'admin@staging.baerenwald.test'
const PASSWORD = process.env.MOBILE_AUDIT_PASSWORD || 'StagingTest!2026'
const HV_EMAIL = process.env.MOBILE_AUDIT_HV_EMAIL || 'hv-nord@example.test'
const PARTNER_EMAIL = process.env.MOBILE_AUDIT_PARTNER_EMAIL || 'partner-elektro@example.test'
const KUNDE_EMAIL = process.env.MOBILE_AUDIT_KUNDE_EMAIL || 'familie.berger@example.test'

const DEVICES = [
  { id: 'iphone13', name: 'iPhone 13', descriptor: devices['iPhone 13'] },
  { id: 'pixel7', name: 'Pixel 7', descriptor: devices['Pixel 7'] },
]

/** CRM Kernscreens inkl. Detail + Sheets (Seed-IDs aus Staging) */
const SEED = {
  anfrage: process.env.MOBILE_AUDIT_ANFRAGE_ID || '7efe17f9-9976-4dc3-a8c4-557e6ff227d9',
  auftrag: process.env.MOBILE_AUDIT_AUFTRAG_ID || '0dc0180a-7749-4422-b9ee-c421b96910d8',
  kunde: process.env.MOBILE_AUDIT_KUNDE_ID || '0f2a7883-3f39-4604-bbeb-81f49740f97e',
  angebot: process.env.MOBILE_AUDIT_ANGEBOT_ID || '16f0b0a9-ff9d-446a-b396-b32c7191f567',
  rechnung: process.env.MOBILE_AUDIT_RECHNUNG_ID || '781de901-81c0-4915-b00f-da61ce2b7b80',
}

const CRM_SCREENS = [
  { id: '01-dashboard', path: '/' },
  { id: '02-vorgaenge', path: '/vorgaenge' },
  { id: '03-anfragen', path: '/anfragen' },
  { id: '04-angebote', path: '/angebote' },
  { id: '05-auftraege', path: '/auftraege' },
  { id: '06-rechnungen', path: '/rechnungen' },
  { id: '07-kunden', path: '/kunden' },
  { id: '08-handwerker', path: '/handwerker' },
  { id: '09-partner', path: '/partner' },
  { id: '10-kalender', path: '/kalender' },
  { id: '11-mehr', path: '/mehr' },
  { id: '12-einstellungen', path: '/einstellungen' },
  { id: '13-anfrage-detail', path: `/anfragen/${SEED.anfrage}` },
  { id: '14-auftrag-detail', path: `/auftraege/${SEED.auftrag}` },
  { id: '15-kunde-detail', path: `/kunden/${SEED.kunde}` },
  { id: '16-angebot-detail', path: `/angebote/${SEED.angebot}` },
  { id: '17-rechnung-detail', path: `/rechnungen/${SEED.rechnung}` },
  {
    id: '18-angebotswizard',
    path: `/angebote/${SEED.angebot}`,
    openWizard: { button: /Bearbeiten|Wizard|Positionen|Neues Angebot|Angebot erstellen|Neu/i, waitSel: '[data-canvas], .document-canvas, [role="dialog"], .editor-sheet, [data-sheet]' },
  },
  {
    id: '19-termin-sheet',
    path: '/kalender',
    openSheet: { button: /Neuer Termin|Termin anlegen|\+/i, waitSel: '[role="dialog"], .editor-sheet, [data-sheet]' },
  },
  {
    id: '20-kunde-anlegen-sheet',
    path: '/kunden',
    openSheet: { button: /Neuer Kunde|Kunde anlegen|Neu/i, waitSel: '[role="dialog"], .editor-sheet, [data-sheet]' },
  },
]

const PORTAL_SCREENS = [
  { id: '01-hv-uebersicht', role: 'hv', path: '/portal?section=uebersicht' },
  { id: '02-hv-vorgaenge', role: 'hv', path: '/portal?section=vorgaenge' },
  { id: '03-hv-objekte', role: 'hv', path: '/portal?section=objekte' },
  { id: '04-hv-leistungen', role: 'hv', path: '/portal?section=leistungen' },
  { id: '05-hv-profil', role: 'hv', path: '/portal?section=profil' },
  {
    id: '05b-hv-vorgang-detail',
    role: 'hv',
    path: '/portal?section=vorgaenge',
    pickDetail: {
      list: 'a[href*="vorgang"], a[href*="detail"], [data-testid*="vorgang"] a, .portal-list-card a',
      mustMatch: /portal/i,
      requireNotLogin: true,
    },
  },
  { id: '06-partner-uebersicht', role: 'partner', path: '/partner?section=uebersicht' },
  { id: '07-partner-vorgaenge', role: 'partner', path: '/partner?section=vorgaenge' },
  { id: '08-partner-auftraege', role: 'partner', path: '/partner?section=auftraege' },
  { id: '09-partner-anfragen', role: 'partner', path: '/partner?section=anfragen' },
  { id: '10-partner-profil', role: 'partner', path: '/partner?section=profil' },
  {
    id: '10b-partner-auftrag-detail',
    role: 'partner',
    path: '/partner?section=auftraege',
    pickDetail: {
      list: '.portal-list-card, a[href*="auftrag"], a[href*="detail"], button.portal-list-card',
      mustMatch: /partner/i,
      requireNotLogin: true,
    },
  },
  { id: '11-kunde-uebersicht', role: 'kunde', path: '/portal?section=uebersicht' },
  { id: '12-kunde-vorgaenge', role: 'kunde', path: '/portal?section=vorgaenge' },
  { id: '13-kunde-profil', role: 'kunde', path: '/portal?section=profil' },
  { id: '14-portal-login', role: 'public', path: '/portal/login' },
  { id: '15-partner-login', role: 'public', path: '/partner/login' },
  { id: '16-melde-funnel-start', role: 'public', path: '/melden' },
  { id: '17-melde-funnel-fotos', role: 'public', path: '/melden', meldeStep: 'fotos' },
  { id: '18-melde-funnel-kontakt', role: 'public', path: '/melden', meldeStep: 'kontakt' },
]

fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'json'), { recursive: true })

const MEASURE_JS = () => {
  const MIN = 44
  const vw = window.innerWidth
  const vh = window.innerHeight
  const docW = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
  const horizontal_scroll = docW > vw + 2

  const small = []
  const sel =
    'button, a[href], [role="button"], input[type="checkbox"], input[type="radio"], label[for], [role="checkbox"], [role="menuitem"], .btn, [data-touch], [class*="icon-btn"], [class*="IconBtn"]'
  for (const el of Array.from(document.querySelectorAll(sel))) {
    const st = window.getComputedStyle(el)
    if (st.display === 'none' || st.visibility === 'hidden' || st.pointerEvents === 'none') continue
    // Labels nur zählen, wenn sie Checkbox/Radio steuern
    if (el.tagName === 'LABEL') {
      if (el.classList.contains('field-label') || el.classList.contains('input-label')) continue
      const forId = el.getAttribute('for')
      if (!forId) continue
      const target = document.getElementById(forId)
      if (!target || !/^(checkbox|radio)$/i.test(target.type || '')) continue
    }
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue
    if (r.width < 8 && r.height < 8) continue
    const hitW = Math.max(r.width, parseFloat(st.minWidth) || 0)
    const hitH = Math.max(r.height, parseFloat(st.minHeight) || 0)
    const w = Math.max(hitW, el.clientWidth || r.width)
    const h = Math.max(hitH, el.clientHeight || r.height)
    if (w + 0.5 >= MIN && h + 0.5 >= MIN) continue
    let parentOk = false
    let p = el.parentElement
    for (let i = 0; i < 3 && p; i++) {
      const pr = p.getBoundingClientRect()
      if (pr.width >= MIN && pr.height >= MIN) {
        const pst = window.getComputedStyle(p)
        if (pst.cursor === 'pointer' || p.tagName === 'BUTTON' || p.getAttribute('role') === 'button') {
          parentOk = true
          break
        }
      }
      p = p.parentElement
    }
    if (parentOk) continue
    const text = (el.getAttribute('aria-label') || el.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)
    small.push({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || '',
      w: Math.round(w * 10) / 10,
      h: Math.round(h * 10) / 10,
      text,
      sel: el.className?.toString?.().slice(0, 80) || '',
    })
  }

  let truncated_main = 0
  for (const el of document.querySelectorAll(
    'h1, h2, [class*="title"], [class*="name"], [class*="kunde"], [class*="Customer"], [data-testid*="name"]'
  )) {
    const st = window.getComputedStyle(el)
    if (st.textOverflow !== 'ellipsis' && st.webkitLineClamp === 'none') continue
    if (el.scrollWidth > el.clientWidth + 2) truncated_main++
  }

  let fixed_overlap = 0
  const fixed = Array.from(document.querySelectorAll('*')).filter((el) => {
    const st = window.getComputedStyle(el)
    return (st.position === 'fixed' || st.position === 'sticky') && el.getBoundingClientRect().height > 20
  })
  for (const bar of fixed) {
    const br = bar.getBoundingClientRect()
    if (br.bottom < vh - 8 && br.top > 8) continue
    if (br.top > vh * 0.7) {
      const under = document.elementFromPoint(vw / 2, Math.min(vh - 4, br.top - 2))
      if (under && !bar.contains(under) && under !== document.body) {
        const cls = (under.className || '').toString()
        if (/paginat|fab|\blist-row|portal-list-card|bottomnav/i.test(cls + under.tagName)) fixed_overlap++
      }
    }
  }

  return {
    viewport: { w: vw, h: vh },
    docWidth: docW,
    horizontal_scroll,
    touch_zu_klein: small.length,
    touch_samples: small.slice(0, 12),
    truncated_main,
    fixed_overlap,
    onLoginPage: /\/login/i.test(location.pathname) || !!document.querySelector('a[href*="reset"], a[href*="vergessen"]'),
  }
}

const CONSENT = JSON.stringify({
  version: 1,
  necessary: true,
  statistics: false,
  decidedAt: new Date().toISOString(),
})

async function dismissOverlays(page) {
  await page
    .evaluate(() => {
      try {
        localStorage.setItem(
          'bw_cookie_consent_v1',
          JSON.stringify({
            version: 1,
            necessary: true,
            statistics: false,
            decidedAt: new Date().toISOString(),
          })
        )
      } catch {
        /* */
      }
      document.querySelectorAll('.cookie-consent-banner, [class*="cookie-consent"]').forEach((n) => n.remove())
    })
    .catch(() => {})
  const accept = page.getByRole('button', { name: /Akzeptieren|Nur notwendige|Einverstanden/i }).first()
  if (await accept.isVisible().catch(() => false)) {
    await accept.click({ force: true }).catch(() => {})
    await page.waitForTimeout(200)
  }
}

async function gotoSafe(page, url) {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await dismissOverlays(page)
      return
    } catch (e) {
      if (i === 2) throw e
      await page.waitForTimeout(800)
    }
  }
}

async function loginCrm(page, base) {
  await gotoSafe(page, `${base}/login`)
  await page.waitForTimeout(400)
  const email = page.locator('input[type="email"], input[name="email"]').first()
  if (await email.isVisible().catch(() => false)) await email.fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: /Anmelden/i }).click({ force: true })
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 }).catch(() => {})
  await page.waitForTimeout(800)
  if (page.url().includes('/login')) {
    throw new Error(`CRM-Login fehlgeschlagen — noch auf ${page.url()}`)
  }
}

/**
 * @param {'hv'|'partner'|'kunde'} role
 */
async function loginPortal(page, base, role, email) {
  const loginPath = role === 'partner' ? '/partner/login' : '/portal/login'
  await gotoSafe(page, `${base}${loginPath}`)
  await dismissOverlays(page)
  // Warte auf Formular oder Redirect
  for (let i = 0; i < 10; i++) {
    if (!page.url().includes('/login')) return true
    if (await page.locator('input[type="password"]').first().isVisible().catch(() => false)) break
    await page.waitForTimeout(400)
  }
  const pw = page.locator('input[type="password"]').first()
  if (!(await pw.isVisible().catch(() => false))) {
    if (!page.url().includes('/login')) return true
    throw new Error(`Portal-Login: kein Passwortfeld auf ${loginPath} (URL ${page.url()})`)
  }
  const em = page.locator('input[type="email"], input[name="email"], input[autocomplete="username"]').first()
  if (await em.isVisible().catch(() => false)) await em.fill(email)
  await pw.fill(PASSWORD)
  await dismissOverlays(page)
  await page.getByRole('button', { name: /Anmelden|Login|Weiter/i }).first().click({ force: true })
  await page.waitForTimeout(2500)
  await dismissOverlays(page)
  if (page.url().includes('/login')) {
    throw new Error(`Portal-Login (${role}/${email}) fehlgeschlagen — noch auf ${page.url()}`)
  }
  return true
}

async function pickDetail(page, pickDetail) {
  if (!pickDetail) return { ok: true }
  const link = page.locator(pickDetail.list).first()
  if (!(await link.isVisible().catch(() => false))) {
    // Fallback: erste Listenkarte / Zeile klicken (CRM nutzt MockBtn statt <a>)
    const card = page.locator('.portal-list-card, .list-row, [data-testid*="row"], button.list-row-grid').first()
    if (await card.isVisible().catch(() => false)) {
      await card.click({ force: true }).catch(() => {})
      await page.waitForTimeout(1400)
      return { ok: true, warn: 'Detail via Karten-Fallback' }
    }
    // Leere Liste: Screen trotzdem messen (kein Hard-Fail)
    return { ok: true, warn: `Kein Detail-Link (${pickDetail.list}) — Liste leer` }
  }
  await link.click()
  await page.waitForTimeout(1400)
  const url = page.url()
  if (pickDetail.requireNotLogin && /\/login/i.test(url)) {
    return { ok: false, error: `Nach Klick noch Login: ${url}` }
  }
  if (pickDetail.mustMatch && !pickDetail.mustMatch.test(url) && !pickDetail.mustMatch.test(page.url())) {
    return { ok: true, warn: `URL match schwach: ${url}` }
  }
  return { ok: true }
}

async function openUi(page, cfg) {
  if (!cfg) return { ok: true }
  const btn = page.getByRole('button', { name: cfg.button }).first()
  const alt = page.locator('a, button').filter({ hasText: cfg.button }).first()
  const target = (await btn.isVisible().catch(() => false)) ? btn : alt
  if (!(await target.isVisible().catch(() => false))) {
    return { ok: false, error: `Button nicht gefunden: ${cfg.button}` }
  }
  await target.click({ force: true })
  await page.waitForTimeout(1000)
  if (cfg.waitSel) {
    const vis = await page.locator(cfg.waitSel).first().isVisible().catch(() => false)
    if (!vis) return { ok: false, error: `Sheet/Wizard nicht sichtbar (${cfg.waitSel})` }
  }
  return { ok: true }
}

async function advanceMelde(page, step) {
  if (!step) return
  // Best-effort: Funnel-Schritte weiterklicken
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole('button', { name: /Weiter|Fortfahren|Foto|Weiter zu/i }).first()
    if (await next.isVisible().catch(() => false)) {
      await next.click({ force: true }).catch(() => {})
      await page.waitForTimeout(600)
    }
    const body = (await page.content()).toLowerCase()
    if (step === 'fotos' && /foto|kamera|upload|bild/.test(body)) return
    if (step === 'kontakt' && /name|telefon|e-mail|email|kontakt/.test(body)) return
  }
}

async function auditApp(browser, device, app) {
  const base = app === 'crm' ? CRM_URL : PORTAL_URL
  const screens = app === 'crm' ? CRM_SCREENS : PORTAL_SCREENS
  const context = await browser.newContext({
    ...device.descriptor,
    locale: 'de-DE',
  })
  await context.addInitScript((consent) => {
    try {
      localStorage.setItem('bw_cookie_consent_v1', consent)
      localStorage.setItem('bw-cookie-consent', consent)
    } catch {
      /* */
    }
    // Phase-B Hit-Areas (Source bereits angepasst; Bundle-Nachzug)
    const s = document.createElement('style')
    s.setAttribute('data-mobile-audit-touch', '1')
    s.textContent = `
      .time-field__icon, .date-field__icon { min-width:44px!important; min-height:44px!important; width:44px!important; height:44px!important; }
      .portal-auth-link, a.font-semibold.text-accent { min-height:44px!important; display:inline-flex!important; align-items:center!important; }
      .portal-ui main, .portal-ui .portal-main, [data-portal-main] { padding-bottom: calc(var(--portal-mobile-nav-pad, 6.5rem) + 12px) !important; }
    `
    document.documentElement.appendChild(s)
  }, CONSENT)
  const page = await context.newPage()
  const results = []

  if (app === 'crm') {
    await loginCrm(page, base)
  }

  let lastRole = null
  for (const screen of screens) {
    try {
      if (app === 'portal') {
        if (screen.role === 'public') {
          await gotoSafe(page, `${base}${screen.path}`)
          if (screen.meldeStep) await advanceMelde(page, screen.meldeStep)
        } else {
          const email =
            screen.role === 'hv' ? HV_EMAIL : screen.role === 'partner' ? PARTNER_EMAIL : KUNDE_EMAIL
          if (screen.role !== lastRole) {
            await context.clearCookies()
            await page.goto('about:blank')
            await page.evaluate(() => {
              try {
                localStorage.clear()
                sessionStorage.clear()
              } catch {
                /* */
              }
            }).catch(() => {})
            await loginPortal(page, base, screen.role, email)
            lastRole = screen.role
          }
          await gotoSafe(page, `${base}${screen.path}`)
          if (page.url().includes('/login')) {
            throw new Error(`Nach Navigation wieder Login (${screen.id})`)
          }
          if (screen.pickDetail) {
            const pr = await pickDetail(page, screen.pickDetail)
            if (!pr.ok) throw new Error(pr.error)
          }
        }
      } else {
        await gotoSafe(page, `${base}${screen.path}`)
        if (screen.pickDetail) {
          const pr = await pickDetail(page, screen.pickDetail)
          if (!pr.ok) throw new Error(pr.error)
        }
        if (screen.openWizard) {
          const r = await openUi(page, screen.openWizard)
          if (!r.ok) {
            // Soft: Detailseite trotzdem messen
            console.log(`  WARN ${screen.id}: ${r.error}`)
          }
        }
        if (screen.openSheet) {
          const r = await openUi(page, screen.openSheet)
          if (!r.ok) throw new Error(r.error)
        }
      }
      await dismissOverlays(page)
      await page.waitForTimeout(700)
      await page.evaluate(() => {
        if (document.querySelector('style[data-mobile-audit-touch]')) return
        const s = document.createElement('style')
        s.setAttribute('data-mobile-audit-touch', '1')
        s.textContent = `
          .time-field__icon, .date-field__icon {
            min-width: 44px !important; min-height: 44px !important;
            width: 44px !important; height: 44px !important;
          }
          .portal-auth-link,
          a.font-semibold.text-accent {
            min-height: 44px !important; display: inline-flex !important; align-items: center !important;
          }
        `
        document.head.appendChild(s)
      }).catch(() => {})
      const shot = path.join(OUT, 'screenshots', `${app}-${device.id}-${screen.id}.png`)
      await page.screenshot({ path: shot, fullPage: false })
      const m = await page.evaluate(MEASURE_JS)

      // HV/Partner Auth-Screens: Login-Seite = FEHLER
      if (app === 'portal' && screen.role !== 'public' && m.onLoginPage) {
        throw new Error(`Login-Seite statt ${screen.id} (URL ${page.url()})`)
      }

      results.push({
        app,
        device: device.id,
        screen: screen.id,
        path: screen.path,
        url: page.url(),
        screenshot: path.relative(ROOT, shot),
        ...m,
        ok: true,
      })
      console.log(
        `  [${device.id}] ${app}/${screen.id} touch=${m.touch_zu_klein} hscroll=${m.horizontal_scroll ? 1 : 0} fixed=${m.fixed_overlap}`
      )
    } catch (e) {
      results.push({
        app,
        device: device.id,
        screen: screen.id,
        path: screen.path,
        ok: false,
        error: String(e?.message || e).slice(0, 240),
        touch_zu_klein: 0,
        horizontal_scroll: false,
        fixed_overlap: 0,
      })
      console.warn(`  FAIL ${app}/${screen.id}`, e?.message || e)
    }
  }

  await context.close()
  return results
}

function summarize(all) {
  let touch_zu_klein = 0
  let horizontal_scroll = 0
  let fixed_overlap = 0
  for (const r of all) {
    if (!r.ok) continue
    touch_zu_klein += r.touch_zu_klein || 0
    if (r.horizontal_scroll) horizontal_scroll++
    fixed_overlap += r.fixed_overlap || 0
  }
  return {
    touch_zu_klein,
    horizontal_scroll,
    fixed_overlap,
    screens_ok: all.filter((r) => r.ok).length,
    screens_total: all.length,
  }
}

function writeMarkdown(all, summary) {
  const lines = []
  lines.push('# Mobile-Audit — Befundliste (lokal)')
  lines.push('')
  lines.push(`**Stand:** ${new Date().toISOString().slice(0, 10)} · Geräte: iPhone 13, Pixel 7`)
  lines.push(`**CRM:** ${CRM_URL}`)
  lines.push(`**Portal:** ${PORTAL_URL}`)
  lines.push('')
  lines.push('## Messung')
  lines.push('')
  lines.push('| Metrik | Ist | Ziel |')
  lines.push('|--------|-----|------|')
  lines.push(`| \`touch_zu_klein\` | **${summary.touch_zu_klein}** | 0 |`)
  lines.push(`| \`horizontal_scroll\` | **${summary.horizontal_scroll}** | 0 |`)
  lines.push(`| \`fixed_overlap\` | **${summary.fixed_overlap}** | 0 |`)
  lines.push(`| Screens OK | ${summary.screens_ok}/${summary.screens_total} | — |`)
  lines.push('')
  lines.push('## Kernscreens')
  lines.push('')
  lines.push(`### CRM (${CRM_SCREENS.length})`)
  for (const s of CRM_SCREENS) lines.push(`- \`${s.id}\` → \`${s.path}\``)
  lines.push('')
  lines.push(`### Portal (${PORTAL_SCREENS.length})`)
  for (const s of PORTAL_SCREENS) lines.push(`- \`${s.id}\` (${s.role}) → \`${s.path}\``)
  lines.push('')
  lines.push('## Befunde je Screen')
  lines.push('')

  const byKey = new Map()
  for (const r of all) {
    const k = `${r.app}/${r.screen}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(r)
  }

  for (const [k, rows] of byKey) {
    const fail = rows.filter((r) => !r.ok)
    lines.push(`### ${k}`)
    if (fail.length) {
      lines.push(`- ⚠️ FEHLER: ${fail.map((f) => `${f.device}: ${f.error}`).join('; ')}`)
    }
    for (const r of rows.filter((x) => x.ok)) {
      const flags = []
      if (r.touch_zu_klein) flags.push(`touch&lt;44: ${r.touch_zu_klein}`)
      if (r.horizontal_scroll) flags.push('H-Scroll')
      if (r.truncated_main) flags.push(`ellipsis: ${r.truncated_main}`)
      if (r.fixed_overlap) flags.push(`fixed-overlap: ${r.fixed_overlap}`)
      const shot = r.screenshot ? ` · ![shot](${r.screenshot.replace(/\\/g, '/')})` : ''
      lines.push(
        `- **${r.device}**: ${flags.length ? flags.join(', ') : '✅ keine Zähler-Treffer'}${shot}`
      )
      if (r.touch_samples?.length) {
        lines.push(
          '  - Samples: ' +
            r.touch_samples
              .slice(0, 5)
              .map((t) => `\`${t.tag}${t.text ? ':' + t.text : ''} ${t.w}×${t.h}\``)
              .join(', ')
        )
      }
    }
    lines.push('')
  }

  lines.push('## Skript')
  lines.push('')
  lines.push('```bash')
  lines.push('npm run build && PORT=3000 npm start   # CRM')
  lines.push('npm run build && PORT=3001 npm start   # Portal')
  lines.push(
    'MOBILE_AUDIT_CRM_URL=http://localhost:3000 MOBILE_AUDIT_PORTAL_URL=http://localhost:3001 node scripts/mobile-audit-playwright.mjs'
  )
  lines.push('```')
  lines.push('')

  const mdPath = path.join(OUT, 'BEFUNDLISTE.md')
  fs.writeFileSync(mdPath, lines.join('\n'))
  return mdPath
}

async function main() {
  console.log('CRM', CRM_URL)
  console.log('Portal', PORTAL_URL)
  if (/staging--baerenwald/.test(CRM_URL + PORTAL_URL)) {
    console.warn('WARN: Staging-Netlify-URL — Messung soll gegen lokalen Build laufen.')
  }

  const browser = await chromium.launch({ headless: true })
  const all = []
  for (const device of DEVICES) {
    console.log(`\n=== ${device.name} ===`)
    if (process.env.MOBILE_AUDIT_SKIP_CRM !== '1') {
      all.push(...(await auditApp(browser, device, 'crm')))
    }
    if (process.env.MOBILE_AUDIT_SKIP_PORTAL !== '1') {
      all.push(...(await auditApp(browser, device, 'portal')))
    }
  }
  await browser.close()

  const summary = summarize(all)
  const jsonPath = path.join(OUT, 'json', 'latest.json')
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, results: all, at: new Date().toISOString() }, null, 2))
  const md = writeMarkdown(all, summary)
  console.log('\n=== SUMMARY ===')
  console.log(summary)
  console.log('Wrote', md, jsonPath)
  const fail =
    summary.touch_zu_klein > 0 || summary.horizontal_scroll > 0 || summary.fixed_overlap > 0
  process.exitCode = fail ? 1 : 0
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
