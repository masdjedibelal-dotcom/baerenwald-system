/**
 * HTML → PDF über Puppeteer (identisch zur Vorschau preview=html).
 * Lokal (macOS): chrome-headless-shell (`npm run setup:chrome`) — kein volles Google Chrome.
 * Netlify/Linux Serverless: @sparticuz/chromium
 */

import { spawn } from 'child_process'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const MAC_FULL_BROWSER_MARKERS = [
  'Google Chrome.app',
  'Chromium.app',
  'Microsoft Edge.app',
  'Brave Browser.app',
]

const LINUX_CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

const WIN_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

const LOCAL_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
]

const HEADLESS_SHELL_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--disable-breakpad',
]

export type ChromiumExecutable = {
  path: string
  isLocalInstall: boolean
  isHeadlessShell: boolean
}

function isMacFullBrowserPath(p: string): boolean {
  return MAC_FULL_BROWSER_MARKERS.some((m) => p.includes(m))
}

function crmRootFromModuleFile(): string | null {
  try {
    const here = fileURLToPath(import.meta.url)
    return join(dirname(here), '..', '..', '..')
  } catch {
    return null
  }
}

/** Projektordner finden (Next cwd kann .next oder Workspace-Root sein). */
function pdfProjectSearchRoots(): string[] {
  const roots: string[] = []
  const fromModule = crmRootFromModuleFile()
  if (fromModule && existsSync(join(fromModule, 'package.json'))) roots.push(fromModule)

  let dir = process.cwd()
  for (let i = 0; i < 12; i++) {
    roots.push(dir)
    const nested = join(dir, 'baerenwald-crm-dashboard')
    if (existsSync(join(nested, 'package.json'))) roots.push(nested)
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return Array.from(new Set(roots))
}

function findHeadlessShellInRoot(projectRoot: string): string | null {
  const base = join(projectRoot, 'chrome-headless-shell')
  if (!existsSync(base)) return null

  const shellFolders: Record<string, string> = {
    darwin: 'chrome-headless-shell-mac-arm64',
    linux: 'chrome-headless-shell-linux64',
    win32: 'chrome-headless-shell-win64',
  }
  const binName =
    process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell'
  const folder = shellFolders[process.platform]
  if (!folder) return null

  try {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const candidate = join(base, entry.name, folder, binName)
      if (existsSync(candidate)) {
        try {
          return realpathSync(candidate)
        } catch {
          return candidate
        }
      }
    }
  } catch {
    /* optional */
  }
  return null
}

function findProjectHeadlessShell(): string | null {
  for (const root of pdfProjectSearchRoots()) {
    const pkgPath = join(root, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const name = JSON.parse(readFileSync(pkgPath, 'utf8')).name as string
        if (name !== 'baerenwald-crm-dashboard' && !existsSync(join(root, 'chrome-headless-shell'))) {
          continue
        }
      } catch {
        /* continue */
      }
    }
    const shell = findHeadlessShellInRoot(root)
    if (shell) return shell
  }
  return null
}

function findLocalChromeNonMac(): string | null {
  const paths = process.platform === 'win32' ? WIN_CHROME_PATHS : LINUX_CHROME_PATHS
  for (const p of paths) {
    if (existsSync(p)) return p
  }
  return null
}

function shouldUseServerlessChromium(): boolean {
  if (process.platform !== 'linux') return false
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.NETLIFY ||
    process.env.CHROMIUM_SERVERLESS === '1'
  )
}

function toExecutable(path: string, isHeadlessShell: boolean): ChromiumExecutable {
  return { path, isLocalInstall: true, isHeadlessShell }
}

function normalizeExecutablePath(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}

export async function resolveChromiumExecutable(): Promise<ChromiumExecutable> {
  const explicitPdf = process.env.PDF_CHROMIUM_EXECUTABLE?.trim()
  if (explicitPdf) {
    const resolved = normalizeExecutablePath(explicitPdf)
    if (!existsSync(resolved)) {
      throw new Error(`PDF_CHROMIUM_EXECUTABLE existiert nicht: ${explicitPdf}`)
    }
    return toExecutable(resolved, resolved.includes('chrome-headless-shell'))
  }

  const headlessShell = findProjectHeadlessShell()
  if (headlessShell) return toExecutable(headlessShell, true)

  const fromEnv =
    process.env.CHROMIUM_PATH?.trim() ||
    process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
    ''

  if (fromEnv && existsSync(fromEnv)) {
    if (fromEnv.includes('chrome-headless-shell')) {
      return toExecutable(fromEnv, true)
    }
    if (process.platform === 'darwin' && isMacFullBrowserPath(fromEnv)) {
      throw new Error(
        'CHROMIUM_PATH zeigt auf Google Chrome (SEGV auf macOS). ' +
          'In .env.local entfernen, dann: npm run setup:chrome && Dev-Server neu starten.'
      )
    }
    return toExecutable(fromEnv, false)
  }

  if (process.platform !== 'darwin') {
    const local = findLocalChromeNonMac()
    if (local) return toExecutable(local, false)
  }

  if (!shouldUseServerlessChromium()) {
    const roots = pdfProjectSearchRoots().slice(0, 3).join(', ')
    throw new Error(
      `Kein chrome-headless-shell für PDF gefunden (gesucht in: ${roots}). ` +
        'Im Ordner baerenwald-crm-dashboard: npm run setup:chrome — danach Dev-Server neu starten.'
    )
  }

  try {
    const chromiumMod = await import('@sparticuz/chromium')
    const chromium = chromiumMod.default ?? chromiumMod
    try {
      chromium.setGraphicsMode = false
    } catch {
      /* optional */
    }
    if (typeof chromium.executablePath === 'function') {
      const sp = await chromium.executablePath()
      if (sp && existsSync(sp)) {
        return { path: sp, isLocalInstall: false, isHeadlessShell: false }
      }
    }
  } catch (e) {
    console.error('[resolveChromiumExecutable] Sparticuz:', e)
  }

  throw new Error('Serverless-Chromium konnte nicht geladen werden.')
}

