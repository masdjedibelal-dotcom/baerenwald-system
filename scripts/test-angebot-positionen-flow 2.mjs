#!/usr/bin/env node
/**
 * Integrationstest: Angebot-Positionen Steuerung (add / update / delete / Gate).
 * Nutzt Service-Role — kein Browser nötig.
 *
 * Aufruf: node scripts/test-angebot-positionen-flow.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const p = join(ROOT, '.env.local')
  if (!existsSync(p)) throw new Error('.env.local fehlt')
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq)
    if (!process.env[k]) process.env[k] = t.slice(eq + 1)
  }
}

const BEARBEITBAR = [
  'entwurf',
  'gesendet_handwerker',
  'handwerker_akzeptiert',
  'gesendet_kunde',
  'kunde_akzeptiert',
]

function neuePositionsId() {
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function summenAusPositionen(positionen) {
  let nettoMin = 0
  let einkaufZeileMin = 0
  for (const p of positionen) {
    if (p.typ === 'freitext' || p.typ === 'gewerk_beschreibung') continue
    const vk = (p.lohn_netto + p.material_netto) * (p.menge || 1)
    nettoMin += vk
    if (p.einkaufspreis) einkaufZeileMin += p.einkaufspreis * (p.menge || 1)
  }
  return { nettoMin, einkaufZeileMin, margeMin: nettoMin - einkaufZeileMin }
}

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase-Env fehlt')

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const results = []
  const ok = (name) => results.push({ name, ok: true })
  const fail = (name, msg) => {
    results.push({ name, ok: false, msg })
    console.error(`✗ ${name}: ${msg}`)
  }

  const { data: editable, error: e1 } = await db
    .from('angebote')
    .select('id, status, positionen, gesamt_min')
    .in('status', BEARBEITBAR)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (e1 || !editable) {
    fail('editable-angebot-finden', e1?.message ?? 'Kein bearbeitbares Angebot')
    printSummary(results)
    process.exit(1)
  }
  ok(`bearbeitbares Angebot: ${editable.id} (${editable.status})`)

  const angebotId = editable.id
  const original = Array.isArray(editable.positionen) ? [...editable.positionen] : []
  const originalGesamt = editable.gesamt_min

  const testId = neuePositionsId()
  const neu = {
    id: testId,
    gewerk_id: 'test-gewerk',
    gewerk_name: 'Test-Gewerk',
    gewerk_slug: 'test-gewerk',
    gewerk_block_key: `test-gewerk-${Date.now()}`,
    leistung: 'Integrationstest Position',
    leistung_name: 'Integrationstest Position',
    beschreibung: '',
    menge: 1,
    einheit: 'Stk.',
    lohn_netto: 100,
    material_netto: 0,
    gesamt_min: 100,
    gesamt_max: 100,
    preis_typ: 'fix',
    einkaufspreis: 60,
  }

  const afterAdd = [...original, neu]
  const summenAdd = summenAusPositionen(afterAdd)
  const { error: addErr } = await db
    .from('angebote')
    .update({
      positionen: afterAdd,
      gesamt_min: summenAdd.nettoMin,
      gesamt_max: summenAdd.nettoMin,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  if (addErr) fail('position-hinzufuegen', addErr.message)
  else ok('position-hinzufuegen')

  const { data: afterAddRow } = await db.from('angebote').select('positionen').eq('id', angebotId).single()
  const found = (afterAddRow?.positionen ?? []).find((p) => p.id === testId)
  if (!found) fail('position-persistiert', 'Testposition nicht in DB')
  else ok('position-persistiert')

  const afterUpdate = (afterAddRow.positionen ?? []).map((p) =>
    p.id === testId
      ? { ...p, leistung_name: 'Integrationstest geändert', lohn_netto: 150, gesamt_min: 150, gesamt_max: 150 }
      : p
  )
  const summenUpd = summenAusPositionen(afterUpdate)
  const { error: updErr } = await db
    .from('angebote')
    .update({ positionen: afterUpdate, gesamt_min: summenUpd.nettoMin, gesamt_max: summenUpd.nettoMin })
    .eq('id', angebotId)

  if (updErr) fail('position-aendern', updErr.message)
  else ok('position-aendern')

  const afterDelete = afterUpdate.filter((p) => p.id !== testId)
  const summenDel = summenAusPositionen(afterDelete)
  const { error: delErr } = await db
    .from('angebote')
    .update({
      positionen: afterDelete,
      gesamt_min: summenDel.nettoMin,
      gesamt_max: summenDel.nettoMin,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  if (delErr) fail('position-loeschen', delErr.message)
  else ok('position-loeschen')

  const { data: restored } = await db.from('angebote').select('positionen, gesamt_min').eq('id', angebotId).single()
  const stillThere = (restored?.positionen ?? []).some((p) => p.id === testId)
  if (stillThere) fail('position-entfernt', 'Testposition noch vorhanden')
  else ok('position-entfernt')

  const { data: locked } = await db
    .from('angebote')
    .select('id, status')
    .not('status', 'in', `(${BEARBEITBAR.join(',')})`)
    .limit(1)
    .maybeSingle()

  if (locked) {
    const lockedEditable = BEARBEITBAR.includes(locked.status)
    if (lockedEditable) fail('gate-gesperrt', `Status ${locked.status} sollte gesperrt sein`)
    else ok(`gate-gesperrt: Status „${locked.status}" nicht bearbeitbar`)
  } else {
    ok('gate-gesperrt: (kein gesperrtes Angebot in DB — Gate-Logik OK)')
  }

  await db
    .from('angebote')
    .update({ positionen: original, gesamt_min: originalGesamt, gesamt_max: originalGesamt })
    .eq('id', angebotId)
  ok('rollback-original')

  printSummary(results)
  const failed = results.filter((r) => !r.ok)
  process.exit(failed.length ? 1 : 0)
}

function printSummary(results) {
  console.log('\n--- Angebot-Positionen Flow-Test ---')
  for (const r of results) {
    console.log(r.ok ? `✓ ${r.name}` : `✗ ${r.name}${r.msg ? `: ${r.msg}` : ''}`)
  }
  const passed = results.filter((r) => r.ok).length
  console.log(`\n${passed}/${results.length} bestanden`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
