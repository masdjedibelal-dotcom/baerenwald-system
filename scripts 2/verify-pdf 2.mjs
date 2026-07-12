#!/usr/bin/env node
/**
 * Prüft chrome-headless-shell und erzeugt eine Test-PDF (CLI + Worker).
 */
import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const crmRoot = join(__dirname, '..')

function fail(msg) {
  console.error('FEHLER:', msg)
  process.exit(1)
}

function loadEnvLocal() {
  const envPath = join(crmRoot, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

loadEnvLocal()

const chrome = process.env.PDF_CHROMIUM_EXECUTABLE?.trim()
const worker = join(crmRoot, 'scripts', 'pdf-render-worker.mjs')
const htmlPath = join(crmRoot, '.tmp-verify-pdf.html')
const pdfPath = join(crmRoot, '.tmp-verify-pdf.pdf')

if (!chrome || !existsSync(chrome)) {
  fail('PDF_CHROMIUM_EXECUTABLE fehlt oder ungültig. Bitte: npm run setup:chrome')
}
if (!existsSync(worker)) fail('pdf-render-worker.mjs nicht gefunden')

writeFileSync(
  htmlPath,
  `<!DOCTYPE html><html><head><style>@page{size:A4;margin:12mm}body{font-family:Arial}</style></head><body><h1>PDF OK</h1><p>Bärenwald CRM</p></body></html>`,
  'utf8'
)

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [worker, htmlPath, pdfPath, chrome], {
    execArgv: [],
    cwd: dirname(worker),
    stdio: 'inherit',
  })
  child.on('error', reject)
  child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Worker Code ${code}`))))
})

if (!existsSync(pdfPath)) fail('Test-PDF wurde nicht erzeugt')

console.log('OK: PDF erzeugt →', pdfPath)
console.log('Chrome:', chrome)
