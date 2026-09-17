#!/usr/bin/env node
/**
 * Prod → Staging Snapshot (anonymisiert) — View–Action- / Ownership-Historie.
 *
 *   node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs
 *   node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs --export-only
 *   node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs --import-only
 *   node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs --dry-run
 *
 * Env:
 *   Prod-Lesen:  PROD_SUPABASE_URL + PROD_SERVICE_ROLE_KEY  (nur SELECT)
 *   Staging-Schreiben: STAGING_SUPABASE_URL + STAGING_SERVICE_ROLE_KEY (+ Guard)
 *
 * Regeln:
 * - Keine Dokumente/Fotos/Mail-Bodies/Storage-Blobs
 * - Anonymisierung PFLICHT vor Import (DSGVO)
 * - IDs, Status, Beträge, Daten, Verknüpfungen behalten
 * - Auth-User-FKs (erstellt_von u.ä.) → NULL (Staging hat andere user_profiles)
 * - Titel/Namen mit Präfix PRODSIM- (unterscheidbar von ZZTEST)
 * - Report: Zeilenzahlen + Anomalien (tote FKs, Null-Pflichtfelder) = erstes Testergebnis
 */
import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  PROD_PROJECT_REF,
  STAGING_PROJECT_REF_CANON,
  assertNotProdWrite,
  assertStagingWriteTarget,
} from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '../..')
const DUMP_DIR = join(__dirname, 'dumps/prodsim')
const DUMP_FILE = join(DUMP_DIR, 'snapshot-anonymized.json')
const REPORT_FILE = join(DUMP_DIR, 'import-report.json')

const PREFIX = 'PRODSIM-'
const PAGE = 1000
const BATCH = 80

/** Import-Reihenfolge (FK-sicher). handwerker nur referenzierte Partner. */
const TABLE_ORDER = [
  'handwerker',
  'kunden',
  'kunden_ansprechpartner',
  'kunden_objekte',
  'objekt_einheiten',
  'leads',
  'angebote',
  'angebot_handwerker',
  'auftraege',
  'auftrag_handwerker',
  'rechnungen',
  'lead_notizen',
  'lead_timeline',
]

/** Spalten die wir nie exportieren / immer leeren (Dokumente, Mail, Storage). */
const STRIP_ALWAYS = new Set([
  'pdf_url',
  'pdf_generiert_at',
  'hw_angebot_pdf_url',
  'hw_rechnung_pdf_url',
  'hw_angebot_anhang_urls',
  'fotos_urls',
  'visualisierung_ids',
  'cover_url',
  'logo_url',
  'org_logo_url',
  'org_hero_url',
  'abnahme_protokoll_url',
  'abschlussdokumentation_url',
  'versicherungsakte_pdf_url',
  'datei_url',
  'datei_urls',
  'av_text_snapshot',
  'mail_einleitung',
  'mail_betreff',
])

/** FK-Definitionen innerhalb des Snapshots (+ externe Referenzen). */
const FK_MAP = {
  kunden_ansprechpartner: [{ col: 'kunde_id', parent: 'kunden', required: true }],
  kunden_objekte: [{ col: 'kunde_id', parent: 'kunden', required: true }],
  objekt_einheiten: [{ col: 'kunde_objekt_id', parent: 'kunden_objekte', required: true }],
  leads: [
    { col: 'kunde_id', parent: 'kunden', required: false },
    { col: 'auftraggeber_kunde_id', parent: 'kunden', required: false },
    { col: 'kunde_objekt_id', parent: 'kunden_objekte', required: false },
    { col: 'ansprechpartner_id', parent: 'kunden_ansprechpartner', required: false },
    { col: 'zusammengefuehrt_in', parent: 'leads', required: false },
  ],
  angebote: [
    { col: 'lead_id', parent: 'leads', required: false },
    { col: 'kunde_id', parent: 'kunden', required: false },
    { col: 'kunde_objekt_id', parent: 'kunden_objekte', required: false },
    { col: 'ansprechpartner_id', parent: 'kunden_ansprechpartner', required: false },
    { col: 'ersetzt_durch', parent: 'angebote', required: false },
    { col: 'korrektur_von', parent: 'angebote', required: false },
  ],
  angebot_handwerker: [
    { col: 'angebot_id', parent: 'angebote', required: true },
    { col: 'handwerker_id', parent: 'handwerker', required: true },
    { col: 'gewerk_id', parent: '__staging_gewerke', required: false },
  ],
  auftraege: [
    { col: 'angebot_id', parent: 'angebote', required: false },
    { col: 'lead_id', parent: 'leads', required: false },
    { col: 'kunde_id', parent: 'kunden', required: false },
  ],
  auftrag_handwerker: [
    { col: 'auftrag_id', parent: 'auftraege', required: true },
    { col: 'handwerker_id', parent: 'handwerker', required: true },
    { col: 'gewerk_id', parent: '__staging_gewerke', required: false },
    { col: 'abnahme_protokoll_id', parent: '__drop', required: false },
  ],
  rechnungen: [
    { col: 'angebot_id', parent: 'angebote', required: false },
    { col: 'auftrag_id', parent: 'auftraege', required: false },
    { col: 'kunde_id', parent: 'kunden', required: false },
    { col: 'kunde_objekt_id', parent: 'kunden_objekte', required: false },
    { col: 'ansprechpartner_id', parent: 'kunden_ansprechpartner', required: false },
    { col: 'handwerker_id', parent: 'handwerker', required: false },
    { col: 'angebot_handwerker_id', parent: 'angebot_handwerker', required: false },
    { col: 'bezug_rechnung_id', parent: 'rechnungen', required: false },
    { col: 'ersetzt_durch', parent: 'rechnungen', required: false },
    { col: 'korrektur_von', parent: 'rechnungen', required: false },
  ],
  lead_notizen: [
    { col: 'lead_id', parent: 'leads', required: true },
    { col: 'quelle_notiz_id', parent: 'lead_notizen', required: false },
    { col: 'kalender_termin_id', parent: '__drop', required: false },
  ],
  lead_timeline: [
    { col: 'lead_id', parent: 'leads', required: true },
    { col: 'angebot_id', parent: 'angebote', required: false },
    { col: 'email_log_id', parent: '__drop', required: false },
  ],
}

