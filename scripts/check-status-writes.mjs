import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { findDirectStatusUpdates } from './lib/find-direct-status-updates.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const statusDir = path.join(srcDir, 'lib', 'status')
const allowlistPath = path.join(root, 'scripts/status-write-allowlist.txt')

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function isWriteHelper(rel) {
  return (
    /src\/lib\/status\/write-/.test(rel) ||
    /write-(lead|angebot|auftrag|rechnung)-status/.test(rel)
  )
}

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) return new Set()
  return new Set(
    fs
      .readFileSync(allowlistPath, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean)
  )
}

const allow = loadAllowlist()
const violations = []

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file).replace(/\\/g, '/')
  if (isWriteHelper(rel)) continue
  const content = fs.readFileSync(file, 'utf8')
  for (const hit of findDirectStatusUpdates(content)) {
    if (allow.has(rel)) continue
    violations.push({ rel, line: hit.line, kind: 'direct_update' })
  }
}

/** Jeder write-*-status.ts (außer write-helpers) braucht *_WRITE_STATUSES + assertKnownStatus. */
if (fs.existsSync(statusDir)) {
  for (const name of fs.readdirSync(statusDir)) {
    if (!/^write-.+-status\.ts$/.test(name)) continue
    if (name === 'write-helpers.ts') continue
    const file = path.join(statusDir, name)
    const rel = path.relative(root, file).replace(/\\/g, '/')
    const content = fs.readFileSync(file, 'utf8')
    if (!/[A-Z0-9_]+_WRITE_STATUSES\s*=/.test(content)) {
      violations.push({
        rel,
        line: 1,
        kind: 'missing_write_list',
        detail: 'keine *_WRITE_STATUSES-Konstante',
      })
    }
    if (!/assertKnownStatus\s*\(/.test(content)) {
      violations.push({
        rel,
        line: 1,
        kind: 'missing_assert',
        detail: 'kein assertKnownStatus',
      })
    }
  }
}

if (violations.length) {
  console.error('Status-Write-Guard fehlgeschlagen:')
  for (const v of violations) {
    if (v.kind === 'direct_update') {
      console.error(`  ${v.rel}:${v.line}  direkte .update({ status… })`)
    } else {
      console.error(`  ${v.rel}:${v.line}  ${v.detail}`)
    }
  }
  console.error(
    `\n${violations.length} Fund(e). write-*-status.ts braucht *_WRITE_STATUSES + assertKnownStatus; sonst write-* oder Allowlist.`
  )
  process.exit(1)
}

console.log('OK: Status-Writes nur über write-* (bzw. Allowlist); alle Helfer mit Liste')
