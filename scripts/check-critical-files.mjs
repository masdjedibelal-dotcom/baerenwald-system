#!/usr/bin/env node
/**
 * Stellt sicher, dass Kern-Dateien im Repo vorhanden sind (häufiger Netlify-Fehler:
 * Dateien lokal vorhanden, aber nicht committed).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const kiAnalyseDir = 'scripts/ki-analyse'
const kiAnalyseRequired = [
  'index.mjs',
  'lib.mjs',
  'funnel-core.mjs',
  'nachfrage-core.mjs',
  'kommunikation-core.mjs',
  'angebot-abgleich-core.mjs',
  'preise-margen-core.mjs',
  'produkte-core.mjs',
  'gewerke-core.mjs',
  'ausfuehrung-core.mjs',
  'handwerker-core.mjs',
  'dauer-core.mjs',
  'bewertungen-core.mjs',
  'claude-auswertung.mjs',
  'claude-client.mjs',
  'upsert.mjs',
]

const required = [
  'src/lib/supabase.ts',
  'src/lib/supabase-server.ts',
  'src/lib/supabase-admin.ts',
  'src/lib/mail-branding.ts',
  'src/lib/get-mail-branding.ts',
  'src/lib/kalender-internes-todo.ts',
  'src/components/ui/Card.tsx',
  'src/components/ui/Button.tsx',
  'src/components/brand/BrandLogo.tsx',
  'src/components/kalender/KalenderClient.tsx',
  'middleware.ts',
  ...kiAnalyseRequired.map((f) => `${kiAnalyseDir}/${f}`),
]

const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)))

if (missing.length) {
  console.error('Fehlende Kern-Dateien für den Build:', missing.length)
  for (const rel of missing) {
    console.error(`  ${rel}`)
  }
  console.error('\nHinweis: Dateien müssen ins Git-Repo committed und gepusht werden.')
  process.exit(1)
}

console.log('OK: all critical build files present on disk')