const FIRST_NAMES = [
  'Alex', 'Blair', 'Casey', 'Dana', 'Eden', 'Finn', 'Gray', 'Harper', 'Indigo', 'Jordan',
  'Kai', 'Logan', 'Morgan', 'Noa', 'Oakley', 'Parker', 'Quinn', 'Riley', 'Sage', 'Taylor',
  'Uri', 'Val', 'Winter', 'Yael', 'Zion', 'Mila', 'Nora', 'Otto', 'Pia', 'Rune',
]
const LAST_NAMES = [
  'Berger', 'Hoffmann', 'Keller', 'Lang', 'Meier', 'Neumann', 'Oswald', 'Peters', 'Richter',
  'Schulz', 'Vogel', 'Wagner', 'Zimmermann', 'Albrecht', 'Brandt', 'Dreher', 'Engel', 'Fischer',
  'Graf', 'Haas', 'Jung', 'Koch', 'Lehmann', 'Moser', 'Nagel',
]
const STREETS = [
  'Ahornweg', 'Birkenstraße', 'Castellplatz', 'Dornierstraße', 'Eichenallee', 'Fichtenweg',
  'Gartenstraße', 'Haselnußweg', 'Isarring', 'Jägerstraße',
]

function loadEnvFile(name) {
  const envPath = join(CRM_ROOT, name)
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

function parseArgs(argv) {
  const flags = {
    exportOnly: argv.includes('--export-only'),
    importOnly: argv.includes('--import-only'),
    dryRun: argv.includes('--dry-run'),
  }
  if (flags.exportOnly && flags.importOnly) {
    console.error('ABORT: --export-only und --import-only schließen sich aus')
    process.exit(1)
  }
  return flags
}

function hashHex(input, len = 12) {
  return createHash('sha256').update(String(input)).digest('hex').slice(0, len)
}

function pick(list, seed) {
  const n = parseInt(hashHex(seed, 8), 16)
  return list[n % list.length]
}

function fakerName(seed) {
  return `${pick(FIRST_NAMES, seed + ':fn')} ${pick(LAST_NAMES, seed + ':ln')}`
}

function fakerFirst(seed) {
  return pick(FIRST_NAMES, seed + ':first')
}

function fakerLast(seed) {
  return pick(LAST_NAMES, seed + ':last')
}

function prodsimEmail(seed) {
  return `prodsim-${hashHex(seed, 10)}@example.test`
}

function dummyPhone(seed) {
  const n = parseInt(hashHex(seed, 6), 16) % 9000000
  return `089 ${String(1000000 + n).slice(0, 4)} ${String(1000 + (n % 9000)).slice(0, 4)}`
}

function dummyStreet(seed) {
  return pick(STREETS, seed + ':st')
}

function rotateToken(kind, seed) {
  return `prodsim_${kind}_${hashHex(seed, 8)}_${randomBytes(8).toString('base64url')}`
}

function withPrefix(value, seed) {
  const base = String(value ?? '').trim()
  if (!base) return `${PREFIX}${fakerName(seed)}`
  if (base.startsWith(PREFIX)) return base
  // Kurz halten, Klartext nicht 1:1 übernehmen
  const short = base.length > 48 ? `${base.slice(0, 45)}…` : base
  return `${PREFIX}${short}`
}

function scrubFreeText(value, seed, max = 120) {
  if (value == null) return value
  // Booleans/Zahlen nie zu Strings machen (z. B. leads.duplikat_hinweis = bool)
  if (typeof value !== 'string') return value
  let s = value.trim()
  if (!s) return s
  // E-Mails in Freitext maskieren (PII-Guard)
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, prodsimEmail(seed))
  return `${PREFIX}Text ${hashHex(seed, 6)} · ${s.slice(0, Math.min(40, max))}…`
}

