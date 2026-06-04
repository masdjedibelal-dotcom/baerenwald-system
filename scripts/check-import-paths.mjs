#!/usr/bin/env node
/**
 * Find @/ imports whose path casing does not match the filesystem (Linux/Netlify).
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
    else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function resolveImport(imp) {
  if (!imp.startsWith('@/')) return null
  const rel = imp.slice(2)
  const base = path.join(srcDir, rel)
  for (const ext of ['.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
    const full = ext.startsWith('/') ? base + ext : base + ext
    if (fs.existsSync(full)) return { full, ok: true }
  }
  const dir = base
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    for (const ext of ['/index.tsx', '/index.ts']) {
      if (fs.existsSync(dir + ext)) return { full: dir + ext, ok: true }
    }
  }
  return { full: base, ok: false }
}

function dirListingForHint(basePath) {
  const dir = path.dirname(basePath)
  const base = path.basename(basePath)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().includes(base.toLowerCase().slice(0, 4)) || f.replace(/\.[^.]+$/, '') === base)
    .slice(0, 5)
}

const importRe = /from\s+['"](@\/[^'"]+)['"]/g
const files = walk(srcDir)
const broken = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  let m
  while ((m = importRe.exec(text))) {
    const imp = m[1]
    const r = resolveImport(imp)
    if (r && !r.ok) {
      broken.push({ file: path.relative(root, file), import: imp, hints: dirListingForHint(r.full) })
    }
  }
}

if (broken.length) {
  console.error('Broken imports (case/path mismatch):', broken.length)
  for (const b of broken) {
    console.error(`  ${b.file}\n    ${b.import}\n    hints: ${b.hints.join(', ') || '—'}`)
  }
  process.exit(1)
}
console.log('OK: all @/ imports resolve on disk (' + files.length + ' files checked)')
