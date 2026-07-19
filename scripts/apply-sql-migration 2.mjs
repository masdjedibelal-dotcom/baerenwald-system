/**
 * Wendet eine SQL-Migrationsdatei auf die Supabase-Postgres-DB an.
 *
 * Voraussetzung in .env.local (Dashboard → Settings → Database → Connection string, URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 * Nutzung:
 *   node --env-file=.env.local scripts/apply-sql-migration.mjs supabase/migrations/20260520153000_kunden_adresse_felder.sql
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