function scrubJsonPii(obj, seed) {
  if (obj == null) return obj
  if (Array.isArray(obj)) return obj.map((v, i) => scrubJsonPii(v, `${seed}:${i}`))
  if (typeof obj !== 'object') return obj
  const out = { ...obj }
  for (const key of Object.keys(out)) {
    const k = key.toLowerCase()
    if (typeof out[key] === 'boolean' || typeof out[key] === 'number') continue
    if (k.includes('foto') || k.includes('photo') || k.includes('image') || k.includes('url')) {
      out[key] = Array.isArray(out[key]) ? [] : null
      continue
    }
    if (k.includes('email') || k === 'mail') {
      out[key] = prodsimEmail(`${seed}:${key}`)
      continue
    }
    if (k.includes('telefon') || k.includes('phone') || k === 'tel') {
      out[key] = dummyPhone(`${seed}:${key}`)
      continue
    }
    if (
      k.includes('name') ||
      k.includes('strasse') ||
      k.includes('nachricht') ||
      k.includes('notiz') ||
      k.includes('text')
    ) {
      if (typeof out[key] === 'string') out[key] = scrubFreeText(out[key], `${seed}:${key}`, 80)
      continue
    }
    if (typeof out[key] === 'object') out[key] = scrubJsonPii(out[key], `${seed}:${key}`)
  }
  return out
}

/** Staging hat andere Auth-User — Prod-UUIDs würden FK sprengen. */
function nullAuthUserFks(row, { keepRequiredCreatedBy = false } = {}) {
  const out = { ...row }
  for (const key of Object.keys(out)) {
    if (keepRequiredCreatedBy && (key === 'created_by' || key === 'erstellt_von')) continue
    if (
      key === 'erstellt_von' ||
      key === 'storniert_von' ||
      key === 'updated_by' ||
      key === 'created_by' ||
      key === 'betreuer_id' ||
      key.endsWith('_von_user_id') ||
      key === 'auth_user_id'
    ) {
      out[key] = null
    }
  }
  return out
}

function stripBlobFields(row) {
  const out = { ...row }
  for (const key of Object.keys(out)) {
    if (STRIP_ALWAYS.has(key)) {
      if (key.endsWith('_urls') || key.endsWith('_ids')) out[key] = []
      else out[key] = null
    }
  }
  return out
}

function anonymizeHandwerker(row) {
  const id = row.id
  const name = `${PREFIX}${fakerName(id)}`
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      name,
      firma: `${PREFIX}Firma ${fakerLast(id)}`,
      vorname: fakerFirst(id),
      nachname: fakerLast(id),
      email: prodsimEmail(`hw:${id}`),
      telefon: dummyPhone(`hw:${id}`),
      whatsapp: null,
      adresse: `${dummyStreet(id)} 1, 80331 München`,
      strasse: dummyStreet(id),
      hausnummer: '1',
      plz: '80331',
      ort: 'München',
      notizen: scrubFreeText(row.notizen, `hw-notiz:${id}`),
      steuernummer: null,
      ustid: null,
      iban: null,
      bic: null,
      bank: null,
      handelsregister: null,
      webseite: null,
      auth_user_id: null,
      logo_url: null,
      // Staging partner_kategorien ≠ Prod — tot → null
      partner_kategorie_id: null,
    })
  )
}

function anonymizeKunde(row) {
  const id = row.id
  const name = withPrefix(row.org_anzeigename || row.name || fakerName(id), `k:${id}`)
  const orgKennung =
    row.org_kennung != null && String(row.org_kennung).trim()
      ? `prodsim-${hashHex(String(row.org_kennung), 10)}`
      : row.org_kennung
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      name,
      vorname: fakerFirst(id),
      nachname: fakerLast(id),
      email: prodsimEmail(`kunde:${id}`),
      telefon: dummyPhone(`kunde:${id}`),
      adresse: `${dummyStreet(id)} 12, 80331 München`,
      strasse: dummyStreet(id),
      hausnummer: '12',
      plz: row.plz || '80331',
      ort: row.ort || 'München',
      ansprechpartner: row.ansprechpartner ? `${PREFIX}${fakerName(`${id}:ap`)}` : row.ansprechpartner,
      notizen: scrubFreeText(row.notizen, `k-notiz:${id}`),
      webseite: null,
      ust_id: null,
      auth_user_id: null,
      org_kennung: orgKennung,
      org_anzeigename: row.org_anzeigename ? withPrefix(row.org_anzeigename, `org:${id}`) : row.org_anzeigename,
      org_telefon: row.org_telefon ? dummyPhone(`orgtel:${id}`) : row.org_telefon,
      org_strasse: row.org_strasse ? dummyStreet(`orgst:${id}`) : row.org_strasse,
      org_ort: row.org_ort || row.ort || 'München',
      mieter_kontakt_telefon: row.mieter_kontakt_telefon
        ? dummyPhone(`mieter:${id}`)
        : row.mieter_kontakt_telefon,
      mieter_kontakt_email: row.mieter_kontakt_email
        ? prodsimEmail(`mieter:${id}`)
        : row.mieter_kontakt_email,
      mieter_kontakt_hinweis: scrubFreeText(row.mieter_kontakt_hinweis, `mieterh:${id}`, 60),
      av_akzeptiert_von: null,
      wl_ansprache_am: row.wl_ansprache_am,
    })
  )
}

