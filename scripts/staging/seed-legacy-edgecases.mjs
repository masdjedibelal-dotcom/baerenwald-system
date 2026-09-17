#!/usr/bin/env node
/**
 * LEGACY-Edgecases — Staging-Seed per DIREKTEM SQL (bewusst an App-Logik vorbei).
 *
 * Simuliert Alt-/Prod-Historie: fremde Eigentümer, tote Verweise, leere Altfelder,
 * unbekannte Status-Strings, halb-migrierte Zustände, Extremwerte.
 *
 *   node --env-file=.env.staging scripts/staging/seed-legacy-edgecases.mjs
 *   node --env-file=.env.staging scripts/staging/seed-legacy-edgecases.mjs --purge-only
 *
 * Voraussetzung: STAGING_DB_URL (Direct/Session 5432) + Staging-Guard.
 * Alle Artefakte: Präfix LEGACY- · feste UUIDs · idempotent (purge → insert).
 *
 * Report: scripts/staging/dumps/legacy/legacy-seed-report.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import {
  assertNotProdWrite,
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CRM_ROOT = join(__dirname, '../..')
const OUT_DIR = join(__dirname, 'dumps/legacy')
const REPORT_FILE = join(OUT_DIR, 'legacy-seed-report.json')
const PREFIX = 'LEGACY-'

/** Feste IDs — löschen/neu anlegen ohne Drift. */
const ID = {
  deletedUser: '00000000-dead-4000-8000-ffffffffffff',
  otherStaff: '00000000-51af-4000-8000-222222222222',
  kundeHub: 'a1100000-0000-4000-8000-000000000001',
  kundeSoft: 'a1100000-0000-4000-8000-000000000002',
  kundeNoMail: 'a1100000-0000-4000-8000-000000000003',
  objektNoSlug: 'a1100000-0000-4000-8000-000000000010',
  leadForeign: 'a1100000-0000-4000-8000-000000000020',
  angebotForeign: 'a1100000-0000-4000-8000-000000000021',
  auftragForeign: 'a1100000-0000-4000-8000-000000000022',
  rechnungForeign: 'a1100000-0000-4000-8000-000000000023',
  leadDeadRe: 'a1100000-0000-4000-8000-000000000030',
  rechnungDead: 'a1100000-0000-4000-8000-000000000031',
  leadOrphanAng: 'a1100000-0000-4000-8000-000000000032',
  angebotOrphan: 'a1100000-0000-4000-8000-000000000033',
  auftragOrphanAng: 'a1100000-0000-4000-8000-000000000034',
  leadKundeSoft: 'a1100000-0000-4000-8000-000000000035',
  planZeile: 'a1100000-0000-4000-8000-000000000036',
  leadPlan: 'a1100000-0000-4000-8000-000000000037',
  angebotPlan: 'a1100000-0000-4000-8000-000000000038',
  auftragPlan: 'a1100000-0000-4000-8000-000000000039',
  rechnungPlanGone: 'a1100000-0000-4000-8000-00000000003a',
  zahlungsplan: 'a1100000-0000-4000-8000-00000000003b',
  zahlungsplanPos: 'a1100000-0000-4000-8000-00000000003c',
  leadEmpty: 'a1100000-0000-4000-8000-000000000040',
  angebotEmptyPos: 'a1100000-0000-4000-8000-000000000041',
  rechnungNoNr: 'a1100000-0000-4000-8000-000000000042',
  leadEmptyAng: 'a1100000-0000-4000-8000-000000000043',
  leadEmptyRe: 'a1100000-0000-4000-8000-000000000044',
  leadAltStatus: 'a1100000-0000-4000-8000-000000000050',
  angebotAltStatus: 'a1100000-0000-4000-8000-000000000051',
  auftragAltStatus: 'a1100000-0000-4000-8000-000000000052',
  rechnungAltStatus: 'a1100000-0000-4000-8000-000000000053',
  leadHalb: 'a1100000-0000-4000-8000-000000000060',
  angebotHalb: 'a1100000-0000-4000-8000-000000000061',
  auftragHalb: 'a1100000-0000-4000-8000-000000000062',
  auftragHwHalb: 'a1100000-0000-4000-8000-000000000063',
  orgLogHalb: 'a1100000-0000-4000-8000-000000000064',
  leadBig: 'a1100000-0000-4000-8000-000000000070',
  angebotBig: 'a1100000-0000-4000-8000-000000000071',
  auftragBig: 'a1100000-0000-4000-8000-000000000072',
  rechnungBig: 'a1100000-0000-4000-8000-000000000073',
  leadOld: 'a1100000-0000-4000-8000-000000000074',
}

function leadPhaseId(i) {
  return `a1100000-0000-4000-8000-000000000${String(100 + i).padStart(3, '0')}`
}

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

