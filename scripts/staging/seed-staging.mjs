#!/usr/bin/env node
/**
 * Kunstdaten + Test-Logins NUR auf Staging.
 * Liest .env.staging (nie .env.local). Bricht ab, wenn das Ziel Prod ist.
 *
 *   node --env-file=.env.staging scripts/staging/seed-staging.mjs
 *
 * Admin (fest, gleiche Werte wie src/lib/auth/staging-admin.ts):
 *   admin@staging.baerenwald.test / StagingTest!2026
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '../..')

const STAGING_ADMIN_EMAIL = 'admin@staging.baerenwald.test'
const STAGING_ADMIN_PASSWORD = 'StagingTest!2026'
const STAGING_ADMIN_NAME = 'Staging Admin'
const STAGING_PASSWORD = STAGING_ADMIN_PASSWORD

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

const projectId = process.env.STAGING_PROJECT_ID?.trim()
const supabaseUrl = process.env.STAGING_SUPABASE_URL?.trim()
const serviceKey = process.env.STAGING_SERVICE_ROLE_KEY?.trim()
const projectRef = process.env.STAGING_PROJECT_REF?.trim()
const dbUrl = process.env.STAGING_DB_URL?.trim()

assertStagingWriteTarget({ projectId, supabaseUrl, projectRef, dbUrl })

if (!supabaseUrl || !serviceKey) {
  console.error(
    'ABORT: STAGING_SUPABASE_URL und STAGING_SERVICE_ROLE_KEY müssen gesetzt sein (.env.staging).'
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function fail(label, error) {
  const msg = error?.message ?? String(error)
  console.error(`ABORT: ${label}: ${msg}`)
  process.exit(1)
}

async function must(label, result) {
  if (result.error) fail(label, result.error)
  return result.data
}

async function ensureAuthUser(opts) {
  const email = opts.email.trim().toLowerCase()
  const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 1000,
  })
  if (listErr) fail(`Auth listUsers (${email})`, listErr)
  const existing = (listed?.users ?? []).find(
    (u) => (u.email ?? '').toLowerCase() === email
  )

  const appMetadata = opts.appMetadata ?? {}
  const userMetadata = opts.userMetadata ?? {}

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: STAGING_PASSWORD,
      email_confirm: true,
      app_metadata: { ...(existing.app_metadata ?? {}), ...appMetadata },
      user_metadata: { ...(existing.user_metadata ?? {}), ...userMetadata },
    })
    if (error) fail(`Auth update (${email})`, error)
    console.log(`  auth existiert: ${email}`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: STAGING_PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  })
  if (error || !data.user) fail(`Auth create (${email})`, error)
  console.log(`  auth angelegt: ${email}`)
  return data.user.id
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
  const { data, error } = await admin
    .from(table)
    .insert(payload)
    .select('id')
    .single()
  if (error || !data) fail(`${table} insert`, error)
  return data.id
}

console.log(`==> Seed Staging ${STAGING_PROJECT_REF_CANON}`)
console.log(`==> URL ${supabaseUrl}`)

const schemaProbe = await admin.from('kunden').select('id').limit(1)
if (schemaProbe.error) {
  fail(
    'Tabelle public.kunden fehlt — zuerst ./scripts/staging/dump-prod-schema-to-staging.sh',
    schemaProbe.error
  )
}

const adminId = await ensureAuthUser({
  email: STAGING_ADMIN_EMAIL,
  appMetadata: { crm_role: 'admin', is_crm_admin: true },
  userMetadata: { name: STAGING_ADMIN_NAME, role: 'admin' },
})

const hvNordAuthId = await ensureAuthUser({
  email: 'hv-nord@example.test',
  userMetadata: { name: 'HV Muster Nord' },
})
const hvSuedAuthId = await ensureAuthUser({
  email: 'hv-sued@example.test',
  userMetadata: { name: 'HV Muster Süd' },
})
const mieterAuthId = await ensureAuthUser({
  email: 'mieter-muster@example.test',
  userMetadata: { name: 'Mia Muster' },
})
const partnerAuthIds = {
  elektro: await ensureAuthUser({
    email: 'partner-elektro@example.test',
    userMetadata: { name: 'Elektro Muster GmbH' },
  }),
}

await must(
  'user_profiles admin',
  await admin.from('user_profiles').upsert({
    id: adminId,
    name: STAGING_ADMIN_NAME,
    email: STAGING_ADMIN_EMAIL,
    role: 'admin',
    telefon: '089 0000 0001',
    phone: '089 0000 0001',
  })
)

const einstellungen = {
  firmenname: 'Bärenwald Staging',
  rechtsform: 'GmbH (Testdaten)',
  strasse: 'Stagingstraße',
  hausnummer: '1',
  plz: '80331',
  ort: 'München',
  telefon: '089 0000 0000',
  email: 'staging@example.test',
  website: 'staging.example.test',
  ust_id: 'DE000000000',
  steuernummer: '000/000/00000',
  zahlungsziel_tage: '7',
  angebot_gueltig_tage: '30',
  mwst_satz: '19',
  pdf_fusszeile: 'STAGING — keine Echtfirma',
  geschaeftsfuehrer: STAGING_ADMIN_NAME,
}

for (const [key, value] of Object.entries(einstellungen)) {
  await must(
    `einstellungen ${key}`,
    await admin.from('einstellungen').upsert({ key, value }, { onConflict: 'key' })
  )
}

const gewerkeSeed = [
  { name: 'Maler', slug: 'maler', ausfuehrung: 'eigen' },
  { name: 'Elektrik', slug: 'elektrik', ausfuehrung: 'fachbetrieb' },
  { name: 'Sanitär', slug: 'sanitaer', ausfuehrung: 'fachbetrieb' },
  { name: 'Dach', slug: 'dach', ausfuehrung: 'fachbetrieb' },
  { name: 'Boden', slug: 'boden', ausfuehrung: 'beides' },
]
for (const g of gewerkeSeed) {
  await upsertBy('gewerke', { slug: g.slug }, {
    name: g.name,
    slug: g.slug,
    aktiv: true,
    ausfuehrung: g.ausfuehrung,
  })
}

const hvNordId = await upsertBy(
  'kunden',
  { org_kennung: 'staging-muster-nord' },
  {
    name: 'Musterverwaltung Nord',
    typ: 'hausverwaltung',
    email: 'hv-nord@example.test',
    telefon: '089 1111 0001',
    strasse: 'Leopoldstraße',
    hausnummer: '10',
    plz: '80802',
    ort: 'München',
    adresse: 'Leopoldstraße 10',
    portal_modus: 'organisation',
    org_kennung: 'staging-muster-nord',
    org_anzeigename: 'Musterverwaltung Nord',
    freigabe_modus: 'freigabe',
    freigabe_schwelle_eur: 500,
    notfall_direkt: true,
    auth_user_id: hvNordAuthId,
    quelle: 'staging-seed',
    notizen: 'STAGING HV Nord',
  }
)

const hvSuedId = await upsertBy(
  'kunden',
  { org_kennung: 'staging-muster-sued' },
  {
    name: 'Musterverwaltung Süd',
    typ: 'hausverwaltung',
    email: 'hv-sued@example.test',
    telefon: '089 1111 0002',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '40',
    plz: '81541',
    ort: 'München',
    adresse: 'Tegernseer Landstraße 40',
    portal_modus: 'organisation',
    org_kennung: 'staging-muster-sued',
    org_anzeigename: 'Musterverwaltung Süd',
    freigabe_modus: 'direkt',
    notfall_direkt: true,
    auth_user_id: hvSuedAuthId,
    quelle: 'staging-seed',
    notizen: 'STAGING HV Süd',
  }
)

const hvWestId = await upsertBy(
  'kunden',
  { org_kennung: 'staging-muster-west' },
  {
    name: 'Musterverwaltung West',
    typ: 'hausverwaltung',
    email: 'hv-west@example.test',
    telefon: '089 1111 0003',
    strasse: 'Landsberger Straße',
    hausnummer: '200',
    plz: '80687',
    ort: 'München',
    adresse: 'Landsberger Straße 200',
    portal_modus: 'organisation',
    org_kennung: 'staging-muster-west',
    org_anzeigename: 'Musterverwaltung West',
    freigabe_modus: 'freigabe',
    quelle: 'staging-seed',
    notizen: 'STAGING HV West ohne Login',
  }
)

const mieterId = await upsertBy(
  'kunden',
  { email: 'mieter-muster@example.test' },
  {
    name: 'Mia Muster',
    vorname: 'Mia',
    nachname: 'Muster',
    typ: 'privat',
    email: 'mieter-muster@example.test',
    telefon: '089 2222 0001',
    strasse: 'Leopoldstraße',
    hausnummer: '10',
    plz: '80802',
    ort: 'München',
    adresse: 'Leopoldstraße 10',
    portal_modus: 'mieter',
    auth_user_id: mieterAuthId,
    quelle: 'staging-seed',
    notizen: 'STAGING Mieter',
  }
)

const bergerId = await upsertBy(
  'kunden',
  { email: 'familie.berger@example.test' },
  {
    name: 'Familie Berger',
    vorname: 'Anna',
    nachname: 'Berger',
    typ: 'privat',
    email: 'familie.berger@example.test',
    telefon: '089 2222 0002',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '88',
    plz: '81541',
    ort: 'München',
    adresse: 'Tegernseer Landstraße 88',
    portal_modus: 'privat',
    quelle: 'staging-seed',
    notizen: 'STAGING Privatkunde Berger',
  }
)

const cafeId = await upsertBy(
  'kunden',
  { email: 'cafe.giesing@example.test' },
  {
    name: 'Café Giesing GmbH',
    typ: 'gewerbe',
    email: 'cafe.giesing@example.test',
    telefon: '089 2222 0003',
    strasse: 'Giesinger Bahnhofplatz',
    hausnummer: '1',
    plz: '81539',
    ort: 'München',
    adresse: 'Giesinger Bahnhofplatz 1',
    portal_modus: 'privat',
    quelle: 'staging-seed',
    notizen: 'STAGING Gewerbe Café',
  }
)

console.log(`  kunden: 6 (3 HV, 1 Mieter, 1 Privat, 1 Gewerbe)`)

const objektNordId = await upsertBy(
  'kunden_objekte',
  { kunde_id: hvNordId, titel: 'WEG Leopold 10 (Staging)' },
  {
    kunde_id: hvNordId,
    titel: 'WEG Leopold 10 (Staging)',
    strasse: 'Leopoldstraße',
    hausnummer: '10',
    plz: '80802',
    ort: 'München',
    typ: 'Mehrfamilienhaus',
    melde_aktiv: true,
    melde_slug: 'staging-leopold-10',
  }
)

const objektSuedId = await upsertBy(
  'kunden_objekte',
  { kunde_id: hvSuedId, titel: 'Wohnanlage Tegernseer 40 (Staging)' },
  {
    kunde_id: hvSuedId,
    titel: 'Wohnanlage Tegernseer 40 (Staging)',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '40',
    plz: '81541',
    ort: 'München',
    typ: 'Wohnanlage',
    melde_aktiv: true,
    melde_slug: 'staging-tegernseer-40',
  }
)

const einheitId = await upsertBy(
  'objekt_einheiten',
  { kunde_objekt_id: objektNordId, bezeichnung: 'WE 12 (Staging)' },
  {
    kunde_objekt_id: objektNordId,
    bezeichnung: 'WE 12 (Staging)',
    sort_order: 12,
    aktiv: true,
  }
)

await upsertBy(
  'einheit_bewohner',
  { objekt_einheit_id: einheitId, email: 'mieter-muster@example.test' },
  {
    kunde_id: hvNordId,
    objekt_einheit_id: einheitId,
    name: 'Mia Muster',
    email: 'mieter-muster@example.test',
    telefon: '089 2222 0001',
    rolle: 'mieter',
    aktiv: true,
    portal_kunde_id: mieterId,
  }
)

const handwerkerSpecs = [
  {
    email: 'partner-elektro@example.test',
    firma: 'Elektro Muster GmbH',
    vorname: 'Emil',
    nachname: 'Muster',
    telefon: '089 3333 0001',
    strasse: 'Stagingweg',
    hausnummer: '7',
    gewerke: ['elektrik'],
    fachbetrieb: true,
    auth_user_id: partnerAuthIds.elektro,
  },
  {
    email: 'partner-maler@example.test',
    firma: 'Maler Weiß & Sohn',
    vorname: 'Walter',
    nachname: 'Weiß',
    telefon: '089 3333 0002',
    strasse: 'Pinselstraße',
    hausnummer: '4',
    gewerke: ['maler'],
    fachbetrieb: false,
  },
  {
    email: 'partner-sanitaer@example.test',
    firma: 'Sanitär Klar',
    vorname: 'Katja',
    nachname: 'Klar',
    telefon: '089 3333 0003',
    strasse: 'Rohrweg',
    hausnummer: '12',
    gewerke: ['sanitaer'],
    fachbetrieb: true,
  },
  {
    email: 'partner-dach@example.test',
    firma: 'Dach & Fassade Huber',
    vorname: 'Hans',
    nachname: 'Huber',
    telefon: '089 3333 0004',
    strasse: 'Firstweg',
    hausnummer: '9',
    gewerke: ['dach'],
    fachbetrieb: true,
  },
  {
    email: 'partner-boden@example.test',
    firma: 'Boden Schmidt',
    vorname: 'Sara',
    nachname: 'Schmidt',
    telefon: '089 3333 0005',
    strasse: 'Parkettgasse',
    hausnummer: '3',
    gewerke: ['boden'],
    fachbetrieb: false,
  },
]

for (const h of handwerkerSpecs) {
  await upsertBy(
    'handwerker',
    { email: h.email },
    {
      name: h.firma,
      firma: h.firma,
      vorname: h.vorname,
      nachname: h.nachname,
      email: h.email,
      telefon: h.telefon,
      strasse: h.strasse,
      hausnummer: h.hausnummer,
      plz: '80331',
      ort: 'München',
      adresse: `${h.strasse} ${h.hausnummer}`,
      gewerke: h.gewerke,
      aktiv: true,
      ist_fachbetrieb: h.fachbetrieb,
      auth_user_id: h.auth_user_id ?? null,
      notizen: `STAGING Partner ${h.firma}`,
    }
  )
}
console.log('  handwerker: 5')

const leadSpecs = [
  {
    matchNotiz: 'STAGING-LEAD-NEU',
    status: 'neu',
    kanal: 'website',
    situation: 'Wohnzimmer streichen, Farbberatung gewünscht',
    kunde_id: bergerId,
    kundentyp: 'privat',
    bereiche: ['maler'],
    kontakt_name: 'Anna Berger',
    kontakt_email: 'familie.berger@example.test',
    plz: '81541',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '88',
  },
  {
    matchNotiz: 'STAGING-LEAD-KONTAKTIERT',
    status: 'kontaktiert',
    kanal: 'telefon',
    situation: 'Theke Café neu fliesen, Termin zur Besichtigung offen',
    kunde_id: cafeId,
    kundentyp: 'gewerbe',
    bereiche: ['boden'],
    kontakt_name: 'Café Giesing',
    kontakt_email: 'cafe.giesing@example.test',
    plz: '81539',
    strasse: 'Giesinger Bahnhofplatz',
    hausnummer: '1',
  },
  {
    matchNotiz: 'STAGING-LEAD-TERMIN',
    status: 'termin',
    kanal: 'hv_direkt',
    situation: 'Steigleitung prüfen vor Sanierung WE 12',
    kunde_id: mieterId,
    auftraggeber_kunde_id: hvNordId,
    kunde_objekt_id: objektNordId,
    kundentyp: 'hausverwaltung',
    bereiche: ['sanitaer'],
    kontakt_name: 'Mia Muster',
    kontakt_email: 'mieter-muster@example.test',
    plz: '80802',
    strasse: 'Leopoldstraße',
    hausnummer: '10',
    anlass: 'meldung',
  },
  {
    matchNotiz: 'STAGING-LEAD-ANGEBOT',
    status: 'angebot',
    kanal: 'servicepaket',
    situation: 'Malerarbeiten Treppenhaus Wohnanlage Süd',
    kunde_id: hvSuedId,
    auftraggeber_kunde_id: hvSuedId,
    kunde_objekt_id: objektSuedId,
    kundentyp: 'hausverwaltung',
    bereiche: ['maler'],
    kontakt_name: 'Musterverwaltung Süd',
    kontakt_email: 'hv-sued@example.test',
    plz: '81541',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '40',
  },
  {
    matchNotiz: 'STAGING-LEAD-AUFTRAG',
    status: 'auftrag',
    kanal: 'hv_katalog',
    situation: 'Steckdosen Küche nachrüsten WE 12',
    kunde_id: mieterId,
    auftraggeber_kunde_id: hvNordId,
    kunde_objekt_id: objektNordId,
    kundentyp: 'hausverwaltung',
    bereiche: ['elektrik'],
    kontakt_name: 'Mia Muster',
    kontakt_email: 'mieter-muster@example.test',
    plz: '80802',
    strasse: 'Leopoldstraße',
    hausnummer: '10',
    anlass: 'meldung',
  },
  {
    matchNotiz: 'STAGING-LEAD-ABGESCHLOSSEN',
    status: 'abgeschlossen',
    kanal: 'email',
    situation: 'Schlafzimmer gestrichen, Abnahme erfolgt',
    kunde_id: bergerId,
    kundentyp: 'privat',
    bereiche: ['maler'],
    kontakt_name: 'Anna Berger',
    kontakt_email: 'familie.berger@example.test',
    plz: '81541',
    strasse: 'Tegernseer Landstraße',
    hausnummer: '88',
  },
  {
    matchNotiz: 'STAGING-LEAD-ABGEBROCHEN',
    status: 'abgebrochen',
    kanal: 'website',
    situation: 'Dachcheck angefragt, Kunde hat anderes Angebot genommen',
    kunde_id: cafeId,
    kundentyp: 'gewerbe',
    bereiche: ['dach'],
    kontakt_name: 'Café Giesing',
    kontakt_email: 'cafe.giesing@example.test',
    plz: '81539',
    strasse: 'Giesinger Bahnhofplatz',
    hausnummer: '1',
  },
]

for (const spec of leadSpecs) {
  await upsertBy(
    'leads',
    { notizen: spec.matchNotiz },
    {
      kunde_id: spec.kunde_id,
      auftraggeber_kunde_id: spec.auftraggeber_kunde_id ?? null,
      kunde_objekt_id: spec.kunde_objekt_id ?? null,
      kanal: spec.kanal,
      status: spec.status,
      situation: spec.situation,
      bereiche: spec.bereiche,
      plz: spec.plz,
      strasse: spec.strasse,
      hausnummer: spec.hausnummer,
      kundentyp: spec.kundentyp,
      kontakt_name: spec.kontakt_name,
      kontakt_email: spec.kontakt_email,
      notizen: spec.matchNotiz,
      anlass: spec.anlass ?? 'projekt',
      erfassung_von: 'crm',
      org_freigabe_status:
        spec.kundentyp === 'hausverwaltung' && spec.status === 'neu'
          ? 'ausstehend'
          : spec.kundentyp === 'hausverwaltung'
            ? 'freigegeben'
            : 'nicht_noetig',
      funnel_daten: { quelle: 'staging-seed', staging: true },
      erstellt_von: adminId,
    }
  )
}
console.log('  vorgänge: 7 (neu, kontaktiert, termin, angebot, auftrag, abgeschlossen, abgebrochen)')

void hvWestId

console.log('')
console.log('Seed fertig.')
console.log(`  CRM-Admin  ${STAGING_ADMIN_EMAIL}  /  ${STAGING_ADMIN_PASSWORD}`)
console.log('  HV Nord    hv-nord@example.test')
console.log('  HV Süd     hv-sued@example.test')
console.log('  Mieter     mieter-muster@example.test')
console.log('  Partner    partner-elektro@example.test')
console.log(`  Passwort aller Test-Logins: ${STAGING_PASSWORD}`)
