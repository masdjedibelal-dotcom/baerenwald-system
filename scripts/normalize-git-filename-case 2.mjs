#!/usr/bin/env node
/**
 * Git on macOS/Windows can track the wrong filename casing (card.tsx vs Card.tsx).
 * Linux/Netlify then fails to resolve imports. This script renames via git mv so
 * the index matches the on-disk casing exactly.
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function gitTrackedFiles() {
  try {
    return execSync('git ls-files', { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
  } catch {
    return []
  }
}

function onDiskExactPath(rel) {
  const parts = rel.split('/')
  let cur = root
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!fs.existsSync(cur)) return null
    const entries = fs.readdirSync(cur)
    const hit = entries.find((e) => e === part)
    if (!hit) return null
    cur = path.join(cur, hit)
  }
  return path.relative(root, cur)
}

const tracked = gitTrackedFiles()
const fixes = []

for (const gitPath of tracked) {
  if (!gitPath.startsWith('src/')) continue
  const diskPath = onDiskExactPath(gitPath)
  if (!diskPath || diskPath === gitPath) continue
  fixes.push({ gitPath, diskPath })
}

if (!fixes.length) {
  console.log('OK: git index filename casing matches disk')
  process.exit(0)
}

console.log('Fixing git filename casing:', fixes.length)
for (const { gitPath, diskPath } of fixes) {
  const tmp = `${diskPath}.casefix.tmp`
  console.log(`  ${gitPath} → ${diskPath}`)
  execSync(`git mv -f ${JSON.stringify(gitPath)} ${JSON.stringify(tmp)}`, { cwd: root, stdio: 'inherit' })
  execSync(`git mv -f ${JSON.stringify(tmp)} ${JSON.stringify(diskPath)}`, { cwd: root, stdio: 'inherit' })
}
console.log('Done. Commit and push these renames before redeploying.')
