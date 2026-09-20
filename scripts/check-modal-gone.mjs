#!/usr/bin/env node
/**
 * Build-Check (E1 / P5-3): kein ui/Modal und kein mock-ui/MockModal mehr.
 * Failt wenn Dateien existieren oder Importe/Referenzen bleiben.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const guardRel = 'scripts/check-modal-gone.mjs'

const errors = []

const modalPath = path.join(srcDir, 'components/ui/Modal.tsx')
const mockModalPath = path.join(srcDir, 'components/mock-ui/MockModal.tsx')

if (fs.existsSync(modalPath)) {
  errors.push('src/components/ui/Modal.tsx existiert noch — löschen und auf EditorSheet/ConfirmPopup umstellen')
}
if (fs.existsSync(mockModalPath)) {
  errors.push(
    'src/components/mock-ui/MockModal.tsx existiert noch — löschen und auf EditorSheet/ConfirmPopup umstellen'
  )
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts|mjs|js)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

const IMPORT_RE =
  /@\/components\/ui\/Modal['"]|components\/ui\/Modal['"]|from ['"].*\/ui\/Modal['"]|@\/components\/mock-ui\/MockModal|MockModal/g

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  if (rel === guardRel) continue
  const content = fs.readFileSync(file, 'utf8')
  IMPORT_RE.lastIndex = 0
  let m
  while ((m = IMPORT_RE.exec(content))) {
    const line = content.slice(0, m.index).split('\n').length
    errors.push(`${rel}:${line}  Referenz auf Modal/MockModal (${m[0]})`)
  }
}

const uiIndex = path.join(srcDir, 'components/ui/index.ts')
if (fs.existsSync(uiIndex)) {
  const idx = fs.readFileSync(uiIndex, 'utf8')
  if (/export\s*\{[^}]*\bModal\b/.test(idx) || /from\s*['"]\.\/Modal['"]/.test(idx)) {
    errors.push('src/components/ui/index.ts exportiert noch Modal')
  }
}

const mockIndex = path.join(srcDir, 'components/mock-ui/index.ts')
if (fs.existsSync(mockIndex)) {
  const idx = fs.readFileSync(mockIndex, 'utf8')
  if (/MockModal/.test(idx)) {
    errors.push('src/components/mock-ui/index.ts referenziert noch MockModal')
  }
}

if (errors.length) {
  console.error('Modal/MockModal-Check fehlgeschlagen:')
  for (const e of errors) console.error(`  ${e}`)
  console.error(`\n${errors.length} Fund(e). Nutze EditorSheet oder ConfirmPopup.`)
  process.exit(1)
}

console.log('OK: kein ui/Modal und kein MockModal (EditorSheet/ConfirmPopup kanonisch)')