function anonymizeObjekt(row) {
  const id = row.id
  // Staging: created_by ist 'crm'|'portal' (CHECK), nicht User-UUID
  const createdBy =
    row.created_by === 'portal' || row.created_by === 'crm' ? row.created_by : 'crm'
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      titel: withPrefix(row.titel || 'Objekt', `obj:${id}`),
      strasse: dummyStreet(id),
      hausnummer: String((parseInt(hashHex(id, 2), 16) % 80) + 1),
      plz: row.plz || '80331',
      ort: row.ort || 'München',
      melde_slug: row.melde_slug
        ? `prodsim-${hashHex(row.melde_slug, 10)}`
        : row.melde_slug,
      einheiten_hinweis: scrubFreeText(row.einheiten_hinweis, `eh:${id}`, 60),
      notizen_intern: scrubFreeText(row.notizen_intern, `oin:${id}`),
      versicherer: row.versicherer ? `${PREFIX}Versicherer` : row.versicherer,
      versicherungs_nr: row.versicherungs_nr
        ? `PS-${hashHex(row.versicherungs_nr, 8)}`
        : row.versicherungs_nr,
      created_by: createdBy,
    }),
    { keepRequiredCreatedBy: true }
  )
}

function anonymizeEinheit(row) {
  return nullAuthUserFks({
    ...row,
    bezeichnung: withPrefix(row.bezeichnung || 'WE', `ein:${row.id}`),
  })
}

function anonymizeAnsprechpartner(row) {
  const id = row.id
  return nullAuthUserFks({
    ...row,
    name: `${PREFIX}${fakerName(id)}`,
    email: prodsimEmail(`ap:${id}`),
    telefon: dummyPhone(`ap:${id}`),
  })
}

function anonymizeLead(row) {
  const id = row.id
  const funnel = scrubJsonPii(row.funnel_daten, `funnel:${id}`)
  if (funnel && typeof funnel === 'object') {
    funnel.fotos = []
    funnel.prodsim = true
  }
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      situation: withPrefix(row.situation || 'Meldung', `sit:${id}`),
      kontakt_name: `${PREFIX}${fakerName(`kn:${id}`)}`,
      kontakt_email: prodsimEmail(`ke:${id}`),
      kontakt_telefon: dummyPhone(`kt:${id}`),
      kontakt_nachricht: scrubFreeText(row.kontakt_nachricht, `km:${id}`),
      notizen: scrubFreeText(row.notizen, `ln:${id}`),
      vor_ort_notizen: scrubFreeText(row.vor_ort_notizen, `von:${id}`),
      melder_name: row.melder_name ? `${PREFIX}${fakerName(`mn:${id}`)}` : row.melder_name,
      melder_email: row.melder_email ? prodsimEmail(`me:${id}`) : row.melder_email,
      melder_telefon: row.melder_telefon ? dummyPhone(`mt:${id}`) : row.melder_telefon,
      melder_einheit: row.melder_einheit
        ? withPrefix(row.melder_einheit, `meu:${id}`)
        : row.melder_einheit,
      ki_zusammenfassung: scrubFreeText(row.ki_zusammenfassung, `ki:${id}`, 80),
      strasse: row.strasse ? dummyStreet(`ls:${id}`) : row.strasse,
      hausnummer: row.hausnummer ? '7' : row.hausnummer,
      funnel_daten: funnel,
      einladung_token: row.einladung_token ? rotateToken('einladung', id) : row.einladung_token,
      melde_tracking_token: row.melde_tracking_token
        ? rotateToken('melde', id)
        : row.melde_tracking_token,
      versicherungs_nr: row.versicherungs_nr
        ? `PS-${hashHex(row.versicherungs_nr, 8)}`
        : row.versicherungs_nr,
      storniert_grund: scrubFreeText(row.storniert_grund, `sg:${id}`, 60),
      wiedervorlage_notiz: scrubFreeText(row.wiedervorlage_notiz, `wv:${id}`, 60),
      // duplikat_hinweis ist boolean — nicht als Text scrubben
      duplikat_hinweis: typeof row.duplikat_hinweis === 'boolean' ? row.duplikat_hinweis : null,
    })
  )
}

function anonymizeAngebot(row) {
  const id = row.id
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      notizen: scrubFreeText(row.notizen, `an:${id}`),
      leistungsumfang: withPrefix(row.leistungsumfang || 'Leistung', `lu:${id}`),
      einleitung: scrubFreeText(row.einleitung, `ae:${id}`, 80),
      hinweise: scrubFreeText(row.hinweise, `ah:${id}`, 80),
      wichtige_hinweise: scrubFreeText(row.wichtige_hinweise, `aw:${id}`, 80),
      projektbeschreibung: scrubFreeText(row.projektbeschreibung, `ap:${id}`),
      zahlungsbedingungen: row.zahlungsbedingungen
        ? `${PREFIX}Zahlungsziel unverändert (anonym)`
        : row.zahlungsbedingungen,
      ablehnung_notiz: scrubFreeText(row.ablehnung_notiz, `abl:${id}`, 60),
      ablehnung_grund: scrubFreeText(row.ablehnung_grund, `abg:${id}`, 60),
      wiedervorlage_notiz: scrubFreeText(row.wiedervorlage_notiz, `anwv:${id}`, 60),
    })
  )
}

