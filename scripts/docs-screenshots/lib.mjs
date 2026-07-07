import { existsSync, mkdirSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const CRM_ROOT = join(__dirname, '..', '..')

export function loadEnvLocal() {
  const envPath = join(CRM_ROOT, '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq)
    if (process.env[key]) continue
    process.env[key] = trimmed.slice(eq + 1)
  }
}

export function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 120) || 'screen'
}

export function routeSlug(path, suffix) {
  const base = path === '/' ? 'dashboard' : slugify(path.replace(/\//g, '--'))
  if (!suffix) return base
  return `${base}--${slugify(suffix)}`
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForServer(baseUrl, timeoutMs = 120_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(baseUrl, { redirect: 'manual' })
      if (res.status < 500) return true
    } catch {
      /* retry */
    }
    await sleep(1500)
  }
  return false
}

export function getChromePath() {
  const chrome = process.env.PDF_CHROMIUM_EXECUTABLE?.trim()
  if (!chrome || !existsSync(chrome)) {
    throw new Error('PDF_CHROMIUM_EXECUTABLE fehlt. Bitte: npm run setup:chrome')
  }
  return chrome
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
