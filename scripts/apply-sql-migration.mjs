/**
 * Wendet eine SQL-Migrationsdatei auf Postgres an.
 * Prod (wnotlydvhsmfkhexgeol) wird abgelehnt — Ziel-URI muss Staging sein.
 *
 * Nutzung:
 *   node --env-file=.env.staging scripts/apply-sql-migration.mjs pfad/zur.sql
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertNotProdWrite } from './lib/prod-guard.mjs'

const file = process.argv[2]
const dbUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim()

if (!file) {
  console.error('Pfad zur .sql-Datei angeben.')
  process.exit(1)
}

if (!dbUrl) {
  console.error(
    'SUPABASE_DB_URL oder DATABASE_URL in .env.local fehlt.\n' +
      'Supabase → Project Settings → Database → Connection string (URI) eintragen,\n' +
      'oder die Migration im SQL Editor ausführen:\n' +
      `  ${resolve(file)}`
  )
  process.exit(1)
}

assertNotProdWrite({ dbUrl }, 'SUPABASE_DB_URL / DATABASE_URL')

const sql = readFileSync(resolve(file), 'utf8')

const { default: postgres } = await import('postgres')

const db = postgres(dbUrl, { max: 1 })

try {
  await db.unsafe(sql)
  console.log('Migration erfolgreich angewendet:', file)
} catch (e) {
  console.error('Migration fehlgeschlagen:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await db.end({ timeout: 5 })
}
