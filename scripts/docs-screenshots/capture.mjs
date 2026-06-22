#!/usr/bin/env node
/**
 * Erstellt Desktop- und Mobile-Screenshots aller konfigurierten CRM-Routen.
 *
 * Voraussetzungen:
 *   npm run setup:chrome
 *   npm run dev:skip-auth   (Port 3001, in separatem Terminal)
 *
 * Aufruf:
 *   npm run docs:screenshots
 *   DOCS_BASE_URL=http://127.0.0.1:3001 npm run docs:screenshots
 */
import { spawn } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  AUFTRAG_SUB_ROUTES,
  DEFAULT_BASE_URL,
  DISCOVERY_RULES,
  OUTPUT_DIR,
  STATIC_ROUTES,
  VIEWPORTS,
} from './config.mjs'
import {
  CRM_ROOT,
  ensureDir,
  getChromePath,
  loadEnvLocal,
  routeSlug,
  sleep,
  waitForServer,
} from './lib.mjs'
import { runInteractionScenarios } from './scenarios.mjs'
import { captureMobileEditSheets } from './interactions.mjs'
import {
  authenticateDocsPage,
  dismissBlockingModals,
  prepareDocsBrowserPage,
  verifyAuthenticatedFetch,
} from './auth-session.mjs'

loadEnvLocal()

const baseUrl = DEFAULT_BASE_URL.replace(/\/$/, '')
const outRoot = join(CRM_ROOT, OUTPUT_DIR, 'screenshots')
const manifestPath = join(CRM_ROOT, OUTPUT_DIR, 'manifest.json')
const maxRoutes = Number(process.env.DOCS_MAX_ROUTES || 0) || Infinity
const waitMs = Number(process.env.DOCS_WAIT_MS || 1200)
const navTimeout = Number(process.env.DOCS_NAV_TIMEOUT || 45_000)

/** @type {import('./config.mjs').DocRoute[]} */
const routes = [...STATIC_ROUTES]

function pushRoute(route) {
  if (routes.some((r) => r.path === route.path && r.title === route.title)) return
  routes.push(route)
}

function tokenRoutes() {
  const formular = process.env.DOCS_FORMULAR_TOKEN?.trim()
  const projekt = process.env.DOCS_PROJEKT_TOKEN?.trim()
  const nachtrag = process.env.DOCS_NACHTRAG_TOKEN?.trim()
  const handwerker = process.env.DOCS_HANDWERKER_TOKEN?.trim()
  if (formular) {
    pushRoute({
      path: `/formular/${formular}`,
      title: 'Öffentliches Formular',
      category: 'Portale',
    })
  }
  if (projekt) {
    pushRoute({ path: `/projekt/${projekt}`, title: 'Kunden-Portal Projekt', category: 'Portale' })
  }
  if (nachtrag) {
    pushRoute({ path: `/nachtrag/${nachtrag}`, title: 'Nachtrag-Portal', category: 'Portale' })
  }
  if (handwerker) {
    pushRoute({
      path: `/handwerker/anfrage/${handwerker}`,
      title: 'Handwerker-Portal Anfrage',
      category: 'Portale',
    })
  }
}

function envSampleRoutes() {
  const samples = [
    ['DOCS_ANFRAGE_ID', '/anfragen/{id}', 'Anfrage', 'Pipeline — Detail', true],
    ['DOCS_ANGEBOT_ID', '/angebote/{id}', 'Angebot', 'Pipeline — Detail', true],
    ['DOCS_AUFTRAG_ID', '/auftraege/{id}', 'Auftrag', 'Pipeline — Detail', true],
    ['DOCS_RECHNUNG_ID', '/rechnungen/{id}', 'Rechnung', 'Pipeline — Detail', true],
    ['DOCS_KUNDE_ID', '/kunden/{id}', 'Kunde', 'Stammdaten — Detail', true],
    ['DOCS_HANDWERKER_ID', '/handwerker/{id}', 'Handwerker', 'Stammdaten — Detail', true],
    ['DOCS_PARTNER_ID', '/partner/{id}', 'Partner', 'Stammdaten — Detail', false],
    ['DOCS_FORMULAR_ID', '/formulare/{id}', 'Formular', 'Formulare — Detail', false],
  ]
  for (const [envKey, template, title, category, captureTabs] of samples) {
    const id = process.env[envKey]?.trim()
    if (!id) continue
    pushRoute({
      path: template.replace('{id}', id),
      title,
      category,
      captureTabs: Boolean(captureTabs),
    })
  }
}

