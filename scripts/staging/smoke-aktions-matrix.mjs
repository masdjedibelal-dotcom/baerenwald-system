#!/usr/bin/env node
/**
 * Runde-3 Aktions-Matrix Smoke (Staging CRM)
 *
 * Öffnet Detailseiten und prüft/führt Aktionen aus.
 * Ergebnisse: ok | disabled | fail | crash
 *
 *   node --env-file=.env.staging scripts/staging/smoke-aktions-matrix.mjs
 *
 * Datenbasis: LEGACY-Seed + Staging-Seed (Musterverwaltung / Partner).
 * Destruktiv nur an LEGACY-* (Confirm nur wo nötig; Restore wo möglich).
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  assertStagingWriteTarget,
  STAGING_PROJECT_REF_CANON,
} from '../lib/prod-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const OUT_DIR = path.join(__dirname, '../../docs/test')
const SHOT = path.join(OUT_DIR, 'screenshots/aktions-matrix')

const CRM_USER = process.env.CRM_SMOKE_USER || 'admin@staging.baerenwald.test'
const CRM_PASS = process.env.CRM_SMOKE_PASS || 'StagingTest!2026'
const SMOKE_LABEL = process.env.CRM_SMOKE_LABEL || (CRM_USER.includes('staff2') ? 'staff2' : 'admin')
const JSON_OUT = path.join(
  OUT_DIR,
  SMOKE_LABEL === 'admin' ? 'aktions-matrix-r3-results.json' : `aktions-matrix-r3-${SMOKE_LABEL}-results.json`
)
const MD_OUT = path.join(
  OUT_DIR,
  SMOKE_LABEL === 'admin' ? 'AKTIONS-SMOKE-R3.md' : `AKTIONS-SMOKE-R3-${SMOKE_LABEL.toUpperCase()}.md`
)

/** LEGACY IDs aus seed-legacy-edgecases.mjs */
const L = {
  reForeign: 'a1100000-0000-4000-8000-000000000023',
  reNoNr: 'a1100000-0000-4000-8000-000000000042',
  reTeil: 'a1100000-0000-4000-8000-000000000053',
  reBig: 'a1100000-0000-4000-8000-000000000073',
  angForeign: 'a1100000-0000-4000-8000-000000000021',
  angEmpty: 'a1100000-0000-4000-8000-000000000041',
  angAlt: 'a1100000-0000-4000-8000-000000000051',
  angHalb: 'a1100000-0000-4000-8000-000000000061',
  aufForeign: 'a1100000-0000-4000-8000-000000000022',
  aufOrphan: 'a1100000-0000-4000-8000-000000000034',
  aufPlan: 'a1100000-0000-4000-8000-000000000039',
  aufAlt: 'a1100000-0000-4000-8000-000000000052',
  aufHalb: 'a1100000-0000-4000-8000-000000000062',
  aufBig: 'a1100000-0000-4000-8000-000000000072',
  leadForeign: 'a1100000-0000-4000-8000-000000000020',
  leadEmpty: 'a1100000-0000-4000-8000-000000000040',
  leadAlt: 'a1100000-0000-4000-8000-000000000050',
  leadHalb: 'a1100000-0000-4000-8000-000000000060',
  leadOld: 'a1100000-0000-4000-8000-000000000074',
  leadPhase0: 'a1100000-0000-4000-8000-000000000100', // neu
  kundeHub: 'a1100000-0000-4000-8000-000000000001',
  kundeNoMail: 'a1100000-0000-4000-8000-000000000003',
  kundeSoft: 'a1100000-0000-4000-8000-000000000002',
}

const SEED = {
  kundeNord: '1b6cccda-6fdf-4b9c-84b3-b58ade30da94',
  hwElektro: '6f9b423c-44e1-49ec-839f-576fd4f5f0f5',
  leadR2: '22eac221-036c-42c2-bd24-21bf9a448b98',
  auftragR2: '231716aa-0215-4560-9253-1492632981de',
}

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env.staging')
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

