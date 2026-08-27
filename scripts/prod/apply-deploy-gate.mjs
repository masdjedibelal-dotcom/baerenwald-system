#!/usr/bin/env node
/**
 * AUFTRAG F — Deploy-Gate Apply: nur Migrationen, deren Schema auf Prod fehlt.
 *
 * Aktuell Apply-Liste (Schema-Diff 2026-08-26):
 *   20261009120000_portal_dokumente_visibility_fixes.sql
 *
 * Safe (Schema schon da, nur Tracking fehlt — optional nachziehen):
 *   belegnummer_erst_bei_versand, 13b_flag, partner_ersetzt_sperre, …
 *
 *   # Dry-Run
 *   node --env-file=.env.staging scripts/prod/apply-deploy-gate.mjs
 *
 *   # Backup + Apply (explizit)
 *   ALLOW_PROD_SCHEMA_APPLY=1 CONFIRM_PROD_BACKUP=1 \
 *     node --env-file=.env.staging scripts/prod/apply-deploy-gate.mjs --apply
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { PROD_PROJECT_REF } from '../lib/prod-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const BACKUP_DIR = path.join(ROOT, 'docs/test/backups')

/** Nur Migrationen mit nachgewiesenem Schema-Diff auf Prod. */
const APPLY_LIST = [
  {
    version: '20261009120000',
    name: 'portal_dokumente_visibility_fixes',
    file: 'supabase/migrations/20261009120000_portal_dokumente_visibility_fixes.sql',
    reason:
      'Prod: rechnungen_portal_select ohne bezahlt; portal_kunde_lead_ids ohne auftraggeber; BT-Kunde-Policy fehlt; kunden_dokumente auth_all',
  },
]

function loadEnv() {
  const p = path.join(ROOT, '.env.staging')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i)
    if (!process.env[k]) process.env[k] = t.slice(i + 1).replace(/^["']|["']$/g, '')
  }
}

function requireProdDbUrl() {
  const url = (process.env.PROD_DB_URL || '').trim()
  if (!url.includes(PROD_PROJECT_REF)) {
    console.error(`ABORT: PROD_DB_URL muss Prod-Ref ${PROD_PROJECT_REF} enthalten.`)
    process.exit(1)
  }
  return url
}

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 50 * 1024 * 1024,
  })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `${cmd} failed`)
    process.exit(r.status || 1)
  }
  return r.stdout
}

function backup(dbUrl) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const schemaFile = path.join(BACKUP_DIR, `prod-schema-${stamp}.sql`)
  const dataFile = path.join(BACKUP_DIR, `prod-rechnungen-einstellungen-${stamp}.sql`)
  console.log('==> Backup schema-only →', schemaFile)
  run('pg_dump', [dbUrl, '--schema-only', '--no-owner', '--no-privileges', '-f', schemaFile])
  console.log('==> Backup rechnungen + einstellungen data →', dataFile)
  run('pg_dump', [
    dbUrl,
    '--data-only',
    '--no-owner',
    '-t',
    'public.rechnungen',
    '-t',
    'public.einstellungen',
    '-f',
    dataFile,
  ])
  return { schemaFile, dataFile }
}

function applySqlFile(dbUrl, relPath) {
  const abs = path.join(ROOT, relPath)
  if (!fs.existsSync(abs)) {
    console.error('ABORT: Datei fehlt', abs)
    process.exit(1)
  }
  console.log('==> Apply', relPath)
  run('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', abs])
}

function trackMigration(dbUrl, { version, name }) {
  console.log('==> Tracking schema_migrations', version, name)
  // statements: leeres Array — DDL bereits ausgeführt; Tracking-Nachzug
  const sql = `
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('${version}', '${name}', ARRAY[]::text[])
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
`
  run('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql])
}

function verify(dbUrl) {
  const out = run('psql', [
    dbUrl,
    '-t',
    '-A',
    '-c',
    `
select
  (select count(*) from pg_policies where policyname='auftrag_bautagebuch_kunde_portal_select') as bt_kunde,
  (select (qual::text like '%bezahlt%')::text from pg_policies where policyname='rechnungen_portal_select' limit 1) as re_bezahlt,
  (select (pg_get_functiondef(p.oid) like '%auftraggeber_kunde_id%')::text
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='portal_kunde_lead_ids' limit 1) as lead_ag,
  (select count(*) from supabase_migrations.schema_migrations where version='20261009120000') as tracked;
`,
  ])
  console.log('Verify:', out.trim())
  const [bt, re, lead, tracked] = out.trim().split('|')
  const truthy = (v) => v === 't' || v === 'true' || v === '1'
  if (bt !== '1' || !truthy(re) || !truthy(lead) || tracked !== '1') {
    console.error('ABORT: Post-Apply-Verify fehlgeschlagen', { bt, re, lead, tracked })
    process.exit(1)
  }
  console.log('Post-Apply-Verify OK')
}

async function main() {
  loadEnv()
  const apply = process.argv.includes('--apply')
  const dbUrl = requireProdDbUrl()

  console.log('Apply-Liste:')
  for (const m of APPLY_LIST) {
    console.log(`  - ${m.version}_${m.name}`)
    console.log(`    Grund: ${m.reason}`)
  }

  if (!apply) {
    console.log('\nDry-Run. Für Apply: ALLOW_PROD_SCHEMA_APPLY=1 CONFIRM_PROD_BACKUP=1 … --apply')
    return
  }

  if (process.env.ALLOW_PROD_SCHEMA_APPLY !== '1') {
    console.error('ABORT: ALLOW_PROD_SCHEMA_APPLY=1 fehlt')
    process.exit(1)
  }
  if (process.env.CONFIRM_PROD_BACKUP !== '1') {
    console.error('ABORT: CONFIRM_PROD_BACKUP=1 fehlt (explizite Backup-Bestätigung)')
    process.exit(1)
  }

  const files = backup(dbUrl)
  console.log('Backup fertig:', files)

  for (const m of APPLY_LIST) {
    applySqlFile(dbUrl, m.file)
    trackMigration(dbUrl, m)
  }

  verify(dbUrl)
  console.log('\nFertig. Deploy-Gate Apply abgeschlossen.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