async function discoverFromListClick(page, rule) {
  const clicked = await page.evaluate(() => {
    const row = document.querySelector('button.app-entity-list-row, a.app-entity-list-row')
    if (row instanceof HTMLElement) {
      row.click()
      return true
    }
    const gridRow = document.querySelector('.list-row-grid:not(.head)')
    if (gridRow instanceof HTMLElement) {
      gridRow.click()
      return true
    }
    return false
  })
  if (!clicked) return null
  await sleep(waitMs + 600)
  const path = new URL(page.url()).pathname
  if (!rule.pattern.test(path)) return null
  if (rule.exclude?.test(path)) return null
  return path
}

async function discoverRoutes(page) {
  envSampleRoutes()

  for (const rule of DISCOVERY_RULES) {
    const listUrl = `${baseUrl}${rule.listPath}`
    try {
      await goto(page, listUrl)
      await sleep(waitMs)
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((a) => a.getAttribute('href') || '')
          .filter(Boolean)
      )
      const found = []
      for (const href of hrefs) {
        const path = href.startsWith('http') ? new URL(href).pathname : href.split('?')[0]
        if (!rule.pattern.test(path)) continue
        if (rule.exclude?.test(path)) continue
        if (found.includes(path)) continue
        found.push(path)
        if (rule.max && found.length >= rule.max) break
      }

      if (!found.length) {
        const clickedPath = await discoverFromListClick(page, rule)
        if (clickedPath) found.push(clickedPath)
        await goto(page, listUrl)
      }

      for (const path of found) {
        pushRoute({
          path,
          title: rule.titlePrefix,
          category: rule.category,
          captureTabs: rule.captureTabs,
        })
      }
    } catch (err) {
      console.warn(`Discovery übersprungen (${rule.listPath}):`, err instanceof Error ? err.message : err)
    }
  }

  const auftrag = routes.find((r) => /^\/auftraege\/[0-9a-f-]{36}$/i.test(r.path))
  if (auftrag) {
    for (const sub of AUFTRAG_SUB_ROUTES) {
      pushRoute({
        path: `${auftrag.path}${sub.suffix}`,
        title: sub.title,
        category: sub.category,
      })
    }
  }
}

async function goto(page, url) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: navTimeout })
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeout })
  }
}

async function collectTabLabels(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="tab"]'))
      .map((el) => ({
        label: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        selected: el.getAttribute('aria-selected') === 'true',
      }))
      .filter((t) => t.label.length > 0)
  )
}

async function clickTab(page, label) {
  await page.evaluate((tabLabel) => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    const btn = tabs.find((el) => (el.textContent || '').replace(/\s+/g, ' ').trim() === tabLabel)
    if (btn instanceof HTMLElement) btn.click()
  }, label)
  await sleep(waitMs)
}

/** @type {{ slug: string, path: string, title: string, category: string, viewport: string, viewportLabel: string, tab?: string, interaction?: string, scenario?: string, file: string, ok: boolean, error?: string }[]} */
const manifest = []

function createShotRecorder(page, viewport) {
  const viewportDir = join(outRoot, viewport.name)
  ensureDir(viewportDir)

  return async function recordShot(meta) {
    const suffix = meta.interaction || meta.tab
    const slug = routeSlug(meta.path, suffix)
    const fileName = `${slug}.png`
    const filePath = join(viewportDir, fileName)
    const label = suffix || meta.title

    try {
      await dismissBlockingModals(page)
      const fullPage = viewport.name !== 'mobile'
      await page.screenshot({ path: filePath, fullPage })
      manifest.push({
        slug,
        path: meta.path,
        title: meta.title,
        category: meta.category,
        viewport: viewport.name,
        viewportLabel: viewport.label,
        tab: meta.tab,
        interaction: meta.interaction,
        scenario: meta.scenario,
        file: join(OUTPUT_DIR, 'screenshots', viewport.name, fileName).replace(/\\/g, '/'),
        ok: true,
      })
      process.stdout.write(`  ✓ ${viewport.name} / ${label}\n`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      manifest.push({
        slug,
        path: meta.path,
        title: meta.title,
        category: meta.category,
        viewport: viewport.name,
        viewportLabel: viewport.label,
        tab: meta.tab,
        interaction: meta.interaction,
        scenario: meta.scenario,
        file: '',
        ok: false,
        error: msg,
      })
      process.stdout.write(`  ✗ ${viewport.name} / ${label}: ${msg}\n`)
    }
  }
}

async function captureRoute(page, route, viewport, recordShot) {
  const url = `${baseUrl}${route.path}`

  try {
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.name === 'mobile' ? 2 : 1,
    })
    await goto(page, url)
    await sleep(waitMs)
    await dismissBlockingModals(page)
    await assertAuthenticatedPage(page, route.path)
    await recordShot({
      path: route.path,
      title: route.title,
      category: route.category,
    })

    if (route.captureTabs) {
      const tabs = await collectTabLabels(page)
      for (const tab of tabs) {
        if (tab.selected) continue
        await clickTab(page, tab.label)
        await recordShot({
          path: route.path,
          title: route.title,
          category: route.category,
          tab: tab.label,
        })
      }
    }

    if (viewport.name === 'mobile') {
      await captureMobileEditSheets(page, recordShot, {
        path: route.path,
        title: route.title,
        category: `${route.category} — Sheet`,
      })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    manifest.push({
      slug: routeSlug(route.path),
      path: route.path,
      title: route.title,
      category: route.category,
      viewport: viewport.name,
      viewportLabel: viewport.label,
      file: '',
      ok: false,
      error: msg,
    })
    process.stdout.write(`  ✗ ${viewport.name}: ${msg}\n`)
  }
}