async function purgeLegacy(tx) {
  await tx`DELETE FROM org_freigabe_log WHERE id = ${ID.orgLogHalb} OR notiz ILIKE ${PREFIX + '%'}`
  await tx`DELETE FROM lead_timeline WHERE lead_id IN (SELECT id FROM leads WHERE situation ILIKE ${PREFIX + '%'} OR notizen ILIKE ${PREFIX + '%'})`
  await tx`DELETE FROM lead_notizen WHERE lead_id IN (SELECT id FROM leads WHERE situation ILIKE ${PREFIX + '%'})`
  await tx`DELETE FROM auftrag_zahlungsplan_positionen WHERE id = ${ID.zahlungsplanPos} OR bezeichnung ILIKE ${PREFIX + '%'}`
  await tx`DELETE FROM auftrag_zahlungsplaene WHERE id = ${ID.zahlungsplan} OR COALESCE(titel, '') ILIKE ${PREFIX + '%'}`
  await tx`DELETE FROM auftrag_handwerker WHERE id = ${ID.auftragHwHalb}`
  await tx`DELETE FROM angebot_handwerker WHERE angebot_id IN (
    SELECT id FROM angebote WHERE COALESCE(leistungsumfang,'') ILIKE ${PREFIX + '%'} OR COALESCE(notizen,'') ILIKE ${PREFIX + '%'}
  )`
  await tx`DELETE FROM rechnungen WHERE
    id IN (${ID.rechnungForeign}, ${ID.rechnungDead}, ${ID.rechnungPlanGone}, ${ID.rechnungNoNr}, ${ID.rechnungAltStatus}, ${ID.rechnungBig})
    OR COALESCE(notizen,'') ILIKE ${PREFIX + '%'}
    OR COALESCE(rechnungsnummer,'') ILIKE ${'LEGACY-%'}`
  await tx`DELETE FROM auftraege WHERE
    id IN (${ID.auftragForeign}, ${ID.auftragOrphanAng}, ${ID.auftragPlan}, ${ID.auftragAltStatus}, ${ID.auftragHalb}, ${ID.auftragBig})
    OR titel ILIKE ${PREFIX + '%'}`
  await tx`DELETE FROM angebote WHERE
    id IN (${ID.angebotForeign}, ${ID.angebotOrphan}, ${ID.angebotPlan}, ${ID.angebotEmptyPos}, ${ID.angebotAltStatus}, ${ID.angebotHalb}, ${ID.angebotBig})
    OR COALESCE(leistungsumfang,'') ILIKE ${PREFIX + '%'}
    OR COALESCE(notizen,'') ILIKE ${PREFIX + '%'}`
  await tx`DELETE FROM leads WHERE
    id IN (
      ${ID.leadForeign}, ${ID.leadDeadRe}, ${ID.leadOrphanAng}, ${ID.leadKundeSoft},
      ${ID.leadPlan}, ${ID.leadEmpty}, ${ID.leadEmptyAng}, ${ID.leadEmptyRe},
      ${ID.leadAltStatus}, ${ID.leadHalb}, ${ID.leadBig}, ${ID.leadOld}
    )
    OR situation ILIKE ${PREFIX + '%'}
    OR COALESCE(notizen,'') ILIKE ${PREFIX + '%'}
    OR id::text LIKE 'a1100000-0000-4000-8000-0000000001%'`
  await tx`DELETE FROM kunden_objekte WHERE id = ${ID.objektNoSlug} OR titel ILIKE ${PREFIX + '%'}`
  await tx`DELETE FROM kunden WHERE id IN (${ID.kundeHub}, ${ID.kundeSoft}, ${ID.kundeNoMail}) OR name ILIKE ${PREFIX + '%'}`
}

