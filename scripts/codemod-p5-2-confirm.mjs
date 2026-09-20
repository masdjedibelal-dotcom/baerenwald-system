#!/usr/bin/env node
/**
 * P5-2: confirmDelete → openDeleteConfirm, confirmAction → openActionConfirm;
 * Provider → ConfirmPopupHost; Helfer-Dateien werden danach gelöscht.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), 'src')

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

function transform(src) {
  let s = src
  const before = s

  // --- Imports confirm-delete ---
  s = s.replace(
    /import\s*\{\s*confirmDelete\s*\}\s*from\s*['"]@\/components\/ui\/confirm-delete['"]\s*;?\s*\n?/g,
    "import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'\n"
  )
  s = s.replace(
    /import\s*\{\s*ConfirmDeleteProvider\s*\}\s*from\s*['"]@\/components\/ui\/confirm-delete['"]\s*;?\s*\n?/g,
    "import { ConfirmPopupHost } from '@/components/ui/ConfirmPopup'\n"
  )
  s = s.replace(
    /import\s*\{\s*ConfirmDeleteProvider\s*,\s*confirmDelete\s*\}\s*from\s*['"]@\/components\/ui\/confirm-delete['"]\s*;?\s*\n?/g,
    "import { ConfirmPopupHost, openDeleteConfirm } from '@/components/ui/ConfirmPopup'\n"
  )
  s = s.replace(
    /import\s*\{\s*confirmDelete\s*,\s*ConfirmDeleteProvider\s*\}\s*from\s*['"]@\/components\/ui\/confirm-delete['"]\s*;?\s*\n?/g,
    "import { ConfirmPopupHost, openDeleteConfirm } from '@/components/ui/ConfirmPopup'\n"
  )

  // --- Imports confirm-action ---
  s = s.replace(
    /import\s*\{\s*confirmAction\s*\}\s*from\s*['"]@\/components\/ui\/confirm-action['"]\s*;?\s*\n?/g,
    "import { openActionConfirm } from '@/components/ui/ConfirmPopup'\n"
  )
  s = s.replace(
    /import\s*\{\s*ConfirmActionProvider\s*\}\s*from\s*['"]@\/components\/ui\/confirm-action['"]\s*;?\s*\n?/g,
    "import { ConfirmPopupHost } from '@/components/ui/ConfirmPopup'\n"
  )
  s = s.replace(
    /import\s*\{\s*ConfirmActionProvider\s*,\s*confirmAction\s*\}\s*from\s*['"]@\/components\/ui\/confirm-action['"]\s*;?\s*\n?/g,
    "import { ConfirmPopupHost, openActionConfirm } from '@/components/ui/ConfirmPopup'\n"
  )
  s = s.replace(
    /import\s*\{\s*confirmAction\s*,\s*ConfirmActionProvider\s*\}\s*from\s*['"]@\/components\/ui\/confirm-action['"]\s*;?\s*\n?/g,
    "import { ConfirmPopupHost, openActionConfirm } from '@/components/ui/ConfirmPopup'\n"
  )

  // Merge duplicate ConfirmPopup imports in same file
  const popupImports = []
  s = s.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/ui\/ConfirmPopup['"]\s*;?\s*\n?/g,
    (_m, names) => {
      for (const n of names.split(',')) {
        const t = n.trim()
        if (t && !popupImports.includes(t)) popupImports.push(t)
      }
      return ''
    }
  )
  if (popupImports.length) {
    // Prefer Host first if present
    const order = ['ConfirmPopupHost', 'openDeleteConfirm', 'openActionConfirm', 'openConfirmPopup', 'ConfirmPopup']
    popupImports.sort((a, b) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
    s = `import { ${popupImports.join(', ')} } from '@/components/ui/ConfirmPopup'\n` + s
  }

  // JSX providers
  s = s.replace(/<ConfirmDeleteProvider>/g, '<ConfirmPopupHost>')
  s = s.replace(/<\/ConfirmDeleteProvider>/g, '</ConfirmPopupHost>')
  s = s.replace(/<ConfirmActionProvider>/g, '<ConfirmPopupHost>')
  s = s.replace(/<\/ConfirmActionProvider>/g, '</ConfirmPopupHost>')

  // Nested Host → single Host (DashboardProviders had both)
  s = s.replace(
    /<ConfirmPopupHost>\s*<ConfirmPopupHost>/g,
    '<ConfirmPopupHost>'
  )
  s = s.replace(
    /<\/ConfirmPopupHost>\s*<\/ConfirmPopupHost>/g,
    '</ConfirmPopupHost>'
  )

  // Call sites
  s = s.replace(/\bconfirmDelete\s*\(/g, 'openDeleteConfirm(')
  s = s.replace(/\bconfirmAction\s*\(/g, 'openActionConfirm(')

  // Local helpers that still contain the forbidden names
  s = s.replace(/\bconfirmDeleteEinzel\b/g, 'runDeleteEinzel')
  s = s.replace(/\bconfirmDeleteSelected\b/g, 'runDeleteSelected')
  s = s.replace(/\bconfirmDeleteAll\b/g, 'runDeleteAll')
  s = s.replace(/\bconfirmDeleteOne\b/g, 'runDeleteOne')
  s = s.replace(/\bconfirmDeleteRow\b/g, 'runDeleteRow')
  s = s.replace(/\bconfirmDeleteItem\b/g, 'runDeleteItem')

  if (s === before) return null
  return s
}

const files = walk(root)
let n = 0
for (const f of files) {
  if (f.endsWith('/confirm-delete.tsx') || f.endsWith('/confirm-action.tsx')) continue
  if (f.endsWith('/ConfirmPopup.tsx')) continue
  const src = readFileSync(f, 'utf8')
  if (!/confirmDelete|confirmAction|ConfirmDeleteProvider|ConfirmActionProvider|confirm-delete|confirm-action/.test(src)) {
    continue
  }
  const out = transform(src)
  if (!out) continue
  writeFileSync(f, out)
  n++
  console.log('updated', f.replace(process.cwd() + '/', ''))
}
console.log(`done: ${n} files`)
