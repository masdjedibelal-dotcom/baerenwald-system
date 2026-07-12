#!/usr/bin/env node
/**
 * Baut aus docs/generated/manifest.json eine HTML- und PDF-Dokumentation.
 *
 * Aufruf:
 *   npm run docs:pdf
 *   npm run docs:ui          (Screenshots + PDF)
 */
import { spawn } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { OUTPUT_DIR } from './config.mjs'
import { CRM_ROOT, ensureDir, escapeHtml, getChromePath, loadEnvLocal } from './lib.mjs'

loadEnvLocal()

const manifestPath = join(CRM_ROOT, OUTPUT_DIR, 'manifest.json')
const htmlPath = join(CRM_ROOT, OUTPUT_DIR, 'ui-dokumentation.html')
const pdfPath = join(CRM_ROOT, OUTPUT_DIR, 'ui-dokumentation.pdf')
const workerPath = join(CRM_ROOT, 'scripts', 'pdf-render-worker.mjs')

function imageRelSrc(item) {
  if (!item.file) return ''
  const absPath = join(CRM_ROOT, item.file)
  if (!existsSync(absPath)) return ''
  const prefix = `${OUTPUT_DIR}/`
  return item.file.startsWith(prefix) ? item.file.slice(prefix.length) : item.file
}

function groupByCategory(items) {
  /** @type {Map<string, typeof items>} */
  const map = new Map()
  for (const item of items) {
    if (!item.ok) continue
    const list = map.get(item.category) || []
    list.push(item)
    map.set(item.category, list)
  }
  return map
}

