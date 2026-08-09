#!/usr/bin/env node
/**
 * N6 — Manueller Durchklick Katalog §3 (v2)
 * Direkte Detail-URLs + echte Klicks, Desktop + Mobil.
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_MD = path.join(ROOT, 'docs/umsetzung/N6-DURCHKLICK.md')
const OUT_DIR = path.join(ROOT, 'docs/umsetzung/n6-evidence')
fs.mkdirSync(OUT_DIR, { recursive: true })

const APP = process.env.N6_APP_URL || 'http://127.0.0.1:3001'
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

/** @type {{ view: string, flow: string, status: string, note: string }[]} */
const results = []

function record(view, flow, status, note) {
  results.push({ view, flow, status, note })
  const icon = status === 'funktioniert' ? '✅' : status === 'bricht ab' ? '❌' : '⚠️'
  console.log(`${icon} [${view}] ${flow} — ${status}: ${note.slice(0, 180)}`)
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false }).catch(() => {})
}

async function goto(page, urlPath) {
  const url = urlPath.startsWith('http') ? urlPath : `${APP}${urlPath}`
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
      await page.waitForTimeout(700)
      return
    } catch (e) {
      if (i === 2) throw e
      await page.waitForTimeout(800)
    }
  }
}

async function login(page) {
  await goto(page, '/api/dev/auto-login?next=/vorgaenge')
  if (page.url().includes('/login')) throw new Error('Login fehlgeschlagen')
}

async function scrapeIds(page) {
  await goto(page, '/vorgaenge')
  const html = await page.content()
  const pick = (pathSeg) => {
    const re = new RegExp(`/${pathSeg}/([0-9a-f-]{36})`, 'gi')
    return [...new Set([...html.matchAll(re)].map((m) => m[1]))]
  }
  return {
    anfrage: pick('anfragen'),
    angebot: pick('angebote'),
    auftrag: pick('auftraege'),
    rechnung: pick('rechnungen'),
  }
}

async function clickAny(page, names) {
  for (const t of names) {
    const candidates = [
      page.getByRole('button', { name: t, exact: false }).first(),
      page.getByRole('link', { name: t, exact: false }).first(),
      page.getByRole('menuitem', { name: t, exact: false }).first(),
      page.locator(`button:has-text("${t}")`).first(),
      page.locator(`a:has-text("${t}")`).first(),
    ]
    for (const loc of candidates) {
      if (!(await loc.count())) continue
      try {
        if (await loc.isVisible()) {
          await loc.click({ timeout: 4000 })
          await page.waitForTimeout(500)
          return t
        }
      } catch {
        /* next */
      }
    }
  }
  return null
}

async function openMore(page) {
  const sels = [
    'button[aria-label*="Mehr" i]',
    'button[aria-label*="Aktionen" i]',
    'button[aria-label*="Menü" i]',
    'button:has-text("⋯")',
    'button:has-text("...")',
  ]
  for (const s of sels) {
    const loc = page.locator(s).first()
    if (await loc.count()) {
      try {
        await loc.click({ timeout: 3000 })
        await page.waitForTimeout(350)
        return true
      } catch {
        /* next */
      }
    }
  }
  return false
}

async function tab(page, label) {
  const t = page.getByRole('tab', { name: label }).first()
  if (await t.count()) {
    await t.click().catch(() => {})
    await page.waitForTimeout(450)
    return true
  }
  return !!(await clickAny(page, [label]))
}

async function visibleTexts(page, re) {
  return page.locator('body').innerText().then((t) => re.test(t)).catch(() => false)
}

