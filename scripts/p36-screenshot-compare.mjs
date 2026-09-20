#!/usr/bin/env node
/**
 * P3-6: 10 Hauptseiten auf Staging laden, lokales CSS injizieren, Screenshots.
 * Usage: node scripts/p36-screenshot-compare.mjs before|after
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'docs/p3-6-screenshots')
const PHASE = process.argv[2] === 'after' ? 'after' : 'before'
const APP = process.env.P36_APP_URL || 'https://staging--baerenwald-backend.netlify.app'
const EMAIL = 'admin@staging.baerenwald.test'
const PASSWORD = 'StagingTest!2026'

const PAGES = [
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
]

fs.mkdirSync(path.join(OUT, PHASE), { recursive: true })

function loadLocalCssBundle() {
  const globals = fs.readFileSync(path.join(ROOT, 'src/app/globals.css'), 'utf8')
  const mock = fs.readFileSync(path.join(ROOT, 'src/styles/mock-design-system.css'), 'utf8')
  // Strip Tailwind directives that won't work as plain CSS
  const globalsPlain = globals
    .replace(/@tailwind\s+[^;]+;/g, '')
    .replace(/@apply\s+[^;]+;/g, '')
  return `${globalsPlain}\n${mock}`
}

async function injectLocalCss(page, css) {
  await page.evaluate((bundle) => {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        sheet.disabled = true
      } catch {
        /* cross-origin */
      }
    }
    document.querySelectorAll('style[data-p36], link[data-p36]').forEach((n) => n.remove())
    const style = document.createElement('style')
    style.setAttribute('data-p36', '1')
    style.textContent = bundle
    document.head.appendChild(style)
  }, css)
  await page.waitForTimeout(400)
}

async function login(page) {
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(800)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.getByRole('button', { name: /Anmelden/i }).click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
  await page.waitForTimeout(1200)
}

async function main() {
  const css = loadLocalCssBundle()
  console.log('css_bundle_kb', Math.round(Buffer.byteLength(css) / 1024))
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  await login(page)
  console.log('after-login', page.url())
  for (const p of PAGES) {
    await page.goto(`${APP}${p.path}`, { waitUntil: 'networkidle', timeout: 180000 })
    await page.waitForTimeout(2000)
    await injectLocalCss(page, css)
    await page.waitForTimeout(600)
    const file = path.join(OUT, PHASE, `${p.id}.png`)
    await page.screenshot({ path: file, fullPage: false })
    console.log('✓', PHASE, p.id, fs.statSync(file).size, page.url())
  }
  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
