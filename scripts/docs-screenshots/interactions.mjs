/** Gemeinsame Puppeteer-Hilfen für klickbasierte UI-Dokumentation. */

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function isMobileViewport(page) {
  return page.evaluate(() => window.matchMedia('(max-width: 767px)').matches)
}

export async function waitForSheet(page, timeout = 12_000) {
  await page.waitForSelector('.mobile-filter-sheet', { visible: true, timeout })
  await sleep(350)
}

export async function closeSheet(page) {
  const closed = await page.evaluate(() => {
    const fertig = Array.from(document.querySelectorAll('.mobile-filter-sheet__footer button')).find((b) =>
      /fertig/i.test(b.textContent || '')
    )
    if (fertig instanceof HTMLElement) {
      fertig.click()
      return true
    }
    const backdrop = document.querySelector('.mobile-filter-sheet__backdrop')
    if (backdrop instanceof HTMLElement) {
      backdrop.click()
      return true
    }
    const x = document.querySelector('.mobile-filter-sheet__close')
    if (x instanceof HTMLElement) {
      x.click()
      return true
    }
    return false
  })
  if (closed) await sleep(400)
}

export async function clickTabByLabel(page, label) {
  await page.evaluate((tabLabel) => {
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'))
    const btn = tabs.find((el) => (el.textContent || '').replace(/\s+/g, ' ').trim().includes(tabLabel))
    if (btn instanceof HTMLElement) btn.click()
  }, label)
  await sleep(600)
}

export async function clickActionsMenuItem(page, itemLabel) {
  const trigger =
    (await page.$('[aria-label="Weitere Aktionen"]')) ??
    (await page.$('.menu-wrap [role="button"]'))
  if (!trigger) return false
  await trigger.click()
  await sleep(450)

  const mobile = await isMobileViewport(page)
  const clicked = await page.evaluate(
    (label, isMobileSheet) => {
      if (isMobileSheet) {
        const sheetBtn = Array.from(document.querySelectorAll('.action-sheet-item')).find((b) =>
          (b.textContent || '').replace(/\s+/g, ' ').trim().startsWith(label)
        )
        if (sheetBtn instanceof HTMLElement) {
          sheetBtn.click()
          return true
        }
      }
      const item = Array.from(document.querySelectorAll('.menu-item')).find((b) =>
        (b.textContent || '').includes(label)
      )
      if (item instanceof HTMLElement) {
        item.click()
        return true
      }
      return false
    },
    itemLabel,
    mobile
  )
  await sleep(mobile ? 900 : 700)
  return clicked
}

export async function waitForWizard(page, timeout = 20_000) {
  await page.waitForSelector('.app-flow-screen', { visible: true, timeout })
  await sleep(700)
}

export async function closeWizard(page) {
  await page.evaluate(() => {
    const close = document.querySelector('.app-flow-screen [aria-label="Schließen"]')
    if (close instanceof HTMLElement) close.click()
  })
  await sleep(500)
}

export async function getWizardStepNumber(page) {
  return page.evaluate(() => {
    const active = document.querySelector('.stepper .step.active .step-n')
    return active?.textContent?.trim() ?? null
  })
}

export async function clickWizardWeiter(page) {
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.app-flow-screen button'))
    const weiter = btns.find((b) => /^Weiter$/i.test((b.textContent || '').replace(/\s+/g, ' ').trim()))
    weiter?.click()
  })
  await sleep(1800)
}

export async function clickWizardButton(page, labelPattern) {
  await page.evaluate((pattern) => {
    const re = new RegExp(pattern, 'i')
    const btns = Array.from(document.querySelectorAll('.app-flow-screen button'))
    const btn = btns.find((b) => re.test((b.textContent || '').replace(/\s+/g, ' ').trim()))
    if (btn instanceof HTMLElement) btn.click()
  }, labelPattern)
  await sleep(1200)
}

export async function captureMobileEditSheets(page, captureShot, meta) {
  if (!(await isMobileViewport(page))) return 0

  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.mobile-editable-overview button'))
      .map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  )

  let count = 0
  for (const label of [...new Set(labels)]) {
    const clicked = await page.evaluate((text) => {
      const btn = Array.from(document.querySelectorAll('.mobile-editable-overview button')).find(
        (b) => (b.textContent || '').replace(/\s+/g, ' ').trim() === text
      )
      if (!(btn instanceof HTMLElement)) return false
      btn.click()
      return true
    }, label)
    if (!clicked) continue
    try {
      await waitForSheet(page)
      await captureShot({ ...meta, interaction: `Sheet — ${label}` })
      count++
    } catch {
      /* Sheet evtl. nicht geöffnet */
    }
    await closeSheet(page)
  }
  return count
}

export async function captureFirstPositionSheet(page, captureShot, meta) {
  if (!(await isMobileViewport(page))) return false

  const clicked = await page.evaluate(() => {
    const row = document.querySelector('.pos-acc .pos-row[role="button"], .pos-acc .pos-row')
    if (!(row instanceof HTMLElement)) return false
    row.click()
    return true
  })
  if (!clicked) return false

  try {
    await waitForSheet(page)
    await captureShot({ ...meta, interaction: 'Sheet — Position bearbeiten' })
    await closeSheet(page)
    return true
  } catch {
    return false
  }
}

export function extractIdFromRoutes(routes, pattern) {
  const hit = routes.find((r) => pattern.test(r.path))
  return hit?.path.split('/').pop() ?? null
}

/** Ersten Datensatz auf einer Liste per Klick öffnen und ID aus der URL lesen. */
export async function discoverEntityIdFromList(page, listUrl, pathPattern) {
  try {
    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await sleep(900)

    const clicked = await page.evaluate(() => {
      const mobile = document.querySelector('button.app-entity-list-row, a.app-entity-list-row')
      if (mobile instanceof HTMLElement) {
        mobile.click()
        return 'mobile'
      }
      const gridRow = document.querySelector('.list-row-grid:not(.head)')
      if (gridRow instanceof HTMLElement) {
        gridRow.click()
        return 'grid'
      }
      return null
    })

    if (!clicked) return null
    await sleep(1200)

    const path = new URL(page.url()).pathname
    if (!pathPattern.test(path)) return null
    return path.split('/').pop() ?? null
  } catch {
    return null
  }
}
