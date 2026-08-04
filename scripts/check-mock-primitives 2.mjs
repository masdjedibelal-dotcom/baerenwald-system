#!/usr/bin/env node
/**
 * Build-Check: Keine Alt-Primitive (btn-*, DetailCollapsibleCard).
 * StatusBadge ist Spec §11 / Phase 1 kanonisch (wrappt MockBadge) — erlaubt.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const guardRel = 'scripts/check-mock-primitives.mjs'

const FORBIDDEN = [
  { id: 'btn-primary', re: /\bbtn-primary\b/g },
  { id: 'btn-ghost', re: /\bbtn-ghost\b/g },
  { id: 'btn-secondary', re: /\bbtn-secondary\b/g },
  { id: 'btn-danger', re: /\bbtn-danger\b/g },
  { id: 'btn-sm', re: /\bbtn-sm\b/g },
  { id: 'btn-lg', re: /\bbtn-lg\b/g },
  { id: 'chip.selected', re: /\bchip(?:\s+|-)selected\b|\.chip\.selected\b/g },
  { id: 'detail-section-card', re: /\bdetail-section-card\b/g },
  { id: 'DetailCollapsibleCard', re: /\bDetailCollapsibleCard\b/g },
]

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts|css)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function isAllowed(rel) {
  if (rel === guardRel) return true
  if (rel.startsWith('docs/')) return true
  return false
}

const violations = []

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  if (isAllowed(rel)) continue
  const content = fs.readFileSync(file, 'utf8')
  for (const rule of FORBIDDEN) {
    rule.re.lastIndex = 0
    let m
    while ((m = rule.re.exec(content))) {
      const line = content.slice(0, m.index).split('\n').length
      violations.push({ rel, line, rule: rule.id, snippet: content.split('\n')[line - 1]?.trim().slice(0, 100) })
    }
  }
}

if (violations.length) {
  console.error('Mock-Primitive-Check fehlgeschlagen:')
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  [${v.rule}]  ${v.snippet}`)
  }
  console.error(`\n${violations.length} Fund(e). Siehe docs/DESIGN-CSS.md`)
  process.exit(1)
}

console.log('OK: Mock-Primitive-Guard (btn/card/badge, keine Alt-Klassen)')
