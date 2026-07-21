/**
 * Interaktive Szenarien: Wizard-Schritte, Mobile Bottom Sheets, Modals.
 */
import {
  captureFirstPositionSheet,
  captureMobileEditSheets,
  clickActionsMenuItem,
  clickTabByLabel,
  clickWizardWeiter,
  closeSheet,
  closeWizard,
  extractIdFromRoutes,
  discoverEntityIdFromList,
  isMobileViewport,
  sleep,
  waitForSheet,
  waitForWizard,
} from './interactions.mjs'

/**
 * @param {import('puppeteer-core').Page} page
 * @param {{ routes: import('./config.mjs').DocRoute[], baseUrl: string, waitMs: number }} ctx
 * @param {(meta: Record<string, unknown>) => Promise<void>} captureShot
 */
export async function runInteractionScenarios(page, ctx, captureShot) {
  if (process.env.DOCS_SKIP_SCENARIOS === 'true') {
    console.log('\nSzenarien übersprungen (DOCS_SKIP_SCENARIOS=true)')
    return
  }

  const ids = {
    angebotId: process.env.DOCS_ANGEBOT_ID?.trim() || extractIdFromRoutes(ctx.routes, /^\/angebote\/[0-9a-f-]{36}$/i),
    auftragId: process.env.DOCS_AUFTRAG_ID?.trim() || extractIdFromRoutes(ctx.routes, /^\/auftraege\/[0-9a-f-]{36}$/i),
    rechnungId:
      process.env.DOCS_RECHNUNG_ID?.trim() || extractIdFromRoutes(ctx.routes, /^\/rechnungen\/[0-9a-f-]{36}$/i),
    anfrageId:
      process.env.DOCS_ANFRAGE_ID?.trim() || extractIdFromRoutes(ctx.routes, /^\/anfragen\/[0-9a-f-]{36}$/i),
  }

  if (!ids.angebotId) {
    ids.angebotId = await discoverEntityIdFromList(
      page,
      `${ctx.baseUrl}/angebote`,
      /^\/angebote\/[0-9a-f-]{36}$/i
    )
  }
  if (!ids.auftragId) {
    ids.auftragId = await discoverEntityIdFromList(
      page,
      `${ctx.baseUrl}/auftraege`,
      /^\/auftraege\/[0-9a-f-]{36}$/i
    )
  }
  if (!ids.anfrageId) {
    ids.anfrageId = await discoverEntityIdFromList(
      page,
      `${ctx.baseUrl}/anfragen`,
      /^\/anfragen\/[0-9a-f-]{36}$/i
    )
  }
  if (!ids.rechnungId) {
    ids.rechnungId = await discoverEntityIdFromList(
      page,
      `${ctx.baseUrl}/rechnungen`,
      /^\/rechnungen\/[0-9a-f-]{36}$/i
    )
  }

  console.log('\n── Interaktive Szenarien ──')
  if (ids.angebotId) console.log(`  Angebot-ID: ${ids.angebotId}`)
  if (ids.auftragId) console.log(`  Auftrag-ID: ${ids.auftragId}`)
  if (ids.rechnungId) console.log(`  Rechnung-ID: ${ids.rechnungId}`)

  if (ids.angebotId) {
    await captureAngebotWizardScenarios(page, ctx, ids.angebotId, captureShot)
  } else {
    console.log('  ⊘ Angebot-Wizard: keine Angebots-ID (Entwurf in DB oder DOCS_ANGEBOT_ID setzen)')
  }

  if (ids.auftragId) {
    await captureAuftragMobileScenarios(page, ctx, ids.auftragId, captureShot)
  } else {
    console.log('  ⊘ Auftrag Mobile-Sheets: keine Auftrags-ID')
  }

  if (ids.auftragId || ids.rechnungId) {
    await captureRechnungWizardScenarios(page, ctx, ids, captureShot)
  } else {
    console.log('  ⊘ Rechnung-Wizard: keine Auftrags-/Rechnungs-ID')
  }

  if (ids.anfrageId) {
    await captureAnfrageFilterSheetScenario(page, ctx, ids.anfrageId, captureShot)
  } else {
    await captureAnfrageFilterSheetScenario(page, ctx, null, captureShot)
  }
}

async function captureAngebotWizardScenarios(page, ctx, angebotId, captureShot) {
  const path = `/angebote/${angebotId}`
  const base = {
    path,
    title: 'Angebot-Wizard',
    category: 'Wizard — Angebot',
    scenario: 'angebot-wizard',
  }

  console.log(`\n→ Angebot-Wizard (${path})`)

  try {
    await ctx.goto(page, `${ctx.baseUrl}${path}`)
    await sleep(ctx.waitMs)

    const opened = await clickActionsMenuItem(page, 'Bearbeiten')
    if (!opened) {
      console.warn('  ✗ Bearbeiten nicht gefunden — ggf. kein bearbeitbarer Entwurf')
      return
    }

    await waitForWizard(page)

    for (const step of [
      { n: '1', label: 'Schritt 1 — Leistungen' },
      { n: '2', label: 'Schritt 2 — Finalisieren' },
      { n: '3', label: 'Schritt 3 — Handwerker' },
    ]) {
      const current = await page.evaluate(() =>
        document.querySelector('.stepper .step.active .step-n')?.textContent?.trim()
      )
      if (current !== step.n && step.n !== '1') break

      await captureShot({ ...base, interaction: step.label })

      if (await isMobileViewport(page)) {
        if (step.n === '1') {
          await captureFirstPositionSheet(page, captureShot, {
            ...base,
            interaction: 'Schritt 1 — Position Sheet',
          })
          await captureMobileEditSheets(page, captureShot, {
            ...base,
            interaction: 'Schritt 1 — Gewerk Sheet',
          })
        }
        if (step.n === '2') {
          await captureMobileEditSheets(page, captureShot, base)
        }
        if (step.n === '3') {
          await captureMobileEditSheets(page, captureShot, base)
        }
      }

      if (step.n === '3') break
      await clickWizardWeiter(page)
      await sleep(600)
    }

    await closeWizard(page)
  } catch (err) {
    console.warn('  ✗ Angebot-Wizard:', err instanceof Error ? err.message : err)
    await closeWizard(page).catch(() => undefined)
  }
}

