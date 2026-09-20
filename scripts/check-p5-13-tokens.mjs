#!/usr/bin/env node
/** P5-13: Fehler wenn Tailwind-Standardfarben oder Hex-in-class in src ts/tsx. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src')
const TW = /\b(?:bg|text|border|ring)-(?:red|green|blue|gray|slate|zinc|amber|yellow|emerald|indigo|orange|rose|pink|purple|violet|cyan|sky|lime|teal|neutral|stone|fuchsia)-\d{2,3}\b/g
const HEX = /\[#[0-9a-fA-F]{3,8}\]/g

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

let hits = 0
for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8')
  const tw = src.match(TW) || []
  const hx = src.match(HEX) || []
  if (tw.length || hx.length) {
    hits += tw.length + hx.length
    console.error(`[P5-13] ${relative(process.cwd(), file)}: tw=${tw.length} hex=${hx.length}`)
  }
}
if (hits) {
  console.error(`\n[P5-13] ${hits} Treffer — nur CRM-Tokens (bw-*/status-*/danger/muted/warning).`)
  process.exit(1)
}
console.log('[P5-13] ok')
process.exit(0)
