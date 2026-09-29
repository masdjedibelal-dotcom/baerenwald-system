// Schreibt Tabellen/Spalten/Funktionen/Buckets des Ziels nach scripts/audit/out/schema-<target>.json.
// Aufruf: TARGET=prod node scripts/audit/schema-snapshot.mjs
import fs from 'node:fs'
import { readOnly, sql, TARGET } from './db-readonly.mjs'
const t = await readOnly(`select table_name n from information_schema.tables where table_schema='public' union select table_name from information_schema.views where table_schema='public'`)
const f = await readOnly(`select distinct p.proname n from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public'`)
const b = await readOnly(`select id n from storage.buckets`)
const c = await readOnly(`select table_name t, column_name c from information_schema.columns where table_schema='public'`)
fs.mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
const out = new URL(`./out/schema-${TARGET}.json`, import.meta.url)
fs.writeFileSync(out, JSON.stringify({ tables: t.map((x) => x.n), fns: f.map((x) => x.n), buckets: b.map((x) => x.n), cols: c.map((x) => `${x.t}.${x.c}`) }))
console.log(`${TARGET}: ${t.length} Tabellen, ${f.length} Funktionen, ${b.length} Buckets, ${c.length} Spalten → ${out.pathname}`)
await sql.end()