function anonymizeAngebotHw(row) {
  const id = row.id
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      notizen: scrubFreeText(row.notizen, `ahw:${id}`, 60),
      antwort_notiz: scrubFreeText(row.antwort_notiz, `ahw-a:${id}`, 60),
      hw_notiz: scrubFreeText(row.hw_notiz, `ahw-h:${id}`, 60),
      hw_crm_notiz: scrubFreeText(row.hw_crm_notiz, `ahw-c:${id}`, 60),
      ablehnung_grund: scrubFreeText(row.ablehnung_grund, `ahw-abl:${id}`, 60),
      aufgabe_notiz: scrubFreeText(row.aufgabe_notiz, `ahw-auf:${id}`, 60),
      token: row.token ? rotateToken('hw', id) : row.token,
    })
  )
}

function anonymizeAuftrag(row) {
  const id = row.id
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      titel: withPrefix(row.titel || 'Auftrag', `auf:${id}`),
      notizen: scrubFreeText(row.notizen, `aufn:${id}`),
      kunden_token: row.kunden_token ? rotateToken('projekt', id) : row.kunden_token,
      bauleiter_name: row.bauleiter_name ? `${PREFIX}${fakerName(`bl:${id}`)}` : row.bauleiter_name,
      bauleiter_telefon: row.bauleiter_telefon ? dummyPhone(`blt:${id}`) : row.bauleiter_telefon,
      bauleiter_email: row.bauleiter_email ? prodsimEmail(`ble:${id}`) : row.bauleiter_email,
      bau_mannschaft: scrubFreeText(row.bau_mannschaft, `bm:${id}`, 60),
      bau_nachunternehmer_name: row.bau_nachunternehmer_name
        ? `${PREFIX}${fakerName(`nu:${id}`)}`
        : row.bau_nachunternehmer_name,
      bau_nachunternehmer_firma: row.bau_nachunternehmer_firma
        ? `${PREFIX}NU ${fakerLast(id)}`
        : row.bau_nachunternehmer_firma,
      versicherungs_nr: row.versicherungs_nr
        ? `PS-${hashHex(row.versicherungs_nr, 8)}`
        : row.versicherungs_nr,
      wiedervorlage_notiz: scrubFreeText(row.wiedervorlage_notiz, `aufwv:${id}`, 60),
      naechster_schritt: scrubFreeText(row.naechster_schritt, `ns:${id}`, 60),
    })
  )
}

function anonymizeAuftragHw(row) {
  return nullAuthUserFks({
    ...row,
    notizen: scrubFreeText(row.notizen, `aufhw:${row.id}`, 60),
    absprachen: scrubFreeText(row.absprachen, `aufhwa:${row.id}`, 60),
    abnahme_protokoll_id: null,
  })
}

function anonymizeRechnung(row) {
  const id = row.id
  return nullAuthUserFks(
    stripBlobFields({
      ...row,
      notizen: scrubFreeText(row.notizen, `re:${id}`),
      einleitung: scrubFreeText(row.einleitung, `rei:${id}`, 80),
      hinweise: scrubFreeText(row.hinweise, `reh:${id}`, 80),
      mail_einleitung: null,
      mail_betreff: null,
      reklamation_grund: scrubFreeText(row.reklamation_grund, `rek:${id}`, 60),
      wiedervorlage_notiz: scrubFreeText(row.wiedervorlage_notiz, `rewv:${id}`, 60),
      zahlungsbedingungen: row.zahlungsbedingungen
        ? `${PREFIX}Zahlungsziel unverändert (anonym)`
        : row.zahlungsbedingungen,
    })
  )
}

function anonymizeLeadNotiz(row) {
  return nullAuthUserFks({
    id: row.id,
    lead_id: row.lead_id,
    titel: withPrefix(row.titel || 'Notiz', `nt:${row.id}`),
    inhalt: scrubFreeText(row.inhalt, `ni:${row.id}`, 100),
    erstellt_von: null,
    created_at: row.created_at,
    kalender_termin_id: null,
    datei_url: null,
    datei_urls: [],
    quelle_notiz_id: row.quelle_notiz_id,
  })
}

function anonymizeLeadTimeline(row) {
  return nullAuthUserFks({
    id: row.id,
    lead_id: row.lead_id,
    typ: row.typ,
    titel: withPrefix(row.titel || 'Ereignis', `tt:${row.id}`),
    beschreibung: scrubFreeText(row.beschreibung, `td:${row.id}`, 100),
    erstellt_von: null,
    created_at: row.created_at,
    angebot_id: row.angebot_id,
    email_log_id: null,
  })
}

