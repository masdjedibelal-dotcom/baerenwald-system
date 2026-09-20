#!/usr/bin/env node
/**
 * Einmalig: ui/Button → MockBtn (E2 / P5-4).
 * - Import umschreiben
 * - <Button> → <MockBtn>, variant→kind, size="sm"→sm
 * - Ohne variant/kind: kind="primary" (alte Button-Default)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

const IMPORT_RE =
  /import\s*\{\s*Button(?:\s*,\s*type\s+ButtonProps)?\s*\}\s*from\s*['"]@\/components\/ui\/Button['"]/g

function transformOpeningTag(tag) {
  let t = tag.replace(/^<Button\b/, '<MockBtn')

  // variant= → kind=
  t = t.replace(/\bvariant=/g, 'kind=')

  // size="sm" | size='sm' → sm
  t = t.replace(/\s+size=(["'])sm\1/g, ' sm')
  // size="md"|"lg" entfernen (waren No-ops in ui/Button)
  t = t.replace(/\s+size=(["'])(?:md|lg)\1/g, '')

  // Kein kind und kein variant (bereits umgeschrieben) → primary (Legacy-Default)
  if (!/\bkind=/.test(t)) {
    t = t.replace(/^<MockBtn\b/, '<MockBtn kind="primary"')
  }

  return t
}

function transformFile(content) {
  if (!content.includes("@/components/ui/Button") && !content.includes("components/ui/Button")) {
    return null
  }

  let out = content.replace(
    IMPORT_RE,
    "import { MockBtn } from '@/components/mock-ui'"
  )

  // Fallback: type ButtonProps only
  out = out.replace(
    /import\s*\{\s*type\s+ButtonProps\s*\}\s*from\s*['"]@\/components\/ui\/Button['"]/g,
    "import { type MockBtnProps } from '@/components/mock-ui'"
  )
  out = out.replace(/\bButtonProps\b/g, (m, offset, s) => {
    // only if we already switched this file's import
    if (s.includes("MockBtnProps") || s.includes("from '@/components/mock-ui'")) {
      return m === 'ButtonProps' && s.slice(Math.max(0, offset - 20), offset).includes('type ')
        ? 'MockBtnProps'
        : m === 'ButtonProps'
          ? 'MockBtnProps'
          : m
    }
    return m
  })

  // Opening tags (no nested < in attrs that we'd break — typical Button usage)
  out = out.replace(/<Button\b[^>]*>/g, (tag) => {
    if (tag.endsWith('/>')) {
      return transformOpeningTag(tag.slice(0, -2)) + '/>'
    }
    return transformOpeningTag(tag)
  })

  out = out.replace(/<\/Button>/g, '</MockBtn>')

  return out === content ? null : out
}

let changed = 0
for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  if (rel === 'src/components/ui/Button.tsx') continue
  const raw = fs.readFileSync(file, 'utf8')
  const next = transformFile(raw)
  if (next == null) continue
  fs.writeFileSync(file, next)
  changed++
  console.log('updated', rel)
}

console.log(`\nCodemod fertig: ${changed} Datei(en)`)
