#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/umsetzung/n5-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const MOCK_URL = 'http://127.0.0.1:8765/Baerenwald%20CRM%20(standalone)%20(9).html';
const APP = 'http://127.0.0.1:3001';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812 };
const TABS = ['uebersicht', 'leistungen', 'zahlung', 'akte', 'aktivitaet'];
const TAB_LABEL = {
  uebersicht: 'Übersicht',
  leistungen: 'Leistungen',
  zahlung: 'Zahlung',
  akte: 'Akte',
  aktivitaet: 'Aktivität',
};

async function shot(page, name) {
  await page.waitForTimeout(350);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('✓', name, fs.statSync(file).size);
}

async function gotoApp(page, urlPath) {
  await page.goto(`${APP}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(700);
}

async function waitMock(page) {
  await page.goto(MOCK_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.sidebar-icon', { timeout: 120000 });
  await page.waitForTimeout(1200);
}

async function mockNav(page, label) {
  await page.evaluate((lab) => {
    const el = [...document.querySelectorAll('.sidebar-icon')].find(
      (b) => (b.getAttribute('data-label') || '') === lab
    );
    if (el) el.click();
    else {
      const bn = [...document.querySelectorAll('.bottomnav-item')].find(
        (b) => (b.getAttribute('aria-label') || '').includes(lab)
      );
      if (bn) bn.click();
    }
  }, label);
  await page.waitForTimeout(500);
}

async function mockFilterPhase(page, phaseLabel) {
  await page.evaluate((lab) => {
    const chips = [...document.querySelectorAll('button, .chip, [class*="Chip"]')];
    // text like "Anfrage 9"
    const el = chips.find((c) => {
      const t = (c.textContent || '').replace(/\s+/g, ' ').trim();
      return t === lab || t.startsWith(lab + ' ') || t.startsWith(lab);
    });
    if (el) el.click();
  }, phaseLabel);
  await page.waitForTimeout(400);
}

async function mockOpenFirstVgRow(page) {
  const n = await page.locator('.vg-row:not(.head)').count();
  if (!n) {
    console.warn('no vg-row');
    return false;
  }
  await page.locator('.vg-row:not(.head)').first().click();
  await page.waitForTimeout(700);
  const ok = (await page.locator('.dshell, .detail-head, .dh-title').count()) > 0;
  console.log('opened detail?', ok, 'rows', n);
  return ok;
}

async function mockTab(page, tabKey) {
  const lab = TAB_LABEL[tabKey];
  const ok = await page.evaluate((label) => {
    const btn = [...document.querySelectorAll('.dshell-navitem')].find((b) => {
      const t = (b.textContent || '').replace(/\s+/g, ' ').trim();
      return t === label || t.startsWith(label);
    });
    if (btn) { btn.click(); return true; }
    // Mehr sheet
    const more = document.querySelector('.dshell-more');
    if (more) {
      more.click();
      const item = [...document.querySelectorAll('.dshell-sheet button, .pop-item')].find((b) =>
        (b.textContent || '').includes(label)
      );
      if (item) { item.click(); return true; }
    }
    return false;
  }, lab);
  await page.waitForTimeout(450);
  if (!ok) console.warn('tab miss', tabKey);
  return ok;
}

async function mockBackToList(page) {
  await mockNav(page, 'Vorgänge');
  await page.waitForTimeout(400);
}

async function mockClickButton(page, re) {
  return page.evaluate((pattern) => {
    const rx = new RegExp(pattern, 'i');
    const b = [...document.querySelectorAll('button, a')].find((x) => rx.test((x.textContent || '').trim()));
    if (b) { b.click(); return true; }
    return false;
  }, re);
}

async function captureMock(browser) {
  console.log('\n=== MOCK ===');
  for (const [vpName, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    const context = await browser.newContext({
      viewport: vp,
      isMobile: vpName === 'mobile',
      hasTouch: vpName === 'mobile',
    });
    const page = await context.newPage();
    await waitMock(page);

    await mockNav(page, 'Dashboard');
    await shot(page, `mock-dashboard-${vpName}`);

    await mockNav(page, 'Vorgänge');
    await shot(page, `mock-vorgaenge-list-${vpName}`);

    const types = [
      ['anfrage', 'Anfrage'],
      ['angebot', 'Angebot'],
      ['auftrag', 'Auftrag'],
      ['rechnung', 'Rechnung'],
    ];

    if (vpName === 'desktop') {
      for (const [key, filter] of types) {
        await mockNav(page, 'Vorgänge');
        await mockFilterPhase(page, filter);
        await mockOpenFirstVgRow(page);
        for (const tab of TABS) {
          await mockTab(page, tab);
          await shot(page, `mock-detail-${key}-${tab}-desktop`);
        }
        await mockBackToList(page);
      }

      // Angebot canvas: Anfrage → Angebot erstellen
      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Anfrage');
      await mockOpenFirstVgRow(page);
      await mockClickButton(page, 'Angebot erstellen');
      await page.waitForTimeout(1000);
      if (!(await page.locator('.doc-canvas, [class*="canvas"], .wizard-flow').count())) {
        await mockBackToList(page);
        await mockFilterPhase(page, 'Angebot');
        // edit via row menu is hard; use pencil hover or primary
        await page.hover('.vg-row:not(.head)');
        await page.waitForTimeout(200);
        await page.evaluate(() => {
          const pencil = document.querySelector('.vg-row .qa-btn[title="Bearbeiten"], .vg-actions .qa-btn');
          if (pencil) pencil.click();
        });
        await page.waitForTimeout(1000);
      }
      await shot(page, 'mock-angebot-canvas-desktop');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // Rechnung canvas
      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Auftrag');
      await mockOpenFirstVgRow(page);
      await mockClickButton(page, 'Rechnung erstellen|Rechnung');
      await page.waitForTimeout(1000);
      await shot(page, 'mock-rechnung-canvas-desktop');
      await page.keyboard.press('Escape');

      // Abnahme canvas
      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Auftrag');
      await mockOpenFirstVgRow(page);
      await mockClickButton(page, 'Abnahme');
      await page.waitForTimeout(1000);
      await shot(page, 'mock-abnahme-canvas-desktop');
      await page.keyboard.press('Escape');

      // Leistung drawer
      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Auftrag');
      await mockOpenFirstVgRow(page);
      await mockTab(page, 'leistungen');
      await page.locator('.lt-row, .offer-pos-row, table tbody tr, .list-row:not(.head)').first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, 'mock-leistung-drawer-desktop');
      await page.keyboard.press('Escape');

      // Rate drawer
      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Rechnung');
      await mockOpenFirstVgRow(page);
      await mockTab(page, 'zahlung');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button, .lt-row, .list-row')].find((x) =>
          /Öffnen|Abschlag|Schluss|Rate/i.test(x.textContent || '')
        );
        if (b) b.click();
        else {
          const row = document.querySelector('.lt-row, .list-row:not(.head)');
          if (row) row.click();
        }
      });
      await page.waitForTimeout(800);
      await shot(page, 'mock-rate-drawer-desktop');
    } else {
      for (const [key, filter] of types) {
        await mockNav(page, 'Vorgänge');
        await mockFilterPhase(page, filter);
        await mockOpenFirstVgRow(page);
        await mockTab(page, 'leistungen');
        await shot(page, `mock-detail-${key}-leistungen-mobile`);
        await mockBackToList(page);
      }

      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Anfrage');
      await mockOpenFirstVgRow(page);
      await mockClickButton(page, 'Angebot erstellen|Bearbeiten');
      await page.waitForTimeout(900);
      await shot(page, 'mock-angebot-canvas-mobile');
      await page.keyboard.press('Escape');

      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Auftrag');
      await mockOpenFirstVgRow(page);
      await mockClickButton(page, 'Rechnung erstellen');
      await page.waitForTimeout(900);
      await shot(page, 'mock-rechnung-canvas-mobile');
      await page.keyboard.press('Escape');

      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Auftrag');
      await mockOpenFirstVgRow(page);
      await mockClickButton(page, 'Abnahme');
      await page.waitForTimeout(900);
      await shot(page, 'mock-abnahme-canvas-mobile');
      await page.keyboard.press('Escape');

      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Auftrag');
      await mockOpenFirstVgRow(page);
      await mockTab(page, 'leistungen');
      await page.locator('.lt-row, .list-row:not(.head), table tbody tr').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(700);
      await shot(page, 'mock-leistung-drawer-mobile');
      await page.keyboard.press('Escape');

      await mockNav(page, 'Vorgänge');
      await mockFilterPhase(page, 'Rechnung');
      await mockOpenFirstVgRow(page);
      await mockTab(page, 'zahlung');
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button, .lt-row')].find((x) => /Öffnen|Abschlag|Schluss/i.test(x.textContent || ''));
        if (b) b.click();
      });
      await page.waitForTimeout(700);
      await shot(page, 'mock-rate-drawer-mobile');
    }

    await context.close();
  }
}

async function autoLogin(context) {
  const page = await context.newPage();
  await page.goto(`${APP}/api/dev/auto-login?next=/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(1200);
  // follow if still on login
  for (let i = 0; i < 3; i++) {
    if (!page.url().includes('/login') && !page.url().includes('auto-login')) break;
    await page.goto(`${APP}/api/dev/auto-login?next=/`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(800);
  }
  await gotoApp(page, '/');
  return page;
}

async function discoverIds(page) {
  await gotoApp(page, '/vorgaenge');
  await page.waitForSelector('a[href*="/anfragen/"], a[href*="/angebote/"], .vg-row, table', { timeout: 60000 }).catch(() => {});
  const ids = await page.evaluate(() => {
    const out = { anfrage: null, angebot: null, auftrag: null, rechnung: null };
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href') || '';
      const m1 = h.match(/\/anfragen\/([0-9a-f-]{36})/i);
      const m2 = h.match(/\/angebote\/([0-9a-f-]{36})/i);
      const m3 = h.match(/\/auftraege\/([0-9a-f-]{36})/i);
      const m4 = h.match(/\/rechnungen\/([0-9a-f-]{36})/i);
      if (m1 && !out.anfrage) out.anfrage = m1[1];
      if (m2 && !out.angebot) out.angebot = m2[1];
      if (m3 && !out.auftrag) out.auftrag = m3[1];
      if (m4 && !out.rechnung) out.rechnung = m4[1];
    }
    return out;
  });
  console.log('IDs', ids);
  return ids;
}

async function captureIst(browser) {
  console.log('\n=== IST ===');
  const boot = await browser.newContext({ viewport: DESKTOP });
  const bootPage = await autoLogin(boot);
  const ids = await discoverIds(bootPage);
  const storage = await boot.storageState();
  await boot.close();

  const route = {
    anfrage: (id, tab) => `/anfragen/${id}?tab=${tab}`,
    angebot: (id, tab) => `/angebote/${id}?tab=${tab}`,
    auftrag: (id, tab) => `/auftraege/${id}?tab=${tab}`,
    rechnung: (id, tab) => `/rechnungen/${id}?tab=${tab}`,
  };

  for (const [vpName, vp] of [['desktop', DESKTOP], ['mobile', MOBILE]]) {
    const context = await browser.newContext({
      viewport: vp,
      storageState: storage,
      isMobile: vpName === 'mobile',
      hasTouch: vpName === 'mobile',
    });
    const page = await context.newPage();

    await gotoApp(page, '/');
    await shot(page, `ist-dashboard-${vpName}`);

    await gotoApp(page, '/vorgaenge');
    await shot(page, `ist-vorgaenge-list-${vpName}`);

    if (vpName === 'desktop') {
      for (const type of ['anfrage', 'angebot', 'auftrag', 'rechnung']) {
        if (!ids[type]) { console.warn('skip', type); continue; }
        for (const tab of TABS) {
          await gotoApp(page, route[type](ids[type], tab));
          await shot(page, `ist-detail-${type}-${tab}-desktop`);
        }
      }

      if (ids.angebot) {
        await gotoApp(page, `/angebote/${ids.angebot}?tab=uebersicht`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a')].find((x) => /Bearbeiten|Überarbeiten/i.test(x.textContent || ''));
          if (b) b.click();
        });
        await page.waitForTimeout(1200);
        await shot(page, 'ist-angebot-canvas-desktop');
        await page.keyboard.press('Escape');
      }

      if (ids.rechnung) {
        await gotoApp(page, `/rechnungen/${ids.rechnung}?tab=uebersicht`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a')].find((x) => /Bearbeiten|Korrigieren/i.test(x.textContent || ''));
          if (b) b.click();
        });
        await page.waitForTimeout(1200);
        await shot(page, 'ist-rechnung-canvas-desktop');
        await page.keyboard.press('Escape');
      } else if (ids.auftrag) {
        await gotoApp(page, `/auftraege/${ids.auftrag}`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a')].find((x) => /Rechnung erstellen/i.test(x.textContent || ''));
          if (b) b.click();
        });
        await page.waitForTimeout(1200);
        await shot(page, 'ist-rechnung-canvas-desktop');
        await page.keyboard.press('Escape');
      }

      if (ids.auftrag) {
        await gotoApp(page, `/auftraege/${ids.auftrag}/abnahme/erstellen`);
        await shot(page, 'ist-abnahme-canvas-desktop');

        await gotoApp(page, `/auftraege/${ids.auftrag}?tab=leistungen`);
        await page.locator('table tbody tr, .lt-row, [data-leistung-id]').first().click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);
        await shot(page, 'ist-leistung-drawer-desktop');
        await page.keyboard.press('Escape');
      }

      if (ids.rechnung || ids.auftrag) {
        const p = ids.rechnung
          ? `/rechnungen/${ids.rechnung}?tab=zahlung`
          : `/auftraege/${ids.auftrag}?tab=zahlung`;
        await gotoApp(page, p);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a, tr')].find((x) =>
            /Öffnen|Abschlag|Schluss|Rate/i.test(x.textContent || '')
          );
          if (b) b.click();
        });
        await page.waitForTimeout(900);
        await shot(page, 'ist-rate-drawer-desktop');
      }
    } else {
      for (const type of ['anfrage', 'angebot', 'auftrag', 'rechnung']) {
        if (!ids[type]) continue;
        await gotoApp(page, route[type](ids[type], 'leistungen'));
        await shot(page, `ist-detail-${type}-leistungen-mobile`);
      }
      if (ids.angebot) {
        await gotoApp(page, `/angebote/${ids.angebot}`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a')].find((x) => /Bearbeiten|Überarbeiten/i.test(x.textContent || ''));
          if (b) b.click();
        });
        await page.waitForTimeout(1000);
        await shot(page, 'ist-angebot-canvas-mobile');
        await page.keyboard.press('Escape');
      }
      if (ids.rechnung || ids.auftrag) {
        await gotoApp(page, ids.rechnung ? `/rechnungen/${ids.rechnung}` : `/auftraege/${ids.auftrag}`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a')].find((x) =>
            /Bearbeiten|Rechnung erstellen|Korrigieren/i.test(x.textContent || '')
          );
          if (b) b.click();
        });
        await page.waitForTimeout(1000);
        await shot(page, 'ist-rechnung-canvas-mobile');
        await page.keyboard.press('Escape');
      }
      if (ids.auftrag) {
        await gotoApp(page, `/auftraege/${ids.auftrag}/abnahme/erstellen`);
        await shot(page, 'ist-abnahme-canvas-mobile');

        await gotoApp(page, `/auftraege/${ids.auftrag}?tab=leistungen`);
        await page.locator('table tbody tr, .lt-row').first().click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(800);
        await shot(page, 'ist-leistung-drawer-mobile');
        await page.keyboard.press('Escape');

        await gotoApp(page, ids.rechnung
          ? `/rechnungen/${ids.rechnung}?tab=zahlung`
          : `/auftraege/${ids.auftrag}?tab=zahlung`);
        await page.evaluate(() => {
          const b = [...document.querySelectorAll('button, a, tr')].find((x) =>
            /Öffnen|Abschlag|Schluss|Rate/i.test(x.textContent || '')
          );
          if (b) b.click();
        });
        await page.waitForTimeout(800);
        await shot(page, 'ist-rate-drawer-mobile');
      }
    }

    await context.close();
  }
}

const browser = await chromium.launch({ headless: true });
try {
  await captureMock(browser);
  await captureIst(browser);
} finally {
  await browser.close();
}
const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'));
console.log('\nTOTAL PNGs', files.length);
