#!/usr/bin/env node
/**
 * Client-sichere Lib-Module: dürfen von 'use client'-Komponenten importiert werden,
 * auch wenn sie indirekt Server-Code nutzen könnten (nur reine Hilfsfunktionen).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const SERVER_MARKERS = [
  "import 'server-only'",
  'from "@/lib/supabase-admin"',
  "from '@/lib/supabase-admin'",
]

/** Bekannte client-sichere Module (kein server-only im Dateiinhalt). */
const CLIENT_SAFE_IMPORTS = new Set([
  '@/lib/mail-branding',
  '@/lib/kalender-internes-todo',
  '@/lib/gewerke-ausfuehrung',
  '@/lib/firmen-einstellungen',
])

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function resolveImport(imp) {
  const base = path.join(srcDir, imp.slice(2))
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const full = ext.startsWith('/') ? base + ext : base + ext
    if (fs.existsSync(full)) return full
  }
  return null
}

function isServerActionModule(filePath, text) {
  if (!text.includes("'use server'")) return false
  if (/(?:^|[/\\])actions[/\\][^/\\]+\.ts$/.test(filePath)) return true
  return /(?:^|[/\\])[\w-]*actions\.ts$/.test(filePath)
}

function isServerModule(filePath, importPath) {
  if (CLIENT_SAFE_IMPORTS.has(importPath)) return false
  const text = fs.readFileSync(filePath, 'utf8')
  if (isServerActionModule(filePath, text)) return false
  return SERVER_MARKERS.some((m) => text.includes(m))
}

function isClientFile(text) {
  return text.includes("'use client'") || text.includes('"use client"')
}

const importRe = /^\s*import\s+(?!type\b)([^\n]*?\S)\s+from\s+['"](@\/[^'"]+)['"]/gm
const broken = []

for (const file of walk(srcDir)) {
  const text = fs.readFileSync(file, 'utf8')
  if (!isClientFile(text)) continue
  let m
  while ((m = importRe.exec(text))) {
    const imp = m[2]
    const target = resolveImport(imp)
    if (target && isServerModule(target, imp)) {
      broken.push({
        client: path.relative(root, file),
        import: imp,
        target: path.relative(root, target),
      })
    }
  }
}

if (broken.length) {
  console.error('Client components import server-only modules (value imports):', broken.length)
  for (const b of broken) {
    console.error(`  ${b.client}\n    ${b.import}\n    -> ${b.target}`)
  }
  process.exit(1)
}

console.log('OK: no client value imports of server-only modules')
