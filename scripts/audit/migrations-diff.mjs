// Vergleicht Migrationsdateien (CRM + Portal) mit supabase_migrations.schema_migrations des Ziels.
// Aufruf: TARGET=prod node scripts/audit/migrations-diff.mjs
import fs from 'node:fs'
import { readOnly, sql, TARGET } from './db-readonly.mjs'
const files = []
for (const [repo, dir] of [['CRM', '../baerenwald-system/supabase/migrations'], ['Portal', '../baerenwald/supabase/migrations']]) {
  const abs = new URL('../../' + dir + '/', import.meta.url)
  if (!fs.existsSync(abs)) continue
  for (const f of fs.readdirSync(abs)) if (/^\d{14}_.*\.sql$/.test(f)) files.push({ repo, f, v: f.slice(0, 14) })
}
let applied = new Set()
try { applied = new Set((await readOnly(`select version from supabase_migrations.schema_migrations`)).map((r) => String(r.version))) }
catch (e) { console.log('keine schema_migrations-Tabelle:', e.message) }
const missing = files.filter((x) => !applied.has(x.v))
console.log(`${TARGET}: ${applied.size} eingetragen, ${files.length} Dateien, ${missing.length} Dateien ohne Eintrag`)
for (const m of missing) console.log(`  ${m.repo}  ${m.f}`)
await sql.end()
