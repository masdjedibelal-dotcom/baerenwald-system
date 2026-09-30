#!/usr/bin/env node
/**
 * Design-Fundament (30.09.2026): Radien, Schriftstärken und kurze Übergänge nur über Grund-Werte.
 * - border-radius: nur var(--r-*), 0, 50%, inherit
 * - font-weight: nur 400 · 500 · 600 (bzw. normal/inherit)
 * - transition/animation ≤ 400 ms: nur var(--dur-fast) / var(--dur)
 * - box-shadow mit Unschärfe: nur var(--sh-1|--sh-2|--sh-3|--sh-up)
 * Neue freie Werte brechen den Build — so wuchert es nicht wieder.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const files = []
function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.css')) files.push(p)
  }
}
walk(join(ROOT, 'src'))

const funde = []
for (const f of files) {
  const t = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const lineOf = (i) => t.slice(0, i).split('\n').length
  for (const m of t.matchAll(/border(?:-(?:top|bottom)-(?:left|right))?-radius:\s*([^;}]+)/g)) {
    const teile = m[1].match(/var\([^)]*\)|\S+/g) ?? []
    const bad = teile.filter((v) => !/^(0|50%|inherit|!important|var\(--r(?:-[a-z]+)?(?:,[^)]*)?\))$/.test(v))
    if (bad.length) funde.push(`${f}:${lineOf(m.index)} Radius ${m[1].trim()}`)
  }
  for (const m of t.matchAll(/(?<![-\w])box-shadow:\s*([^;}]+)/g)) {
    // Farben/Variablen entfernen, dann jede Schicht einzeln: x y blur — blur > 0 ohne inset = freier Schatten
    const ohne = m[1]
      .replace(/(?:var|rgba?|color-mix|hsla?)\((?:[^()]|\([^()]*\))*\)/g, '')
      .replace(/#[0-9a-fA-F]+/g, '')
      .replace(/!important/g, '')
    const frei = ohne.split(',').some((layer) => {
      if (/inset/.test(layer)) return false
      const n = layer.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
      return n.length >= 3 && n[2] > 0
    })
    if (frei) funde.push(`${f}:${lineOf(m.index)} Schatten ${m[1].trim()} → var(--sh-1|2|3)`)
  }
  for (const m of t.matchAll(/font-weight:\s*(\d{3})/g)) {
    if (!['400', '500', '600'].includes(m[1])) funde.push(`${f}:${lineOf(m.index)} Schriftstärke ${m[1]}`)
  }
  for (const m of t.matchAll(/(?:transition(?:-duration)?|animation(?:-duration)?):([^;{}]+)/g)) {
    if (m[1].includes('infinite')) continue
    for (const d of m[1].matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) {
      const ms = Number(d[1]) * (d[2] === 's' ? 1000 : 1)
      if (ms > 0 && ms <= 400) funde.push(`${f}:${lineOf(m.index)} Dauer ${d[0]} → var(--dur-fast|--dur)`)
    }
  }
}

if (funde.length) {
  console.error(`Design-Grundwerte verletzt (${funde.length}):`)
  for (const x of funde.slice(0, 40)) console.error('  ' + x)
  process.exit(1)
}
console.log(`OK: Design-Grundwerte eingehalten (${files.length} CSS-Dateien)`)