async function main() {
  const purgeOnly = process.argv.includes('--purge-only')
  loadEnvStagingFile()

  const supabaseUrl = process.env.STAGING_SUPABASE_URL?.trim()
  const projectRef = process.env.STAGING_PROJECT_REF?.trim()
  const projectId = process.env.STAGING_PROJECT_ID?.trim()
  const dbUrl = process.env.STAGING_DB_URL?.trim()

  assertStagingWriteTarget({ projectId, supabaseUrl, projectRef, dbUrl })
  assertNotProdWrite({ dbUrl, supabaseUrl }, 'Staging-Ziel')

  if (!dbUrl?.includes(STAGING_PROJECT_REF_CANON)) {
    console.error('ABORT: STAGING_DB_URL muss Staging-Ref enthalten (Direct/Session 5432).')
    process.exit(1)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const sql = postgres(dbUrl, { max: 1, prepare: false })
  const catalog = []
  const notes = []

  try {
    console.log(`==> LEGACY-Seed Staging ${STAGING_PROJECT_REF_CANON}`)

    const [hw] = await sql`
      SELECT id FROM handwerker WHERE aktiv IS DISTINCT FROM false
      ORDER BY created_at ASC NULLS LAST LIMIT 1`
    const [gw] = await sql`
      SELECT id FROM gewerke WHERE aktiv IS DISTINCT FROM false
      ORDER BY name ASC NULLS LAST LIMIT 1`
    if (!hw?.id || !gw?.id) {
      console.error('ABORT: Handwerker/Gewerk fehlen — zuerst npm run staging:seed')
      process.exit(1)
    }

    const [staff2] = await sql`
      SELECT id FROM user_profiles
      WHERE email ILIKE '%staff2%' OR email = 'admin@staging.baerenwald.test'
      ORDER BY CASE WHEN email ILIKE '%staff2%' THEN 0 ELSE 1 END
      LIMIT 1`
    const otherCreator = staff2?.id ?? ID.otherStaff
    const deletedCreator = ID.deletedUser
    notes.push(`handwerker=${hw.id}`, `gewerk=${gw.id}`, `otherCreator=${otherCreator}`)

    const pos = (netto) => [
      {
        id: 'legacy-pos-1',
        titel: 'LEGACY Position',
        beschreibung: 'Seed',
        menge: 1,
        einheit: 'pauschal',
        vk_netto: netto,
        lohn_netto: netto,
        material_netto: 0,
        gewerk_id: gw.id,
        gewerk_name: 'Legacy',
        leistung: 'legacy',
      },
    ]

    if (!purgeOnly) {
      console.log('==> Enum-Altwerte (Staging) …')
      const wanted = [
        ['lead_status', 'in_bearbeitung'],
        ['angebot_status', 'versendet'],
        ['auftrag_status', 'wartend'],
      ]
      for (const [typ, label] of wanted) {
        const rows = await sql`
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = ${typ} AND e.enumlabel = ${label}
          LIMIT 1`
        if (rows.length) continue
        try {
          await sql.unsafe(`ALTER TYPE ${typ} ADD VALUE '${label}'`)
          console.log(`  + ${typ}.${label}`)
        } catch (e) {
          console.warn('  enum warn:', e instanceof Error ? e.message : e)
        }
      }
    }

    await sql.begin(async (tx) => {
      console.log('==> Purge …')
      await purgeLegacy(tx)
      if (purgeOnly) {
        notes.push('purge-only')
        return
      }

      // Bewusste tote UUID-FKs wie historische Drift
      await tx.unsafe(`SET LOCAL session_replication_role = replica`)

      console.log('==> Insert …')

      // ── Kunden / Objekt ──────────────────────────────────────────
      await tx`
        INSERT INTO kunden (id, name, email, telefon, typ, notizen, created_at, updated_at)
        VALUES
          (${ID.kundeHub}, ${PREFIX + 'Hub Kunde (30 Vorgänge)'}, ${'legacy.hub@example.test'},
           ${'089 0000 0001'}, ${'privat'}, ${PREFIX + 'Hub für Phasen-Sweep'}, now(), now()),
          (${ID.kundeSoft}, ${PREFIX + 'Soft-gelöscht'}, ${'legacy.soft@example.test'},
           ${'089 0000 0002'}, ${'privat'}, ${PREFIX + 'Soft-Delete Ziel'}, now(), now()),
          (${ID.kundeNoMail}, ${PREFIX + 'Ohne E-Mail'}, NULL,
           ${'089 0000 0003'}, ${'privat'}, ${PREFIX + 'Kunde ohne email'}, now(), now())`

      // kunden hat kein geloescht_am — Soft-Delete-Simulation: Spam + leere Kontaktdaten
      await tx`
        UPDATE kunden SET
          name = ${PREFIX + '[gelöscht] Soft-Kunde'},
          email = NULL,
          telefon = NULL,
          ist_spam = true,
          spam_markiert_am = now() - interval '30 days',
          notizen = ${PREFIX + 'simuliert soft-gelöscht'}
        WHERE id = ${ID.kundeSoft}`

      await tx`
        INSERT INTO kunden_objekte (
          id, kunde_id, titel, strasse, hausnummer, plz, ort, melde_slug, created_at, updated_at, created_by
        ) VALUES (
          ${ID.objektNoSlug}, ${ID.kundeHub}, ${PREFIX + 'Objekt ohne melde_slug'},
          ${'Legacyweg'}, ${'9'}, ${'80331'}, ${'München'}, NULL,
          now(), now(), ${'crm'}
        )`

      catalog.push({ case: 'leere_altfelder', kind: 'kunde_ohne_email', id: ID.kundeNoMail })
      catalog.push({ case: 'leere_altfelder', kind: 'objekt_ohne_melde_slug', id: ID.objektNoSlug })

      // ── 1) Fremder / gelöschter Ersteller ─────────────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, funnel_daten,
          erstellt_von, created_at, updated_at, kontakt_name, kontakt_email
        ) VALUES (
          ${ID.leadForeign}, ${ID.kundeHub}, ${'telefon'}, ${'angebot'},
          ${PREFIX + 'Fremder Ersteller'}, ${PREFIX + 'erstellt_von=gelöschter User'},
          ${tx.json({ legacy: true, case: 'foreign_creator' })},
          ${deletedCreator}, now() - interval '120 days', now(),
          ${PREFIX + 'Melder Foreign'}, ${'legacy.foreign@example.test'}
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, status_einfach, positionen, gesamt_fix,
          erstellt_von, created_at, updated_at, leistungsumfang, notizen, gesendet_kunde_at
        ) VALUES (
          ${ID.angebotForeign}, ${ID.leadForeign}, ${ID.kundeHub},
          ${'gesendet_kunde'}, ${'gesendet'}, ${tx.json(pos(500))}, ${595},
          ${otherCreator}, now() - interval '100 days', now(),
          ${PREFIX + 'Angebot fremder Staff'}, ${PREFIX + 'erstellt_von=otherStaff'},
          now() - interval '90 days'
        )`

      await tx`
        INSERT INTO auftraege (
          id, angebot_id, lead_id, kunde_id, status, titel, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.auftragForeign}, ${ID.angebotForeign}, ${ID.leadForeign}, ${ID.kundeHub},
          ${'in_arbeit'}, ${PREFIX + 'Auftrag fremder Staff'}, ${PREFIX + 'erstellt_von=otherStaff'},
          ${otherCreator}, now() - interval '80 days', now()
        )`

      await tx`
        INSERT INTO rechnungen (
          id, angebot_id, auftrag_id, kunde_id, status, rechnungsnummer, positionen,
          netto, mwst_satz, mwst_betrag, brutto, erstellt_von, created_at, updated_at,
          gesendet_at, rechnung_art, beleg_typ, notizen
        ) VALUES (
          ${ID.rechnungForeign}, ${ID.angebotForeign}, ${ID.auftragForeign}, ${ID.kundeHub},
          ${'gesendet'}, ${'LEGACY-RE-FOREIGN'}, ${tx.json(pos(500))},
          ${500}, ${19}, ${95}, ${595}, ${deletedCreator},
          now() - interval '70 days', now(), now() - interval '60 days',
          ${'voll'}, ${'rechnung'}, ${PREFIX + 'erstellt_von=gelöschter User'}
        )`

      catalog.push({
        case: 'fremder_ersteller',
        lead: ID.leadForeign,
        angebot: ID.angebotForeign,
        auftrag: ID.auftragForeign,
        rechnung: ID.rechnungForeign,
        note: 'Lead/RE erstellt_von=deletedUser; Angebot/Auftrag=otherStaff',
      })

      // ── 2a) Vorgang → RE hard-gelöscht ───────────────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadDeadRe}, ${ID.kundeHub}, ${'email'}, ${'auftrag'},
          ${PREFIX + 'Vorgang ohne RE (hard-delete)'},
          ${PREFIX + 'gelöschte RE-ID ' + ID.rechnungDead},
          ${deletedCreator}, now() - interval '40 days', now()
        )`

      await tx`
        INSERT INTO rechnungen (
          id, kunde_id, status, rechnungsnummer, positionen,
          netto, mwst_satz, mwst_betrag, brutto, erstellt_von, created_at, updated_at,
          gesendet_at, rechnung_art, beleg_typ, notizen
        ) VALUES (
          ${ID.rechnungDead}, ${ID.kundeHub}, ${'gesendet'}, ${'LEGACY-RE-DEAD'},
          ${tx.json(pos(100))}, ${100}, ${19}, ${19}, ${119}, ${deletedCreator},
          now() - interval '39 days', now(), now() - interval '38 days',
          ${'voll'}, ${'rechnung'}, ${PREFIX + 'temp vor hard-delete'}
        )`

      await tx`
        INSERT INTO lead_timeline (lead_id, typ, titel, beschreibung, erstellt_von, created_at)
        VALUES (
          ${ID.leadDeadRe}, ${'rechnung'}, ${PREFIX + 'RE gestellt (danach gelöscht)'},
          ${'rechnung_id=' + ID.rechnungDead}, ${deletedCreator}, now() - interval '38 days'
        )`

      await tx`DELETE FROM rechnungen WHERE id = ${ID.rechnungDead}`
      catalog.push({
        case: 'tote_verweise',
        kind: 'vorgang_rechnung_hard_deleted',
        lead: ID.leadDeadRe,
        deleted_rechnung: ID.rechnungDead,
      })

      // ── 2b) Auftrag → Angebot gelöscht (FK würde NULL setzen; wir lassen tote UUID) ──
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadOrphanAng}, ${ID.kundeHub}, ${'website'}, ${'auftrag'},
          ${PREFIX + 'Auftrag ohne Angebot'}, ${PREFIX + 'angebot_id zeigt auf gelöschtes Angebot'},
          ${deletedCreator}, now() - interval '50 days', now()
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, positionen, gesamt_fix, erstellt_von, created_at, updated_at,
          leistungsumfang, notizen
        ) VALUES (
          ${ID.angebotOrphan}, ${ID.leadOrphanAng}, ${ID.kundeHub}, ${'kunde_akzeptiert'},
          ${tx.json(pos(200))}, ${238}, ${deletedCreator}, now() - interval '49 days', now(),
          ${PREFIX + 'wird gelöscht'}, ${PREFIX + 'orphan source'}
        )`

      await tx`
        INSERT INTO auftraege (
          id, angebot_id, lead_id, kunde_id, status, titel, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.auftragOrphanAng}, ${ID.angebotOrphan}, ${ID.leadOrphanAng}, ${ID.kundeHub},
          ${'offen'}, ${PREFIX + 'Auftrag → Angebot weg'}, ${PREFIX + 'tote angebot_id'},
          ${deletedCreator}, now() - interval '48 days', now()
        )`

      await tx`DELETE FROM angebote WHERE id = ${ID.angebotOrphan}`
      // Replica-Rolle: tote UUID wieder setzen (App-Logik würde NULL lassen)
      await tx`UPDATE auftraege SET angebot_id = ${ID.angebotOrphan} WHERE id = ${ID.auftragOrphanAng}`
      catalog.push({
        case: 'tote_verweise',
        kind: 'auftrag_angebot_deleted',
        auftrag: ID.auftragOrphanAng,
        dead_angebot_id: ID.angebotOrphan,
      })

      // ── 2c) Lead → Kunde soft-gelöscht ───────────────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadKundeSoft}, ${ID.kundeSoft}, ${'telefon'}, ${'neu'},
          ${PREFIX + 'Lead an soft-gelöschtem Kunden'}, ${PREFIX + 'Kunde soft-sim: ist_spam + Kontaktdaten leer'},
          ${deletedCreator}, now() - interval '20 days', now()
        )`
      catalog.push({
        case: 'tote_verweise',
        kind: 'lead_kunde_soft_deleted_sim',
        lead: ID.leadKundeSoft,
        kunde: ID.kundeSoft,
      })

      // ── 2d) Zahlplan-Rate → RE weg ────────────────────────────────
      const planJson = {
        modus: 'abschlagsplan',
        zeilen: [
          {
            id: ID.planZeile,
            titel: PREFIX + 'Abschlag 1',
            typ: 'prozent',
            wert: 30,
            rechnung_id: ID.rechnungPlanGone,
          },
          { id: 'leg-plan-rest', titel: PREFIX + 'Schluss', typ: 'rest', wert: 0 },
        ],
      }

      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadPlan}, ${ID.kundeHub}, ${'website'}, ${'auftrag'},
          ${PREFIX + 'Zahlplan ohne RE'}, ${PREFIX + 'Rate zeigt auf gelöschte RE'},
          ${deletedCreator}, now() - interval '25 days', now()
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, positionen, gesamt_fix, erstellt_von, created_at, updated_at,
          leistungsumfang, zahlungsplan
        ) VALUES (
          ${ID.angebotPlan}, ${ID.leadPlan}, ${ID.kundeHub}, ${'kunde_akzeptiert'},
          ${tx.json(pos(1000))}, ${1190}, ${deletedCreator}, now() - interval '24 days', now(),
          ${PREFIX + 'Plan-Angebot'}, ${tx.json(planJson)}
        )`

      await tx`
        INSERT INTO auftraege (
          id, angebot_id, lead_id, kunde_id, status, titel, notizen, erstellt_von, created_at, updated_at, zahlungsplan
        ) VALUES (
          ${ID.auftragPlan}, ${ID.angebotPlan}, ${ID.leadPlan}, ${ID.kundeHub},
          ${'in_arbeit'}, ${PREFIX + 'Auftrag Zahlplan'}, ${PREFIX + 'RE zur Rate gelöscht'},
          ${deletedCreator}, now() - interval '23 days', now(), ${tx.json(planJson)}
        )`

      await tx`
        INSERT INTO auftrag_zahlungsplaene (id, auftrag_id, titel, gesamt_netto, created_at, updated_at)
        VALUES (${ID.zahlungsplan}, ${ID.auftragPlan}, ${PREFIX + 'Plan'}, ${1000}, now(), now())`

      await tx`
        INSERT INTO rechnungen (
          id, angebot_id, auftrag_id, kunde_id, status, rechnungsnummer, positionen,
          netto, mwst_satz, mwst_betrag, brutto, erstellt_von, created_at, updated_at,
          gesendet_at, rechnung_art, abschlag_index, zahlungsplan_abschlag_id, beleg_typ, notizen
        ) VALUES (
          ${ID.rechnungPlanGone}, ${ID.angebotPlan}, ${ID.auftragPlan}, ${ID.kundeHub},
          ${'gesendet'}, ${'LEGACY-RE-PLAN'}, ${tx.json(pos(300))},
          ${300}, ${19}, ${57}, ${357}, ${deletedCreator},
          now() - interval '22 days', now(), now() - interval '21 days',
          ${'abschlag'}, ${1}, ${ID.planZeile}, ${'rechnung'}, ${PREFIX + 'wird gelöscht'}
        )`

      await tx`
        INSERT INTO auftrag_zahlungsplan_positionen (
          id, zahlungsplan_id, bezeichnung, prozent, betrag_netto, rechnung_id, sort_order, created_at
        ) VALUES (
          ${ID.zahlungsplanPos}, ${ID.zahlungsplan}, ${PREFIX + 'Rate 30%'}, ${30}, ${300},
          ${ID.rechnungPlanGone}, ${1}, now()
        )`

      await tx`DELETE FROM rechnungen WHERE id = ${ID.rechnungPlanGone}`
      // Replica: tote rechnung_id wieder setzen (normal: ON DELETE SET NULL)
      await tx`
        UPDATE auftrag_zahlungsplan_positionen
        SET rechnung_id = ${ID.rechnungPlanGone}
        WHERE id = ${ID.zahlungsplanPos}`

      catalog.push({
        case: 'tote_verweise',
        kind: 'zahlplan_rate_rechnung_weg',
        auftrag: ID.auftragPlan,
        plan_zeile: ID.planZeile,
        dead_rechnung: ID.rechnungPlanGone,
        zahlungsplan_pos: ID.zahlungsplanPos,
      })

      // ── 3) Leere Altfelder ────────────────────────────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, funnel_daten,
          erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadEmpty}, ${ID.kundeNoMail}, ${'servicepaket'}, ${'neu'},
          ${PREFIX + 'Lead ohne funnel / Alt-Kanal'},
          ${PREFIX + 'funnel_daten=NULL kanal=servicepaket (Enum ok, nicht in KANAL_LABELS) (nicht in Map)'},
          NULL, ${deletedCreator}, now() - interval '15 days', now()
        )`

      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadEmptyAng}, ${ID.kundeHub}, ${'website'}, ${'angebot'},
          ${PREFIX + 'Träger Angebot ohne Positionen'}, ${PREFIX + 'empty positions'},
          ${deletedCreator}, now() - interval '14 days', now()
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, status_einfach, positionen, gesamt_fix,
          erstellt_von, created_at, updated_at, leistungsumfang, notizen, gesendet_kunde_at, gesendet_am
        ) VALUES (
          ${ID.angebotEmptyPos}, ${ID.leadEmptyAng}, ${ID.kundeHub},
          ${'gesendet_kunde'}, ${'gesendet'}, ${tx.json([])}, ${0},
          ${deletedCreator}, now() - interval '14 days', now(),
          ${PREFIX + 'Angebot ohne Positionen (gesendet)'}, ${PREFIX + 'positionen=[]'},
          now() - interval '13 days', now() - interval '13 days'
        )`

      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadEmptyRe}, ${ID.kundeHub}, ${'website'}, ${'auftrag'},
          ${PREFIX + 'Träger RE ohne Nummer'}, ${PREFIX + 'Alt: Nummer erst bei Versand'},
          ${deletedCreator}, now() - interval '12 days', now()
        )`

      await tx`
        INSERT INTO rechnungen (
          id, kunde_id, status, rechnungsnummer, positionen,
          netto, mwst_satz, mwst_betrag, brutto, erstellt_von, created_at, updated_at,
          gesendet_at, rechnung_art, beleg_typ, notizen
        ) VALUES (
          ${ID.rechnungNoNr}, ${ID.kundeHub}, ${'gesendet'}, NULL,
          ${tx.json(pos(150))}, ${150}, ${19}, ${28.5}, ${178.5}, ${deletedCreator},
          now() - interval '12 days', now(), now() - interval '11 days',
          ${'voll'}, ${'rechnung'}, ${PREFIX + 'status=gesendet rechnungsnummer=NULL'}
        )`

      catalog.push({ case: 'leere_altfelder', kind: 'lead_ohne_funnel_kanal_servicepaket', lead: ID.leadEmpty })
      catalog.push({ case: 'leere_altfelder', kind: 'angebot_ohne_positionen_gesendet', angebot: ID.angebotEmptyPos })
      catalog.push({ case: 'leere_altfelder', kind: 'rechnung_ohne_nummer_gesendet', rechnung: ID.rechnungNoNr })

      // ── 4) Alt-Status (nicht in kanonischer Map) ──────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadAltStatus}, ${ID.kundeHub}, ${'email'}, ${'in_bearbeitung'},
          ${PREFIX + 'Lead Alt-Status in_bearbeitung'}, ${PREFIX + 'UI-Map? status=in_bearbeitung'},
          ${deletedCreator}, now() - interval '10 days', now()
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, status_einfach, positionen, gesamt_fix,
          erstellt_von, created_at, updated_at, leistungsumfang, notizen
        ) VALUES (
          ${ID.angebotAltStatus}, ${ID.leadAltStatus}, ${ID.kundeHub},
          ${'versendet'}, ${'versendet'}, ${tx.json(pos(80))}, ${95.2},
          ${deletedCreator}, now() - interval '10 days', now(),
          ${PREFIX + 'Angebot status=versendet'}, ${PREFIX + 'historischer String'}
        )`

      await tx`
        INSERT INTO auftraege (
          id, lead_id, kunde_id, status, titel, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.auftragAltStatus}, ${ID.leadAltStatus}, ${ID.kundeHub},
          ${'wartend'}, ${PREFIX + 'Auftrag status=wartend'}, ${PREFIX + 'nicht in AUFTRAG_STATUS_MAP'},
          ${deletedCreator}, now() - interval '9 days', now()
        )`

      await tx`
        INSERT INTO rechnungen (
          id, kunde_id, status, rechnungsnummer, positionen,
          netto, mwst_satz, mwst_betrag, brutto, erstellt_von, created_at, updated_at,
          rechnung_art, beleg_typ, notizen
        ) VALUES (
          ${ID.rechnungAltStatus}, ${ID.kundeHub}, ${'teilbezahlt'}, ${'LEGACY-RE-TEIL'},
          ${tx.json(pos(90))}, ${90}, ${19}, ${17.1}, ${107.1}, ${deletedCreator},
          now() - interval '8 days', now(), ${'voll'}, ${'rechnung'},
          ${PREFIX + 'status=teilbezahlt'}
        )`

      catalog.push({
        case: 'alt_status',
        lead_status: 'in_bearbeitung',
        angebot_status: 'versendet',
        auftrag_status: 'wartend',
        rechnung_status: 'teilbezahlt',
        ids: {
          lead: ID.leadAltStatus,
          angebot: ID.angebotAltStatus,
          auftrag: ID.auftragAltStatus,
          rechnung: ID.rechnungAltStatus,
        },
      })

      // ── 5) Halb-migriert ──────────────────────────────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, auftraggeber_kunde_id, kanal, status, situation, notizen,
          org_freigabe_status, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadHalb}, ${ID.kundeHub}, ${ID.kundeHub}, ${'hv_direkt'}, ${'angebot'},
          ${PREFIX + 'Halb-migriert Freigabe/HW'},
          ${PREFIX + 'org_freigabe_status=nicht_noetig aber Log existiert; HW ohne angebot_handwerker'},
          ${'nicht_noetig'}, ${deletedCreator}, now() - interval '7 days', now()
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, positionen, gesamt_fix, erstellt_von, created_at, updated_at,
          leistungsumfang, notizen
        ) VALUES (
          ${ID.angebotHalb}, ${ID.leadHalb}, ${ID.kundeHub}, ${'gesendet_handwerker'},
          ${tx.json(pos(400))}, ${476}, ${deletedCreator}, now() - interval '7 days', now(),
          ${PREFIX + 'Halb HW'}, ${PREFIX + 'kein angebot_handwerker'}
        )`

      await tx`
        INSERT INTO auftraege (
          id, angebot_id, lead_id, kunde_id, status, titel, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.auftragHalb}, ${ID.angebotHalb}, ${ID.leadHalb}, ${ID.kundeHub},
          ${'in_arbeit'}, ${PREFIX + 'Auftrag HW ohne Angebot-Zuweisung'}, ${PREFIX + 'nur auftrag_handwerker'},
          ${deletedCreator}, now() - interval '6 days', now()
        )`

      await tx`
        INSERT INTO auftrag_handwerker (id, auftrag_id, handwerker_id, gewerk_id, status, created_at, notizen)
        VALUES (
          ${ID.auftragHwHalb}, ${ID.auftragHalb}, ${hw.id}, ${gw.id}, ${'zugewiesen'}, now(),
          ${PREFIX + 'ohne angebot_handwerker-Gegenstück'}
        )`

      await tx`
        INSERT INTO org_freigabe_log (
          id, lead_id, angebot_id, auftraggeber_kunde_id, aktion, betrag_eur, notiz, erstellt_von, created_at
        ) VALUES (
          ${ID.orgLogHalb}, ${ID.leadHalb}, ${ID.angebotHalb}, ${ID.kundeHub},
          ${'angefordert'}, ${476}, ${PREFIX + 'Log ohne Lead-Status-Pendant (Lead=nicht_noetig)'},
          ${'crm'}, now() - interval '6 days'
        )`

      catalog.push({
        case: 'halb_migriert',
        kind: 'auftrag_hw_ohne_angebot_handwerker',
        auftrag: ID.auftragHalb,
        auftrag_handwerker: ID.auftragHwHalb,
        angebot: ID.angebotHalb,
        note: 'kein angebot_handwerker-Row',
      })
      catalog.push({
        case: 'halb_migriert',
        kind: 'org_freigabe_log_ohne_lead_status',
        lead: ID.leadHalb,
        org_freigabe_log: ID.orgLogHalb,
        lead_org_status: 'nicht_noetig',
        log_aktion: 'angefordert',
      })

      // ── 6) Extremwerte ───────────────────────────────────────────
      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadBig}, ${ID.kundeHub}, ${'website'}, ${'auftrag'},
          ${PREFIX + 'Große RE >20k'}, ${PREFIX + 'wie Prod-Extremfall'},
          ${deletedCreator}, now() - interval '5 days', now()
        )`

      await tx`
        INSERT INTO angebote (
          id, lead_id, kunde_id, status, positionen, gesamt_fix, erstellt_von, created_at, updated_at,
          leistungsumfang, notizen
        ) VALUES (
          ${ID.angebotBig}, ${ID.leadBig}, ${ID.kundeHub}, ${'kunde_akzeptiert'},
          ${tx.json(pos(20000))}, ${23800}, ${deletedCreator}, now() - interval '5 days', now(),
          ${PREFIX + 'Großprojekt 20k'}, ${PREFIX + 'netto 20000'}
        )`

      await tx`
        INSERT INTO auftraege (
          id, angebot_id, lead_id, kunde_id, status, titel, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.auftragBig}, ${ID.angebotBig}, ${ID.leadBig}, ${ID.kundeHub},
          ${'in_arbeit'}, ${PREFIX + 'Auftrag 20k'}, ${PREFIX + 'große Summe'},
          ${deletedCreator}, now() - interval '4 days', now()
        )`

      await tx`
        INSERT INTO rechnungen (
          id, angebot_id, auftrag_id, kunde_id, status, rechnungsnummer, positionen,
          netto, mwst_satz, mwst_betrag, brutto, erstellt_von, created_at, updated_at,
          gesendet_at, rechnung_art, beleg_typ, notizen
        ) VALUES (
          ${ID.rechnungBig}, ${ID.angebotBig}, ${ID.auftragBig}, ${ID.kundeHub},
          ${'gesendet'}, ${'LEGACY-RE-20K'}, ${tx.json(pos(20000))},
          ${20000}, ${19}, ${3800}, ${23800}, ${deletedCreator},
          now() - interval '4 days', now(), now() - interval '3 days',
          ${'voll'}, ${'rechnung'}, ${PREFIX + 'brutto 23800'}
        )`

      await tx`
        INSERT INTO leads (
          id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at
        ) VALUES (
          ${ID.leadOld}, ${ID.kundeHub}, ${'telefon'}, ${'abgeschlossen'},
          ${PREFIX + 'Vorgang von vor 2 Jahren'}, ${PREFIX + 'created_at zurückdatiert'},
          ${deletedCreator}, now() - interval '730 days', now() - interval '700 days'
        )`

      catalog.push({
        case: 'extremwerte',
        kind: 'rechnung_ueber_20k',
        rechnung: ID.rechnungBig,
        brutto: 23800,
      })
      catalog.push({
        case: 'extremwerte',
        kind: 'vorgang_vor_2_jahren',
        lead: ID.leadOld,
      })

      // ── 7) Kunde mit 30 Vorgängen quer durch Phasen ───────────────
      const phases = [
        'neu',
        'kontaktiert',
        'termin',
        'angebot',
        'auftrag',
        'abgeschlossen',
        'abgebrochen',
      ]
      for (let i = 0; i < 30; i++) {
        const st = phases[i % phases.length]
        const lid = leadPhaseId(i)
        await tx`
          INSERT INTO leads (
            id, kunde_id, kanal, status, situation, notizen, erstellt_von, created_at, updated_at,
            funnel_daten
          ) VALUES (
            ${lid}, ${ID.kundeHub}, ${'website'}, ${st},
            ${PREFIX + `Phase ${i + 1}/${st}`},
            ${PREFIX + `Sweep #${i + 1}`},
            ${i % 2 === 0 ? deletedCreator : otherCreator},
            now() - (${i} * interval '1 day'),
            now(),
            ${tx.json({ legacy_phase: true, index: i, status: st })}
          )`
      }
      catalog.push({
        case: 'extremwerte',
        kind: 'kunde_30_vorgaenge',
        kunde: ID.kundeHub,
        leads_prefix: 'a1100000-0000-4000-8000-0000000001',
        count: 30,
        phases,
      })
    })

    const report = {
      finished_at: new Date().toISOString(),
      target_ref: STAGING_PROJECT_REF_CANON,
      prefix: PREFIX,
      purge_only: purgeOnly,
      notes,
      catalog,
      ids: ID,
      ui_checks: [
        'CRM /anfragen/[leadAltStatus] — Badge für status=in_bearbeitung',
        'CRM /angebote/[angebotAltStatus] — Label für status=versendet',
        'CRM /auftraege/[auftragAltStatus] — status=wartend',
        'CRM /rechnungen/[rechnungAltStatus] — status=teilbezahlt',
        'CRM /rechnungen/[rechnungForeign] — Als bezahlt (fremde Ownership)',
        'CRM /rechnungen/[rechnungBig] — Format >20k',
        'CRM /auftraege/[auftragOrphanAng] — Angebot-Link tot',
        'CRM /auftraege/[auftragPlan] — Zahlplan-Rate ohne RE',
        'CRM /auftraege/[auftragHalb] — Partner ohne angebot_handwerker',
      ],
    }
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2))
    console.log(`\n==> Fertig. Fälle: ${catalog.length}`)
    console.log(`Report: ${REPORT_FILE}`)
    for (const c of catalog) {
      console.log(`  - ${c.case}: ${c.kind ?? c.note ?? JSON.stringify(c.ids ?? c)}`)
    }
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