async function captureAuftragMobileScenarios(page, ctx, auftragId, captureShot) {
  if (!(await isMobileViewport(page))) return

  const path = `/auftraege/${auftragId}`
  const base = {
    path,
    title: 'Auftrag — Leistung',
    category: 'Mobile Sheets — Auftrag',
    scenario: 'auftrag-mobile-sheets',
  }

  console.log(`\n→ Auftrag Mobile-Sheets (${path})`)

  try {
    await ctx.goto(page, `${ctx.baseUrl}${path}`)
    await sleep(ctx.waitMs)
    await clickTabByLabel(page, 'Leistungsübersicht')
    await sleep(ctx.waitMs)

    const gewerkEdit = await page.$('.pos-mobile-gewerk__edit')
    if (gewerkEdit) {
      await gewerkEdit.click()
      await waitForSheet(page)
      await captureShot({ ...base, interaction: 'Sheet — Gewerk bearbeiten' })
      await closeSheet(page)
    }

    const leistungRow = await page.$('.pos-mobile-leistung-row--tappable')
    if (leistungRow) {
      await leistungRow.click()
      await waitForSheet(page)
      await captureShot({ ...base, interaction: 'Sheet — Leistung bearbeiten' })
      await closeSheet(page)
    }
  } catch (err) {
    console.warn('  ✗ Auftrag Mobile-Sheets:', err instanceof Error ? err.message : err)
    await closeSheet(page).catch(() => undefined)
  }
}

async function captureRechnungWizardScenarios(page, ctx, ids, captureShot) {
  const { auftragId, rechnungId } = ids
  const path = auftragId ? `/auftraege/${auftragId}/rechnungen-auswahl` : `/rechnungen/${rechnungId}`
  const base = {
    path,
    title: 'Rechnung-Wizard',
    category: 'Wizard — Rechnung',
    scenario: 'rechnung-wizard',
  }

  console.log(`\n→ Rechnung-Wizard (${path})`)

  try {
    if (auftragId) {
      await ctx.goto(page, `${ctx.baseUrl}/auftraege/${auftragId}/rechnungen-auswahl`)
      await sleep(ctx.waitMs)

      const opened = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          /weiterbearbeiten|bearbeiten|entwurf/i.test(b.textContent || '')
        )
        if (btn instanceof HTMLElement) {
          btn.click()
          return true
        }
        const neu = Array.from(document.querySelectorAll('button')).find((b) =>
          /neue rechnung/i.test(b.textContent || '')
        )
        if (neu instanceof HTMLElement) {
          neu.click()
          return true
        }
        return false
      })

      if (!opened) {
        console.warn('  ✗ Kein Rechnungs-Entwurf / Neue Rechnung gefunden')
        return
      }
      await sleep(1200)
    } else if (rechnungId) {
      await ctx.goto(page, `${ctx.baseUrl}/rechnungen/${rechnungId}`)
      await sleep(ctx.waitMs)
      await clickActionsMenuItem(page, 'Bearbeiten')
      await sleep(1200)
    }

    await waitForWizard(page)

    for (const step of [
      { n: '1', label: 'Schritt 1 — Leistungen' },
      { n: '2', label: 'Schritt 2 — Finalisieren' },
      { n: '3', label: 'Schritt 3 — Versenden' },
    ]) {
      const current = await page.evaluate(() =>
        document.querySelector('.stepper .step.active .step-n')?.textContent?.trim()
      )
      if (current !== step.n && step.n !== '1') break

      await captureShot({ ...base, interaction: step.label })

      if (await isMobileViewport(page) && step.n === '2') {
        await captureMobileEditSheets(page, captureShot, base)
      }

      if (step.n === '3') break
      await clickWizardWeiter(page)
    }

    await closeWizard(page)
  } catch (err) {
    console.warn('  ✗ Rechnung-Wizard:', err instanceof Error ? err.message : err)
    await closeWizard(page).catch(() => undefined)
  }
}

async function captureAnfrageFilterSheetScenario(page, ctx, _anfrageId, captureShot) {
  if (!(await isMobileViewport(page))) return

  const path = `/anfragen`
  console.log(`\n→ Anfragen Filter-Sheet (${path})`)

  try {
    await ctx.goto(page, `${ctx.baseUrl}${path}`)
    await sleep(ctx.waitMs + 500)

    const trigger = await page.waitForSelector('.mobile-filter-trigger-btn', { timeout: 10_000 }).catch(() => null)
    if (!trigger) {
      console.warn('  ✗ Filter-Button nicht gefunden')
      return
    }
    await trigger.click()

    await waitForSheet(page)
    await captureShot({
      path,
      title: 'Anfragen — Filter',
      category: 'Mobile Sheets — Listen',
      scenario: 'anfragen-filter',
      interaction: 'Sheet — Filter',
    })
    await closeSheet(page)
  } catch {
    await closeSheet(page).catch(() => undefined)
  }
}
