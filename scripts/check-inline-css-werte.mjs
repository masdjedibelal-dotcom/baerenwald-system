#!/usr/bin/env node
/**
 * Guard: kaputte Inline-CSS-Werte in .ts/.tsx (z. B. remrem, 0.0.3125).
 * Verhindert stille Browser-Verwerfung von Padding/Rahmen.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const CSS_PROPS = new Set([
  'border',
  'borderTop',
  'borderBottom',
  'borderLeft',
  'borderRight',
  'borderRadius',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'gap',
  'rowGap',
  'columnGap',
  'fontSize',
  'lineHeight',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'top',
  'left',
  'right',
  'bottom',
  'inset',
  'flexBasis',
  'letterSpacing',
  'boxShadow',
])

/** Props die Längen mit Einheit brauchen (außer 0). lineHeight darf unitless sein. */
const LENGTH_PROPS = new Set([
  'borderRadius',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'gap',
  'rowGap',
  'columnGap',
  'fontSize',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'top',
  'left',
  'right',
  'bottom',
  'inset',
  'flexBasis',
  'letterSpacing',
])

const KNOWN_UNITS =
  /^(px|rem|em|%|vh|vw|dvh|svh|lvh|ch|fr|mm|cm|in|pt|pc|s|ms|deg|rad|turn|vmin|vmax)$/i

const LENGTH_TOKEN = /-?\d+(?:\.\d+)?[a-z%]*/gi

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function expandTemplate(raw) {
  // Platzhalter ohne Einheit — damit `${x}%` → `1%` gültig bleibt
  return raw.replace(/\$\{[^}]*\}/g, '1')
}

function checkValue(prop, raw, rel, line) {
  const issues = []
  const expanded = expandTemplate(raw)

  if (/(?:remrem|pxpx|emem|%%)/i.test(expanded)) {
    issues.push({ rel, line, prop, raw, reason: 'doppelter Einheitensuffix' })
  }
  if (/\d+\.\d+\.\d+/.test(expanded)) {
    issues.push({ rel, line, prop, raw, reason: 'mehrere Dezimalpunkte in Zahl' })
  }

  const open = (expanded.match(/\(/g) || []).length
  const close = (expanded.match(/\)/g) || []).length
  if (open !== close) {
    issues.push({ rel, line, prop, raw, reason: 'unbalancierte Klammern' })
  }

  if (LENGTH_PROPS.has(prop)) {
    // Funktionen raus — darin liegen oft unitless Multiplikatoren (calc(1 * …) selten)
    const stripped = expanded.replace(
      /(?:calc|var|min|max|clamp|env|color-mix|rgb|rgba|hsl|hsla)\([^)]*\)/gi,
      ' '
    )
    LENGTH_TOKEN.lastIndex = 0
    let m
    while ((m = LENGTH_TOKEN.exec(stripped))) {
      const tok = m[0]
      const numMatch = tok.match(/^(-?\d+(?:\.\d+)?)(.*)$/)
      if (!numMatch) continue
      const [, num, unit] = numMatch
      if (num === '0' && !unit) continue
      if (!unit) {
        issues.push({
          rel,
          line,
          prop,
          raw,
          reason: `Zahl ohne Einheit (${num})`,
        })
        continue
      }
      if (!KNOWN_UNITS.test(unit)) {
        issues.push({
          rel,
          line,
          prop,
          raw,
          reason: `unbekannte Einheit (${unit})`,
        })
      }
    }
  }

  return issues
}

/** Nur style-Objekte: style={{ … }} / style: { … } */
function extractStyleObjects(content) {
  const blocks = []
  const re = /\bstyle\s*=\s*\{\{|\bstyle\s*:\s*\{/g
  let m
  while ((m = re.exec(content))) {
    let braceStart = m.index
    while (braceStart < content.length && content[braceStart] !== '{') braceStart += 1
    // style={{ → innere Objekt-Klammer
    if (content.slice(m.index, m.index + 12).includes('={{')) {
      braceStart = content.indexOf('{', braceStart + 1)
    }
    if (braceStart < 0) continue
    let depth = 0
    let i = braceStart
    for (; i < content.length; i += 1) {
      const c = content[i]
      if (c === '{') depth += 1
      else if (c === '}') {
        depth -= 1
        if (depth === 0) {
          i += 1
          break
        }
      }
    }
    blocks.push({ start: braceStart, end: i, text: content.slice(braceStart, i) })
  }
  return blocks
}

const propAssignRe =
  /\b([A-Za-z]+)\s*:\s*(?:'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`)/g

const violations = []

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  const content = fs.readFileSync(file, 'utf8')
  for (const block of extractStyleObjects(content)) {
    propAssignRe.lastIndex = 0
    let m
    while ((m = propAssignRe.exec(block.text))) {
      const prop = m[1]
      if (!CSS_PROPS.has(prop)) continue
      const raw = m[2] ?? m[3] ?? m[4] ?? ''
      const absIndex = block.start + m.index
      const line = content.slice(0, absIndex).split('\n').length
      violations.push(...checkValue(prop, raw, rel, line))
    }
  }
}

if (violations.length) {
  console.error('Inline-CSS-Werte-Check fehlgeschlagen:')
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  [${v.prop}] ${v.reason} → ${JSON.stringify(v.raw)}`)
  }
  console.error(`\n${violations.length} Fund(e).`)
  process.exit(1)
}

console.log('OK: Inline-CSS-Werte (kein remrem / kaputte Einheiten)')
