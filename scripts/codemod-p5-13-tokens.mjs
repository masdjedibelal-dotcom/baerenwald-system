#!/usr/bin/env node
/**
 * P5-13: Tailwind-Standardfarben + Hex-in-class zu CRM-Tokens.
 * String-Ersatz in src ts/tsx — kein Verhaltenswechsel.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'src')

/** Reihenfolge: spezifischere Muster zuerst */
const TW_REPLACEMENTS = [
  // red → danger / cancel
  [/bg-red-50\b/g, 'bg-status-cancel-bg'],
  [/bg-red-100\b/g, 'bg-status-cancel-bg'],
  [/bg-red-200\b/g, 'bg-status-cancel-bg'],
  [/text-red-500\b/g, 'text-danger'],
  [/text-red-600\b/g, 'text-danger'],
  [/text-red-700\b/g, 'text-danger'],
  [/text-red-800\b/g, 'text-status-cancel-text'],
  [/text-red-900\b/g, 'text-status-cancel-text'],
  [/border-red-200\b/g, 'border-status-cancel-bg'],
  [/border-red-300\b/g, 'border-status-cancel-bg'],
  [/border-red-500\b/g, 'border-danger'],
  [/border-red-600\b/g, 'border-danger'],
  // emerald / green → success / order
  [/bg-emerald-50\b/g, 'bg-status-order-bg'],
  [/bg-emerald-100\b/g, 'bg-status-order-bg'],
  [/bg-emerald-200\b/g, 'bg-status-order-bg'],
  [/text-emerald-700\b/g, 'text-status-order-text'],
  [/text-emerald-800\b/g, 'text-status-order-text'],
  [/text-emerald-900\b/g, 'text-status-order-text'],
  [/text-emerald-950\b/g, 'text-status-order-text'],
  [/text-emerald-600\b/g, 'text-bw-success'],
  [/bg-emerald-500\b/g, 'bg-bw-success'],
  [/bg-emerald-600\b/g, 'bg-bw-success'],
  [/border-emerald-200\b/g, 'border-status-order-bg'],
  [/border-emerald-300\b/g, 'border-status-order-bg'],
  [/border-emerald-500\b/g, 'border-bw-success'],
  [/bg-green-50\b/g, 'bg-bw-green-bg'],
  [/bg-green-100\b/g, 'bg-status-order-bg'],
  [/bg-green-200\b/g, 'bg-status-order-bg'],
  [/bg-green-500\b/g, 'bg-bw-success'],
  [/bg-green-600\b/g, 'bg-bw-success'],
  [/text-green-600\b/g, 'text-bw-success'],
  [/text-green-700\b/g, 'text-status-order-text'],
  [/text-green-800\b/g, 'text-status-order-text'],
  [/text-green-900\b/g, 'text-status-order-text'],
  [/border-green-200\b/g, 'border-status-order-bg'],
  [/border-green-300\b/g, 'border-status-order-bg'],
  [/border-green-500\b/g, 'border-bw-success'],
  [/border-green-600\b/g, 'border-bw-success'],
  // amber / yellow → contact / warning
  [/bg-amber-50\b/g, 'bg-status-contact-bg'],
  [/bg-amber-100\b/g, 'bg-status-contact-bg'],
  [/bg-amber-200\b/g, 'bg-status-contact-bg'],
  [/bg-amber-500\b/g, 'bg-status-contact-bg'],
  [/text-amber-700\b/g, 'text-status-contact-text'],
  [/text-amber-800\b/g, 'text-status-contact-text'],
  [/text-amber-900\b/g, 'text-status-contact-text'],
  [/text-amber-950\b/g, 'text-status-contact-text'],
  [/text-amber-600\b/g, 'text-warning'],
  [/border-amber-200\b/g, 'border-status-contact-bg'],
  [/border-amber-300\b/g, 'border-status-contact-bg'],
  [/border-amber-400\b/g, 'border-status-contact-bg'],
  [/bg-yellow-50\b/g, 'bg-status-contact-bg'],
  [/bg-yellow-100\b/g, 'bg-status-contact-bg'],
  [/text-yellow-700\b/g, 'text-status-contact-text'],
  [/text-yellow-800\b/g, 'text-status-contact-text'],
  [/text-yellow-900\b/g, 'text-status-contact-text'],
  [/border-yellow-200\b/g, 'border-status-contact-bg'],
  [/border-yellow-300\b/g, 'border-status-contact-bg'],
  // blue → new
  [/bg-blue-50\b/g, 'bg-status-new-bg'],
  [/bg-blue-100\b/g, 'bg-status-new-bg'],
  [/bg-blue-200\b/g, 'bg-status-new-bg'],
  [/text-blue-600\b/g, 'text-status-new-text'],
  [/text-blue-700\b/g, 'text-status-new-text'],
  [/text-blue-800\b/g, 'text-status-new-text'],
  [/text-blue-900\b/g, 'text-status-new-text'],
  [/text-blue-950\b/g, 'text-status-new-text'],
  [/border-blue-200\b/g, 'border-status-new-bg'],
  [/border-blue-300\b/g, 'border-status-new-bg'],
  [/border-blue-500\b/g, 'border-status-new-text'],
  // gray / slate / zinc → muted / done
  [/bg-gray-50\b/g, 'bg-bw-bg-soft'],
  [/bg-gray-100\b/g, 'bg-status-done-bg'],
  [/bg-gray-200\b/g, 'bg-status-done-bg'],
  [/text-gray-400\b/g, 'text-bw-text-subtle'],
  [/text-gray-500\b/g, 'text-muted'],
  [/text-gray-600\b/g, 'text-bw-text-muted'],
  [/text-gray-700\b/g, 'text-bw-text-mid'],
  [/text-gray-800\b/g, 'text-bw-text'],
  [/text-gray-900\b/g, 'text-bw-text'],
  [/border-gray-200\b/g, 'border-bw-border'],
  [/border-gray-300\b/g, 'border-bw-border-strong'],
  [/bg-slate-50\b/g, 'bg-bw-bg-soft'],
  [/bg-slate-100\b/g, 'bg-status-done-bg'],
  [/text-slate-500\b/g, 'text-muted'],
  [/text-slate-600\b/g, 'text-bw-text-muted'],
  [/text-slate-700\b/g, 'text-bw-text-mid'],
  [/text-slate-800\b/g, 'text-bw-text'],
  [/border-slate-200\b/g, 'border-bw-border'],
  [/bg-zinc-50\b/g, 'bg-bw-bg-soft'],
  [/bg-zinc-100\b/g, 'bg-status-done-bg'],
  [/bg-zinc-900\b/g, 'bg-bw-dark'],
  [/text-zinc-500\b/g, 'text-muted'],
  [/text-zinc-600\b/g, 'text-bw-text-muted'],
  [/text-zinc-700\b/g, 'text-bw-text-mid'],
  [/border-zinc-200\b/g, 'border-bw-border'],
  [/border-zinc-900\b/g, 'border-bw-dark'],
  // indigo → new (info)
  [/bg-indigo-50\b/g, 'bg-status-new-bg'],
  [/bg-indigo-100\b/g, 'bg-status-new-bg'],
  [/text-indigo-600\b/g, 'text-status-new-text'],
  [/text-indigo-700\b/g, 'text-status-new-text'],
  [/text-indigo-800\b/g, 'text-status-new-text'],
  [/border-indigo-200\b/g, 'border-status-new-bg'],
  // orange → warning / contact
  [/bg-orange-50\b/g, 'bg-status-contact-bg'],
  [/bg-orange-100\b/g, 'bg-status-contact-bg'],
  [/text-orange-600\b/g, 'text-warning'],
  [/text-orange-700\b/g, 'text-status-contact-text'],
  [/text-orange-800\b/g, 'text-status-contact-text'],
  [/text-orange-900\b/g, 'text-status-contact-text'],
  [/text-orange-950\b/g, 'text-status-contact-text'],
  [/border-orange-200\b/g, 'border-status-contact-bg'],
  [/border-orange-300\b/g, 'border-status-contact-bg'],
  // sky → new
  [/bg-sky-50\b/g, 'bg-status-new-bg'],
  [/bg-sky-100\b/g, 'bg-status-new-bg'],
  [/text-sky-700\b/g, 'text-status-new-text'],
  [/text-sky-800\b/g, 'text-status-new-text'],
  [/text-sky-900\b/g, 'text-status-new-text'],
  [/text-sky-950\b/g, 'text-status-new-text'],
  [/border-sky-200\b/g, 'border-status-new-bg'],
  [/border-sky-300\b/g, 'border-status-new-bg'],
  // violet / purple → new
  [/bg-violet-50\b/g, 'bg-status-new-bg'],
  [/bg-violet-100\b/g, 'bg-status-new-bg'],
  [/text-violet-700\b/g, 'text-status-new-text'],
  [/text-violet-800\b/g, 'text-status-new-text'],
  [/text-violet-900\b/g, 'text-status-new-text'],
  [/text-violet-950\b/g, 'text-status-new-text'],
  [/border-violet-200\b/g, 'border-status-new-bg'],
  [/border-violet-300\b/g, 'border-status-new-bg'],
  [/bg-purple-50\b/g, 'bg-status-new-bg'],
  [/bg-purple-100\b/g, 'bg-status-new-bg'],
  [/text-purple-500\b/g, 'text-status-new-text'],
  [/text-purple-600\b/g, 'text-status-new-text'],
  [/text-purple-700\b/g, 'text-status-new-text'],
  [/text-purple-800\b/g, 'text-status-new-text'],
  [/border-purple-200\b/g, 'border-status-new-bg'],
  // ring
  [/ring-amber-300\b/g, 'ring-status-contact-bg'],
  [/ring-amber-200\b/g, 'ring-status-contact-bg'],
  [/ring-red-300\b/g, 'ring-status-cancel-bg'],
  [/ring-green-300\b/g, 'ring-status-order-bg'],
  [/ring-blue-300\b/g, 'ring-status-new-bg'],
]

