/**
 * Seed: View–Action-Parität — Datensätze mit „fremder“ Eigentümerschaft (Staging only).
 *
 * Erzeugt Lead → Angebot → Auftrag → Rechnung (gesendet), `erstellt_von` = anderer User
 * als der CRM-Staff, der die Smoke-Aktionen ausführt.
 *
 * Usage:
 *   node scripts/seed-view-action-parity.mjs
 *
 * Env (.env.staging): STAGING_SUPABASE_URL, STAGING_SERVICE_ROLE_KEY
 * Optional: PARITY_OWNER_USER_ID (UUID eines Nicht-Staff- oder zweiten Users)
 *
 * Siehe docs/test/VIEW-ACTION-PARITAET.md
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from './lib/prod-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TAG = 'view-action-parity'

function loadEnv() {
  const envPath = path.join(__dirname, '../.env.staging')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const k = t.slice(0, eq)
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).replace(/^["']|["']$/g, '')
  }
}

function db() {
  loadEnv()
  const url = process.env.STAGING_SUPABASE_URL?.trim()
  const key = process.env.STAGING_SERVICE_ROLE_KEY?.trim()
  assertStagingWriteTarget({
    supabaseUrl: url,
    projectRef: STAGING_PROJECT_REF_CANON,
  })
  if (!url?.includes(STAGING_PROJECT_REF_CANON) || !key) {
    console.error('ABORT: STAGING_SUPABASE_URL / STAGING_SERVICE_ROLE_KEY fehlen.')
    process.exit(1)
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function resolveForeignOwner(supabase) {
  const explicit = process.env.PARITY_OWNER_USER_ID?.trim()
  if (explicit) return explicit

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, email, role')
    .order('created_at', { ascending: true })
    .limit(20)

  const foreign =
    (profiles ?? []).find((p) => /staff2|staging\.baerenwald/i.test(String(p.email ?? ''))) ??
    (profiles ?? [])[1] ??
    (profiles ?? [])[0]

  if (!foreign?.id) {
    console.error('ABORT: Kein user_profiles-Eintrag für fremde Eigentümerschaft.')
    process.exit(1)
  }
  return String(foreign.id)
}

async function main() {
  const supabase = db()
  const ownerId = await resolveForeignOwner(supabase)
  const now = new Date().toISOString()
  const stamp = now.slice(0, 19).replace(/[:T]/g, '')

  const { data: kunde, error: kErr } = await supabase
    .from('kunden')
    .insert({
      name: `Parity-Kunde ${stamp}`,
      email: `parity-${stamp}@example.test`,
      typ: 'privat',
      notizen: `${TAG} seed`,
    })
    .select('id')
    .single()
  if (kErr || !kunde?.id) throw new Error(kErr?.message ?? 'Kunde insert failed')

  const { data: lead, error: lErr } = await supabase
    .from('leads')
    .insert({
      kunde_id: kunde.id,
      status: 'angebot',
      situation: 'kaputt',
      notizen: `${TAG} fremder Owner ${ownerId}`,
      erstellt_von: ownerId,
    })
    .select('id')
    .single()
  if (lErr || !lead?.id) throw new Error(lErr?.message ?? 'Lead insert failed')

  const { data: angebot, error: aErr } = await supabase
    .from('angebote')
    .insert({
      lead_id: lead.id,
      kunde_id: kunde.id,
      status: 'gesendet_kunde',
      status_einfach: 'gesendet',
      positionen: [
        {
          id: crypto.randomUUID(),
          titel: 'Parity-Position',
          menge: 1,
          einheit: 'pauschal',
          vk_netto: 100,
        },
      ],
      gesamt_fix: 119,
      erstellt_von: ownerId,
      gesendet_kunde_at: now,
    })
    .select('id')
    .single()
  if (aErr || !angebot?.id) throw new Error(aErr?.message ?? 'Angebot insert failed')

  const { data: auftrag, error: aufErr } = await supabase
    .from('auftraege')
    .insert({
      lead_id: lead.id,
      angebot_id: angebot.id,
      kunde_id: kunde.id,
      titel: `Parity-Auftrag ${stamp}`,
      status: 'in_arbeit',
      erstellt_von: ownerId,
    })
    .select('id')
    .single()
  if (aufErr || !auftrag?.id) throw new Error(aufErr?.message ?? 'Auftrag insert failed')

  const { data: rechnung, error: rErr } = await supabase
    .from('rechnungen')
    .insert({
      lead_id: lead.id,
      angebot_id: angebot.id,
      auftrag_id: auftrag.id,
      kunde_id: kunde.id,
      status: 'gesendet',
      rechnung_art: 'voll',
      beleg_typ: 'rechnung',
      positionen: [
        {
          id: crypto.randomUUID(),
          titel: 'Parity-Leistung',
          menge: 1,
          einheit: 'pauschal',
          vk_netto: 100,
        },
      ],
      netto: 100,
      brutto: 119,
      mwst: 19,
      gesendet_at: now,
      erstellt_von: ownerId,
      rechnungsnummer: `PARITY-${stamp}`,
    })
    .select('id, rechnungsnummer, status, erstellt_von')
    .single()
  if (rErr || !rechnung?.id) throw new Error(rErr?.message ?? 'Rechnung insert failed')

  const out = {
    tag: TAG,
    ownerId,
    kundeId: kunde.id,
    leadId: lead.id,
    angebotId: angebot.id,
    auftragId: auftrag.id,
    rechnungId: rechnung.id,
    rechnungsnummer: rechnung.rechnungsnummer,
    crmDetail: {
      anfrage: `/anfragen/${lead.id}`,
      angebot: `/angebote/${angebot.id}`,
      auftrag: `/auftraege/${auftrag.id}`,
      rechnung: `/rechnungen/${rechnung.id}`,
    },
    smoke: [
      'Rechnung Detail → Als bezahlt',
      'Rechnung → Zahlungserinnerung (wenn noch gesendet)',
      'Rechnung → Soft-Storno ohne Ersatz',
      'Angebot → Ablehnen / Status',
      'Auftrag → Status abschließen/stornieren',
      'Anfrage → Status / verloren',
    ],
  }

  const outPath = path.join(__dirname, '../docs/test/view-action-parity-seed.json')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(JSON.stringify(out, null, 2))
  console.log(`\nWrote ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