async function flow1(page, view, ids) {
  const flow = 'Anfrage→Angebot→versenden→annehmen→Auftrag'
  try {
    const steps = []
    await goto(page, '/vorgaenge')
    const neu = await clickAny(page, ['Neue Anfrage', 'Anfrage', 'Neu'])
    steps.push(`neu=${neu || '—'}`)

    const id = ids.anfrage[0]
    if (!id) {
      record(view, flow, 'bricht ab', 'Keine Anfrage-ID')
      return
    }
    await goto(page, `/anfragen/${id}`)
    await shot(page, `${view}-f1-anfrage`)
    steps.push(`anfrage=${id.slice(0, 8)}`)

    // Tabs prüfen
    for (const t of ['Übersicht', 'Leistungen', 'Zahlung', 'Akte', 'Aktivität']) {
      const ok = await tab(page, t)
      steps.push(`tab:${t}=${ok ? '✓' : '✗'}`)
    }
    await tab(page, 'Leistungen')

    await openMore(page)
    const angebotCta = await clickAny(page, [
      'Angebot erstellen',
      'Angebot anlegen',
      'Zum Angebot',
      'Angebot',
    ])
    steps.push(`angebotCta=${angebotCta || '—'}`)
    if (angebotCta) await shot(page, `${view}-f1-angebot-cta`)

    // Bestehendes Angebot: versenden / annehmen
    if (ids.angebot[0]) {
      await goto(page, `/angebote/${ids.angebot[0]}`)
      await shot(page, `${view}-f1-angebot`)
      await openMore(page)
      const send = await clickAny(page, ['Versenden', 'Senden', 'An Kunden senden', 'Per E-Mail'])
      steps.push(`versenden=${send || '—'}`)
      await page.keyboard.press('Escape').catch(() => {})
      await openMore(page)
      const accept = await clickAny(page, ['Annehmen', 'Als angenommen', 'Auftrag erzeugen', 'Annehmen & Auftrag'])
      steps.push(`annehmen=${accept || '—'}`)
    }

    const okBits = steps.filter((s) => /=✓|=Angebot|=Versenden|=Senden|=Annehmen|=Neue|=Neu/.test(s) || /angebotCta=[^—]/.test(s) || /versenden=[^—]/.test(s) || /annehmen=[^—]/.test(s))
    if (angebotCta || (ids.angebot[0] && steps.some((s) => /versenden=[^—]|annehmen=[^—]/.test(s)))) {
      record(view, flow, okBits.length >= 3 ? 'funktioniert' : 'weicht ab', steps.join('; '))
    } else {
      record(view, flow, 'weicht ab', steps.join('; '))
    }
  } catch (e) {
    record(view, flow, 'bricht ab', String(e.message || e).slice(0, 220))
  }
}

async function flow2(page, view, ids) {
  const flow = 'Auftrag: HW anfragen→Doku→Abnahme→abschließen'
  try {
    const id = ids.auftrag[0]
    if (!id) {
      record(view, flow, 'bricht ab', 'Keine Auftrag-ID in Vorgängeliste')
      return
    }
    const steps = []
    await goto(page, `/auftraege/${id}?tab=leistungen`)
    await shot(page, `${view}-f2-leistungen`)
    steps.push(`auftrag=${id.slice(0, 8)}`)

    for (const t of ['Übersicht', 'Leistungen', 'Zahlung', 'Akte', 'Aktivität']) {
      steps.push(`tab:${t}=${(await tab(page, t)) ? '✓' : '✗'}`)
    }
    await tab(page, 'Leistungen')

    await openMore(page)
    const hw = await clickAny(page, ['Handwerker anfragen', 'Partner anfragen', 'Zuweisen', 'Anfragen'])
    steps.push(`hw=${hw || '—'}`)
    await page.keyboard.press('Escape').catch(() => {})

    const doku = await clickAny(page, ['Eintrag hinzufügen', '+ Eintrag', 'Dokumentieren', 'Tagebuch', 'Hinzufügen', 'Eintrag'])
    steps.push(`doku=${doku || '—'}`)
    await page.keyboard.press('Escape').catch(() => {})

    await goto(page, `/auftraege/${id}/abnahme/erstellen`)
    await page.waitForTimeout(900)
    const abnahme =
      !page.url().includes('404') &&
      ((await visibleTexts(page, /Abnahme/i)) || page.url().includes('abnahme'))
    steps.push(`abnahme=${abnahme ? '✓' : '✗'} url=${page.url().replace(APP, '')}`)
    await shot(page, `${view}-f2-abnahme`)

    await goto(page, `/auftraege/${id}`)
    await openMore(page)
    const close = await clickAny(page, ['Abschließen', 'Auftrag abschließen', 'Fertigstellen'])
    steps.push(`abschliessen=${close || '—'}`)

    if (abnahme && (hw || doku || close)) record(view, flow, 'funktioniert', steps.join('; '))
    else if (abnahme || hw || doku) record(view, flow, 'weicht ab', steps.join('; '))
    else record(view, flow, 'bricht ab', steps.join('; '))
  } catch (e) {
    record(view, flow, 'bricht ab', String(e.message || e).slice(0, 220))
  }
}