async function checkServerAllowsDocs() {
  return verifyAuthenticatedFetch(baseUrl)
}

async function assertAuthenticatedPage(page, expectedPath) {
  const path = new URL(page.url()).pathname
  if (path === '/login' && expectedPath !== '/login') {
    throw new Error(
      `Login-Umleitung statt ${expectedPath}. Bitte nur mit «npm run dev:skip-auth» (Port 3001) erfassen.`
    )
  }
}

async function killPortIfNeeded(port) {
  if (process.env.DOCS_NO_KILL_PORT === 'true') return
  try {
    const { execSync } = await import('child_process')
    const pids = execSync(`lsof -ti :${port} 2>/dev/null || true`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
      .filter((pid) => pid !== String(process.pid))
    for (const pid of pids) {
      execSync(`kill ${pid}`)
    }
    if (pids.length) {
      console.log(`Port ${port} freigegeben (alter Dev-Server beendet).`)
      await sleep(2000)
    }
  } catch {
    /* ignore */
  }
}

async function maybeStartDevServer() {
  const port = Number(new URL(baseUrl).port || 3001)

  if (process.env.DOCS_NO_AUTO_START === 'true') {
    if (!(await waitForServer(baseUrl, 4_000))) {
      throw new Error(`Server ${baseUrl} nicht erreichbar. Bitte: npm run dev (Port 3001)`)
    }
    return
  }

  if (await waitForServer(baseUrl, 4_000)) return

  console.log(`Starte Dev-Server auf Port ${port} …`)
  const child = spawn('npm', ['run', 'dev:skip-auth'], {
    cwd: CRM_ROOT,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, CRM_DEV_SKIP_AUTH: 'true' },
  })
  child.unref()

  const ready = await waitForServer(baseUrl, 120_000)
  if (!ready) {
    throw new Error(`Dev-Server unter ${baseUrl} nicht erreichbar.`)
  }
  await sleep(4000)
  console.log('Dev-Server bereit.')
}

async function main() {
  tokenRoutes()
  await maybeStartDevServer()

  if (!(await waitForServer(baseUrl, 8_000))) {
    throw new Error(`Server ${baseUrl} nicht erreichbar.`)
  }

  const chromePath = getChromePath()
  const puppeteer = (await import('puppeteer-core')).default
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'shell',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    page.setDefaultNavigationTimeout(navTimeout)
    page.setDefaultTimeout(navTimeout)
    await prepareDocsBrowserPage(page)

    console.log('CRM-Session herstellen (Supabase Magic-Link) …')
    await authenticateDocsPage(page, baseUrl)
    await assertAuthenticatedPage(page, '/')
    console.log('Eingeloggt.')

    console.log('Ermittle Detail-Routen …')
    await discoverRoutes(page)

    const limited = routes.slice(0, maxRoutes)
    console.log(`Erfasse ${limited.length} Routen + Szenarien × ${Object.keys(VIEWPORTS).length} Viewports …`)

    for (const viewport of Object.values(VIEWPORTS)) {
      console.log(`\n=== Viewport: ${viewport.label} ===`)
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.name === 'mobile' ? 2 : 1,
      })

      const recordShot = createShotRecorder(page, viewport)

      for (const route of limited) {
        console.log(`\n→ ${route.title} (${route.path})`)
        await captureRoute(page, route, viewport, recordShot)
      }

      await runInteractionScenarios(
        page,
        { routes, baseUrl, waitMs, goto },
        recordShot
      )
    }
  } finally {
    await browser.close().catch(() => undefined)
  }

  ensureDir(join(CRM_ROOT, OUTPUT_DIR))
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        total: manifest.length,
        success: manifest.filter((m) => m.ok).length,
        failed: manifest.filter((m) => !m.ok).length,
        items: manifest,
      },
      null,
      2
    ),
    'utf8'
  )

  const failed = manifest.filter((m) => !m.ok).length
  console.log(`\nFertig: ${manifest.length - failed}/${manifest.length} Screenshots`)
  console.log('Manifest:', manifestPath)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('FEHLER:', err instanceof Error ? err.message : err)
  process.exit(1)
})
