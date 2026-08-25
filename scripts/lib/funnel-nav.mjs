/**
 * Melde-/Portal-Funnel: an Options-Schritten zuerst eine Kachel wählen, dann Weiter.
 * Export für R2-E2E / Stress-Skripte.
 */

const NAV_SKIP =
  /weiter|zurück|impressum|datenschutz|ablehnen|akzeptieren|cookie|alle ablehnen/i

/** Erkennt Options-Schritte (Kacheln / „Was ist …?“ ohne gewählte Kachel). */
export async function funnelHasOptionStep(page) {
  const tiles = page.locator(
    'button.funnel-tile, .funnel-step-tiles-card button, .funnel-tile'
  )
  const n = await tiles.count()
  if (n === 0) return false
  // mindestens eine sichtbare Kachel, die nicht Footer/Nav ist
  for (let i = 0; i < Math.min(n, 12); i++) {
    const t = tiles.nth(i)
    if (!(await t.isVisible().catch(() => false))) continue
    const txt = ((await t.innerText().catch(() => '')) || '').trim()
    if (!txt || txt.length > 120) continue
    if (NAV_SKIP.test(txt)) continue
    return true
  }
  const body = await page.locator('body').innerText()
  if (/Was ist (das Problem|betroffen)/i.test(body) && n > 0) return true
  return false
}

/** Erste sichtbare Funnel-Option klicken (nicht Nav/Footer). */
export async function funnelSelectFirstOption(page) {
  const tiles = page.locator(
    'button.funnel-tile, .funnel-step-tiles-card button, .funnel-tile'
  )
  const n = await tiles.count()
  for (let i = 0; i < Math.min(n, 15); i++) {
    const t = tiles.nth(i)
    if (!(await t.isVisible().catch(() => false))) continue
    if (await t.isDisabled().catch(() => false)) continue
    const txt = ((await t.innerText().catch(() => '')) || '').trim()
    if (!txt || txt.length > 120) continue
    if (NAV_SKIP.test(txt)) continue
    await t.click({ force: true })
    await page.waitForTimeout(500)
    return txt.slice(0, 80)
  }
  // Fallback: Bereich-Chips (älterer Melde-Flow)
  const chip = page
    .locator('button, [role=button]')
    .filter({ hasText: /Wasser|Heizung|Strom|Rohr|WC/i })
    .first()
  if (await chip.count()) {
    await chip.click({ force: true })
    await page.waitForTimeout(500)
    return 'chip-fallback'
  }
  return null
}

/** Weiter-Button (nur wenn enabled). */
export async function funnelClickWeiter(page) {
  const next = page
    .locator('button.funnel-footer-next:not([disabled])')
    .or(page.getByRole('button', { name: /^Weiter/i }))
    .first()
  if (!(await next.count())) return false
  if (await next.isDisabled().catch(() => true)) return false
  await next.click({ force: true })
  await page.waitForTimeout(600)
  return true
}

/**
 * Ein Funnel-Schritt: Option (falls nötig) → Weiter.
 * @returns {'weiter'|'absenden'|'stuck'|'done'}
 */
export async function funnelAdvanceStep(page, log) {
  if (await funnelHasOptionStep(page)) {
    const picked = await funnelSelectFirstOption(page)
    if (picked) log?.(`funnel picked: ${picked}`)
    else log?.('funnel option step but no tile clicked')
  }

  const absenden = page
    .getByRole('button', { name: /absenden|melden|senden|abschicken|meldung/i })
    .or(page.locator('button.funnel-footer-next').filter({ hasText: /absenden|melden/i }))
    .first()
  if (
    (await absenden.isVisible().catch(() => false)) &&
    !(await absenden.isDisabled().catch(() => true))
  ) {
    return 'absenden'
  }

  if (await funnelClickWeiter(page)) return 'weiter'
  return 'stuck'
}
