#!/usr/bin/env node
/**
 * Stellt sicher, dass Kern-Dateien im Repo vorhanden und syntaktisch intakt sind
 * (häufiger Netlify-Fehler: Dateien lokal vorhanden, aber nicht committed;
 * oder Working-Tree-Korruption: leere Dateien / fehlendes erstes Zeichen).
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
  'src/hooks/useIsCrmAdmin.ts',
  'src/app/(dashboard)/einstellungen/sicherheit/page.tsx',
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

/** Erste nicht-leere Zeile (ohne BOM). */
function firstCodeLine(text) {
  const cleaned = text.replace(/^\uFEFF/, '')
  for (const line of cleaned.split(/\r?\n/)) {
    if (line.trim()) return line
  }
  return ''
}

/**
 * Erkennt typische Working-Tree-Korruption:
 * - 0-Byte-Dateien
 * - fehlendes erstes Zeichen ('use client' → use client', import → mport)
 */
function describeCorruption(rel, text) {
  if (text.length === 0) return 'Datei ist leer (0 Bytes)'
  const first = firstCodeLine(text)
  if (!first) return 'Datei enthält keinen Code'

  if (/^use client['"]$/.test(first) || /^use server['"]$/.test(first)) {
    return `Direktive ohne führendes Anführungszeichen: ${JSON.stringify(first)}`
  }
  if (/^mport\s/.test(first)) return `„import“ ohne führendes „i“: ${JSON.stringify(first.slice(0, 48))}`
  if (/^xport\s/.test(first)) return `„export“ ohne führendes „e“: ${JSON.stringify(first.slice(0, 48))}`
  if (/^rom\s/.test(first)) return `„from“ ohne führendes „f“: ${JSON.stringify(first.slice(0, 48))}`

  // Erwartete Starts für TS/TSX unter src/
  if (rel.startsWith('src/') && /\.(ts|tsx)$/.test(rel)) {
    const ok =
      first.startsWith("'use client'") ||
      first.startsWith('"use client"') ||
      first.startsWith("'use server'") ||
      first.startsWith('"use server"') ||
      first.startsWith('import ') ||
      first.startsWith('export ') ||
      first.startsWith('/**') ||
      first.startsWith('/*') ||
      first.startsWith('//') ||
      first.startsWith('type ') ||
      first.startsWith('interface ') ||
      first.startsWith('const ') ||
      first.startsWith('function ') ||
      first.startsWith('async ') ||
      first.startsWith('declare ') ||
      first.startsWith('namespace ') ||
      first.startsWith('#')
    if (!ok) {
      return `Ungewöhnlicher Dateianfang (mögliche Korruption): ${JSON.stringify(first.slice(0, 64))}`
    }
  }
  return null
}

function walkSrcTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walkSrcTsFiles(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

const corrupted = []
for (const full of walkSrcTsFiles(path.join(root, 'src'))) {
  const rel = path.relative(root, full).split(path.sep).join('/')
  let text
  try {
    text = fs.readFileSync(full, 'utf8')
  } catch (e) {
    corrupted.push({ rel, reason: `Lesen fehlgeschlagen: ${e.message}` })
    continue
  }
  const reason = describeCorruption(rel, text)
  if (reason) corrupted.push({ rel, reason })
}

// Auch die explizit kritischen Dateien außerhalb von src/ prüfen
for (const rel of required) {
  if (rel.startsWith('src/')) continue
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) continue
  if (!/\.(ts|tsx|js|mjs)$/.test(rel)) continue
  const text = fs.readFileSync(full, 'utf8')
  if (text.length === 0) corrupted.push({ rel, reason: 'Datei ist leer (0 Bytes)' })
}

if (corrupted.length) {
  console.error('Korrupte oder leere Source-Dateien (Build abgebrochen):', corrupted.length)
  for (const { rel, reason } of corrupted) {
    console.error(`  ${rel}`)
    console.error(`    → ${reason}`)
  }
  console.error(
    '\nHinweis: Oft fehlt das erste Zeichen oder die Datei ist leer. Aus Git wiederherstellen:\n  git checkout HEAD -- <pfad>'
  )
  process.exit(1)
}

console.log('OK: all critical build files present on disk')
console.log('OK: no empty/truncated source files under src/')