/** Häufige Marken-/UI-Hex → Tokens */
const HEX_REPLACEMENTS = [
  [/bg-\[#[0-9a-fA-F]*2[Ee]7[Dd]52\]/g, 'bg-bw-primary'],
  [/text-\[#[0-9a-fA-F]*2[Ee]7[Dd]52\]/g, 'text-bw-primary'],
  [/border-\[#[0-9a-fA-F]*2[Ee]7[Dd]52\]/g, 'border-bw-primary'],
  [/border-l-\[#[0-9a-fA-F]*2[Ee]7[Dd]52\]/g, 'border-l-bw-primary'],
  [/bg-\[#1[Aa]3[Dd]2[Bb]\]/g, 'bg-bw-dark'],
  [/text-\[#1[Aa]3[Dd]2[Bb]\]/g, 'text-bw-dark'],
  [/border-\[#1[Aa]3[Dd]2[Bb]\]/g, 'border-bw-dark'],
  [/bg-\[#1[Bb]4332\]/gi, 'bg-bw-dark'],
  [/text-\[#1[Bb]4332\]/gi, 'text-bw-dark'],
  [/bg-\[#16201[Bb]\]/gi, 'bg-bw-dark'],
  [/text-\[#16201[Bb]\]/gi, 'text-bw-dark'],
  [/bg-\[#153222\]/gi, 'bg-bw-dark'],
  [/bg-\[#0[Ff]2818\]/gi, 'bg-bw-dark'],
  [/bg-\[#[Ee]5[Ee]3[Dd][Ff]\]/gi, 'bg-bw-bg-soft'],
  [/border-\[#[Ee]5[Ee]3[Dd][Ff]\]/gi, 'border-bw-border'],
  [/bg-\[#[Ee][Aa][Ff]3[Dd][Ee]\]/gi, 'bg-bw-green-bg'],
  [/bg-\[#[Ee][Ee][Ff]3[Ee][Cc]\]/gi, 'bg-bw-green-bg'],
  [/bg-\[#[Ee]8[Ee][Ee][Ee]9\]/gi, 'bg-bw-green-bg'],
  [/bg-\[#[Ee]2[Ee]8[Ee]2\]/gi, 'bg-bw-green-bg'],
  [/bg-\[#[Ff]7[Ff]6[Ff]3\]/gi, 'bg-bw-bg-soft'],
  [/bg-\[#[Ff]3[Ff]4[Ff]6\]/gi, 'bg-bw-bg-soft'],
  [/bg-\[#[Ee]8[Ff]5[Ee]9\]/gi, 'bg-bw-green-bg'],
  [/bg-\[#[Ee]6[Ff]1[Ff][Bb]\]/gi, 'bg-status-new-bg'],
  [/text-\[#6[Bb]7280\]/gi, 'text-muted'],
  [/text-\[#9[Cc][Aa]3[Aa][Ff]\]/gi, 'text-bw-text-subtle'],
  [/text-\[#4[Bb]5563\]/gi, 'text-bw-text-mid'],
  [/text-\[#4a5c54\]/gi, 'text-bw-text-mid'],
  [/border-\[#[Dd]1[Dd]5[Dd][Bb]\]/gi, 'border-bw-border-strong'],
  [/border-\[#[Bb]8[Dd]4[Cc]4\]/gi, 'border-status-order-bg'],
  [/text-\[#185[Ff][Aa]5\]/gi, 'text-status-new-text'],
  [/bg-\[#7[Cc]5[Cc][Ff][Cc]\]/gi, 'bg-status-new-bg'],
  [/text-\[#7[Cc]5[Cc][Ff][Cc]\]/gi, 'text-status-new-text'],
  [/border-\[#7[Cc]5[Cc][Ff][Cc]\]/gi, 'border-status-new-text'],
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

let changed = 0
for (const file of walk(root)) {
  let src = readFileSync(file, 'utf8')
  const before = src
  for (const [re, to] of TW_REPLACEMENTS) src = src.replace(re, to)
  for (const [re, to] of HEX_REPLACEMENTS) src = src.replace(re, to)
  if (src !== before) {
    writeFileSync(file, src)
    changed++
    console.log('updated', file.replace(process.cwd() + '/', ''))
  }
}
console.log(`\nP5-13 codemod: ${changed} files`)
