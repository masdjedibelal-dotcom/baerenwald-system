#!/usr/bin/env node
/**
 * P0-2 — Echtdaten auf Staging anonymisieren (Zafer / outllok.de).
 *   node --env-file=.env.staging scripts/staging/anonymize-echtdaten.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '../..')

function loadEnvStagingFile() {
  const envPath = join(CRM_ROOT, '.env.staging')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq)
    if (process.env[key]) continue
    let val = trimmed.slice(eq + 1)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

loadEnvStagingFile()

const supabaseUrl = process.env.STAGING_SUPABASE_URL?.trim()
const serviceKey = process.env.STAGING_SERVICE_ROLE_KEY?.trim()
const projectRef = process.env.STAGING_PROJECT_REF?.trim()
const projectId = process.env.STAGING_PROJECT_ID?.trim()
const dbUrl = process.env.STAGING_DB_URL?.trim()

assertStagingWriteTarget({ projectId, supabaseUrl, projectRef, dbUrl })

if (!supabaseUrl || !serviceKey) {
  console.error('ABORT: STAGING_SUPABASE_URL / STAGING_SERVICE_ROLE_KEY fehlen')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const KUNDE_ID = 'cc438a16-4e2f-481f-8742-bb5a91cb3ae9'
const LEAD_ID = '95799310-ccdf-482e-9678-624c7923df92'
const PHOTO_PATH =
  'meldung/melde-baerenwald-muenchen-haus-muenchen/1787089449607-m0gixm.jpg'
const NEW_TOKEN = `zztest_anonym_${randomBytes(12).toString('base64url')}`

console.log(`==> Anonymisieren Staging ${STAGING_PROJECT_REF_CANON}`)

const { data: kunde, error: kErr } = await admin
  .from('kunden')
  .update({
    name: 'ZZTEST Anonymisiert',
    vorname: 'ZZTEST',
    nachname: 'Anonymisiert',
    email: 'zztest.anonym@example.test',
    telefon: '089 0000 9999',
    adresse: 'Stagingstraße 1, 80331 München',
    strasse: 'Stagingstraße',
    hausnummer: '1',
    plz: '80331',
    ort: 'München',
    notizen: 'P0-2 anonymisiert (ehem. Echtdaten outllok.de)',
  })
  .eq('id', KUNDE_ID)
  .or('email.ilike.%outllok%,email.ilike.%zafer%,name.ilike.%zafer%')
  .select('id, name, email')
  .maybeSingle()

if (kErr) {
  console.error('ABORT kunde', kErr.message)
  process.exit(1)
}
if (!kunde) {
  // Fallback: bereits anonymisiert oder ID-Match ohne Email-OR
  const { data: byId, error } = await admin
    .from('kunden')
    .update({
      name: 'ZZTEST Anonymisiert',
      vorname: 'ZZTEST',
      nachname: 'Anonymisiert',
      email: 'zztest.anonym@example.test',
      telefon: '089 0000 9999',
      adresse: 'Stagingstraße 1, 80331 München',
      strasse: 'Stagingstraße',
      hausnummer: '1',
      plz: '80331',
      ort: 'München',
      notizen: 'P0-2 anonymisiert (ehem. Echtdaten outllok.de)',
    })
    .eq('id', KUNDE_ID)
    .select('id, name, email')
    .maybeSingle()
  if (error || !byId) {
    console.error('ABORT: Kunde nicht gefunden', error?.message)
    process.exit(1)
  }
  console.log('  kunde', byId)
} else {
  console.log('  kunde', kunde)
}

const { data: leadBefore } = await admin
  .from('leads')
  .select('id, funnel_daten, melde_tracking_token')
  .eq('id', LEAD_ID)
  .maybeSingle()

const prevFunnel =
  leadBefore?.funnel_daten && typeof leadBefore.funnel_daten === 'object'
    ? leadBefore.funnel_daten
    : {}
const funnel = {
  ...prevFunnel,
  strasse: 'Stagingstraße',
  hausnummer: '1',
  plz: '80331',
  ort: 'München',
  fotos: [],
  anonymisiert_p0_2: true,
}

const { data: lead, error: lErr } = await admin
  .from('leads')
  .update({
    kontakt_name: 'ZZTEST Anonymisiert',
    kontakt_email: 'zztest.anonym@example.test',
    kontakt_telefon: '089 0000 9999',
    strasse: 'Stagingstraße',
    hausnummer: '1',
    plz: '80331',
    situation: 'ZZTEST — anonymisierte Staging-Meldung',
    melde_tracking_token: NEW_TOKEN,
    funnel_daten: funnel,
  })
  .eq('id', LEAD_ID)
  .select('id, kontakt_name, kontakt_email, melde_tracking_token')
  .maybeSingle()

if (lErr || !lead) {
  console.error('ABORT lead', lErr?.message)
  process.exit(1)
}
console.log('  lead', lead)
console.log('  alter Token invalidiert → neuer Token', NEW_TOKEN)

const { error: sErr } = await admin.storage
  .from('gpt-visualisierungen')
  .remove([PHOTO_PATH])
if (sErr) {
  console.warn('  storage remove warn:', sErr.message)
} else {
  console.log('  storage foto entfernt')
}

console.log('P0-2 fertig.')
