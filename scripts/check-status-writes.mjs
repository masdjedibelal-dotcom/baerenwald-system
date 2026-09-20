import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { findDirectStatusUpdates } from './lib/find-direct-status-updates.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
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
    violations.push({ rel, line: hit.line })
  }
}

if (violations.length) {
  console.error('Status-Write-Guard fehlgeschlagen (direkte .update({ status… })):')
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}`)
  }
  console.error(
    `\n${violations.length} Fund(e). Nutze src/lib/status/write-*-status.ts oder Allowlist schrumpfen.`
  )
  process.exit(1)
}

console.log('OK: Status-Writes nur über write-* (bzw. Allowlist)')