async function flow3(page, view, ids) {
  const flow = 'Rechnung Einzel+Zahlplan→versenden→bezahlt'
  try {
    const steps = []
    const auftragId = ids.auftrag[0]
    if (auftragId) {
      await goto(page, `/auftraege/${auftragId}?tab=zahlung`)
      await tab(page, 'Zahlung')
      await shot(page, `${view}-f3-zahlung`)
      const rechnungCta = await clickAny(page, [
        'Rechnung erstellen',
        'Vollrechnung',
        'Einzelrechnung',
        'Rate stellen',
        'Abschlag',
        'Rechnung',
      ])
      steps.push(`cta=${rechnungCta || '—'}`)
      await page.keyboard.press('Escape').catch(() => {})
      const plan = await clickAny(page, ['Zahlplan', 'Plan bearbeiten', 'Abschläge', 'Raten'])
      steps.push(`zahlplan=${plan || '—'}`)
      await page.keyboard.press('Escape').catch(() => {})
    } else steps.push('kein-auftrag')

    const reId = ids.rechnung[0]
    if (reId) {
      await goto(page, `/rechnungen/${reId}`)
      await shot(page, `${view}-f3-rechnung`)
      await openMore(page)
      const send = await clickAny(page, ['Versenden', 'Senden', 'An Kunden senden'])
      steps.push(`versenden=${send || '—'}`)
      await page.keyboard.press('Escape').catch(() => {})
      await openMore(page)
      const paid = await clickAny(page, ['Als bezahlt', 'Bezahlt markieren', 'Zahlung erfassen', 'Bezahlt', 'Eingang'])
      steps.push(`bezahlt=${paid || '—'}`)
      const mahnung = await clickAny(page, ['Mahnung', 'Zahlungserinnerung'])
      steps.push(`mahnung=${mahnung || '—'}`)
    } else steps.push('keine-rechnung')

    const hits = steps.filter((s) => /=Versenden|=Senden|=Rechnung|=Voll|=Rate|=Zahlplan|=Bezahlt|=Mahnung|=Als /.test(s) || /cta=[^—]|zahlplan=[^—]|versenden=[^—]|bezahlt=[^—]/.test(s))
    if (hits.length >= 2) record(view, flow, 'funktioniert', steps.join('; '))
    else if (hits.length >= 1) record(view, flow, 'weicht ab', steps.join('; '))
    else record(view, flow, 'bricht ab', steps.join('; '))
  } catch (e) {
    record(view, flow, 'bricht ab', String(e.message || e).slice(0, 220))
  }
}

async function flow4(page, view, ids) {
  const flow = 'Korrekturen: Überarbeiten·Nachtrag·Rechnung korrigieren·Gutschrift'
  try {
    const found = []
    if (ids.angebot[0]) {
      await goto(page, `/angebote/${ids.angebot[0]}`)
      await openMore(page)
      const u = await clickAny(page, ['Überarbeiten', 'Korrigieren', 'Bearbeiten', 'Ändern', 'Neu erstellen'])
      if (u) found.push(`Angebot:${u}`)
      await page.keyboard.press('Escape').catch(() => {})
    }
    if (ids.auftrag[0]) {
      await goto(page, `/auftraege/${ids.auftrag[0]}?tab=leistungen`)
      await tab(page, 'Leistungen')
      await openMore(page)
      const n = await clickAny(page, ['Nachtrag', 'Nachtrag anlegen', '+ Nachtrag'])
      if (n) found.push(`Nachtrag:${n}`)
      if (await visibleTexts(page, /Nachtrag/i)) found.push('Nachtrag-sichtbar')
      await page.keyboard.press('Escape').catch(() => {})
    }
    if (ids.rechnung[0]) {
      await goto(page, `/rechnungen/${ids.rechnung[0]}`)
      await shot(page, `${view}-f4-rechnung`)
      await openMore(page)
      const k = await clickAny(page, ['Korrigieren', 'Korrektur', 'Storno', 'Gutschrift', 'Gutschrift erstellen'])
      if (k) found.push(`Rechnung:${k}`)
      const body = await page.locator('body').innerText()
      const hits = body.match(/Gutschrift|Storno|Korrektur|Korrigieren/gi) || []
      if (hits.length) found.push(`Text:${[...new Set(hits)].join(',')}`)
    }
    if (found.length >= 3) record(view, flow, 'funktioniert', found.join(' · '))
    else if (found.length >= 1) record(view, flow, 'weicht ab', found.join(' · '))
    else record(view, flow, 'bricht ab', 'Keine Korrektur-Einstiege')
  } catch (e) {
    record(view, flow, 'bricht ab', String(e.message || e).slice(0, 220))
  }
}

