#!/usr/bin/env node
/**
 * P0-5 — Seed-Paket Runde 2 (nach Mail-Guard).
 * Idempotent über feste notizen / Titel-Marker ZZTEST-R2-*.
 *
 *   node --env-file=.env.staging scripts/staging/seed-runde2.mjs
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '../..')

const STAGING_PASSWORD = 'StagingTest!2026'
const MARKER = 'ZZTEST-R2'

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
  console.error('ABORT: Staging-Env unvollständig')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function fail(label, error) {
  console.error(`ABORT: ${label}: ${error?.message ?? error}`)
  process.exit(1)
}

async function must(label, result) {
  if (result.error) fail(label, result.error)
  return result.data
}

function token(prefix) {
  return `${prefix}_${randomBytes(16).toString('base64url')}`
}

async function upsertBy(table, match, payload) {
  const keys = Object.keys(match)
  let q = admin.from(table).select('id').limit(1)
  for (const k of keys) q = q.eq(k, match[k])
  const { data: found, error: selErr } = await q.maybeSingle()
  if (selErr) fail(`${table} select`, selErr)
  if (found?.id) {
    const { error } = await admin.from(table).update(payload).eq('id', found.id)
    if (error) fail(`${table} update`, error)
    return found.id
  }
  const { data, error } = await admin.from(table).insert(payload).select('id').single()
  if (error || !data) fail(`${table} insert`, error)
  return data.id
}

async function ensureAuthUser({ email, appMetadata = {}, userMetadata = {} }) {
  const mail = email.trim().toLowerCase()
  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 1000,
  })
  if (listErr) fail(`listUsers ${mail}`, listErr)
  const existing = (listed?.users ?? []).find(
    (u) => (u.email ?? '').toLowerCase() === mail
  )
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: STAGING_PASSWORD,
      email_confirm: true,
      app_metadata: { ...(existing.app_metadata ?? {}), ...appMetadata },
      user_metadata: { ...(existing.user_metadata ?? {}), ...userMetadata },
    })
    if (error) fail(`updateUser ${mail}`, error)
    return existing.id
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: mail,
    password: STAGING_PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  })
  if (error || !data.user) fail(`createUser ${mail}`, error)
  return data.user.id
}

console.log(`==> Seed Runde 2 ${STAGING_PROJECT_REF_CANON}`)

const { data: hvNord } = await admin
  .from('kunden')
  .select('id')
  .eq('org_kennung', 'staging-muster-nord')
  .maybeSingle()
const { data: mieter } = await admin
  .from('kunden')
  .select('id')
  .eq('email', 'mieter-muster@example.test')
  .maybeSingle()
const { data: berger } = await admin
  .from('kunden')
  .select('id')
  .eq('email', 'familie.berger@example.test')
  .maybeSingle()
const { data: objekt } = await admin
  .from('kunden_objekte')
  .select('id')
  .eq('melde_slug', 'staging-leopold-10')
  .maybeSingle()
const { data: hwElektro } = await admin
  .from('handwerker')
  .select('id')
  .eq('email', 'partner-elektro@example.test')
  .maybeSingle()
const { data: adminProfile } = await admin
  .from('user_profiles')
  .select('id')
  .eq('email', 'admin@staging.baerenwald.test')
  .maybeSingle()

if (!hvNord?.id || !mieter?.id || !berger?.id || !objekt?.id || !hwElektro?.id) {
  fail(
    'Basis-Seed fehlt',
    new Error('Zuerst scripts/staging/seed-staging.mjs ausführen')
  )
}

const adminId = adminProfile?.id ?? null

// --- Zweiter CRM-User ---
const staff2Id = await ensureAuthUser({
  email: 'staff2@staging.baerenwald.test',
  appMetadata: { crm_role: 'manager', is_crm_admin: false },
  userMetadata: { name: 'ZZTEST Staff Zwei', role: 'manager' },
})
await must(
  'user_profiles staff2',
  await admin.from('user_profiles').upsert({
    id: staff2Id,
    name: 'ZZTEST Staff Zwei',
    email: 'staff2@staging.baerenwald.test',
    role: 'manager',
    telefon: '089 0000 0002',
    phone: '089 0000 0002',
  })
)
console.log('  CRM-User staff2@staging.baerenwald.test')

// --- Haupt-Lead + Auftrag mit Partner ---
const leadAuftragId = await upsertBy(
  'leads',
  { notizen: `${MARKER}-LEAD-AUFTRAG` },
  {
    kunde_id: mieter.id,
    auftraggeber_kunde_id: hvNord.id,
    kunde_objekt_id: objekt.id,
    kanal: 'hv_direkt',
    status: 'auftrag',
    situation: 'ZZTEST-R2 Steckdosen Küche nachrüsten WE 12',
    bereiche: ['elektrik'],
    plz: '80802',
    strasse: 'Leopoldstraße',
    hausnummer: '10',
    kundentyp: 'hausverwaltung',
    kontakt_name: 'Mia Muster',
    kontakt_email: 'mieter-muster@example.test',
    notizen: `${MARKER}-LEAD-AUFTRAG`,
    anlass: 'meldung',
    erfassung_von: 'crm',
    org_freigabe_status: 'freigegeben',
    funnel_daten: { quelle: 'seed-runde2', staging: true },
    erstellt_von: adminId,
  }
)

const kundenToken = token('zztest_projekt')
const auftragId = await upsertBy(
  'auftraege',
  { titel: `${MARKER} Elektro WE 12` },
  {
    titel: `${MARKER} Elektro WE 12`,
    kunde_id: hvNord.id,
    lead_id: leadAuftragId,
    status: 'in_arbeit',
    start_datum: new Date().toISOString().slice(0, 10),
    kunden_token: kundenToken,
    notizen: `${MARKER}-AUFTRAG`,
  }
)

await upsertBy(
  'auftrag_handwerker',
  { auftrag_id: auftragId, handwerker_id: hwElektro.id },
  {
    auftrag_id: auftragId,
    handwerker_id: hwElektro.id,
    status: 'angenommen',
    vereinbarter_preis: 890,
    notizen: `${MARKER}-HW`,
  }
)

await upsertBy(
  'auftrag_positionen',
  { auftrag_id: auftragId, leistung_name: `${MARKER} Steckdose doppelt` },
  {
    auftrag_id: auftragId,
    gewerk_slug: 'elektrik',
    gewerk_name: 'Elektrik',
    leistung_name: `${MARKER} Steckdose doppelt`,
    beschreibung: 'Nachrüstung Küche inkl. Material',
    einheit: 'Stk',
    menge: 2,
    preis_fix: 445,
    lohn_fix: 300,
    material_fix: 145,
    handwerker_id: hwElektro.id,
    sort_order: 1,
    handwerker_status: 'angenommen',
    leistung_status: 'in_arbeit',
    fuer_kunde_sichtbar: true,
  }
)
console.log('  Auftrag + Partner-Zuweisung', auftragId)
console.log('  /projekt Token:', kundenToken)

// --- Nachtrag + Baustopp ---
const nachtragToken = token('zztest_nachtrag')
const nachtragId = await upsertBy(
  'nachtraege',
  { auftrag_id: auftragId, grund: `${MARKER} Zusatzleitung` },
  {
    auftrag_id: auftragId,
    grund: `${MARKER} Zusatzleitung`,
    positionen: [
      {
        name: 'Zusatzleitung Küche',
        menge: 1,
        einheit: 'pauschal',
        preis: 180,
      },
    ],
    gesamt_min: 180,
    gesamt_max: 220,
    status: 'gesendet',
    token: nachtragToken,
    gesendet_at: new Date().toISOString(),
    handwerker_bestaetigt: true,
    handwerker_bestaetigt_at: new Date().toISOString(),
  }
)

await upsertBy(
  'baustopps',
  { auftrag_id: auftragId, grund: `${MARKER} Materialverzögerung` },
  {
    auftrag_id: auftragId,
    typ: 'material',
    grund: `${MARKER} Materialverzögerung`,
    beginn_datum: new Date().toISOString().slice(0, 10),
    ende_datum: null,
    kunde_informiert: true,
    erstellt_von: adminId,
  }
)
console.log('  Nachtrag', nachtragId, 'Token', nachtragToken)
console.log('  Baustopp aktiv')

// --- Abnahme mit Mängeln ---
await upsertBy(
  'auftrag_abnahmeprotokolle',
  { auftrag_id: auftragId, notizen: `${MARKER}-ABNAHME` },
  {
    auftrag_id: auftragId,
    abnahme_datum: new Date().toISOString().slice(0, 10),
    notizen: `${MARKER}-ABNAHME`,
    maengel: [
      {
        titel: 'ZZTEST Abdeckung fehlt',
        beschreibung: 'Steckdosen-Abdeckung noch montieren',
        status: 'offen',
        frist: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      },
    ],
    punkte: [],
    handwerker_id: hwElektro.id,
    ebene: 'gesamt',
    freigabe_status: 'zur_freigabe',
  }
)
console.log('  Abnahme mit Mängeln')

// --- Gesendete Rechnung ---
const netto = 890
const mwst = Math.round(netto * 0.19 * 100) / 100
const brutto = Math.round((netto + mwst) * 100) / 100
const rechnungId = await upsertBy(
  'rechnungen',
  { notizen: `${MARKER}-RE-GESENDET` },
  {
    auftrag_id: auftragId,
    kunde_id: hvNord.id,
    kunde_objekt_id: objekt.id,
    rechnungsnummer: 'STG-R2-0001',
    status: 'gesendet',
    beleg_typ: 'rechnung',
    rechnung_art: 'voll',
    positionen: [
      {
        bezeichnung: `${MARKER} Elektroarbeiten WE 12`,
        menge: 1,
        einheit: 'pauschal',
        einzelpreis: netto,
        mwst_satz: 19,
      },
    ],
    netto,
    mwst_satz: 19,
    mwst_betrag: mwst,
    brutto,
    rechnungsdatum: new Date().toISOString().slice(0, 10),
    faellig_am: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    gesendet_at: new Date().toISOString(),
    notizen: `${MARKER}-RE-GESENDET`,
    erstellt_von: adminId,
  }
)
console.log('  Gesendete Rechnung', rechnungId, 'STG-R2-0001')

// --- Terminslots an Mieter ---
const slotStart = new Date(Date.now() + 2 * 86400000)
slotStart.setHours(9, 0, 0, 0)
const slotEnd = new Date(slotStart.getTime() + 2 * 3600000)
await upsertBy(
  'auftrag_terminslots',
  { lead_id: leadAuftragId, status: 'vorgeschlagen' },
  {
    auftrag_id: auftragId,
    lead_id: leadAuftragId,
    slot_beginn: slotStart.toISOString(),
    slot_ende: slotEnd.toISOString(),
    status: 'vorgeschlagen',
  }
)
console.log('  Terminslot vorgeschlagen (Mieter-Status)')

// --- Compliance: 1 gültig, 1 abgelaufen ---
const inOneYear = new Date()
inOneYear.setFullYear(inOneYear.getFullYear() + 1)
const lastYear = new Date()
lastYear.setFullYear(lastYear.getFullYear() - 1)

await upsertBy(
  'partner_dokumente',
  {
    handwerker_id: hwElektro.id,
    bezeichnung: `${MARKER} Haftpflicht gültig`,
  },
  {
    handwerker_id: hwElektro.id,
    typ: 'eigenes_dokument',
    bezeichnung: `${MARKER} Haftpflicht gültig`,
    gueltig_bis: inOneYear.toISOString().slice(0, 10),
    datei_url: null,
    notizen: `${MARKER}-COMP-OK`,
    status: 'freigegeben',
    freigegeben_am: new Date().toISOString(),
    hochgeladen_am: new Date().toISOString(),
  }
)
await upsertBy(
  'partner_dokumente',
  {
    handwerker_id: hwElektro.id,
    bezeichnung: `${MARKER} Führungszeugnis abgelaufen`,
  },
  {
    handwerker_id: hwElektro.id,
    typ: 'eigenes_dokument',
    bezeichnung: `${MARKER} Führungszeugnis abgelaufen`,
    gueltig_bis: lastYear.toISOString().slice(0, 10),
    datei_url: null,
    notizen: `${MARKER}-COMP-EXPIRED`,
    status: 'freigegeben',
    freigegeben_am: new Date().toISOString(),
    hochgeladen_am: new Date().toISOString(),
  }
)
console.log('  Compliance: 1 gültig + 1 abgelaufen')

// --- Formular-Token (/formular/[token]) ---
const tabId = await upsertBy(
  'hw_formular_tabs',
  { auftrag_id: auftragId, name: `${MARKER} Vor-Ort-Check` },
  {
    auftrag_id: auftragId,
    handwerker_id: hwElektro.id,
    name: `${MARKER} Vor-Ort-Check`,
    beschreibung: 'Seed Runde 2',
    felder: [
      { id: 'notiz', typ: 'text', label: 'Notiz', pflicht: false },
    ],
    sort_order: 1,
    aktiv: true,
  }
)
const formularToken = token('zztest_formular')
await upsertBy(
  'hw_formular_einreichungen',
  { tab_id: tabId, auftrag_id: auftragId },
  {
    tab_id: tabId,
    auftrag_id: auftragId,
    handwerker_id: hwElektro.id,
    token: formularToken,
    felder_werte: {},
    foto_urls: [],
    status: 'offen',
  }
)
console.log('  /formular Token:', formularToken)

// --- Wartungs-Vorgang ---
const wartungLeadId = await upsertBy(
  'leads',
  { notizen: `${MARKER}-LEAD-WARTUNG` },
  {
    kunde_id: berger.id,
    kanal: 'servicepaket',
    status: 'neu',
    situation: 'ZZTEST-R2 Wartung Heizungscheck jährlich',
    bereiche: ['sanitaer'],
    plz: '81541',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '88',
    kundentyp: 'privat',
    kontakt_name: 'Anna Berger',
    kontakt_email: 'familie.berger@example.test',
    notizen: `${MARKER}-LEAD-WARTUNG`,
    anlass: 'projekt',
    erfassung_von: 'crm',
    org_freigabe_status: 'nicht_noetig',
    funnel_daten: { quelle: 'seed-runde2', wartung: true },
    erstellt_von: adminId,
  }
)
console.log('  Wartungs-Vorgang Lead', wartungLeadId)

console.log('')
console.log('Seed Runde 2 fertig.')
console.log('  CRM Staff2   staff2@staging.baerenwald.test /', STAGING_PASSWORD)
console.log('  Auftrag      ', auftragId)
console.log('  /projekt/    ', kundenToken)
console.log('  /nachtrag/   ', nachtragToken)
console.log('  /formular/   ', formularToken)
console.log('  Rechnung     STG-R2-0001')