const results = []

function mark(entity, action, status, note, extra = {}) {
  const row = { entity, action, status, note, ...extra, at: new Date().toISOString() }
  results.push(row)
  const icon = { ok: '✅', disabled: '🔒', fail: '❌', crash: '💥', skip: '⏭️' }[status] || '?'
  console.log(`${icon} ${entity} · ${action} — ${note}`)
}

async function loginCrm(page) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(800)
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email]').first().fill(CRM_USER)
  await page.locator('input[type=password]').fill(CRM_PASS)
  await page.getByRole('button', { name: /anmelden|login/i }).first().click()
  await page.waitForTimeout(2500)
  // Staging landet oft auf / bevor networkidle
  for (let i = 0; i < 30; i++) {
    if (!page.url().includes('/login')) return
    await page.waitForTimeout(500)
  }
  throw new Error('CRM-Login Timeout — noch auf /login')
}

async function openDetail(page, entity, actionLabel, url) {
  const errors = []
  const onErr = (err) => errors.push(String(err))
  page.on('pageerror', onErr)
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(1800)
    const status = res?.status() ?? 0
    const body = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 2500)
    const notFound =
      status === 404 ||
      /nicht gefunden|404|error|etwas ist schief|application error/i.test(body)
    const crashed = errors.some((e) => /chunk|hydrat|typeerror|referenceerror/i.test(e))
    if (crashed) {
      mark(entity, actionLabel, 'crash', `pageerror: ${errors[0]?.slice(0, 120)}`, { url, httpStatus: status })
      return { ok: false, body, status }
    }
    if (notFound || status >= 500) {
      mark(entity, actionLabel, 'fail', `Laden fehlgeschlagen HTTP ${status}`, {
        url,
        httpStatus: status,
        snippet: body.slice(0, 160),
      })
      return { ok: false, body, status }
    }
    mark(entity, actionLabel, 'ok', `Detail geladen HTTP ${status}`, { url, httpStatus: status })
    return { ok: true, body, status }
  } catch (e) {
    mark(entity, actionLabel, 'crash', e.message?.slice(0, 160) || String(e), { url })
    return { ok: false, body: '', status: 0 }
  } finally {
    page.off('pageerror', onErr)
  }
}

async function findAction(page, patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns]
  for (const p of list) {
    const loc = page.getByRole('button', { name: p }).or(page.getByRole('link', { name: p }))
    const n = await loc.count().catch(() => 0)
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i)
      if (await el.isVisible().catch(() => false)) return el
    }
    // Menü-Items oft als menuitem / text
    const txt = page.getByText(p).first()
    if (await txt.isVisible().catch(() => false)) return txt
  }
  return null
}

async function openActionsMenu(page) {
  const candidates = [
    page.getByRole('button', { name: /^⋯$|mehr|aktionen|options/i }).first(),
    page.locator('button[aria-haspopup="menu"]').first(),
    page.locator('[data-actions-menu], .actions-menu, .mock-entity-row-menu button').first(),
  ]
  for (const c of candidates) {
    if (await c.isVisible().catch(() => false)) {
      await c.click().catch(() => {})
      await page.waitForTimeout(400)
      return true
    }
  }
  return false
}

