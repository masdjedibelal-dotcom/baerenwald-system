/**
 * Wendet Schema-Lücken auf angebot_handwerker an (Live-Supabase).
 *
 * Voraussetzung in .env.local (Dashboard → Database → Connection string URI):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@...
 *
 * Nutzung:
 *   node --env-file=.env.local scripts/apply-gap-repair.mjs
 *
 * Ohne SUPABASE_DB_URL: SQL-Datei wird ausgegeben — im Supabase SQL Editor ausführen.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = resolve(
  __dirname,
  '../supabase/migrations/20260607120000_angebot_handwerker_schema_gaps.sql'
)
const sql = readFileSync(sqlPath, 'utf8')
const dbUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim()

if (!dbUrl) {
  console.log(
    'SUPABASE_DB_URL fehlt in .env.local.\n' +
      'Bitte im Supabase SQL Editor ausführen:\n' +
      `  ${sqlPath}\n\n` +
      '--- SQL ---\n' +
      sql
  )
  process.exit(1)
}

const { default: postgres } = await import('postgres')
const db = postgres(dbUrl, { max: 1 })

try {
  await db.unsafe(sql)
  console.log('Schema-Gap-Repair erfolgreich angewendet.')
} catch (e) {
  console.error('Fehler:', e instanceof Error ? e.message : e)
  process.exit(1)
} finally {
  await db.end({ timeout: 5 })
}
