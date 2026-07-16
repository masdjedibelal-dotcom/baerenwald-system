#!/usr/bin/env node
/**
 * Schreibt PDF_CHROMIUM_EXECUTABLE in .env.local (absoluter Pfad zur chrome-headless-shell).
 */
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const crmRoot = join(__dirname, '..')

function findHeadlessShell(projectRoot) {
  const base = join(projectRoot, 'chrome-headless-shell')
  if (!existsSync(base)) return null
  const folder =
    process.platform === 'darwin'
      ? 'chrome-headless-shell-mac-arm64'
      : process.platform === 'linux'
        ? 'chrome-headless-shell-linux64'
        : process.platform === 'win32'
          ? 'chrome-headless-shell-win64'
          : null
  if (!folder) return null
  const bin = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell'
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const candidate = join(base, entry.name, folder, bin)
    if (existsSync(candidate)) {
      try {
        return realpathSync(candidate)
      } catch {
        return candidate
      }
    }
  }
  return null
}

const shellPath = findHeadlessShell(crmRoot)
if (!shellPath) {
  console.error(
    'chrome-headless-shell nicht gefunden. Bitte zuerst ausführen: npm run setup:chrome'
  )
  process.exit(1)
}

const envPath = join(crmRoot, '.env.local')
let content = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''

// Kaputte Zeile: CHROMIUM_PATH=...ChromePDF_CHROMIUM_EXECUTABLE=...
content = content.replace(
  /^#?\s*CHROMIUM_PATH=.*PDF_CHROMIUM_EXECUTABLE=.*$/gm,
  '# CHROMIUM_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
)

const workerScript = (() => {
  const p = join(crmRoot, 'scripts', 'pdf-render-worker.mjs')
  try {
    return realpathSync(p)
  } catch {
    return p
  }
})()
const lines = [
  `PDF_CHROMIUM_EXECUTABLE=${shellPath}`,
  `PDF_WORKER_SCRIPT=${workerScript}`,
]
for (const line of lines) {
  const key = line.split('=')[0]
  if (new RegExp(`^${key}=.*$`, 'm').test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), line)
  } else {
    if (content.length > 0 && !content.endsWith('\n')) content += '\n'
    content += line + '\n'
  }
}

if (/^CHROMIUM_PATH=\/Applications\/Google Chrome/m.test(content)) {
  content = content.replace(/^CHROMIUM_PATH=.*$/m, '# $&')
  console.warn('Hinweis: CHROMIUM_PATH (Google Chrome) wurde auskommentiert — verursacht SEGV.')
}

writeFileSync(envPath, content, 'utf8')
for (const line of lines) console.log('OK:', line)
console.log('Dev-Server neu starten, damit .env.local geladen wird.')