async function classifyButton(page, entity, action, patterns, { execute = false, confirm = false } = {}) {
  await openActionsMenu(page)
  const btn = await findAction(page, patterns)
  if (!btn) {
    mark(entity, action, 'skip', 'Aktion in UI nicht gefunden (Status/Feature)')
    return
  }
  const disabled =
    (await btn.isDisabled().catch(() => false)) ||
    (await btn.getAttribute('aria-disabled').catch(() => null)) === 'true' ||
    (await btn.evaluate((el) => el.classList.contains('disabled') || el.hasAttribute('disabled')).catch(() => false))
  const title = (await btn.getAttribute('title').catch(() => '')) || ''
  const text = ((await btn.innerText().catch(() => '')) || '').trim()

  if (disabled) {
    mark(
      entity,
      action,
      'disabled',
      title || text || 'disabled ohne title — prüfen',
      { title, text }
    )
    return
  }

  if (!execute) {
    mark(entity, action, 'ok', `sichtbar/aktiv („${text.slice(0, 40)}“) — nicht ausgeführt`, {
      mode: 'probe',
    })
    return
  }

  try {
    page.once('dialog', async (d) => {
      if (confirm) await d.accept()
      else await d.dismiss()
    })
    await btn.click({ timeout: 8000 })
    await page.waitForTimeout(1200)
    // Modal?
    const dialog = page.locator('[role=dialog], .mock-modal, .modal').first()
    if (await dialog.isVisible().catch(() => false)) {
      const dt = ((await dialog.innerText().catch(() => '')) || '').slice(0, 200)
      if (!confirm) {
        const cancel = dialog.getByRole('button', { name: /abbrechen|schließen|nein|zurück/i }).first()
        if (await cancel.isVisible().catch(() => false)) await cancel.click().catch(() => {})
        else await page.keyboard.press('Escape')
        mark(entity, action, 'ok', `Modal öffnete sich: ${dt.slice(0, 80)}`, { mode: 'modal-probe' })
        return
      }
    }
    const toastFail = page.locator('text=/nicht gefunden|fehlgeschlagen|keine berechtigung|error/i').first()
    if (await toastFail.isVisible().catch(() => false)) {
      const t = ((await toastFail.innerText().catch(() => '')) || '').slice(0, 120)
      mark(entity, action, 'fail', t)
      return
    }
    mark(entity, action, 'ok', 'Aktion ausgeführt ohne sichtbaren Fehler')
  } catch (e) {
    mark(entity, action, 'crash', e.message?.slice(0, 160) || String(e))
  }
}

async function clickAndExpect(page, entity, action, patterns, expectOk = true) {
  await openActionsMenu(page)
  const btn = await findAction(page, patterns)
  if (!btn) {
    mark(entity, action, 'skip', 'Button nicht gefunden')
    return false
  }
  if (await btn.isDisabled().catch(() => false)) {
    const title = (await btn.getAttribute('title').catch(() => '')) || ''
    mark(entity, action, 'disabled', title || 'disabled')
    return false
  }
  try {
    await btn.click({ timeout: 8000 })
    await page.waitForTimeout(1500)
    const fail = page.locator('text=/nicht gefunden|fehlgeschlagen|keine berechtigung/i').first()
    if (await fail.isVisible().catch(() => false)) {
      mark(entity, action, 'fail', ((await fail.innerText()) || '').slice(0, 140))
      return false
    }
    mark(entity, action, 'ok', expectOk ? 'OK' : 'ausgeführt')
    return true
  } catch (e) {
    mark(entity, action, 'crash', e.message?.slice(0, 160) || String(e))
    return false
  }
}