const ANON = {
  handwerker: anonymizeHandwerker,
  kunden: anonymizeKunde,
  kunden_ansprechpartner: anonymizeAnsprechpartner,
  kunden_objekte: anonymizeObjekt,
  objekt_einheiten: anonymizeEinheit,
  leads: anonymizeLead,
  angebote: anonymizeAngebot,
  angebot_handwerker: anonymizeAngebotHw,
  auftraege: anonymizeAuftrag,
  auftrag_handwerker: anonymizeAuftragHw,
  rechnungen: anonymizeRechnung,
  lead_notizen: anonymizeLeadNotiz,
  lead_timeline: anonymizeLeadTimeline,
}

function clientFor(url, key, label) {
  if (!url || !key) {
    console.error(`ABORT: ${label} URL/Key fehlen`)
    process.exit(1)
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function fetchAll(supabase, table) {
  const rows = []
  let from = 0
  for (;;) {
    const to = from + PAGE - 1
    const { data, error } = await supabase.from(table).select('*').range(from, to)
    if (error) throw new Error(`${table}: ${error.message}`)
    const chunk = data ?? []
    rows.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }
  return rows
}

function idSet(rows) {
  return new Set((rows ?? []).map((r) => r.id).filter(Boolean))
}

function applyFkAnomalies(tables, stagingGewerkeIds, anomalies) {
  const sets = {
    handwerker: idSet(tables.handwerker),
    kunden: idSet(tables.kunden),
    kunden_ansprechpartner: idSet(tables.kunden_ansprechpartner),
    kunden_objekte: idSet(tables.kunden_objekte),
    objekt_einheiten: idSet(tables.objekt_einheiten),
    leads: idSet(tables.leads),
    angebote: idSet(tables.angebote),
    angebot_handwerker: idSet(tables.angebot_handwerker),
    auftraege: idSet(tables.auftraege),
    auftrag_handwerker: idSet(tables.auftrag_handwerker),
    rechnungen: idSet(tables.rechnungen),
    lead_notizen: idSet(tables.lead_notizen),
    lead_timeline: idSet(tables.lead_timeline),
    __staging_gewerke: stagingGewerkeIds,
    __drop: new Set(),
  }

  for (const [table, fks] of Object.entries(FK_MAP)) {
    const rows = tables[table] ?? []
    for (const row of rows) {
      for (const fk of fks) {
        const val = row[fk.col]
        if (val == null || val === '') continue
        if (fk.parent === '__drop') {
          anomalies.push({
            type: 'fk_dropped_external',
            table,
            id: row.id,
            column: fk.col,
            value: val,
            note: 'Externes Ziel nicht im Snapshot — genullt',
          })
          row[fk.col] = null
          continue
        }
        const parentSet = sets[fk.parent]
        if (!parentSet) continue
        if (!parentSet.has(val)) {
          anomalies.push({
            type: fk.required ? 'fk_dead_required' : 'fk_dead_optional',
            table,
            id: row.id,
            column: fk.col,
            value: val,
            parent: fk.parent,
          })
          row[fk.col] = null
        }
      }
    }
  }
}

function assertNoPiiLeak(tables, anomalies) {
  const emailRe = /@[a-z0-9.-]+\.(de|com|net|org|eu)\b/i
  const banned = ['outllok', 'gmail.com', 'web.de', 'gmx.', 't-online']
  for (const [table, rows] of Object.entries(tables)) {
    for (const row of rows) {
      const blob = JSON.stringify(row)
      if (banned.some((b) => blob.toLowerCase().includes(b))) {
        anomalies.push({
          type: 'pii_guard_hit',
          table,
          id: row.id,
          note: 'Verdächtige Echtdaten-Domain nach Anonymisierung',
        })
      }
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'string' && emailRe.test(v) && !v.endsWith('@example.test')) {
          anomalies.push({
            type: 'email_not_anonymized',
            table,
            id: row.id,
            column: k,
            value: v,
          })
        }
      }
    }
  }
}

async function exportAndAnonymize(prod) {
  console.log('==> Export Prod (READ-ONLY) …')
  const raw = {}
  for (const t of [
    'kunden',
    'kunden_ansprechpartner',
    'kunden_objekte',
    'objekt_einheiten',
    'leads',
    'angebote',
    'angebot_handwerker',
    'auftraege',
    'auftrag_handwerker',
    'rechnungen',
    'lead_notizen',
    'lead_timeline',
  ]) {
    raw[t] = await fetchAll(prod, t)
    console.log(`  ${t}: ${raw[t].length}`)
  }

  const hwIds = new Set()
  for (const r of raw.angebot_handwerker) if (r.handwerker_id) hwIds.add(r.handwerker_id)
  for (const r of raw.auftrag_handwerker) if (r.handwerker_id) hwIds.add(r.handwerker_id)
  for (const r of raw.rechnungen) if (r.handwerker_id) hwIds.add(r.handwerker_id)

  const allHw = await fetchAll(prod, 'handwerker')
  raw.handwerker = allHw.filter((h) => hwIds.has(h.id))
  console.log(`  handwerker (referenziert): ${raw.handwerker.length} / ${allHw.length}`)

  console.log('==> Anonymisieren …')
  const tables = {}
  for (const t of TABLE_ORDER) {
    const fn = ANON[t]
    tables[t] = (raw[t] ?? []).map((row) => fn({ ...row }))
  }
  return tables
}

