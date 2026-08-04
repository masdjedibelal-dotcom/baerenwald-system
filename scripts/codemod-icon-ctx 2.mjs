#!/usr/bin/env node
/** One-shot: MockIcon-Tags ohne ctx mit Heuristik ergänzen */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

function inferCtx(rel, tag, fileContent) {
  if (rel.includes('DetailShell') || rel.endsWith('DetailShell.tsx')) return 'nav'
  if (rel.includes('Sidebar') || rel.includes('BottomNav')) return 'sidebar'
  if (rel.includes('MockEmpty')) return 'empty'
  if (rel.includes('detail-tab-bar')) return 'tab'
  if (rel.includes('ListRowQuickActions') || rel.includes('MockEntityRowMenu')) return 'row'
  if (tag.includes('btn ') || /\bbtn-/.test(tag)) return 'btn'
  if (rel.includes('MockCard') || rel.includes('MockModal')) return 'emphasis'
  if (rel.includes('MockDashboard') || rel.includes('MehrScreen')) return 'default'
  if (rel.includes('PosBoard') || rel.includes('PosTable')) return 'default'
  if (rel.includes('WizardShell')) return 'default'
  if (rel.includes('CommandPalette') || rel.includes('TopBar')) return 'default'
  if (rel.includes('MockToolbar') || rel.includes('VorgaengeListe')) return 'default'
  if (rel.includes('NeuErstellen')) return 'emphasis'
  if (rel.includes('MockDetailCrumb')) return 'nav'
  if (rel.includes('DashboardShell')) return 'btn'
  if (rel.includes('MockNeuPopover')) return 'default'
  if (rel.includes('AuftragDokumenteTab')) {
    if (tag.includes('btn') || tag.includes('upload') || tag.includes('cloud-upload')) return 'btn'
    return 'row'
  }
  if (/DetailClient|DetailPageClient/.test(rel)) {
    if (tag.includes('btn') || /size=\{1[4-8]\}/.test(tag)) return 'btn'
    return 'btn'
  }
  if (rel.includes('MockPrimitives')) {
    if (tag.includes('pager')) return 'default'
    if (tag.includes('chip') || tag.includes('MockChip')) return 'default'
    if (tag.includes('MockBtn') || rel.includes('MockBtn')) return 'btn'
    if (tag.includes('MockSortHead') || tag.includes('arrows-exchange')) return 'default'
    return 'btn'
  }
  return 'default'
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.tsx$/.test(ent.name)) acc.push(p)
  }
  return acc
}

let changed = 0
for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  if (rel.endsWith('MockIcon.tsx')) continue
  let content = fs.readFileSync(file, 'utf8')
  if (!content.includes('<MockIcon')) continue

  const next = content.replace(/<MockIcon\b([^>]*?)(\/?>)/g, (full, attrs, close) => {
    if (/ctx=/.test(attrs)) return full
    const ctx = inferCtx(rel, full, content)
    return `<MockIcon ctx="${ctx}"${attrs}${close}`
  })

  if (next !== content) {
    fs.writeFileSync(file, next)
    changed++
    console.log('updated', rel)
  }
}
console.log(`Done: ${changed} files`)
