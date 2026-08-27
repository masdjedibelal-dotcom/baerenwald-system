#!/usr/bin/env node
/**
 * Legacy-/Regression-Checks: objekt_anlagen + Versammlungsbericht-Datenpfade.
 *
 *   node --env-file=.env.staging scripts/staging/test-objekt-anlagen-legacy.mjs
 *
 * Nur Staging (Direct SQL). Kein Prod-Schreibzugriff.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import {
  assertNotProdWrite,
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'dumps/legacy/objekt-anlagen-legacy-report.json')

const PREFIX = 'LEGACY-OA-'
const ID = {
  kunde: 'b1100000-0000-4000-8000-000000000001',
  objekt: 'b1100000-0000-4000-8000-000000000010',
  einheit: 'b1100000-0000-4000-8000-000000000011',
  anlage: 'b1100000-0000-4000-8000-000000000020',
  anlageOrphan: 'b1100000-0000-4000-8000-000000000021',
  leadLinked: 'b1100000-0000-4000-8000-000000000030',
  leadLegacy: 'b1100000-0000-4000-8000-000000000031',
  angebotLinked: 'b1100000-0000-4000-8000-000000000040',
}

const results = []
function ok(id, note, extra = {}) {
  results.push({ id, status: 'ok', note, ...extra })
  console.log(`✅ ${id} — ${note}`)
}
function warn(id, note, extra = {}) {
  results.push({ id, status: 'warn', note, ...extra })
  console.log(`⚠️ ${id} — ${note}`)
}
function fail(id, note, extra = {}) {
  results.push({ id, status: 'fail', note, ...extra })
  console.log(`❌ ${id} — ${note}`)
}

async function main() {
  const dbUrl = process.env.STAGING_DB_URL?.trim()
  assertStagingWriteTarget({ dbUrl, projectRef: STAGING_PROJECT_REF_CANON })
  assertNotProdWrite(dbUrl, 'STAGING_DB_URL')

  mkdirSync(dirname(OUT), { recursive: true })
  const sql = postgres(dbUrl, { max: 1 })

  try {
    // --- Schema ---
    const tableExists = await sql`
      select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'objekt_anlagen'
      ) as ok
    `
    if (!tableExists[0]?.ok) {
      fail('schema', 'Tabelle objekt_anlagen fehlt — Migration 20261127120000 ausführen.')
      writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
      process.exit(1)
    }
    ok('schema', 'Tabelle objekt_anlagen vorhanden')

    const cols = await sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'objekt_anlagen'
    `
    const colSet = new Set(cols.map((c) => c.column_name))
    const detailCols = [
      'garantie_bis',
      'gewaehrleistung_bis',
      'anschaffungswert_eur',
      'hersteller',
    ]
    const missingDetail = detailCols.filter((c) => !colSet.has(c))
    if (missingDetail.length) {
      warn('schema-details', `Detail-Spalten fehlen (Fallback aktiv): ${missingDetail.join(', ')}`)
    } else {
      ok('schema-details', 'Anlagen-Detail-Spalten vorhanden')
    }

    for (const t of ['leads', 'angebote', 'rechnungen']) {
      const [{ exists }] = await sql`
        select exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = ${t}
            and column_name = 'objekt_anlage_id'
        ) as exists
      `
      if (exists) ok(`schema-${t}`, 'objekt_anlage_id vorhanden')
      else warn(`schema-${t}`, 'objekt_anlage_id fehlt — Legacy-Modus')
    }

    // --- Prod-Legacy-Stichprobe (nur lesen) ---
    const legacyStats = await sql`
      select
        (select count(*)::int from public.leads where geloescht_am is null) as leads_total,
        (select count(*)::int from public.leads where geloescht_am is null and objekt_anlage_id is null) as leads_ohne_anlage,
        (select count(*)::int from public.objekt_anlagen) as anlagen_total,
        (select count(*)::int from public.leads l
          join public.objekt_anlagen a on a.id = l.objekt_anlage_id
          where l.geloescht_am is null) as leads_mit_gueltiger_anlage
    `
    const st = legacyStats[0]
    ok('legacy-sample', `${st.leads_ohne_anlage}/${st.leads_total} Leads ohne Anlage (normal)`, st)

    const orphanLeads = await sql`
      select count(*)::int as n from public.leads l
      where l.geloescht_am is null
        and l.objekt_anlage_id is not null
        and not exists (select 1 from public.objekt_anlagen a where a.id = l.objekt_anlage_id)
    `
    if (orphanLeads[0]?.n > 0) {
      warn('orphan-leads', `${orphanLeads[0].n} Leads mit totem objekt_anlage_id (App zeigt „—")`)
    } else {
      ok('orphan-leads', 'Keine Leads mit totem objekt_anlage_id')
    }

    // --- Seed + CRUD-Simulation ---
    const gewerk = await sql`select id from public.gewerke order by name limit 1`
    const gewerkId = gewerk[0]?.id
    if (!gewerkId) {
      fail('seed', 'Kein Gewerk in Staging — Seed unvollständig')
      return
    }

    await sql.begin(async (tx) => {
      await tx`delete from public.leads where id in (${ID.leadLinked}, ${ID.leadLegacy})`
      await tx`delete from public.angebote where id = ${ID.angebotLinked}`
      await tx`delete from public.objekt_anlagen where id in (${ID.anlage}, ${ID.anlageOrphan})`
      await tx`delete from public.objekt_einheiten where id = ${ID.einheit}`
      await tx`delete from public.kunden_objekte where id = ${ID.objekt}`
      await tx`delete from public.kunden where id = ${ID.kunde}`

      await tx`
        insert into public.kunden (id, name, typ, email)
        values (${ID.kunde}, ${PREFIX + 'HV'}, 'organisation', 'legacy-oa@test.local')
      `
      await tx`
        insert into public.kunden_objekte (id, kunde_id, titel, strasse, plz, ort)
        values (${ID.objekt}, ${ID.kunde}, ${PREFIX + 'Objekt'}, 'Testweg', '80331', 'München')
      `
      await tx`
        insert into public.objekt_einheiten (id, kunde_objekt_id, bezeichnung, sort_order)
        values (${ID.einheit}, ${ID.objekt}, 'Whg. 1', 0)
      `
      await tx`
        insert into public.objekt_anlagen (id, kunde_id, kunde_objekt_id, bezeichnung, gewerk_id, status)
        values (${ID.anlage}, ${ID.kunde}, ${ID.objekt}, ${PREFIX + 'Pumpe'}, ${gewerkId}, 'aktiv')
      `
      await tx`
        insert into public.leads (id, auftraggeber_kunde_id, kunde_objekt_id, situation, objekt_anlage_id, vorgang_phase)
        values (${ID.leadLinked}, ${ID.kunde}, ${ID.objekt}, ${PREFIX + 'Mit Anlage'}, ${ID.anlage}, 'angebot')
      `
      await tx`
        insert into public.leads (id, auftraggeber_kunde_id, kunde_objekt_id, situation, bereiche, vorgang_phase)
        values (${ID.leadLegacy}, ${ID.kunde}, ${ID.objekt}, ${PREFIX + 'Legacy ohne Anlage'}, ${['Heizung']}, 'angebot')
      `
      await tx`
        insert into public.angebote (id, lead_id, kunde_id, status, objekt_anlage_id)
        values (${ID.angebotLinked}, ${ID.leadLegacy}, ${ID.kunde}, 'entwurf', ${ID.anlage})
      `
    })
    ok('seed', 'Testdaten LEGACY-OA-* angelegt')

    // Delete-Guard: Lead verknüpft
    const leadBlock = await sql`
      select count(*)::int as n from public.leads where objekt_anlage_id = ${ID.anlage}
    `
    if (leadBlock[0]?.n >= 1) ok('delete-guard-lead', 'Anlage mit Lead — Löschen muss blockiert sein')
    else fail('delete-guard-lead', 'Lead-Verknüpfung fehlt')

    const angBlock = await sql`
      select count(*)::int as n from public.angebote where objekt_anlage_id = ${ID.anlage}
    `
    if (angBlock[0]?.n >= 1) ok('delete-guard-angebot', 'Anlage mit Angebot — Löschen muss blockiert sein')
    else fail('delete-guard-angebot', 'Angebot-Verknüpfung fehlt')

    // Update (Stilllegen)
    await sql`
      update public.objekt_anlagen set status = 'stillgelegt', bezeichnung = ${PREFIX + 'Pumpe (still)'}
      where id = ${ID.anlage}
    `
    const still = await sql`select status from public.objekt_anlagen where id = ${ID.anlage}`
    if (still[0]?.status === 'stillgelegt') ok('update-stilllegen', 'Status stillgelegt gespeichert')
    else fail('update-stilllegen', 'Status-Update fehlgeschlagen')

    // Historie-relevant: Lead behält FK nach Stilllegung
    const fkAfterStill = await sql`
      select objekt_anlage_id from public.leads where id = ${ID.leadLinked}
    `
    if (fkAfterStill[0]?.objekt_anlage_id === ID.anlage) {
      ok('stilllegen-fk', 'Lead behält objekt_anlage_id nach Stilllegung (Historie intakt)')
    } else fail('stilllegen-fk', 'FK unerwartet geändert')

    // ON DELETE SET NULL (DB-Verhalten, ohne App)
    await sql`
      insert into public.objekt_anlagen (id, kunde_id, kunde_objekt_id, bezeichnung, gewerk_id, status)
      values (${ID.anlageOrphan}, ${ID.kunde}, ${ID.objekt}, ${PREFIX + 'Lösch-test'}, ${gewerkId}, 'aktiv')
    `
    await sql`update public.leads set objekt_anlage_id = ${ID.anlageOrphan} where id = ${ID.leadLegacy}`
    await sql`delete from public.objekt_anlagen where id = ${ID.anlageOrphan}`
    const nulled = await sql`select objekt_anlage_id from public.leads where id = ${ID.leadLegacy}`
    if (nulled[0]?.objekt_anlage_id == null) {
      ok('fk-set-null', 'DB SET NULL: Lead überlebt Anlagen-Löschung ohne Fehler')
    } else {
      fail('fk-set-null', 'ON DELETE SET NULL greift nicht')
    }

    // Legacy-Lead ohne Anlage: bereiche als Gewerk-Fallback simulierbar
    const legacyRow = await sql`
      select bereiche, objekt_anlage_id from public.leads where id = ${ID.leadLegacy}
    `
    if (!legacyRow[0]?.objekt_anlage_id && legacyRow[0]?.bereiche?.length) {
      ok('legacy-bereiche', 'Legacy-Lead: bereiche vorhanden, keine Anlage — Historie/Bericht OK')
    } else {
      warn('legacy-bereiche', 'Legacy-Lead-Zustand unerwartet nach FK-Test')
    }

    // Objekt mit echten Legacy-Vorgängen (Stichprobe)
    const realObj = await sql`
      select ko.id, ko.kunde_id, count(l.id)::int as vorgaenge
      from public.kunden_objekte ko
      join public.leads l on l.kunde_objekt_id = ko.id and l.geloescht_am is null
      group by ko.id, ko.kunde_id
      order by vorgaenge desc
      limit 1
    `
    if (realObj[0]) {
      ok('real-objekt', `Stichprobe: Objekt ${realObj[0].id} mit ${realObj[0].vorgaenge} Vorgängen ladbar`)
    } else {
      warn('real-objekt', 'Kein Objekt mit Vorgängen in Staging')
    }

    // Cleanup Testdaten
    await sql.begin(async (tx) => {
      await tx`delete from public.angebote where id = ${ID.angebotLinked}`
      await tx`delete from public.leads where id in (${ID.leadLinked}, ${ID.leadLegacy})`
      await tx`delete from public.objekt_anlagen where id = ${ID.anlage}`
      await tx`delete from public.objekt_einheiten where id = ${ID.einheit}`
      await tx`delete from public.kunden_objekte where id = ${ID.objekt}`
      await tx`delete from public.kunden where id = ${ID.kunde}`
    })
    ok('cleanup', 'Testdaten LEGACY-OA-* entfernt')

    const failed = results.filter((r) => r.status === 'fail').length
    writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), results }, null, 2))
    console.log(`\nReport: ${OUT}`)
    if (failed) process.exit(1)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
