#!/usr/bin/env node
/**
 * Einmalig: RE2026-2111 auf Prod als bezahlt markieren (echte Geschäftsbuchung).
 * Keine Kunden-Mail. Nur mit ALLOW_PROD_RE2111_BEZAHLT=1.
 *
 *   ALLOW_PROD_RE2111_BEZAHLT=1 node --env-file=.env.staging --env-file=.env.local \
 *     scripts/staging/prod-mark-re2111-bezahlt.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PROD_PROJECT_REF } from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const RE_ID = '3778e0e3-6593-48f4-a098-f45583b1bb12'
const RE_NR = 'RE2026-2111'

function loadEnvFile(name) {
  const p = join(ROOT, name)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i)
    if (!process.env[k]) process.env[k] = t.slice(i + 1).replace(/^["']|["']$/g, '')
  }
}

loadEnvFile('.env.staging')
loadEnvFile('.env.local')

if (process.env.ALLOW_PROD_RE2111_BEZAHLT !== '1') {
  console.error('ABORT: Setze ALLOW_PROD_RE2111_BEZAHLT=1 (explizite Belal-Freigabe).')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url.includes(PROD_PROJECT_REF)) {
  console.error(`ABORT: NEXT_PUBLIC_SUPABASE_URL muss Prod ${PROD_PROJECT_REF} sein, ist: ${url}`)
  process.exit(1)
}
if (!key) {
  console.error('ABORT: SUPABASE_SERVICE_ROLE_KEY fehlt (.env.local)')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { data: before, error: loadErr } = await db
  .from('rechnungen')
  .select('id, rechnungsnummer, status, brutto, bezahlt_at, kunde_id, auftrag_id')
  .eq('id', RE_ID)
  .maybeSingle()

if (loadErr) {
  console.error('LOAD', loadErr.message)
  process.exit(1)
}
if (!before || before.rechnungsnummer !== RE_NR) {
  console.error('ABORT: RE nicht gefunden oder Nummer mismatch', before)
  process.exit(1)
}
if (before.status === 'bezahlt') {
  console.log('Bereits bezahlt — nichts zu tun.', {
    id: before.id,
    nr: before.rechnungsnummer,
    bezahlt_at: before.bezahlt_at,
    brutto: before.brutto,
  })
  process.exit(0)
}
if (before.status !== 'gesendet') {
  console.error(`ABORT: Status ist „${before.status}“, erwartet gesendet`)
  process.exit(1)
}

const now = new Date().toISOString()
const { data: after, error: updErr } = await db
  .from('rechnungen')
  .update({ status: 'bezahlt', bezahlt_at: now, updated_at: now })
  .eq('id', RE_ID)
  .eq('status', 'gesendet')
  .select('id, rechnungsnummer, status, brutto, bezahlt_at, kunde_id')
  .maybeSingle()

if (updErr) {
  console.error('UPDATE', updErr.message)
  process.exit(1)
}
if (!after || after.status !== 'bezahlt') {
  console.error('ABORT: Update wirkungslos', after)
  process.exit(1)
}

console.log('OK RE als bezahlt:', {
  id: after.id,
  nr: after.rechnungsnummer,
  status: after.status,
  brutto: after.brutto,
  bezahlt_at: after.bezahlt_at,
})

const kundeId = String(before.kunde_id || '').trim()
if (kundeId) {
  const { data: paid } = await db
    .from('rechnungen')
    .select('brutto')
    .eq('kunde_id', kundeId)
    .eq('status', 'bezahlt')
  const sum = (paid || []).reduce((a, r) => a + (Number(r.brutto) || 0), 0)
  const { error: uErr } = await db.from('kunden').update({ gesamt_umsatz: sum }).eq('id', kundeId)
  if (uErr) console.warn('gesamt_umsatz Warnung:', uErr.message)
  else console.log('Kunde gesamt_umsatz aktualisiert (Summe bezahlter RE-Brutto):', sum)
}

console.log('Hinweis: keine Zahlungsbestätigungs-Mail gesendet (bewusst).')
console.log('UI-Parity-Verify separat nach CRM-Login / Deploy.')
