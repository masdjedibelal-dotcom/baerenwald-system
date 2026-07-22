#!/usr/bin/env node
/**
 * Find @/ imports whose path casing does not match the filesystem (Linux/Netlify).
 * Uses readdir exact-name matching — fs.existsSync alone is case-insensitive on macOS.
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

/** Resolve @/ import with exact casing (Linux-safe). */
function resolveImportCaseSensitive(imp) {
  if (!imp.startsWith('@/')) return { ok: true }
  const parts = imp.slice(2).split('/')
  let cur = srcDir

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!fs.existsSync(cur)) {
      return { ok: false, at: path.relative(root, cur), want: part, hints: [] }
    }

    const entries = fs.readdirSync(cur)
    const isLast = i === parts.length - 1

    if (isLast) {
      for (const ext of ['', '.tsx', '.ts', '.jsx', '.js']) {
        const name = part + ext
        if (entries.includes(name)) {
          return { ok: true, full: path.join(cur, name) }
        }
      }
      if (entries.includes(part) && fs.statSync(path.join(cur, part)).isDirectory()) {
        const sub = fs.readdirSync(path.join(cur, part))
        for (const idx of ['index.tsx', 'index.ts']) {
          if (sub.includes(idx)) return { ok: true, full: path.join(cur, part, idx) }
        }
      }
      const hints = entries.filter(
        (e) =>
          e.replace(/\.[^.]+$/, '').toLowerCase() === part.toLowerCase() ||
          e.toLowerCase() === `${part.toLowerCase()}.tsx`
      )
      return { ok: false, at: path.relative(root, cur), want: part, hints: hints.slice(0, 5) }
    }

    if (!entries.includes(part)) {
      const hints = entries.filter((e) => e.toLowerCase() === part.toLowerCase())
      return { ok: false, at: path.relative(root, cur), want: part, hints: hints.slice(0, 5) }
    }
    cur = path.join(cur, part)
  }

  return { ok: true }
}

function checkTsconfigPaths() {
  const tsconfigPath = path.join(root, 'tsconfig.json')
  if (!fs.existsSync(tsconfigPath)) {
    return ['tsconfig.json fehlt (Webpack kann @/ nicht auflösen)']
  }
  const raw = fs.readFileSync(tsconfigPath, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return ['tsconfig.json ist kein gültiges JSON']
  }
  const errors = []
  if (!parsed.compilerOptions?.baseUrl) {
    errors.push('tsconfig.json: "compilerOptions.baseUrl" fehlt (Pfad-Alias @/ bricht auf Linux)')
  }
  const paths = parsed.compilerOptions?.paths?.['@/*']
  if (!paths?.length) {
    errors.push('tsconfig.json: "compilerOptions.paths[\"@/*\"]" fehlt')
  }
  return errors
}

const importRe = /from\s+['"](@\/[^'"]+)['"]/g
const files = walk(srcDir)
const broken = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  let m
  while ((m = importRe.exec(text))) {
    const imp = m[1]
    const r = resolveImportCaseSensitive(imp)
    if (!r.ok) {
      broken.push({
        file: path.relative(root, file),
        import: imp,
        at: r.at,
        want: r.want,
        hints: r.hints,
      })
    }
  }
}

const tsconfigErrors = checkTsconfigPaths()

if (tsconfigErrors.length) {
  console.error('tsconfig path alias problems:', tsconfigErrors.length)
  for (const e of tsconfigErrors) console.error(`  ${e}`)
}

if (broken.length) {
  console.error('Broken imports (case/path mismatch):', broken.length)
  for (const b of broken) {
    const hint =
      b.hints?.length ?
        ` → on disk: ${b.hints.join(', ')}`
      : ''
    console.error(`  ${b.file}\n    ${b.import} (in ${b.at}/, want "${b.want}"${hint})`)
  }
}

if (tsconfigErrors.length || broken.length) process.exit(1)
console.log('OK: all @/ imports resolve on disk (' + files.length + ' files checked)')