import { ANGEBOT_PDF_BOTTOM_MARGIN_MM } from '@/lib/templates/angebot-template'

/** Unterer Rand ohne Puppeteer-Fußzeile */
const PDF_BOTTOM_MARGIN_MM = 12

export type RenderHtmlToPdfOptions = {
  /** Puppeteer footerTemplate (z. B. Angebots-PDF) */
  footerTemplate?: string
}

function findPdfWorkerScript(): string | null {
  const fromEnv = process.env.PDF_WORKER_SCRIPT?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  for (const root of pdfProjectSearchRoots()) {
    const script = join(root, 'scripts', 'pdf-render-worker.mjs')
    if (existsSync(script)) return script
  }
  return null
}

/** Umgebung für PDF-Worker — NODE_OPTIONS o. Ä. können Chrome-Kindprozesse crashen. */
function pdfWorkerChildEnv(executablePath: string): NodeJS.ProcessEnv {
  const env = { ...process.env }
  for (const key of [
    'NODE_OPTIONS',
    'NODE_DEBUG',
    'NODE_INSPECT',
    'V8_COMPILE_CACHE',
    'WATCHPACK_POLLING',
  ]) {
    delete env[key]
  }
  env.PDF_CHROMIUM_EXECUTABLE = executablePath
  if (!env.MallocNanoZone) env.MallocNanoZone = '0'
  return env
}

/** macOS: Chrome in separatem Node-Prozess (Next-Dev + Puppeteer = SEGV). */
function shouldUsePdfWorker(isLocalInstall: boolean): boolean {
  if (process.env.PDF_DISABLE_WORKER === '1') return false
  if (process.env.PDF_USE_WORKER === '1') return isLocalInstall
  return process.platform === 'darwin' && isLocalInstall
}

async function renderHtmlToPdfViaWorker(
  html: string,
  executablePath: string,
  pdfOptions?: RenderHtmlToPdfOptions
): Promise<Buffer> {
  const worker = findPdfWorkerScript()
  if (!worker) {
    throw new Error('scripts/pdf-render-worker.mjs nicht gefunden')
  }

  const tmp = mkdtempSync(join(tmpdir(), 'bw-pdf-'))
  const htmlPath = join(tmp, 'input.html')
  const pdfPath = join(tmp, 'output.pdf')
  const footerPath = pdfOptions?.footerTemplate
    ? join(tmp, 'footer.html')
    : null

  try {
    writeFileSync(htmlPath, html, 'utf8')
    if (footerPath && pdfOptions?.footerTemplate) {
      writeFileSync(footerPath, pdfOptions.footerTemplate, 'utf8')
    }

    const workerArgs = [worker, htmlPath, pdfPath, executablePath]
    if (footerPath) workerArgs.push(footerPath)

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        workerArgs,
        {
          env: pdfWorkerChildEnv(executablePath),
          cwd: dirname(worker),
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      )

      let stderr = ''
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += String(chunk)
      })
      child.on('error', reject)
      child.on('close', (code) => {
        if (code === 0 && existsSync(pdfPath)) resolve()
        else reject(new Error(stderr.trim() || `PDF-Worker beendet (Code ${code ?? '?'})`))
      })
    })

    return Buffer.from(readFileSync(pdfPath))
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* optional */
    }
  }
}

function launchErrorHint(isHeadlessShell: boolean, executablePath: string): string {
  if (isHeadlessShell) {
    return (
      `Binary: ${executablePath}. ` +
      'Fix: im Ordner baerenwald-crm-dashboard `npm run setup:chrome` (setzt PDF_CHROMIUM_EXECUTABLE), Dev-Server neu starten. ' +
      'CHROMIUM_PATH auf Google Chrome muss weg sein.'
    )
  }
  return 'Lokal: npm run setup:chrome. Netlify: Deployment prüfen.'
}

