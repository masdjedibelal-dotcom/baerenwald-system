// Gemeinsamer Zugang für Audit-Skripte: TARGET=staging|prod, jede Abfrage READ ONLY + Rollback.
// URLs aus .env.staging (STAGING_DB_URL / PROD_DB_URL). Ausgaben nur IDs/Status/Zahlen, keine Personendaten.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CRM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const postgres = createRequire(CRM + '/package.json')('postgres')
const env = Object.fromEntries(
  fs.readFileSync(CRM + '/.env.staging', 'utf8').split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')])
)
export const TARGET = process.env.TARGET === 'prod' ? 'prod' : 'staging'
const url = TARGET === 'prod' ? env.PROD_DB_URL : env.STAGING_DB_URL
const ref = TARGET === 'prod' ? 'wnotlydvhsmfkhexgeol' : 'soqownnkxmtfgvsbrgsl'
if (!url || !url.includes(ref)) throw new Error(`ABORT: ${TARGET}-URL fehlt oder passt nicht`)
export const sql = postgres(url, { max: 1, ssl: 'require', idle_timeout: 5, onnotice: () => {} })

export async function readOnly(q) {
  let rows
  try {
    await sql.begin('read only', async (tx) => {
      await tx.unsafe(`set local statement_timeout = '20s'`)
      rows = await tx.unsafe(q)
      throw new Error('__ROLLBACK__')
    })
  } catch (e) {
    if (e.message !== '__ROLLBACK__') throw e
  }
  return rows
}