function writeReport() {
  fs.mkdirSync(SHOT, { recursive: true })
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify(
      {
        finished_at: new Date().toISOString(),
        crm: CRM,
        user: CRM_USER,
        label: SMOKE_LABEL,
        results,
      },
      null,
      2
    )
  )

  const byEntity = {}
  for (const r of results) {
    byEntity[r.entity] ||= []
    byEntity[r.entity].push(r)
  }
  const icon = { ok: '✅', disabled: '🔒', fail: '❌', crash: '💥', skip: '⏭️' }
  let md = `# Aktions-Smoke Runde 3 (Staging) — ${SMOKE_LABEL}

**Datum:** ${new Date().toISOString()}  
**CRM:** ${CRM}  
**Login:** \`${CRM_USER}\`  
**Daten:** LEGACY-Seed + Staging-Seed (+ PRODSIM falls vorhanden)  
**Legende:** ✅ funktioniert · 🔒 deaktiviert-mit-Grund · ❌ Fehler/„nicht gefunden“ · 💥 Crash · ⏭️ UI nicht angeboten

> Hinweis: Mutationen nur selektiv ausgeführt (Parity-kritisch / LEGACY). Viele Zellen = UI-Probe (sichtbar/disabled) ohne Side-Effect.

`

  const counts = { ok: 0, disabled: 0, fail: 0, crash: 0, skip: 0 }
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1
  md += `## Bilanz\n\n| Status | n |\n|---|---:|\n`
  for (const [k, v] of Object.entries(counts)) md += `| ${icon[k] || k} ${k} | ${v} |\n`

  md += `\n## Matrix\n\n`
  for (const [entity, rows] of Object.entries(byEntity)) {
    md += `### ${entity}\n\n| Aktion | Ergebnis | Hinweis |\n|---|---|---|\n`
    for (const r of rows) {
      md += `| ${r.action} | ${icon[r.status] || r.status} | ${(r.note || '').replace(/\|/g, '/')} |\n`
    }
    md += `\n`
  }

  const fails = results.filter((r) => r.status === 'fail' || r.status === 'crash')
  md += `## Funde / Blocker\n\n`
  if (!fails.length) md += `_Keine ❌/💥 in diesem Lauf._\n`
  else {
    for (const f of fails) {
      md += `- **${f.entity} · ${f.action}** (${f.status}): ${f.note}\n`
    }
  }

  md += `\n## Rechnung menuItems={[]}\n\n`
  md += `Detail-Header: \`menuItems={[]}\` → ⋯-Menü **leer/unsichtbar**. `
  md += `Storno/Mahnung am Detail **nicht verdrahtet** (Modal-Code ohne CTA). `
  md += `PDF: Tab Akte/Dokumente. Löschen: nur Listen-⋯ am Auftrag (Entwurf).\n`

  fs.writeFileSync(MD_OUT, md)
  console.log(`\nWrote ${MD_OUT}`)
  console.log(`Wrote ${JSON_OUT}`)
}

