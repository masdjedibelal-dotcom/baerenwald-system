#!/usr/bin/env node
/**
 * Codemod: toast.error(...message) → toast.systemError(...)
 * und portalToastError mit .message → portalToastSystemError
 *
 * Usage: node scripts/codemod-toast-system-error.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SRC = join(ROOT, 'src')

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p)
  }
  return out
}

let changedFiles = 0
let replacements = 0

for (const file of walk(SRC)) {
  let t = readFileSync(file, 'utf8')
  const orig = t

  // toast.error(x.message) / toast.error(res.message || ...) / toast.error(e?.message ?? ...)
  // Conservative: only when arg is primarily a .message expression
  t = t.replace(
    /toast\.error\(\s*((?:await\s+)?[\w.$?\[\]'"]+\.message(?:\s*(\|\||\?\?)\s*[^)]+)?)\s*\)/g,
    (m, expr) => {
      replacements++
      // If it's `res.message || 'fallback'` → toast.systemError(res, 'ui', 'fallback') roughly
      const orMatch = expr.match(/^([\w.$?\[\]'"]+)\.message\s*(?:\|\||\?\?)\s*(.+)$/)
      if (orMatch) {
        const obj = orMatch[1]
        const fb = orMatch[2].trim()
        return `toast.systemError(${obj}, 'ui', ${fb})`
      }
      const obj = expr.replace(/\.message\s*$/, '').trim()
      return `toast.systemError(${obj})`
    }
  )

  // toast.error(userMessage(...)) stay as toast.error — or leave

  // portalToastError(something.message) / portalToastError(TOAST.x, err.message)
  t = t.replace(
    /portalToastError\(\s*([\w.$?\[\]'"]+)\.message\s*\)/g,
    (m, obj) => {
      replacements++
      return `portalToastSystemError(${obj})`
    }
  )

  if (t !== orig) {
    // Ensure imports
    if (t.includes('portalToastSystemError') && !t.includes('portalToastSystemError') === false) {
      if (!/portalToastSystemError/.test(orig) && /from ['"]@\/lib\/shared\/portal-toast['"]/.test(t)) {
        t = t.replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]@\/lib\/shared\/portal-toast['"]/,
          (im, names) => {
            if (names.includes('portalToastSystemError')) return im
            return `import {${names.replace(/\s*$/, '')}, portalToastSystemError } from '@/lib/shared/portal-toast'`
          }
        )
      }
    }
    changedFiles++
    if (!DRY) writeFileSync(file, t)
    console.log(DRY ? `[dry] ${file}` : `updated ${file}`)
  }
}

console.log(`done: ${changedFiles} files, ~${replacements} replacements${DRY ? ' (dry)' : ''}`)
