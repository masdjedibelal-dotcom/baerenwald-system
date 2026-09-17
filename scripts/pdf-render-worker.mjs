/**
 * PDF außerhalb von Next.js.
 * Primär Puppeteer + setContent (kein file:// in der PDF — sonst Link zur Temp-Datei unten).
 * Fallback: chrome-headless-shell CLI (--print-to-pdf).
 */
import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { pathToFileURL } from 'url'

const htmlPath = process.argv[2]
const outPath = process.argv[3]
const executablePath =
  process.argv[4]?.trim() || process.env.PDF_CHROMIUM_EXECUTABLE?.trim()
const footerPath = process.argv[5]?.trim()

function fail(msg) {
  process.stderr.write(`${msg}\n`)
  process.exit(1)
}

if (!htmlPath || !outPath) {
  fail('Usage: pdf-render-worker.mjs <htmlPath> <outPdfPath> [chromeExecutable]')
}
if (!executablePath) fail('Chrome-Pfad fehlt (Argument oder PDF_CHROMIUM_EXECUTABLE)')
if (!existsSync(htmlPath)) fail(`HTML-Datei fehlt: ${htmlPath}`)

const isHeadlessShell = executablePath.includes('chrome-headless-shell')
const shellDir = dirname(executablePath)
const html = readFileSync(htmlPath, 'utf8')
const footerTemplate =
  footerPath && existsSync(footerPath) ? readFileSync(footerPath, 'utf8') : ''
const PDF_BOTTOM_MM = footerTemplate ? 36 : 12

const CHROME_LAUNCH_ARGS = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--disable-breakpad',
]

function chromeChildEnv() {
  const env = { ...process.env }
  for (const key of ['NODE_OPTIONS', 'NODE_DEBUG', 'NODE_INSPECT', 'V8_COMPILE_CACHE']) {
    delete env[key]
  }
  env.PDF_CHROMIUM_EXECUTABLE = executablePath
  if (!env.MallocNanoZone) env.MallocNanoZone = '0'
  return env
}

function runChromeCli() {
  const fileUrl = pathToFileURL(htmlPath).href
  const args = [
    ...CHROME_LAUNCH_ARGS,
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=20000',
    '--print-to-pdf-no-header',
    `--print-to-pdf=${outPath}`,
    fileUrl,
  ]

  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, args, {
      cwd: shellDir,
      env: chromeChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0 && existsSync(outPath)) resolve(undefined)
      else reject(new Error(stderr.trim() || `Chrome CLI beendet (Code ${code ?? '?'})`))
    })
  })
}

async function runPuppeteer() {
  const puppeteer = (await import('puppeteer-core')).default

  let browser
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: isHeadlessShell ? 'shell' : true,
      pipe: false,
      cwd: shellDir,
      args: CHROME_LAUNCH_ARGS,
      timeout: 90_000,
      protocolTimeout: 120_000,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123 })
    const fileUrl = pathToFileURL(htmlPath).href
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 120_000 })
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined)
    await page
      .evaluate(async () => {
        for (const img of document.images) {
          img.loading = 'eager'
        }
        await Promise.all(
          Array.from(document.images).map(
            (img) =>
              new Promise((resolve) => {
                if (img.complete && img.naturalWidth > 0) resolve(undefined)
                else {
                  img.addEventListener('load', () => resolve(undefined), { once: true })
                  img.addEventListener('error', () => resolve(undefined), { once: true })
                  setTimeout(resolve, 15_000)
                }
              })
          )
        )
      })
      .catch(() => undefined)

    // Fotos still als JPEG verkleinern (kleinere PDF-/Mail-Anhänge)
    await page
      .evaluate(
        async ({ maxEdge, quality }) => {
          let compressed = 0
          for (const img of Array.from(document.images)) {
            try {
              if (!img.naturalWidth || !img.naturalHeight) continue
              if (img.naturalWidth <= 48 && img.naturalHeight <= 48) continue
              const scale = Math.min(
                1,
                maxEdge / Math.max(img.naturalWidth, img.naturalHeight, 1)
              )
              const w = Math.max(1, Math.round(img.naturalWidth * scale))
              const h = Math.max(1, Math.round(img.naturalHeight * scale))
              const needsShrink =
                scale < 0.999 || img.naturalWidth * img.naturalHeight > 400_000
              if (
                !needsShrink &&
                (img.src.startsWith('data:image/jpeg') ||
                  img.src.startsWith('data:image/jpg'))
              ) {
                continue
              }
              const canvas = document.createElement('canvas')
              canvas.width = w
              canvas.height = h
              const ctx = canvas.getContext('2d')
              if (!ctx) continue
              ctx.drawImage(img, 0, 0, w, h)
              const dataUrl = canvas.toDataURL('image/jpeg', quality)
              if (!dataUrl.startsWith('data:image/jpeg')) continue
              await new Promise((resolve) => {
                const done = () => resolve(undefined)
                img.addEventListener('load', done, { once: true })
                img.addEventListener('error', done, { once: true })
                img.src = dataUrl
                if (img.complete) resolve(undefined)
                else setTimeout(resolve, 3_000)
              })
              compressed += 1
            } catch {
              /* ignore */
            }
          }
          return compressed
        },
        { maxEdge: 960, quality: 0.72 }
      )
      .catch(() => undefined)

    const useFooter = Boolean(footerTemplate)
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: `${PDF_BOTTOM_MM}mm`,
        left: '12mm',
      },
      displayHeaderFooter: useFooter,
      headerTemplate: '<div></div>',
      footerTemplate: useFooter ? footerTemplate : '<div></div>',
      timeout: 90_000,
    })
    writeFileSync(outPath, pdf)
  } finally {
    if (browser) await browser.close().catch(() => undefined)
  }
}

try {
  await runPuppeteer()
} catch (puppeteerErr) {
  try {
    await runChromeCli()
  } catch (cliErr) {
    const pupMsg = puppeteerErr instanceof Error ? puppeteerErr.message : String(puppeteerErr)
    const cliMsg = cliErr instanceof Error ? cliErr.message : String(cliErr)
    fail(`PDF-Worker: Puppeteer (${pupMsg}); CLI (${cliMsg})`)
  }
}