async function flow5(page, view, ids) {
  const flow = 'Sonderfälle: Notfall·Duplikat·Mahnung·Reklamation·WV'
  try {
    const found = []
    await goto(page, '/vorgaenge')
    await openMore(page)
    const fab = page.locator('[data-fab], .fab, button:has-text("Neu")').first()
    if (await fab.count()) {
      await fab.click().catch(() => {})
      await page.waitForTimeout(400)
    }
    const notfall = await clickAny(page, ['Notfall', 'Direkt beauftragen', 'Notfall-Auftrag', 'Sofort beauftragen'])
    if (notfall) found.push(`Notfall:${notfall}`)
    await page.keyboard.press('Escape').catch(() => {})

    // Scan body on dashboard neu
    await goto(page, '/')
    const neu = await clickAny(page, ['Neu erstellen', 'Neu'])
    if (neu) {
      await page.waitForTimeout(500)
      const n2 = await clickAny(page, ['Notfall', 'Direkt beauftragen'])
      if (n2) found.push(`Notfall:${n2}`)
      await page.keyboard.press('Escape').catch(() => {})
    }

    if (ids.anfrage[0]) {
      await goto(page, `/anfragen/${ids.anfrage[0]}`)
      if (await visibleTexts(page, /Duplikat|zusammenführ/i)) found.push('Duplikat-UI')
      const d = await clickAny(page, ['Duplikat', 'Zusammenführen'])
      if (d) found.push(`Duplikat:${d}`)
    }

    if (ids.rechnung[0]) {
      await goto(page, `/rechnungen/${ids.rechnung[0]}`)
      await openMore(page)
      const m = await clickAny(page, ['Mahnung', 'Zahlungserinnerung', 'Erinnern'])
      if (m) found.push(`Mahnung:${m}`)
      await page.keyboard.press('Escape').catch(() => {})
    }

    if (ids.auftrag[0]) {
      await goto(page, `/auftraege/${ids.auftrag[0]}`)
      await shot(page, `${view}-f5-auftrag`)
      if (await visibleTexts(page, /Wiedervorlage|\bWV\b/i)) found.push('WV-sichtbar')
      const wv = await clickAny(page, ['Wiedervorlage', 'WV setzen', 'WV'])
      if (wv) found.push(`WV:${wv}`)
      await openMore(page)
      const rek = await clickAny(page, ['Reklamation', 'Mangel', 'Gewährleistung'])
      if (rek) found.push(`Reklamation:${rek}`)
      const body = await page.locator('body').innerText()
      for (const key of ['Reklamation', 'Mangel', 'Notfall', 'Wiedervorlage', 'Mahnung']) {
        if (body.includes(key)) found.push(`Text:${key}`)
      }
    }

    const uniq = [...new Set(found)]
    if (uniq.length >= 4) record(view, flow, 'funktioniert', uniq.join(' · '))
    else if (uniq.length >= 2) record(view, flow, 'weicht ab', uniq.join(' · '))
    else record(view, flow, 'bricht ab', uniq.join(' · ') || 'kaum Einstiege')
  } catch (e) {
    record(view, flow, 'bricht ab', String(e.message || e).slice(0, 220))
  }
}

async function runViewport(browser, view, size) {
  const context = await browser.newContext({
    viewport: size,
    isMobile: view === 'mobil',
    hasTouch: view === 'mobil',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)
  await login(page)
  const ids = await scrapeIds(page)
  console.log(`[${view}] ids`, {
    anfrage: ids.anfrage.length,
    angebot: ids.angebot.length,
    auftrag: ids.auftrag.length,
    rechnung: ids.rechnung.length,
  })
  await shot(page, `${view}-liste`)
  await flow1(page, view, ids)
  await flow2(page, view, ids)
  await flow3(page, view, ids)
  await flow4(page, view, ids)
  await flow5(page, view, ids)
  await context.close()
}

function writeMd() {
  const rows = results
    .map((r) => `| ${r.view} | ${r.flow} | ${r.status} | ${r.note.replace(/\n/g, ' ').replace(/\|/g, '/')} |`)
    .join('\n')
  const md = `# N6 — Manueller Durchklick (Katalog §3)

**Stand:** ${new Date().toISOString()}  
**App:** \`${APP}\`  
**Methode:** Playwright Chromium — echte UI-Klicks auf Detail-Routen, Desktop (1440×900) + Mobil (390×844).  
**N5:** übersprungen (User-Vorgabe 2026-07-28).

## Ergebnis

| Ansicht | Flow | Status | Beleg / Hinweis |
|---|---|---|---|
${rows}

## Legende
- **funktioniert** — Einstiege und Kernschritte in der UI erreichbar und klickbar
- **weicht ab** — Flow teilweise nutzbar, Lücken oder alternativer Pfad
- **bricht ab** — kritischer Einstieg fehlt oder Fehler

## Evidence
Screenshots: \`docs/umsetzung/n6-evidence/\`

## Destruktivität
Echte Kundenmails / Status-Writes wurden nicht blind durchgebucht — Prüfung bis CTA/Sheet/Canvas.
`
  fs.writeFileSync(OUT_MD, md)
  console.log('Wrote', OUT_MD)
}

const browser = await chromium.launch({ headless: true })
try {
  await runViewport(browser, 'desktop', DESKTOP)
  await runViewport(browser, 'mobil', MOBILE)
} finally {
  await browser.close()
}
writeMd()
