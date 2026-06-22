#!/usr/bin/env node
/** Manifest aus vorhandenen PNG-Dateien + config STATIC_ROUTES rekonstruieren. */
import { existsSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { OUTPUT_DIR, STATIC_ROUTES, VIEWPORTS } from './config.mjs'
import { CRM_ROOT, routeSlug } from './lib.mjs'

const manifestPath = join(CRM_ROOT, OUTPUT_DIR, 'manifest.json')
const items = []

for (const route of STATIC_ROUTES) {
  for (const viewport of Object.values(VIEWPORTS)) {
    const slug = routeSlug(route.path)
    const fileName = `${slug}.png`
    const rel = join(OUTPUT_DIR, 'screenshots', viewport.name, fileName).replace(/\\/g, '/')
    const abs = join(CRM_ROOT, rel)
    if (!existsSync(abs)) continue
    items.push({
      slug,
      path: route.path,
      title: route.title,
      category: route.category,
      viewport: viewport.name,
      viewportLabel: viewport.label,
      file: rel,
      ok: true,
    })
  }
}

writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl: 'http://127.0.0.1:3001',
      total: items.length,
      success: items.length,
      failed: 0,
      items,
    },
    null,
    2
  ),
  'utf8'
)

console.log(`Manifest: ${items.length} Einträge → ${manifestPath}`)
