#!/usr/bin/env node
/**
 * F-P01 / F-P02 — Zahlplan-Referenz-Reparatur (Prod)
 *
 * Symptom: Rechnung hat `zahlungsplan_abschlag_id`, Auftrag.`zahlungsplan` ist NULL
 * (tote Abschlag-Bindung). Repair: Feld auf NULL setzen.
 *
 * ZIEL-REs (Prod, Stand PROD-SMOKE / König):
 *   - 3778e0e3-6593-48f4-a098-f45583b1bb12  (RE2026-2111 Abschlag)     F-P01
 *   - fe47f58c-0959-431f-a56d-090f2089543a  (Schluss-Entwurf)           F-P02
 *
 * Ausführung NUR im Prod-Release-Fenster mit Backup — Default: Dry-Run.
 *
 *   # Dry-Run (default) — zeigt Treffer, schreibt nicht
 *   node --env-file=.env.local scripts/prod/repair-zahlplan-abschlag-orphans.mjs
 *
 *   # Discover alle Orphans (SELECT):
 *   node --env-file=.env.local scripts/prod/repair-zahlplan-abschlag-orphans.mjs --discover
 *
 *   # Echtlauf (explizit):
 *   ALLOW_PROD_ZAHLPLAN_REPAIR=1 node --env-file=.env.local \
 *     scripts/prod/repair-zahlplan-abschlag-orphans.mjs --apply
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL (muss Prod-Ref enthalten) + SUPABASE_SERVICE_ROLE_KEY
 * Guard: bricht ab, wenn URL nicht Prod-Ref enthält ODER Apply ohne Allow-Flag.
 */
import { createClient } from '@supabase/supabase-js'
import { PROD_PROJECT_REF } from '../lib/prod-guard.mjs'

/** Feste Ziel-IDs — erweitern nur mit neuem Smoke-Beleg. */
const TARGET_RECHNUNG_IDS = [
  '3778e0e3-6593-48f4-a098-f45583b1bb12', // F-P01 RE2026-2111
  'fe47f58c-0959-431f-a56d-090f2089543a', // F-P02 Schluss-Entwurf
]

const PAGE_SIZE = 200

function parseArgs(argv) {
  const flags = { apply: false, ids: [...TARGET_RECHNUNG_IDS], discover: false }
  for (const a of argv) {
    if (a === '--apply') flags.apply = true
    else if (a === '--discover') flags.discover = true
    else if (a.startsWith('--ids=')) {
      flags.ids = a
        .slice('--ids='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return flags
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || ''
  if (!url.includes(PROD_PROJECT_REF)) {
    console.error(`ABORT: NEXT_PUBLIC_SUPABASE_URL muss Prod-Ref ${PROD_PROJECT_REF} enthalten.`)
    process.exit(1)
  }
  if (!key) {
    console.error('ABORT: SUPABASE_SERVICE_ROLE_KEY fehlt.')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function discoverOrphans(sb) {
  const { data: rows, error } = await sb
    .from('rechnungen')
    .select('id, rechnungsnummer, status, auftrag_id, zahlungsplan_abschlag_id')
    .not('zahlungsplan_abschlag_id', 'is', null)
    .limit(PAGE_SIZE)
  if (error) throw new Error(error.message)

  const orphans = []
  for (const r of rows ?? []) {
    if (!r.auftrag_id) {
      orphans.push({ ...r, reason: 'kein_auftrag' })
      continue
    }
    const { data: auf, error: aErr } = await sb
      .from('auftraege')
      .select('id, zahlungsplan')
      .eq('id', r.auftrag_id)
      .maybeSingle()
    if (aErr) throw new Error(aErr.message)
    if (!auf || auf.zahlungsplan == null) {
      orphans.push({ ...r, reason: 'auftrag_plan_null' })
    }
  }
  return orphans
}

async function main() {
  const flags = parseArgs(process.argv.slice(2))
  const sb = client()

  if (flags.apply && process.env.ALLOW_PROD_ZAHLPLAN_REPAIR !== '1') {
    console.error(
      'ABORT: Apply erfordert ALLOW_PROD_ZAHLPLAN_REPAIR=1 (Prod-Release-Fenster + Backup).'
    )
    process.exit(1)
  }

  let targets
  if (flags.discover) {
    console.log('==> Discover Orphans (SELECT) …')
    targets = await discoverOrphans(sb)
  } else {
    const { data, error } = await sb
      .from('rechnungen')
      .select('id, rechnungsnummer, status, auftrag_id, zahlungsplan_abschlag_id')
      .in('id', flags.ids)
    if (error) throw new Error(error.message)
    targets = (data ?? []).map((r) => ({ ...r, reason: 'listed' }))
    const missing = flags.ids.filter((id) => !targets.some((t) => t.id === id))
    if (missing.length) {
      console.warn('WARN: IDs nicht gefunden:', missing.join(', '))
    }
  }

  console.log(`\nTreffer: ${targets.length}`)
  for (const t of targets) {
    console.log(
      `  ${t.id}  nr=${t.rechnungsnummer ?? '—'}  status=${t.status}  abschlag=${t.zahlungsplan_abschlag_id}  (${t.reason})`
    )
  }

  if (!targets.length) {
    console.log('Nichts zu tun.')
    return
  }

  if (!flags.apply) {
    console.log('\nDry-Run — kein Write. Für Apply: ALLOW_PROD_ZAHLPLAN_REPAIR=1 … --apply')
    return
  }

  console.log('\n==> APPLY: zahlungsplan_abschlag_id → NULL …')
  const ids = targets.map((t) => t.id)
  const { data: updated, error: uErr } = await sb
    .from('rechnungen')
    .update({ zahlungsplan_abschlag_id: null, updated_at: new Date().toISOString() })
    .in('id', ids)
    .select('id, rechnungsnummer, zahlungsplan_abschlag_id')

  if (uErr) {
    console.error('Update fehlgeschlagen:', uErr.message)
    process.exit(1)
  }
  console.log('Aktualisiert:', updated?.length ?? 0)
  for (const u of updated ?? []) {
    console.log(`  ${u.id}  nr=${u.rechnungsnummer ?? '—'}  abschlag=${u.zahlungsplan_abschlag_id}`)
  }
  console.log('\nFertig. Backup/Smoke nachziehen.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
