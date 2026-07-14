#!/usr/bin/env node
/**
 * Schritt 1 — Checkout-Audit (CRM_TRACK.md)
 * Prüft kritische Build-Dateien, Shared-Fixtures und Env-Keys aus .env.example.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function ok(msg) {
  console.log(`  ✓ ${msg}`)
}
function warn(msg) {
  console.log(`  ⚠ ${msg}`)
}
function fail(msg) {
  console.error(`  ✗ ${msg}`)
  process.exitCode = 1
}

console.log('Checkout-Audit — baerenwald-crm-dashboard\n')

// Kritische Dateien
try {
  execSync('node scripts/check-critical-files.mjs', { cwd: root, stdio: 'pipe' })
  ok('Kritische Build-Dateien vorhanden')
} catch {
  fail('check-critical-files fehlgeschlagen')
}

try {
  execSync('node scripts/check-import-paths.mjs', { cwd: root, stdio: 'pipe' })
  ok('Import-Pfade auflösbar')
} catch {
  fail('check-import-paths fehlgeschlagen')
}

const sharedFixtures = resolve(root, 'shared/crm-vorgang/resolve-vorgang.fixtures.json')
if (existsSync(sharedFixtures)) {
  ok('Shared-Fixtures JSON vorhanden')
} else {
  warn('shared/crm-vorgang/resolve-vorgang.fixtures.json fehlt (Schritt 2)')
}

// Env-Check: Keys aus .env.example vs .env.local
const examplePath = resolve(root, '.env.example')
const localPath = resolve(root, '.env.local')
const requiredKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
]

if (existsSync(examplePath)) {
  ok('.env.example vorhanden')
} else {
  warn('.env.example fehlt')
}

const parseEnvKeys = (content) => {
  const keys = new Set()
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z][A-Z0-9_]+)=/)
    if (m) keys.add(m[1])
  }
  return keys
}

if (existsSync(localPath)) {
  const localContent = readFileSync(localPath, 'utf8')
  const localValues = Object.fromEntries(
    localContent
      .split('\n')
      .map((line) => {
        const m = line.match(/^([A-Z][A-Z0-9_]+)=(.*)$/)
        return m ? [m[1], m[2].trim()] : null
      })
      .filter(Boolean)
  )
  const missing = requiredKeys.filter((k) => !localValues[k])
  if (missing.length) {
    warn(`.env.local: fehlende Keys: ${missing.join(', ')}`)
  } else {
    ok('Pflicht-Env-Keys in .env.local vorhanden')
  }
} else {
  warn('.env.local fehlt — lokal aus .env.example anlegen')
}

console.log('\nAudit abgeschlossen.')
