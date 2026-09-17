#!/usr/bin/env node
/**
 * A2-Mittelteil Session: HV-Start-Gate → Angebot unter/über Schwelle → Org-Freigabe → Partner-Gate
 * + Mieter-Status-Token + Zusatz-Checks (Süd/direkt, Akut, Timeline)
 *
 * node --env-file=.env.staging scripts/staging/run-a2-mittelteil-session.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { assertStagingWriteTarget, STAGING_PROJECT_REF_CANON } from '../lib/prod-guard.mjs'
import { funnelAdvanceStep } from '../lib/funnel-nav.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const CRM = 'https://staging--baerenwald-backend.netlify.app'
const WEB = 'https://staging--baerenwald.netlify.app'
const SHOT = path.join(ROOT, 'docs/test/screenshots/a2-mittelteil')
const OUT_JSON = path.join(ROOT, 'docs/test/TESTREPORT-A2-MITTELTEIL-SESSION.json')
const OUT_MD = path.join(ROOT, 'docs/test/TESTREPORT-A2-MITTELTEIL-SESSION.md')
const FOTO = path.join(ROOT, 'docs/test/r2-5-data/ok_small.jpg')

const LEAD_FE37 = 'fe37acab-e6ef-43ad-8bfc-2f72ecf5f5af'
const TOKEN_FE37 = 'r21GgKaXhOp-rkmMma0L3UeGW5sqBOqz'
const ADMIN = 'admin@staging.baerenwald.test'
const HV_NORD = 'hv-nord@example.test'
const HV_SUED = 'hv-sued@example.test'
const PASS = 'StagingTest!2026'
const MELDE_NORD = `${WEB}/melden/staging-muster-nord/staging-leopold-10`
const MELDE_SUED = `${WEB}/melden/staging-muster-sued/staging-tegernseer-40`
const PARTNER_BLOCK_MSG = /Wartet auf Org-Freigabe|Organisation hat die Freigabe abgelehnt/i

fs.mkdirSync(SHOT, { recursive: true })

const rows = []
function mark(id, status, note, extra = {}) {
  rows.push({ id, status, note, phase: extra.phase ?? 'A2', ...extra, at: new Date().toISOString() })
  const icon = { ok: '✅', warn: '⚠️', fail: '❌', skip: '⏭️', info: 'ℹ️' }[status] || '?'
  console.log(`${icon} ${id} — ${note}`)
}

function loadEnv() {
  const p = path.join(ROOT, '.env.staging')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i)
    if (!process.env[k]) process.env[k] = t.slice(i + 1).replace(/^["']|["']$/g, '')
  }
}

async function loginCrm(page, email = ADMIN) {
  await page.goto(`${CRM}/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  if (!page.url().includes('/login')) return
  await page.locator('input[type=password]').waitFor({ state: 'visible', timeout: 60000 })
  await page.locator('input[type=email], input[name=email]').first().fill(email)
  await page.locator('input[type=password]').fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 90000 })
}

async function loginPortal(page, email) {
  await page.goto(`${WEB}/portal/login`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(800)
  const pw = page.locator('input[type=password]')
  if (!(await pw.isVisible().catch(() => false))) return
  await page.locator('input[type=email]').first().fill(email)
  await pw.fill(PASS)
  await page.getByRole('button', { name: /anmelden/i }).first().click()
  await page.waitForTimeout(3500)
}

async function dismissCookies(page) {
  const btn = page.getByRole('button', { name: /ablehnen/i }).first()
  if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {})
}

async function probeStatusToken(page, token, label, shotName) {
  const url = `${WEB}/melden/status/${encodeURIComponent(token)}`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)
  if (shotName) await page.screenshot({ path: path.join(SHOT, `${shotName}.png`), fullPage: false })
  const body = (await page.locator('body').innerText()).replace(/\n/g, ' | ')
  const ok = /Status Ihrer Meldung|Your report status|Eingegangen|In Bearbeitung|Beauftragt/i.test(body)
  mark(`status-${label}`, ok ? 'ok' : 'fail', body.slice(0, 220), { phase: 'Status' })
  return { ok, body, url }
}

async function crmPrimaryLabel(page) {
  const bar = page.locator('.detail-actions-bar button, button.btn.primary').first()
  if (await bar.count()) {
    const txt = ((await bar.innerText().catch(() => '')) || '').trim()
    const dis = await bar.isDisabled().catch(() => null)
    if (txt) return { text: txt, disabled: dis }
  }
  const angebot = page.getByRole('button', { name: /Angebot erstellen/i }).first()
  if (await angebot.count()) {
    return {
      text: 'Angebot erstellen',
      disabled: await angebot.isDisabled().catch(() => null),
    }
  }
  return { text: null, disabled: null }
}

async function hvUebergeben(page, leadId, label) {
  await loginPortal(page, HV_NORD)
  await page.goto(`${WEB}/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(SHOT, `hv-${label}.png`), fullPage: false })
  const btn = page
    .getByRole('button', { name: /direkt bärenwald|an bärenwald|bärenwald übergeben/i })
    .first()
  if (!(await btn.count())) {
    mark(`hv-uebergeben-${label}`, 'warn', 'Übergabe-Button nicht sichtbar (evtl. schon übergeben)')
    return false
  }
  await btn.click()
  await page.waitForTimeout(2500)
  mark(`hv-uebergeben-${label}`, 'ok', 'Direkt Bärenwald / Übergeben geklickt')
  return true
}

async function createAngebotViaWizard(page, leadId, label) {
  await loginCrm(page)
  await page.goto(`${CRM}/anfragen/${leadId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  const primary = await crmPrimaryLabel(page)
  mark(`crm-primary-${label}`, /angebot erstellen/i.test(primary.text || '') ? 'ok' : 'warn', `Primary="${primary.text}" disabled=${primary.disabled}`)

  const createBtn = page.getByRole('button', { name: /Angebot erstellen/i }).first()
  if (!(await createBtn.count())) {
    mark(`wizard-open-${label}`, 'fail', 'Kein Angebot-erstellen-Button')
    return null
  }
  await createBtn.click()
  await page.waitForTimeout(3500)
  await page.screenshot({ path: path.join(SHOT, `wizard-${label}.png`), fullPage: false })

  // Position mit Bezeichnung — ggf. vorbefüllt
  const posRow = page.locator('.pos-board-row, [class*="pos-board"] button, .dok-zeile').first()
  if (await posRow.count()) await posRow.click().catch(() => {})
  await page.waitForTimeout(600)

  const bezeichnung = page.locator('input[name="bezeichnung"], input[placeholder*="Bezeichnung"], input[placeholder*="Leistung"]').first()
  if (await bezeichnung.isVisible().catch(() => false)) {
    await bezeichnung.fill(`ZZTEST ${label} Sanitär`).catch(() => {})
  }

  const preis = page.locator('input[name="vk_netto"], input[placeholder*="Netto"], input[inputmode="decimal"]').first()
  if (await preis.isVisible().catch(() => false)) {
    await preis.fill('100').catch(() => {})
  }

  const speichern = page.getByRole('button', { name: /speichern/i }).first()
  if (await speichern.isVisible().catch(() => false)) {
    await speichern.click()
    await page.waitForTimeout(5000)
  } else {
    const check = page.locator('[aria-label="Speichern oder senden"]').first()
    if (await check.count()) {
      await check.click()
      await page.waitForTimeout(400)
      await page.getByRole('button', { name: /^Speichern$/i }).first().click().catch(() => {})
      await page.waitForTimeout(5000)
    }
  }

  await page.screenshot({ path: path.join(SHOT, `wizard-after-${label}.png`), fullPage: false })
  const url = page.url()
  const m = url.match(/\/angebote\/([0-9a-f-]{36})/i)
  if (m) {
    mark(`wizard-save-${label}`, 'ok', `Angebot ${m[1]}`)
    return m[1]
  }
  // Fallback: aus URL nach Schließen
  const zum = page.getByRole('link', { name: /Zum Angebot/i }).first()
  if (await zum.count()) {
    const href = await zum.getAttribute('href')
    const m2 = href?.match(/\/angebote\/([0-9a-f-]{36})/i)
    if (m2) {
      mark(`wizard-save-${label}`, 'ok', `Angebot ${m2[1]} (via Link)`)
      return m2[1]
    }
  }
  mark(`wizard-save-${label}`, 'warn', `Keine Angebot-ID in URL: ${url}`)
  return null
}

async function setAngebotBetragAndSync(page, db, angebotId, leadId, nettoEur, label) {
  await db
    .from('angebote')
    .update({
      gesamt_fix: nettoEur,
      gesamt_max: nettoEur,
      gesamt_min: nettoEur,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)

  await loginCrm(page)
  await page.goto(`${CRM}/angebote/${angebotId}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(2000)
  const bearb = page.getByRole('button', { name: /bearbeiten/i }).first()
  if (await bearb.isVisible().catch(() => false)) {
    await bearb.click()
    await page.waitForTimeout(2500)
    const speichern = page.getByRole('button', { name: /speichern/i }).first()
    if (await speichern.isVisible().catch(() => false)) {
      await speichern.click()
      await page.waitForTimeout(4000)
    }
  }
  const { data: lead } = await db
    .from('leads')
    .select('org_freigabe_status, hv_meldung_status')
    .eq('id', leadId)
    .maybeSingle()
  mark(`angebot-betrag-${label}`, 'info', `${nettoEur}€ netto → org_freigabe=${lead?.org_freigabe_status} hv=${lead?.hv_meldung_status}`)
  return lead
}

async function clickPartnerAnfragen(page, angebotId, label) {
  await page.goto(`${CRM}/angebote/${angebotId}#angebot-versand-handwerker`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: path.join(SHOT, `partner-${label}.png`), fullPage: false })

  const wa = page.getByRole('button', { name: /WhatsApp-Link/i }).first()
  const partner = page.getByRole('button', { name: /Partner anfragen/i }).first()
  let clicked = false
  if (await wa.isVisible().catch(() => false)) {
    await wa.click()
    clicked = true
  } else if (await partner.isVisible().catch(() => false)) {
    await partner.click()
    clicked = true
  }
  if (!clicked) {
    mark(`partner-click-${label}`, 'warn', 'Kein Partner-Button sichtbar')
    return { blocked: null, toast: '' }
  }
  await page.waitForTimeout(2500)
  const toast = await page.locator('[data-sonner-toast], .toast, [role="status"]').allInnerTexts().catch(() => [])
  const toastText = toast.join(' | ')
  const body = await page.locator('body').innerText()
  const blocked = PARTNER_BLOCK_MSG.test(toastText + body)
  mark(
    `partner-send-${label}`,
    blocked ? 'ok' : toastText ? 'warn' : 'info',
    blocked ? `Blockiert: ${toastText.slice(0, 120) || 'UI-Hinweis'}` : `Kein Block — ${toastText.slice(0, 120) || body.slice(0, 100)}`
  )
  return { blocked, toast: toastText }
}

async function hvOrgFreigabe(page, leadId, aktion, label) {
  await loginPortal(page, HV_NORD)
  await page.goto(`${WEB}/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  })
  await page.waitForTimeout(2500)
  const btn = page.getByRole('button', { name: aktion === 'freigegeben' ? /freigeben/i : /ablehnen/i }).first()
  if (!(await btn.count())) {
    mark(`hv-freigabe-${label}`, 'warn', `Button ${aktion} nicht sichtbar`)
    return false
  }
  await btn.click()
  await page.waitForTimeout(2500)
  mark(`hv-freigabe-${label}`, 'ok', `HV ${aktion} geklickt`)
  return true
}

async function runMelde(page, meldeUrl, tag, freitext) {
  const email = `zztest.mittelteil.${tag}@example.test`
  await page.goto(meldeUrl, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await dismissCookies(page)
  for (let i = 0; i < 28; i++) {
    await page.waitForTimeout(400)
    const body = await page.locator('body').innerText()
    const file = page.locator('input[type=file]').first()
    if ((await file.count()) && fs.existsSync(FOTO)) await file.setInputFiles(FOTO).catch(() => {})

    if (/ORT & KONTAKT|Kontaktdaten|Ihre Daten/i.test(body)) {
      const fill = (ph, v) =>
        page.locator(`input.funnel-input[placeholder="${ph}"]`).first().fill(v).catch(() => {})
      await fill('Vorname', 'ZZTEST')
      await fill('Nachname', tag)
      await fill('Straße', 'Leopoldstraße')
      await fill('Nr.', '10')
      await fill('PLZ', '80802')
      await fill('Ort', 'München')
      await fill('E-Mail', email)
      await page.locator('input[type=tel]').first().fill('08955551234').catch(() => {})
      const cb = page.locator('input[type=checkbox]').first()
      if (await cb.count()) await cb.check({ force: true }).catch(() => {})
    }
    if (/BESCHREIBUNG|beschreiben/i.test(body)) {
      const ta = page.locator('textarea:visible').first()
      if (await ta.count()) await ta.fill(freitext).catch(() => {})
    }
    const tiles = page.locator('button.funnel-tile, .funnel-tile')
    const n = await tiles.count()
    for (let t = 0; t < Math.min(n, 12); t++) {
      const txt = ((await tiles.nth(t).innerText().catch(() => '')) || '').toLowerCase()
      if (/wasser|bad|sanitär|rohr|notfall|havarie|heizung/.test(txt)) {
        await tiles.nth(t).click({ force: true }).catch(() => {})
        break
      }
    }
    const step = await funnelAdvanceStep(page)
    if (step === 'absenden') {
      await page.getByRole('button', { name: /absenden|melden|senden/i }).first().click()
      await page.waitForTimeout(5000)
      break
    }
    if (/bestätigung|eingegangen|status/i.test(body + page.url()) && i > 4) break
  }
  const { data: leads } = await db
    .from('leads')
    .select('id, melde_tracking_token, hv_meldung_status, org_freigabe_status')
    .ilike('kontakt_email', email)
    .order('created_at', { ascending: false })
    .limit(1)
  return leads?.[0] ?? null
}

let db

function writeReport() {
  const ok = rows.filter((r) => r.status === 'ok').length
  const warn = rows.filter((r) => r.status === 'warn').length
  const fail = rows.filter((r) => r.status === 'fail').length
  fs.writeFileSync(OUT_JSON, JSON.stringify({ summary: { ok, warn, fail }, rows }, null, 2))

  const lines = [
    '# TESTREPORT — A2-Mittelteil Session',
    '',
    `| Feld | Wert |`,
    `|---|---|`,
    `| Datum | ${new Date().toISOString().slice(0, 10)} |`,
    `| Lead fe37 | \`${LEAD_FE37}\` |`,
    `| Token fe37 | \`${TOKEN_FE37}\` |`,
    `| Bilanz | **${ok} ok · ${warn} warn · ${fail} fail** |`,
    `| Rohdaten | \`docs/test/TESTREPORT-A2-MITTELTEIL-SESSION.json\` |`,
    `| Screenshots | \`docs/test/screenshots/a2-mittelteil/\` |`,
    '',
    '## Ergebnisse',
    '',
    '| ID | Status | Notiz |',
    '|---|---|---|',
    ...rows.map((r) => `| ${r.id} | ${r.status} | ${String(r.note).replace(/\|/g, '/').slice(0, 200)} |`),
    '',
    '## Hinweise',
    '',
    '- **612 € vs. Schwelle 500 €:** Vergleich nutzt `gesamt_fix` (netto). 612 > 500 → erwartet Org-Freigabe, nicht „unter Schwelle“.',
    '- **HV-Start-Gate** (`hv_meldung_status=neu`) ist unabhängig vom Org-`freigabe_modus`.',
    '- Partner-Block getestet via **WhatsApp-Link** / Partner-anfragen (live API, nicht nur Code-Guard).',
  ]
  fs.writeFileSync(OUT_MD, lines.join('\n'))
}

async function main() {
  loadEnv()
  assertStagingWriteTarget({
    supabaseUrl: process.env.STAGING_SUPABASE_URL,
    projectRef: process.env.STAGING_PROJECT_REF || STAGING_PROJECT_REF_CANON,
  })
  db = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  page.on('dialog', async (d) => await d.accept().catch(() => {}))

  try {
    console.log('\n=== 0 Status-Token fe37 (HV-Warte) ===\n')
    await probeStatusToken(page, TOKEN_FE37, 'fe37-hv-warte', 'status-fe37-neu')

    console.log('\n=== 1 HV-Übergabe fe37 ===\n')
    await hvUebergeben(page, LEAD_FE37, 'fe37')

    await loginCrm(page)
    await page.goto(`${CRM}/anfragen/${LEAD_FE37}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await page.waitForTimeout(2000)
    const p1 = await crmPrimaryLabel(page)
    mark(
      'crm-primary-fe37-nach-hv',
      /angebot erstellen/i.test(p1.text || '') ? 'ok' : 'fail',
      `Primary="${p1.text}" (erwartet: Angebot erstellen)`
    )
    await page.screenshot({ path: path.join(SHOT, 'crm-fe37-nach-hv.png') })

    const { data: leadAfterHv } = await db
      .from('leads')
      .select('hv_meldung_status, org_freigabe_status')
      .eq('id', LEAD_FE37)
      .maybeSingle()
    mark('db-fe37-nach-hv', leadAfterHv?.hv_meldung_status === 'angebot_eingefordert' ? 'ok' : 'warn', JSON.stringify(leadAfterHv))

    await probeStatusToken(page, TOKEN_FE37, 'fe37-nach-hv', 'status-fe37-angefordert')

    console.log('\n=== 2 Angebot unter Schwelle (fe37, Ziel 612 → prüfen) ===\n')
    let angUnter = await createAngebotViaWizard(page, LEAD_FE37, 'unter')
    if (!angUnter) {
      const { data: existing } = await db.from('angebote').select('id').eq('lead_id', LEAD_FE37).limit(1)
      angUnter = existing?.[0]?.id ?? null
    }
    if (angUnter) {
      // User nannte 612 — wir setzen exakt und dokumentieren Schwelle 500
      await setAngebotBetragAndSync(page, db, angUnter, LEAD_FE37, 612, '612')
      const partnerUnter = await clickPartnerAnfragen(page, angUnter, 'unter-612')
      const { data: l612 } = await db.from('leads').select('org_freigabe_status').eq('id', LEAD_FE37).maybeSingle()
      if (l612?.org_freigabe_status === 'ausstehend' && partnerUnter.blocked) {
        mark('schwelle-612', 'warn', '612€ löst Org-Freigabe aus (>500 Schwelle) — „unter Schwelle“-Erwartung widerspricht Konfiguration')
      } else if (l612?.org_freigabe_status === 'nicht_noetig' && !partnerUnter.blocked) {
        mark('schwelle-612', 'ok', '612€ ohne Org-Freigabe — Partner-Versand nicht blockiert')
      } else {
        mark('schwelle-612', 'info', `org_freigabe=${l612?.org_freigabe_status} blocked=${partnerUnter.blocked}`)
      }
    }

    console.log('\n=== 3 Zweite Meldung > Schwelle (687,90) ===\n')
    const lead2 = await runMelde(
      page,
      MELDE_NORD,
      `over${Date.now().toString().slice(-5)}`,
      'ZZTEST Mittelteil — Wasserschaden Küche, Kostenschätzung über 500 Euro, Freigabe-Pfad.'
    )
    if (!lead2?.id) {
      mark('melde-2', 'fail', 'Zweite Meldung nicht in DB')
    } else {
      mark('melde-2', 'ok', `Lead ${lead2.id} token=${lead2.melde_tracking_token?.slice(0, 12)}…`)
      if (lead2.melde_tracking_token) await probeStatusToken(page, lead2.melde_tracking_token, 'lead2-neu', 'status-lead2-neu')
      await hvUebergeben(page, lead2.id, 'lead2')
      const ang2 = await createAngebotViaWizard(page, lead2.id, 'over')
      if (ang2) {
        await setAngebotBetragAndSync(page, db, ang2, lead2.id, 687.9, '687')
        const { data: l687 } = await db.from('leads').select('org_freigabe_status').eq('id', lead2.id).maybeSingle()
        mark('freigabe-687', l687?.org_freigabe_status === 'ausstehend' ? 'ok' : 'fail', `org_freigabe=${l687?.org_freigabe_status}`)
        const block687 = await clickPartnerAnfragen(page, ang2, 'over-687')
        mark('partner-block-687', block687.blocked ? 'ok' : 'fail', block687.blocked ? 'Live blockiert' : 'KEIN Block — Finding')
        if (lead2.melde_tracking_token) await probeStatusToken(page, lead2.melde_tracking_token, 'lead2-freigabe', 'status-lead2-freigabe')

        console.log('\n=== 4 HV ablehnen → korrigieren → freigeben ===\n')
        await hvOrgFreigabe(page, lead2.id, 'abgelehnt', 'ablehnen')
        const { data: lab } = await db.from('leads').select('org_freigabe_status').eq('id', lead2.id).maybeSingle()
        mark('hv-ablehnen', lab?.org_freigabe_status === 'abgelehnt' ? 'ok' : 'warn', `status=${lab?.org_freigabe_status}`)
        await setAngebotBetragAndSync(page, db, ang2, lead2.id, 612, 'korr-612')
        await hvOrgFreigabe(page, lead2.id, 'freigegeben', 'freigeben')
        const { data: lfg } = await db.from('leads').select('org_freigabe_status').eq('id', lead2.id).maybeSingle()
        mark('hv-freigeben', lfg?.org_freigabe_status === 'freigegeben' ? 'ok' : 'warn', `status=${lfg?.org_freigabe_status}`)
        const afterFg = await clickPartnerAnfragen(page, ang2, 'nach-freigabe')
        mark('partner-nach-freigabe', !afterFg.blocked ? 'ok' : 'fail', afterFg.toast.slice(0, 120) || 'Versand nicht blockiert')
        if (lead2.melde_tracking_token) await probeStatusToken(page, lead2.melde_tracking_token, 'lead2-freigegeben', 'status-lead2-fg')
      }
    }

    console.log('\n=== Z1 HV-Start-Gate ohne Freigabe-Modus (Süd / direkt) ===\n')
    const leadSued = await runMelde(page, MELDE_SUED, `sued${Date.now().toString().slice(-4)}`, 'ZZTEST Süd — Gate-Check ohne Freigabe-Modus.')
    if (leadSued?.id) {
      await loginCrm(page)
      await page.goto(`${CRM}/anfragen/${leadSued.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(2000)
      const ps = await crmPrimaryLabel(page)
      mark('gate-sued-crm', /warte auf hv|hausmeister/i.test(ps.text || '') ? 'ok' : 'warn', `Primary="${ps.text}" (Gate auch bei freigabe_modus=direkt?)`)
      const { data: org } = await db
        .from('leads')
        .select('auftraggeber_kunde_id, hv_meldung_status')
        .eq('id', leadSued.id)
        .maybeSingle()
      const { data: kunde } = await db.from('kunden').select('freigabe_modus').eq('id', org?.auftraggeber_kunde_id).maybeSingle()
      mark('gate-sued-modus', 'info', `freigabe_modus=${kunde?.freigabe_modus} hv=${org?.hv_meldung_status}`)
    }

    console.log('\n=== Z2 Akut / Notfall-Direkt ===\n')
    const leadAkut = await runMelde(
      page,
      MELDE_NORD,
      `akut${Date.now().toString().slice(-4)}`,
      'ZZTEST AKUT — Rohrbruch, Wasser läuft aus, Notfall Sofortmaßnahme.'
    )
    if (leadAkut?.id) {
      // Notfall-Kachel bevorzugen — ggf. funnel_daten per DB setzen wenn Funnel nicht akut erkannte
      await db
        .from('leads')
        .update({
          situation: 'notfall',
          funnel_daten: { notfall: true, melde_kategorie: 'notfall' },
          freigabe_bypass_grund: 'akut',
        })
        .eq('id', leadAkut.id)
      await loginCrm(page)
      await page.goto(`${CRM}/anfragen/${leadAkut.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
      await page.waitForTimeout(2000)
      const pa = await crmPrimaryLabel(page)
      const skipGate = !/warte auf hv/i.test(pa.text || '')
      mark('gate-akut', skipGate ? 'ok' : 'warn', `Primary="${pa.text}" — Akut soll HV-Start-Gate überspringen`)
    }
  } catch (e) {
    mark('FATAL', 'fail', e instanceof Error ? e.message : String(e))
    console.error(e)
  } finally {
    writeReport()
    await browser.close()
    console.log(`\nReport: ${OUT_MD}\n`)
  }
}

main()
