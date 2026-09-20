#!/usr/bin/env node
/**
 * Build-Check (E3 / P5-5 + P5-8): keine Legacy-Field-/EmptyState-Komponenten.
 * Failt wenn Input/Textarea/Select oder EmptyState-Dateien/Imports bleiben.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const FORBIDDEN_FILES = [
  'src/components/ui/Input.tsx',
  'src/components/ui/Textarea.tsx',
  'src/components/ui/Select.tsx',
  'src/components/ui/Field.tsx',
  'src/components/ui/EmptyState.tsx',
  'src/components/layout/EmptyState.tsx',
]

const errors = []

for (const rel of FORBIDDEN_FILES) {
  if (fs.existsSync(path.join(root, rel))) {
    errors.push(`${rel} existiert noch — löschen (MockField / MockEmpty)`)
  }
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts|mjs|js)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

const IMPORT_PATTERNS = [
  {
    re: /@\/components\/ui\/Input\b|from ['"].*\/ui\/Input['"]/g,
    msg: 'Import/Referenz auf ui/Input',
  },
  {
    re: /@\/components\/ui\/Textarea\b|from ['"].*\/ui\/Textarea['"]/g,
    msg: 'Import/Referenz auf ui/Textarea',
  },
  {
    re: /@\/components\/ui\/Select\b|from ['"].*\/ui\/Select['"]/g,
    msg: 'Import/Referenz auf ui/Select',
  },
  {
    re: /@\/components\/ui\/Field\b|from ['"].*\/ui\/Field['"]/g,
    msg: 'Import/Referenz auf ui/Field',
  },
  {
    re: /@\/components\/ui\/EmptyState\b|@\/components\/layout\/EmptyState\b|from ['"].*\/EmptyState['"]/g,
    msg: 'Import/Referenz auf EmptyState',
  },
]

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  const content = fs.readFileSync(file, 'utf8')
  for (const { re, msg } of IMPORT_PATTERNS) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(content))) {
      const line = content.slice(0, m.index).split('\n').length
      errors.push(`${rel}:${line}  ${msg}`)
    }
  }
}

const uiIndex = path.join(srcDir, 'components/ui/index.ts')
if (fs.existsSync(uiIndex)) {
  const idx = fs.readFileSync(uiIndex, 'utf8')
  if (/from\s*['"]\.\/Input['"]/.test(idx) || /export\s*\{[^}]*\bInput\b/.test(idx)) {
    errors.push('src/components/ui/index.ts exportiert noch Input')
  }
  if (/from\s*['"]\.\/Textarea['"]/.test(idx) || /export\s*\{[^}]*\bTextarea\b/.test(idx)) {
    errors.push('src/components/ui/index.ts exportiert noch Textarea')
  }
  if (/from\s*['"]\.\/Select['"]/.test(idx) || /export\s*\{[^}]*\bSelect\b/.test(idx)) {
    errors.push('src/components/ui/index.ts exportiert noch Select')
  }
  if (/from\s*['"]\.\/EmptyState['"]/.test(idx) || /export\s*\{[^}]*\bEmptyState\b/.test(idx)) {
    errors.push('src/components/ui/index.ts exportiert noch EmptyState')
  }
}

if (errors.length) {
  console.error('Legacy-Field/EmptyState-Check fehlgeschlagen:')
  for (const e of errors) console.error(`  ${e}`)
  console.error(
    `\n${errors.length} Fund(e). Felder: MockField + className="input". Leer: MockEmpty.`
  )
  process.exit(1)
}

console.log('OK: kein ui/Input|Textarea|Select|Field|EmptyState (MockField/MockEmpty kanonisch)')