type PuppeteerBrowser = Awaited<
  ReturnType<(typeof import('puppeteer-core'))['default']['launch']>
>

async function launchLocalBrowser(
  puppeteer: (typeof import('puppeteer-core'))['default'],
  executablePath: string,
  isHeadlessShell: boolean
): Promise<PuppeteerBrowser> {
  const shellDir = dirname(executablePath)
  const launchArgs = isHeadlessShell
    ? HEADLESS_SHELL_ARGS
    : [...LOCAL_CHROME_ARGS, `--user-data-dir=${join(tmpdir(), `bw-chrome-${Date.now()}`)}`]

  const browser = await puppeteer.launch({
    executablePath,
    headless: isHeadlessShell ? 'shell' : true,
    pipe: false,
    args: launchArgs,
    timeout: 90_000,
    protocolTimeout: 120_000,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    ...({ cwd: shellDir } as Record<string, unknown>),
  })
  const proc = browser.process()
  if (proc && proc.exitCode != null) {
    await browser.close().catch(() => undefined)
    throw new Error(`Browser-Prozess beendet (code ${proc.exitCode})`)
  }
  return browser
}

function pdfMarginBottomMm(pdfOptions?: RenderHtmlToPdfOptions): number {
  return pdfOptions?.footerTemplate ? ANGEBOT_PDF_BOTTOM_MARGIN_MM : PDF_BOTTOM_MARGIN_MM
}

function puppeteerPdfOptions(pdfOptions?: RenderHtmlToPdfOptions) {
  const footer = pdfOptions?.footerTemplate?.trim()
  const useFooter = Boolean(footer)
  return {
    format: 'A4' as const,
    printBackground: true,
    displayHeaderFooter: useFooter,
    headerTemplate: '<div></div>',
    footerTemplate: useFooter ? footer! : '<div></div>',
    margin: {
      top: '12mm',
      right: '12mm',
      bottom: `${pdfMarginBottomMm(pdfOptions)}mm`,
      left: '12mm',
    },
    timeout: 90_000,
  }
}

export async function renderHtmlToPdfBuffer(
  html: string,
  pdfOptions?: RenderHtmlToPdfOptions
): Promise<Buffer> {
  const { path: executablePath, isLocalInstall, isHeadlessShell } =
    await resolveChromiumExecutable()

  if (shouldUsePdfWorker(isLocalInstall)) {
    try {
      return await renderHtmlToPdfViaWorker(html, executablePath, pdfOptions)
    } catch (workerErr) {
      const workerMsg = workerErr instanceof Error ? workerErr.message : String(workerErr)
      const hint =
        'Das liegt nicht an hochgeladenen Fotos. PDF-Worker konnte Chrome nicht starten. ' +
        'Bitte: `npm run setup:chrome`, Dev-Server komplett neu starten (Ctrl+C, dann npm run dev). ' +
        'CHROMIUM_PATH darf nicht auf Google Chrome zeigen.'
      if (process.platform === 'darwin') {
        throw new Error(`${workerMsg}. ${hint}`)
      }
      console.warn('[renderHtmlToPdf] PDF-Worker fehlgeschlagen:', workerMsg)
    }
  }

  const puppeteerMod = await import('puppeteer-core')
  const puppeteer = puppeteerMod.default ?? puppeteerMod

  let browser: PuppeteerBrowser | null = null
  try {
    if (isLocalInstall) {
      browser = await launchLocalBrowser(puppeteer, executablePath, isHeadlessShell)
    } else {
      const chromiumMod = await import(
        /* webpackIgnore: true */ '@sparticuz/chromium'
      )
      const chromium = chromiumMod.default ?? chromiumMod
      try {
        chromium.setGraphicsMode = false
      } catch {
        /* optional */
      }
      browser = await puppeteer.launch({
        executablePath,
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        headless: chromium.headless ?? true,
        timeout: 90_000,
        protocolTimeout: 120_000,
      })
    }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    throw new Error(
      `PDF-Browser konnte nicht gestartet werden (${raw}). ${launchErrorHint(isHeadlessShell, executablePath)}`
    )
  }

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 })
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined)
    await page
      .evaluate(async () => {
        const imgs = Array.from(document.images)
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) resolve()
                else {
                  img.addEventListener('load', () => resolve(), { once: true })
                  img.addEventListener('error', () => resolve(), { once: true })
                  setTimeout(resolve, 12_000)
                }
              })
          )
        )
      })
      .catch(() => undefined)

    const pdf = await page.pdf(puppeteerPdfOptions(pdfOptions))
    return Buffer.from(pdf)
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    throw new Error(
      `PDF-Erzeugung fehlgeschlagen (${raw}). ${launchErrorHint(isHeadlessShell, executablePath)}`
    )
  } finally {
    if (browser) await browser.close().catch(() => undefined)
  }
}