async function resetParityRechnung(supabase) {
  if (!supabase) return
  const { error } = await supabase
    .from('rechnungen')
    .update({
      status: 'gesendet',
      bezahlt_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', L.reForeign)
  if (error) console.warn('resetParityRechnung:', error.message)
  else console.log('Reset LEGACY-fremd RE → gesendet (für Als-bezahlt-Probe)')
}

async function resolveProdsimIds(supabase) {
  if (!supabase) return []
  const out = []
  const { data: re } = await supabase
    .from('rechnungen')
    .select('id, rechnungsnummer, status')
    .or('rechnungsnummer.ilike.PRODSIM%,notizen.ilike.%PRODSIM%')
    .limit(5)
  for (const r of re || []) {
    out.push({ entity: 'Rechnung', id: r.id, label: r.rechnungsnummer || r.id, status: r.status })
  }
  const { data: auf } = await supabase
    .from('auftraege')
    .select('id, titel, status')
    .ilike('titel', 'PRODSIM%')
    .limit(3)
  for (const a of auf || []) {
    out.push({ entity: 'Auftrag', id: a.id, label: a.titel || a.id, status: a.status })
  }
  return out
}

async function assertAltStatusBadge(page, entity, expectedRaw) {
  const badges = (
    await page.locator('.mock-badge, [class*="Badge"], [data-kind]').allTextContents().catch(() => [])
  ).map((t) => String(t || '').trim())
  const body = (await page.locator('body').innerText().catch(() => '')) || ''
  const inBadge = badges.some((b) => new RegExp(`^${expectedRaw}$`, 'i').test(b))
  const entwurfBadge = badges.some((b) => /^entwurf$/i.test(b))
  if (entity === 'Angebot' && entwurfBadge && !inBadge) {
    mark(
      entity,
      `Alt-Status Badge (${expectedRaw})`,
      'fail',
      `Badge zeigt Entwurf statt Rohwert (badges=${badges.slice(0, 8).join('|')})`
    )
    return
  }
  if (inBadge) {
    mark(entity, `Alt-Status Badge (${expectedRaw})`, 'ok', `Rohwert im Badge (${badges.filter(Boolean).slice(0, 6).join('|')})`)
    return
  }
  if (new RegExp(expectedRaw, 'i').test(body) && !entwurfBadge) {
    mark(entity, `Alt-Status Badge (${expectedRaw})`, 'ok', 'Rohwert auf Seite sichtbar')
    return
  }
  mark(
    entity,
    `Alt-Status Badge (${expectedRaw})`,
    'fail',
    `Rohwert nicht im Badge (badges=${badges.slice(0, 8).join('|') || '—'})`
  )
}

async function probeRechnungOverflowAndPdf(page) {
  // ⋯ am Detail-Header (DetailActionsBar aria-label)
  const more = page.locator('button[aria-label="Weitere Aktionen"]').first()
  await more.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
  const moreVisible = await more.isVisible().catch(() => false)
  if (!moreVisible) {
    mark('Rechnung', '⋯-Menü Detail', 'fail', 'kein Overflow-Trigger (aria-label „Weitere Aktionen“)')
  } else {
    await more.click().catch(() => {})
    await page.waitForTimeout(400)
    const items = await page.locator('.menu-item, [role=menuitem]').allTextContents().catch(() => [])
    const joined = items.map((t) => t.trim()).filter(Boolean).join(' | ')
    if (!joined) {
      mark('Rechnung', '⋯-Menü Detail', 'fail', 'Menü leer')
    } else {
      mark('Rechnung', '⋯-Menü Detail', 'ok', `Items: ${joined.slice(0, 160)}`)
    }
    await page.keyboard.press('Escape').catch(() => {})
  }

  // PDF über Akte/Dokumente-Tab
  for (const name of ['Akte', 'Dokumente', 'Dokument']) {
    const tab = page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).or(
      page.getByRole('tab', { name: new RegExp(name, 'i') })
    )
    if (await tab.first().isVisible().catch(() => false)) {
      await tab.first().click().catch(() => {})
      await page.waitForTimeout(800)
      break
    }
  }
  const pdfLink = page.getByRole('link', { name: /pdf|rechnung/i }).or(page.getByRole('button', { name: /pdf|öffnen/i }))
  if (await pdfLink.first().isVisible().catch(() => false)) {
    mark('Rechnung', 'PDF (Akte/Dokumente)', 'ok', 'PDF-Link/CTA im Dokumente-Bereich sichtbar — Header-Menü nicht nötig')
  } else {
    mark('Rechnung', 'PDF (Akte/Dokumente)', 'skip', 'kein PDF-CTA im Dokumente-Tab gefunden')
  }
}

async function main() {
  loadEnv()
  assertStagingWriteTarget({
    supabaseUrl: process.env.STAGING_SUPABASE_URL,
    projectRef: process.env.STAGING_PROJECT_REF || STAGING_PROJECT_REF_CANON,
    projectId: process.env.STAGING_PROJECT_ID,
    dbUrl: process.env.STAGING_DB_URL,
  })

  fs.mkdirSync(SHOT, { recursive: true })
  const url = process.env.STAGING_SUPABASE_URL
  const key = process.env.STAGING_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase =
    url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
  await resetParityRechnung(supabase)
  const prodsim = await resolveProdsimIds(supabase)
  if (!prodsim.length) {
    mark('PRODSIM', 'Datensatz-Suche', 'skip', 'keine PRODSIM-Zeilen auf Staging — Import nachziehen')
  } else {
    mark('PRODSIM', 'Datensatz-Suche', 'ok', `${prodsim.length} Treffer`, {
      ids: prodsim.map((p) => `${p.entity}:${p.id}`),
    })
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  console.log(`Smoke-Login: ${CRM_USER} (${SMOKE_LABEL})`)

  try {
    await loginCrm(page)

    // ════════ RECHNUNG ════════
    const reOpen = await openDetail(page, 'Rechnung', 'öffnen (fremd/gesendet)', `${CRM}/rechnungen/${L.reForeign}`)
    if (reOpen.ok) {
      await page.screenshot({ path: path.join(SHOT, `re-foreign-${SMOKE_LABEL}.png`), fullPage: false })
      await classifyButton(page, 'Rechnung', 'bearbeiten', [/bearbeiten|korrigieren|ändern/i], { execute: true })
      // Parity-kritisch: Als bezahlt
      await clickAndExpect(page, 'Rechnung', 'als bezahlt', [/als bezahlt|bezahlt markieren|auf bezahlt/i])
      await clickAndExpect(page, 'Rechnung', 'bezahlt zurücknehmen', [/zurück|unbezahlt|nicht bezahlt|auf gesendet/i])
      await probeRechnungOverflowAndPdf(page)
      await classifyButton(page, 'Rechnung', 'storno ohne Ersatz', [/stornieren|soft-storno|ohne ersatz/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Rechnung', 'storno korrigieren/gutschrift', [/korrigieren|gutschrift|storno.*neu/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Rechnung', 'storno zurücknehmen', [/storno zurück|wiederherstellen|entsperren/i])
      await classifyButton(page, 'Rechnung', 'Mahnung', [/mahnung|erinnerung|zahlungserinnerung/i], { execute: true })
      await classifyButton(page, 'Rechnung', 'löschen', [/löschen|delete/i], { execute: true, confirm: false })
      await classifyButton(page, 'Rechnung', 'PDF (Header)', [/pdf|vorschau|download/i], { execute: true })
    }

    await openDetail(page, 'Rechnung', 'öffnen (ohne Nummer/gesendet)', `${CRM}/rechnungen/${L.reNoNr}`)
    await openDetail(page, 'Rechnung', 'öffnen (Alt-Status teilbezahlt)', `${CRM}/rechnungen/${L.reTeil}`)
    await assertAltStatusBadge(page, 'Rechnung', 'teilbezahlt')
    await openDetail(page, 'Rechnung', 'öffnen (>20k)', `${CRM}/rechnungen/${L.reBig}`)

    for (const p of prodsim.filter((x) => x.entity === 'Rechnung')) {
      await openDetail(page, 'Rechnung', `öffnen (PRODSIM ${p.label})`, `${CRM}/rechnungen/${p.id}`)
      await clickAndExpect(page, 'Rechnung', `als bezahlt (PRODSIM ${p.label})`, [
        /als bezahlt|bezahlt markieren|auf bezahlt/i,
      ])
    }
    // ════════ ANGEBOT ════════
    const angOpen = await openDetail(page, 'Angebot', 'öffnen (fremd)', `${CRM}/angebote/${L.angForeign}`)
    if (angOpen.ok) {
      await page.screenshot({ path: path.join(SHOT, 'ang-foreign.png'), fullPage: false })
      await classifyButton(page, 'Angebot', 'bearbeiten', [/bearbeiten|ändern|wizard/i], { execute: true })
      await classifyButton(page, 'Angebot', 'senden', [/senden|an kunde|mail/i], { execute: true, confirm: false })
      await classifyButton(page, 'Angebot', 'annehmen', [/annehmen|auftrag erstellen|akzeptieren/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Angebot', 'ablehnen', [/ablehnen|abgelehnt/i], { execute: true, confirm: false })
      await classifyButton(page, 'Angebot', 'ersetzen', [/ersetzen|neu stellen|korrektur/i])
      await classifyButton(page, 'Angebot', 'löschen', [/löschen/i], { execute: true, confirm: false })
      await classifyButton(page, 'Angebot', 'Partner-Einholung', [/partner|handwerker|einholung|anfragen/i])
      await classifyButton(page, 'Angebot', 'PDF', [/pdf|vorschau/i], { execute: true })
    }
    await openDetail(page, 'Angebot', 'öffnen (ohne Positionen)', `${CRM}/angebote/${L.angEmpty}`)
    await openDetail(page, 'Angebot', 'öffnen (Alt-Status versendet)', `${CRM}/angebote/${L.angAlt}`)
    await assertAltStatusBadge(page, 'Angebot', 'versendet')
    await page.screenshot({ path: path.join(SHOT, `ang-alt-${SMOKE_LABEL}.png`), fullPage: false })

    // ════════ AUFTRAG ════════
    const aufOpen = await openDetail(page, 'Auftrag', 'öffnen (fremd)', `${CRM}/auftraege/${L.aufForeign}`)
    if (aufOpen.ok) {
      await page.screenshot({ path: path.join(SHOT, 'auf-foreign.png'), fullPage: false })
      await classifyButton(page, 'Auftrag', 'Position ändern', [/position|leistung|bearbeiten/i])
      await classifyButton(page, 'Auftrag', 'HW zuweisen', [/zuweisen|handwerker|partner wählen/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Auftrag', 'an HW senden', [/an partner|an handwerker|senden/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Auftrag', 'Nachtrag', [/nachtrag/i], { execute: true, confirm: false })
      await classifyButton(page, 'Auftrag', 'Baustopp beenden', [/baustopp|fortsetzen|stopp beenden/i])
      await classifyButton(page, 'Auftrag', 'abschließen', [/abschlie/i], { execute: true, confirm: false })
      await classifyButton(page, 'Auftrag', 'stornieren', [/stornieren/i], { execute: true, confirm: false })
      await classifyButton(page, 'Auftrag', 'Abnahme', [/abnahme/i], { execute: true, confirm: false })
    }
    await openDetail(page, 'Auftrag', 'öffnen (tote Angebot-FK)', `${CRM}/auftraege/${L.aufOrphan}`)
    await openDetail(page, 'Auftrag', 'öffnen (Zahlplan)', `${CRM}/auftraege/${L.aufPlan}`)
    await openDetail(page, 'Auftrag', 'öffnen (Alt wartend)', `${CRM}/auftraege/${L.aufAlt}`)
    await assertAltStatusBadge(page, 'Auftrag', 'wartend')
    await openDetail(page, 'Auftrag', 'öffnen (HW halb-migriert)', `${CRM}/auftraege/${L.aufHalb}`)

    for (const p of prodsim.filter((x) => x.entity === 'Auftrag')) {
      await openDetail(page, 'Auftrag', `öffnen (PRODSIM ${String(p.label).slice(0, 40)})`, `${CRM}/auftraege/${p.id}`)
    }

    // Zahlplan an LEGACY-Auftrag
    const zp = await openDetail(page, 'Zahlplan', 'öffnen (Auftrag mit Plan)', `${CRM}/auftraege/${L.aufPlan}`)
    if (zp.ok) {
      // Tab Zahlung?
      const tab = page.getByRole('tab', { name: /zahlung|plan|abrechnung/i }).first()
      if (await tab.isVisible().catch(() => false)) {
        await tab.click().catch(() => {})
        await page.waitForTimeout(800)
      }
      await classifyButton(page, 'Zahlplan', 'Rate ändern', [/ändern|bearbeiten|rate/i])
      await classifyButton(page, 'Zahlplan', 'Rate löschen (frozen)', [/löschen|entfernen/i])
      await classifyButton(page, 'Zahlplan', 'Abschlag erzeugen', [/abschlag|rechnung erstellen|stellen/i], {
        execute: true,
        confirm: false,
      })
    }

    // ════════ LEAD ════════
    const leadOpen = await openDetail(page, 'Lead', 'öffnen (fremd)', `${CRM}/anfragen/${L.leadForeign}`)
    if (leadOpen.ok) {
      await page.screenshot({ path: path.join(SHOT, 'lead-foreign.png'), fullPage: false })
      await classifyButton(page, 'Lead', 'Status wechseln', [/status|kontaktiert|termin|angebot/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Lead', 'verloren', [/verloren|abgebrochen|ablehnen/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Lead', 'spam', [/spam/i], { execute: true, confirm: false })
      await classifyButton(page, 'Lead', 'duplizieren', [/dupliz|kopieren/i], { execute: true, confirm: false })
      await classifyButton(page, 'Lead', 'löschen', [/löschen/i], { execute: true, confirm: false })
      await classifyButton(page, 'Lead', 'restore', [/wiederherstellen|restore|rückgängig/i])
      await classifyButton(page, 'Lead', 'Termin', [/termin|kalender|besichtigung/i], {
        execute: true,
        confirm: false,
      })
    }
    await openDetail(page, 'Lead', 'öffnen (Alt-Status)', `${CRM}/anfragen/${L.leadAlt}`)
    await openDetail(page, 'Lead', 'öffnen (ohne funnel)', `${CRM}/anfragen/${L.leadEmpty}`)
    await openDetail(page, 'Lead', 'öffnen (Freigabe halb)', `${CRM}/anfragen/${L.leadHalb}`)

    // ════════ KUNDE ════════
    const kOpen = await openDetail(page, 'Kunde', 'öffnen (Hub 30 Vorgänge)', `${CRM}/kunden/${L.kundeHub}`)
    if (kOpen.ok) {
      await classifyButton(page, 'Kunde', 'bearbeiten', [/bearbeiten|ändern/i], { execute: true, confirm: false })
      await classifyButton(page, 'Kunde', 'zusammenführen', [/zusammenführ|merge/i], { execute: true, confirm: false })
      await classifyButton(page, 'Kunde', 'löschen (Blockade-Fall)', [/löschen/i], { execute: true, confirm: false })
      await classifyButton(page, 'Kunde', 'Portal-Link', [/portal|einladen|link/i])
    }
    await openDetail(page, 'Kunde', 'öffnen (ohne E-Mail)', `${CRM}/kunden/${L.kundeNoMail}`)
    await openDetail(page, 'Kunde', 'öffnen (Seed Nord)', `${CRM}/kunden/${SEED.kundeNord}`)
    await openDetail(page, 'Kunde', 'öffnen (soft-sim)', `${CRM}/kunden/${L.kundeSoft}`)

    // ════════ PARTNER ════════
    const pOpen = await openDetail(page, 'Partner', 'öffnen (Elektro)', `${CRM}/handwerker/${SEED.hwElektro}`)
    if (pOpen.ok) {
      await classifyButton(page, 'Partner', 'zuweisen', [/zuweisen|auftrag/i])
      await classifyButton(page, 'Partner', 'sperren/entsperren', [/sperren|entsperren|portal/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Partner', 'Compliance ablehnen', [/ablehnen|compliance|dokument/i])
      await classifyButton(page, 'Partner', 'Konditionen', [/kondition|preis|satz/i])
    }

    // ════════ ORG / FREIGABE ════════
    const fOpen = await openDetail(page, 'Org/Freigabe', 'öffnen (Lead freigegeben/R2)', `${CRM}/anfragen/${SEED.leadR2}`)
    if (fOpen.ok) {
      await classifyButton(page, 'Org/Freigabe', 'Freigabe anfordern', [/freigabe anfordern|anfordern/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Org/Freigabe', 'erteilen', [/freigeben|erteilen|genehmigen/i])
      await classifyButton(page, 'Org/Freigabe', 'ablehnen', [/ablehnen/i], { execute: true, confirm: false })
      await classifyButton(page, 'Org/Freigabe', 'erneut anfordern', [/erneut|nochmals|wieder anfordern/i], {
        execute: true,
        confirm: false,
      })
      await classifyButton(page, 'Org/Freigabe', 'Schwelle ändern', [/schwelle|€|euro/i])
    }
    await openDetail(page, 'Org/Freigabe', 'öffnen (LEGACY halb Log)', `${CRM}/anfragen/${L.leadHalb}`)

    // Seed-Auftrag für Vergleich (nicht LEGACY)
    await openDetail(page, 'Auftrag', 'öffnen (Seed R2)', `${CRM}/auftraege/${SEED.auftragR2}`)
  } finally {
    await browser.close()
    writeReport()
  }
}

main().catch((e) => {
  console.error(e)
  writeReport()
  process.exit(1)
})