async function importTables(staging, tables, anomalies, dryRun) {
  const counts = {}
  for (const table of TABLE_ORDER) {
    const rows = (tables[table] ?? []).map((row) => {
      const out = { ...row }
      for (const k of Object.keys(out)) {
        if (k.startsWith('_')) delete out[k]
      }
      return out
    })
    counts[table] = { exported: (tables[table] ?? []).length, upserted: 0, errors: 0 }
    if (!rows.length) {
      console.log(`  ${table}: 0`)
      continue
    }
    if (dryRun) {
      console.log(`  ${table}: dry-run ${rows.length}`)
      counts[table].upserted = rows.length
      continue
    }
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      for (const row of chunk) {
        if (!row.id) {
          anomalies.push({ type: 'null_required', table, column: 'id', id: null })
        }
      }
      const { error } = await staging.from(table).upsert(chunk, { onConflict: 'id' })
      if (error) {
        counts[table].errors += chunk.length
        anomalies.push({
          type: 'upsert_error',
          table,
          message: error.message,
          chunkFrom: i,
          chunkSize: chunk.length,
        })
        for (const row of chunk) {
          const one = await staging.from(table).upsert(row, { onConflict: 'id' })
          if (one.error) {
            anomalies.push({
              type: 'upsert_row_error',
              table,
              id: row.id,
              message: one.error.message,
            })
            if (/null value|not-null|violates not-null/i.test(one.error.message)) {
              anomalies.push({
                type: 'null_required',
                table,
                id: row.id,
                message: one.error.message,
              })
            }
            if (/foreign key|violates foreign key/i.test(one.error.message)) {
              anomalies.push({
                type: 'fk_violation_on_insert',
                table,
                id: row.id,
                message: one.error.message,
              })
            }
          } else {
            counts[table].upserted += 1
            counts[table].errors -= 1
          }
        }
      } else {
        counts[table].upserted += chunk.length
      }
    }
    console.log(
      `  ${table}: upserted ${counts[table].upserted}/${counts[table].exported}` +
        (counts[table].errors ? ` errors=${counts[table].errors}` : '')
    )
  }
  return counts
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  loadEnvFile('.env.staging')
  // Prod-Keys oft in .env.local — nur lesen, nie als Write-Ziel
  loadEnvFile('.env.local')

  const prodUrl =
    process.env.PROD_SUPABASE_URL?.trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(PROD_PROJECT_REF)
      ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim()
      : '')
  const prodKey =
    process.env.PROD_SERVICE_ROLE_KEY?.trim() ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (prodUrl || '').includes(PROD_PROJECT_REF)
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
      : '')

  const stagingUrl = process.env.STAGING_SUPABASE_URL?.trim()
  const stagingKey = process.env.STAGING_SERVICE_ROLE_KEY?.trim()
  const stagingRef = process.env.STAGING_PROJECT_REF?.trim()
  const stagingId = process.env.STAGING_PROJECT_ID?.trim()
  const stagingDb = process.env.STAGING_DB_URL?.trim()

  mkdirSync(DUMP_DIR, { recursive: true })

  let tables
  const anomalies = []

  if (!flags.importOnly) {
    if (!prodUrl?.includes(PROD_PROJECT_REF)) {
      console.error(
        `ABORT: Prod-URL muss ${PROD_PROJECT_REF} enthalten (PROD_SUPABASE_URL).`
      )
      process.exit(1)
    }
    // Sicherheit: Staging-Schreibziel darf nicht Prod sein — hier nur Lesen
    const prod = clientFor(prodUrl, prodKey, 'Prod')
    tables = await exportAndAnonymize(prod)
    assertNoPiiLeak(tables, anomalies)

    const payload = {
      meta: {
        created_at: new Date().toISOString(),
        source_ref: PROD_PROJECT_REF,
        target_ref: STAGING_PROJECT_REF_CANON,
        prefix: PREFIX,
        note: 'Anonymisiert — keine Echtdaten. IDs/Status/Beträge/Ownership erhalten.',
      },
      counts: Object.fromEntries(
        TABLE_ORDER.map((t) => [t, (tables[t] ?? []).length])
      ),
      tables,
      anomalies_pre_import: anomalies.slice(),
    }
    writeFileSync(DUMP_FILE, JSON.stringify(payload, null, 2))
    console.log(`==> Dump geschrieben: ${DUMP_FILE}`)
  } else {
    if (!existsSync(DUMP_FILE)) {
      console.error(`ABORT: Dump fehlt: ${DUMP_FILE}`)
      process.exit(1)
    }
    const payload = JSON.parse(readFileSync(DUMP_FILE, 'utf8'))
    tables = payload.tables
    if (Array.isArray(payload.anomalies_pre_import)) {
      anomalies.push(...payload.anomalies_pre_import)
    }
    console.log(`==> Dump geladen: ${DUMP_FILE}`)
  }

  if (flags.exportOnly) {
    const report = {
      phase: 'export_only',
      counts: Object.fromEntries(
        TABLE_ORDER.map((t) => [t, (tables[t] ?? []).length])
      ),
      anomalies,
    }
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))
    console.log(`==> Report: ${REPORT_FILE}`)
    console.log(`Anomalien (Pre-Import/PII): ${anomalies.length}`)
    return
  }

  assertStagingWriteTarget({
    projectId: stagingId,
    supabaseUrl: stagingUrl,
    projectRef: stagingRef || STAGING_PROJECT_REF_CANON,
    dbUrl: stagingDb,
  })
  assertNotProdWrite(
    { stagingUrl, stagingKey: stagingKey ? 'set' : '', stagingRef, stagingDb },
    'Staging-Ziel'
  )
  if (!stagingUrl?.includes(STAGING_PROJECT_REF_CANON)) {
    console.error('ABORT: Staging-URL muss Staging-Ref enthalten')
    process.exit(1)
  }

  const staging = clientFor(stagingUrl, stagingKey, 'Staging')

  // kunden_objekte.created_by = 'crm'|'portal' (nicht User-UUID)
  for (const row of tables.kunden_objekte ?? []) {
    row.created_by =
      row.created_by === 'portal' || row.created_by === 'crm' ? row.created_by : 'crm'
  }

  // betreuer_id / Auth-FKs auf Aufträgen hart nullen
  for (const row of tables.auftraege ?? []) {
    row.betreuer_id = null
  }
  const reIds = idSet(tables.rechnungen)
  for (const row of tables.rechnungen ?? []) {
    if (row.bezug_rechnung_id && !reIds.has(row.bezug_rechnung_id)) {
      anomalies.push({
        type: 'fk_dead_optional',
        table: 'rechnungen',
        id: row.id,
        column: 'bezug_rechnung_id',
        value: row.bezug_rechnung_id,
      })
      row.bezug_rechnung_id = null
    }
    if (row.bezug_rechnung_id) {
      row._bezug_rechnung_id = row.bezug_rechnung_id
      row.bezug_rechnung_id = null
    }
  }

  // Gewerke auf Staging für FK-Check
  const { data: gewerkeRows, error: gErr } = await staging.from('gewerke').select('id')
  if (gErr) {
    anomalies.push({ type: 'staging_gewerke_read', message: gErr.message })
  }
  const stagingGewerke = new Set((gewerkeRows ?? []).map((g) => g.id))

  console.log('==> FK-Anomalien prüfen / tote FKs nullen …')
  applyFkAnomalies(tables, stagingGewerke, anomalies)

  // required FK nach Nullung → Zeile ggf. überspringen
  for (const [table, fks] of Object.entries(FK_MAP)) {
    const required = fks.filter((f) => f.required)
    if (!required.length) continue
    const before = tables[table]?.length ?? 0
    tables[table] = (tables[table] ?? []).filter((row) => {
      for (const fk of required) {
        if (row[fk.col] == null) {
          anomalies.push({
            type: 'row_skipped_missing_required_fk',
            table,
            id: row.id,
            column: fk.col,
          })
          return false
        }
      }
      return true
    })
    const after = tables[table].length
    if (after !== before) {
      console.log(`  ${table}: ${before - after} Zeilen wegen toter Pflicht-FK übersprungen`)
    }
  }

  console.log(
    flags.dryRun
      ? '==> Dry-Run Import (kein Write) …'
      : `==> Import Staging ${STAGING_PROJECT_REF_CANON} …`
  )
  const counts = await importTables(staging, tables, anomalies, flags.dryRun)

  const report = {
    phase: flags.dryRun ? 'dry_run' : 'import',
    finished_at: new Date().toISOString(),
    source_ref: PROD_PROJECT_REF,
    target_ref: STAGING_PROJECT_REF_CANON,
    prefix: PREFIX,
    counts,
    anomaly_count: anomalies.length,
    anomalies,
  }
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))
  // Dump nach FK-Nullung aktualisieren
  writeFileSync(
    DUMP_FILE,
    JSON.stringify(
      {
        meta: {
          created_at: new Date().toISOString(),
          source_ref: PROD_PROJECT_REF,
          target_ref: STAGING_PROJECT_REF_CANON,
          prefix: PREFIX,
        },
        counts: Object.fromEntries(
          TABLE_ORDER.map((t) => [t, (tables[t] ?? []).length])
        ),
        tables,
        anomalies_pre_import: anomalies.filter((a) =>
          ['fk_dead_required', 'fk_dead_optional', 'fk_dropped_external', 'pii_guard_hit', 'email_not_anonymized'].includes(
            a.type
          )
        ),
      },
      null,
      2
    )
  )

  console.log('\n========== REPORT ==========')
  for (const [t, c] of Object.entries(counts)) {
    console.log(
      `  ${t.padEnd(24)} export=${c.exported} upserted=${c.upserted} errors=${c.errors}`
    )
  }
  console.log(`\nAnomalien: ${anomalies.length} → ${REPORT_FILE}`)
  const byType = {}
  for (const a of anomalies) byType[a.type] = (byType[a.type] ?? 0) + 1
  for (const [type, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}× ${type}`)
  }
  console.log(
    '\nHinweis: PRODSIM-* ist Ownership-/Historie-Testgut. ZZTEST-* bleibt Wegwerf für destruktive Fälle.'
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
