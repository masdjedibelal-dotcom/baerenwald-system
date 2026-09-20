#!/usr/bin/env node
/**
 * P4-3: void-Aufrufe — Mail/Notify/Push nur über safeVoidNotify;
 * sonst nur Allowlist (UI: closeWizardClean, load, patchRow, …).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const allowPath = path.join(root, 'scripts/void-call-allowlist.txt')

/** Direkte void sendMail/notify/push — verboten (Helfer nutzen). */
const FORBIDDEN_CALLEE =
  /^(?:notify\w*|sendMail\w*|sendBrandedMail\w*|sendPush\w*|sendCrmPush\w*|sendPortalWebPush\w*|schedulePortalWebPush\w*|mail\w*|push\w*)$/i

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx?)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function loadAllow() {
  if (!fs.existsSync(allowPath)) return new Set()
  return new Set(
    fs
      .readFileSync(allowPath, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean)
  )
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

const allow = loadAllow()
const violations = []

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file).replace(/\\/g, '/')
  if (rel === 'src/lib/errors/safe-void-notify.ts') continue
  const src = stripComments(fs.readFileSync(file, 'utf8'))

  for (const m of src.matchAll(/\bvoid\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1]
    const line = src.slice(0, m.index).split('\n').length
    if (name === 'safeVoidNotify') continue
    if (FORBIDDEN_CALLEE.test(name)) {
      violations.push({ rel, line, kind: 'mail_notify_push', name })
      continue
    }
    if (!allow.has(name)) {
      violations.push({ rel, line, kind: 'not_allowlisted', name })
    }
  }

  for (const m of src.matchAll(/\bvoid\s*\(/g)) {
    const after = src.slice(m.index + 4).trimStart()
    if (/^[A-Za-z_$]/.test(after)) continue
    const line = src.slice(0, m.index).split('\n').length
    if (!allow.has('(expr)')) {
      violations.push({ rel, line, kind: 'not_allowlisted', name: '(expr)' })
    }
  }
}

if (violations.length) {
  console.error('P4-3 void-Guard fehlgeschlagen:')
  for (const v of violations.slice(0, 80)) {
    console.error(`  ${v.rel}:${v.line}  void ${v.name}  [${v.kind}]`)
  }
  if (violations.length > 80) console.error(`  … +${violations.length - 80} weitere`)
  console.error(
    `\n${violations.length} Fund(e). Mail/Notify/Push → safeVoidNotify; UI → scripts/void-call-allowlist.txt`
  )
  process.exit(1)
}

console.log('OK: void-Aufrufe nur safeVoidNotify oder Allowlist')
