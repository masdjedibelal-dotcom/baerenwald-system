#!/usr/bin/env node
/**
 * P5-19: text-[Npx] → text-fs-*; rounded(-sm|md|lg|…) → rounded-{card|button|field|pill|sheet}
 * Usage: node scripts/codemod-p5-19-text-rounded.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SRC = join(ROOT, 'src')

/** CRM: 10/11→caption, 12→meta, 13→text, 14–16→title, ≥17→head */
function mapTextPx(n) {
  if (n <= 11) return 'text-fs-caption'
  if (n <= 12) return 'text-fs-meta'
  if (n <= 13) return 'text-fs-text'
  if (n <= 16) return 'text-fs-title'
  return 'text-fs-head'
}

/** Heuristik Elementtyp aus Klassenkontext (Zeile / className-String). */
function mapRounded(token, ctx) {
  const c = ctx.toLowerCase()
  if (token === 'rounded-full' || /\b(pill|chip|badge|tag|avatar|dot)\b/.test(c)) return 'rounded-pill'
  if (/\b(sheet|drawer|modal|dialog|panel-pop)\b/.test(c)) return 'rounded-sheet'
  if (/\b(btn|button|mockbtn)\b/.test(c)) return 'rounded-button'
  if (/\b(input|select|textarea|field|mockfield|control)\b/.test(c)) return 'rounded-field'
  if (token === 'rounded-xl' || token === 'rounded-2xl' || token === 'rounded-3xl') return 'rounded-sheet'
  if (token === 'rounded-sm' || token === 'rounded-md') return 'rounded-field'
  if (token === 'rounded-lg' || token === 'rounded') return 'rounded-card'
  return 'rounded-card'
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(p)
  }
  return out
}

const TEXT_RE = /text-\[(\d+(?:\.\d+)?)px\]/g
/** Nur Tailwind-Klassen: nicht `rounded: true` / Object-Keys */
const ROUNDED_RE =
  /(?<=["'`\s])rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?(?=["'`\s])(?!\s*=)/g
const ALLOWED_ROUNDED = new Set([
  'rounded-card',
  'rounded-button',
  'rounded-field',
  'rounded-pill',
  'rounded-sheet',
])

let textHits = 0
let roundedHits = 0
let filesChanged = 0

for (const file of walk(SRC)) {
  let src = readFileSync(file, 'utf8')
  const orig = src

  if (/\.(tsx|ts)$/.test(file)) {
    src = src.replace(TEXT_RE, (_, n) => {
      textHits++
      return mapTextPx(Number(n))
    })

    let out = ''
    let last = 0
    ROUNDED_RE.lastIndex = 0
    let m
    while ((m = ROUNDED_RE.exec(src))) {
      const tok = m[0]
      if (ALLOWED_ROUNDED.has(tok)) continue
      const start = Math.max(0, m.index - 80)
      const end = Math.min(src.length, m.index + tok.length + 80)
      const ctx = src.slice(start, end)
      const repl = mapRounded(tok, ctx)
      out += src.slice(last, m.index) + repl
      last = m.index + tok.length
      roundedHits++
    }
    out += src.slice(last)
    src = out
  }

  if (/\.css$/.test(file) && !/\/globals\.css$/.test(file)) {
    // font-size: Npx → var(--fs-*) — globals.css = Token-Quelle
    src = src.replace(/(?<!calc\()font-size:\s*(\d+(?:\.\d+)?)px\b/g, (full, nStr) => {
      const n = Number(nStr)
      textHits++
      let tok = '--fs-text'
      if (n <= 11) tok = '--fs-caption'
      else if (n <= 12) tok = '--fs-meta'
      else if (n <= 14) tok = '--fs-text'
      else if (n <= 17) tok = '--fs-title'
      else tok = '--fs-head'
      return `font-size: var(${tok})`
    })
  }

  if (src !== orig) {
    filesChanged++
    if (!DRY) writeFileSync(file, src)
    console.log(`${DRY ? '[dry] ' : ''}${relative(ROOT, file)}`)
  }
}

console.log(`text/fs hits≈${textHits} rounded≈${roundedHits} files=${filesChanged}${DRY ? ' (dry)' : ''}`)