function buildHtml(manifest) {
  const okItems = manifest.items.filter((i) => i.ok)
  const grouped = groupByCategory(okItems)
  const categories = [...grouped.keys()].sort((a, b) => a.localeCompare(b, 'de'))
  const date = new Date(manifest.generatedAt).toLocaleString('de-DE')

  const toc = categories
    .map((cat) => {
      const id = `cat-${cat.replace(/\W+/g, '-').toLowerCase()}`
      const count = grouped.get(cat)?.length ?? 0
      return `<li><a href="#${id}">${escapeHtml(cat)}</a> <span class="muted">(${count})</span></li>`
    })
    .join('\n')

  const sections = categories
    .map((cat) => {
      const id = `cat-${cat.replace(/\W+/g, '-').toLowerCase()}`
      const items = grouped.get(cat) ?? []
      const cards = items
        .map((item) => {
          const imgSrc = imageRelSrc(item)
          const tab = item.tab ? ` — Tab „${escapeHtml(item.tab)}“` : ''
          const interaction = item.interaction ? ` — ${escapeHtml(item.interaction)}` : ''
          return `
        <article class="shot">
          <header class="shot-head">
            <div>
              <h3>${escapeHtml(item.title)}${tab}${interaction}</h3>
              <p class="meta">${escapeHtml(item.viewportLabel)} · <code>${escapeHtml(item.path)}</code></p>
            </div>
            <span class="badge ${item.viewport}">${escapeHtml(item.viewport)}</span>
          </header>
          ${imgSrc ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.title)}" />` : '<p class="missing">Bild fehlt</p>'}
        </article>`
        })
        .join('\n')
      return `
    <section id="${id}" class="category">
      <h2>${escapeHtml(cat)}</h2>
      <div class="grid">${cards}</div>
    </section>`
    })
    .join('\n')

  const failed = manifest.items.filter((i) => !i.ok)
  const failedSection =
    failed.length > 0
      ? `
    <section class="category failed">
      <h2>Fehlgeschlagene Aufnahmen (${failed.length})</h2>
      <ul>${failed
        .map(
          (f) =>
            `<li><code>${escapeHtml(f.path)}</code> (${escapeHtml(f.viewport)}) — ${escapeHtml(f.error || 'Unbekannt')}</li>`
        )
        .join('')}</ul>
    </section>`
      : ''

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Bärenwald CRM — UI-Dokumentation</title>
  <style>
    @page { size: A4; margin: 14mm; }
    :root {
      --text: #1a1a1a;
      --muted: #666;
      --border: #ddd;
      --green: #2d5016;
      --bg: #fafafa;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: var(--text);
      line-height: 1.45;
      margin: 0;
      background: white;
    }
    .cover {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 48px;
      page-break-after: always;
      background: linear-gradient(160deg, #f4f7f0 0%, #fff 55%);
    }
    .cover h1 { font-size: 2rem; color: var(--green); margin: 0 0 8px; }
    .cover p { color: var(--muted); margin: 4px 0; }
    .cover .stats { margin-top: 24px; font-size: 0.95rem; }
    nav.toc {
      padding: 32px 40px;
      page-break-after: always;
    }
    nav.toc h2 { margin-top: 0; color: var(--green); }
    nav.toc ul { columns: 2; gap: 24px; padding-left: 20px; }
    nav.toc a { color: var(--green); text-decoration: none; }
    .muted { color: var(--muted); }
    section.category { padding: 24px 32px 8px; page-break-before: always; }
    section.category h2 {
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--green);
      color: var(--green);
    }
    .grid { display: grid; gap: 20px; }
    .shot {
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      background: var(--bg);
      page-break-inside: avoid;
    }
    .shot-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: white;
      border-bottom: 1px solid var(--border);
    }
    .shot h3 { margin: 0; font-size: 0.95rem; }
    .meta { margin: 4px 0 0; font-size: 0.78rem; color: var(--muted); }
    .meta code { font-size: 0.75rem; }
    .badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      white-space: nowrap;
    }
    .badge.desktop { background: #eef2ff; color: #3730a3; }
    .badge.mobile { background: #ecfdf5; color: #047857; }
    .shot img {
      display: block;
      width: 100%;
      height: auto;
      background: white;
    }
    .missing { padding: 16px; color: #b91c1c; }
    section.failed ul { font-size: 0.85rem; color: #7f1d1d; }
    @media print {
      section.category { padding: 0 0 12px; }
      .shot { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <p>Bärenwald CRM Dashboard</p>
    <h1>UI-Dokumentation</h1>
    <p>Automatisch erzeugte Screenshots aller konfigurierten Ansichten</p>
    <p>Basis-URL: <code>${escapeHtml(manifest.baseUrl)}</code></p>
    <p>Erstellt: ${escapeHtml(date)}</p>
    <div class="stats">
      <p><strong>${okItems.length}</strong> Screenshots erfolgreich</p>
      <p><strong>${categories.length}</strong> Kategorien · Desktop &amp; Mobile</p>
      ${failed.length ? `<p><strong>${failed.length}</strong> fehlgeschlagen (siehe Anhang)</p>` : ''}
    </div>
  </div>

  <nav class="toc">
    <h2>Inhalt</h2>
    <ul>${toc}</ul>
  </nav>

  ${sections}
  ${failedSection}
</body>
</html>`
}

async function renderPdf() {
  const chrome = getChromePath()
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath, htmlPath, pdfPath, chrome], {
      cwd: CRM_ROOT,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0 && existsSync(pdfPath) ? resolve() : reject(new Error(`PDF-Worker Code ${code}`))
    )
  })
}

function main() {
  if (!existsSync(manifestPath)) {
    console.error('Manifest fehlt. Bitte zuerst: npm run docs:screenshots')
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  ensureDir(join(CRM_ROOT, OUTPUT_DIR))

  const html = buildHtml(manifest)
  writeFileSync(htmlPath, html, 'utf8')
  console.log('HTML:', htmlPath)

  renderPdf()
    .then(() => {
      console.log('PDF:', pdfPath)
    })
    .catch((err) => {
      console.error('PDF fehlgeschlagen:', err instanceof Error ? err.message : err)
      console.log('HTML-Dokumentation wurde trotzdem erzeugt.')
      process.exit(1)
    })
}

main()
