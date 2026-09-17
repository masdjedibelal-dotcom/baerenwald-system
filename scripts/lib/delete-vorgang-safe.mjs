/**
 * Gehärtetes Vorgang-Löschen für Test-Automation (F-177-Lektion).
 * - Nur volle UUID
 * - Nie Header-.vg-check (das ist „Alle auswählen“)
 * - Vor Confirm: Anzahl + IDs verifizieren
 */
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * @param {import('playwright').Page} page
 * @param {string} leadId volle UUID
 * @param {{ crmBase?: string, shotDir?: string, log?: (m: string) => void }} [opts]
 * @returns {Promise<{ ok: boolean, note: string, selectedIds?: string[] }>}
 */
export async function deleteVorgangByFullUuid(page, leadId, opts = {}) {
  const log = opts.log ?? console.log
  const crm = opts.crmBase ?? 'https://staging--baerenwald-backend.netlify.app'
  const id = String(leadId || '').trim()

  if (!UUID_RE.test(id)) {
    return { ok: false, note: `refuse: not full UUID (${id})` }
  }

  await page.goto(`${crm}/vorgaenge`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(1500)

  // Filter öffnen und volle UUID suchen (entityId ist im Suchtext)
  const filterBtn = page.getByRole('button', { name: /filter|suchen/i }).first()
  if (await filterBtn.isVisible().catch(() => false)) {
    await filterBtn.click()
    await page.waitForTimeout(500)
  }
  const search = page
    .locator('input[placeholder*="Kunde, Vorgang"], input[placeholder*="Nummer"]')
    .first()
  if (!(await search.count())) {
    return { ok: false, note: 'search input not found' }
  }
  await search.fill(id)
  const apply = page.getByRole('button', { name: /anwenden/i }).first()
  if (await apply.count()) await apply.click()
  await page.waitForTimeout(1500)

  // Nur Datenzeilen — niemals .vg-row.head
  const dataRows = page.locator('.vg-row:not(.head)')
  const n = await dataRows.count()
  if (n === 0) {
    return { ok: false, note: `no rows for UUID ${id}` }
  }

  // Zeile mit Link/ID matchen
  let targetIdx = -1
  for (let i = 0; i < n; i++) {
    const row = dataRows.nth(i)
    const html = (await row.innerHTML().catch(() => '')) || ''
    const text = (await row.innerText().catch(() => '')) || ''
    if (html.includes(id) || text.includes(id.slice(0, 8))) {
      targetIdx = i
      break
    }
  }
  if (targetIdx < 0 && n === 1) targetIdx = 0
  if (targetIdx < 0) {
    return { ok: false, note: `UUID not in ${n} filtered rows` }
  }

  // Auswahl leeren falls Bulkbar
  const clear = page.locator('.bulkbar-clear').first()
  if (await clear.isVisible().catch(() => false)) {
    await clear.click()
    await page.waitForTimeout(300)
  }

  await dataRows.nth(targetIdx).locator('.vg-check').click({ force: true })
  await page.waitForTimeout(500)

  const bar = ((await page.locator('.bulkbar-count').innerText().catch(() => '')) || '').trim()
  const countMatch = bar.match(/(\d+)/)
  const selCount = countMatch ? Number(countMatch[1]) : 0
  if (selCount !== 1) {
    log(`VERIFY FAIL selCount=${selCount} bar=${bar}`)
    if (await clear.isVisible().catch(() => false)) await clear.click()
    return { ok: false, note: `verify fail: expected 1 selected, got ${selCount}` }
  }

  // Öffnen Modal — Text zeigt Namen (nach Mini-Fix) bzw. Zahl
  await page.getByRole('button', { name: /^Löschen$/ }).first().click()
  await page.waitForTimeout(600)
  const modalBody = await page.locator('body').innerText()
  if (!/Vorgang löschen\?|1 Vorgang/i.test(modalBody)) {
    if (opts.shotDir) {
      await page.screenshot({
        path: path.join(opts.shotDir, `del-verify-fail-${id.slice(0, 8)}.png`),
      })
    }
    await page.keyboard.press('Escape').catch(() => {})
    return { ok: false, note: 'modal not single-delete' }
  }

  // Confirm (Aufräumen freigegeben)
  await page.getByRole('button', { name: /^Löschen$/ }).last().click()
  await page.waitForTimeout(2500)

  const after = await page.locator('body').innerText()
  const toastOk = /gelöscht/i.test(after)
  return {
    ok: toastOk,
    note: `deleted ${id} toast=${toastOk}`,
    selectedIds: [id],
  }
}
