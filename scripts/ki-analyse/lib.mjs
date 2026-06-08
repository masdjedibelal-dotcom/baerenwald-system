import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

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

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local nötig.')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function plzRegion(plz) {
  const p = String(plz ?? '').trim()
  if (p.length >= 2) return `${p.slice(0, 2)}xxx`
  return 'unbekannt'
}

export function daysBetween(from, to) {
  if (!from || !to) return null
  const a = new Date(String(from).slice(0, 10))
  const b = new Date(String(to).slice(0, 10))
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1
}
