#!/usr/bin/env node
/**
 * Build-Check (E2 / P5-4): kein legacy ui/Button mehr.
 * Failt wenn Button.tsx existiert oder Importe von @/components/ui/Button bleiben.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const buttonPath = path.join(srcDir, 'components/ui/Button.tsx')
const guardRel = 'scripts/check-button-legacy.mjs'

const errors = []

if (fs.existsSync(buttonPath)) {
  errors.push('src/components/ui/Button.tsx existiert noch — löschen und auf MockBtn umstellen')
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts|mjs|js|md)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

const IMPORT_RE = /@\/components\/ui\/Button|components\/ui\/Button['"]|from ['"].*\/ui\/Button['"]/g

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  if (rel === guardRel) continue
  const content = fs.readFileSync(file, 'utf8')
  IMPORT_RE.lastIndex = 0
  let m
  while ((m = IMPORT_RE.exec(content))) {
    const line = content.slice(0, m.index).split('\n').length
    errors.push(`${rel}:${line}  Import/Referenz auf ui/Button`)
  }
}

// Auch Root-Scripts (ohne docs) auf Import-Pfade prüfen — nur src reicht für Runtime
// Zusätzlich: Barrel-Export Button aus ui/index
const uiIndex = path.join(srcDir, 'components/ui/index.ts')
if (fs.existsSync(uiIndex)) {
  const idx = fs.readFileSync(uiIndex, 'utf8')
  if (/export\s*\{[^}]*\bButton\b/.test(idx) || /from\s*['"]\.\/Button['"]/.test(idx)) {
    errors.push('src/components/ui/index.ts exportiert noch Button')
  }
}

if (errors.length) {
  console.error('Legacy-Button-Check fehlgeschlagen:')
  for (const e of errors) console.error(`  ${e}`)
  console.error(`\n${errors.length} Fund(e). Nutze MockBtn aus @/components/mock-ui.`)
  process.exit(1)
}

console.log('OK: kein ui/Button (MockBtn kanonisch)')
