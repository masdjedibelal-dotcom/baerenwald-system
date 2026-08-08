#!/usr/bin/env node
/**
 * Build-Check: MockIcon ctx; Lucide Shell ohne Token; Stroke-Icons (kein fill-Bug).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

/** Mock/Tabler-Namen die bewusst gefüllt sein dürfen */
const FILLED_ALLOWLIST = new Set([
  'circle-check-filled',
  'map-pin-filled',
  'player-play-filled',
  'star-filled',
])

const LUCIDE_GUARD_FILES = [
  'components/anfragen/AnfrageDetailClient.tsx',
  'components/auftraege/AuftragDetailClient.tsx',
  'components/angebote/AngebotDetailPageClient.tsx',
  'components/kunden/KundeDetailClient.tsx',
  'components/handwerker/HandwerkerDetailClient.tsx',
  'components/rechnungen/RechnungDetailClient.tsx',
  'components/mock-ui/DetailShell.tsx',
  'components/ui/detail-tab-bar.tsx',
  'components/layout/Sidebar.tsx',
  'components/layout/BottomNav.tsx',
]

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|jsx|css|ts)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function findMockIconCtxViolations(content, rel) {
  const violations = []
  const re = /<MockIcon\b[\s\S]*?\/>|<MockIcon\b[\s\S]*?<\/MockIcon>/g
  let m
  while ((m = re.exec(content))) {
    const tag = m[0]
    if (tag.includes('ctx=') || tag.includes('ctx =')) continue
    const line = content.slice(0, m.index).split('\n').length
    violations.push({ rel, line, snippet: tag.split('\n')[0].trim().slice(0, 80) })
  }
  return violations
}

/** Lucide-Komponente als JSX ohne icon-ctx-* / MockIcon in guard files */
function findLucideViolations(content, rel) {
  if (!content.includes("from 'lucide-react'")) return []
  const violations = []
  const re = /<([A-Z][A-Za-z0-9]+)\b[^>]*className="[^"]*"[^>]*\/>/g
  let m
  while ((m = re.exec(content))) {
    const name = m[1]
    const tag = m[0]
    if (tag.includes('icon-ctx-') || tag.includes('MockIcon')) continue
    if (['Link', 'Button', 'Card', 'ClientOnly', 'StatusBadge'].includes(name)) continue
    const line = content.slice(0, m.index).split('\n').length
    violations.push({ rel, line, snippet: tag.slice(0, 90) })
  }
  return violations
}

/**
 * Icons mit fill=currentColor / fill={x} außerhalb Allowlist und außerhalb MockIcon.
 * Ausnahme: fill="none", fill={'none'}, className mock-icon-filled + allowlist names.
 */
function findFillViolations(content, rel) {
  if (rel.endsWith('MockIcon.tsx') || rel.endsWith('mock-icons.ts')) return []
  const violations = []
  // Lucide/SVG JSX with fill that isn't none
  const re =
    /<(?:[A-Z][A-Za-z0-9]*|svg|path|circle|rect)\b[^>]*\bfill=\{(?!['"]none['"])[^}]+\}[^>]*\/?>|<(?:[A-Z][A-Za-z0-9]*|svg|path|circle|rect)\b[^>]*\bfill="(?!none)[^"]*"[^>]*\/?>/g
  let m
  while ((m = re.exec(content))) {
    const tag = m[0]
    const line = content.slice(0, m.index).split('\n').length
    // allow currentColor only next to filled allowlist icon names in same vicinity
    const before = content.slice(Math.max(0, m.index - 120), m.index)
    const allow =
      FILLED_ALLOWLIST.has(
        [...FILLED_ALLOWLIST].find((n) => before.includes(`"${n}"`) || before.includes(`'${n}'`) || tag.includes(n))
      ) ||
      /mock-icon-filled|fill-current|star-filled|Star\b/.test(tag + before) ||
      /HandwerkerBewertung|StarRating/.test(rel)
    if (allow) continue
    // skip non-icon UI (progress bars etc.)
    if (/pos-marge|progress-fill|bg-|className="[^"]*fill-/.test(tag)) continue
    if (!content.includes("from 'lucide-react'") && !tag.includes('MockIcon') && !/<svg\b/.test(tag)) {
      // only care about lucide imports or svg in this file for fill=
      if (!/<[A-Z][A-Za-z0-9]+\b/.test(tag)) continue
    }
    if (!content.includes("lucide-react") && !tag.startsWith('<svg') && !tag.startsWith('<path')) continue
    violations.push({ rel, line, snippet: tag.replace(/\s+/g, ' ').slice(0, 100) })
  }
  return violations
}

function checkMockIconRoot() {
  const file = path.join(srcDir, 'components/mock-ui/MockIcon.tsx')
  const content = fs.readFileSync(file, 'utf8')
  const violations = []
  if (!content.includes('getMockIconSvg') || !content.includes('dangerouslySetInnerHTML')) {
    violations.push({
      rel: 'src/components/mock-ui/MockIcon.tsx',
      line: 1,
      snippet: 'MockIcon muss Tabler-SVGs aus mock-icon-svgs rendern (Mock-Glyphen)',
    })
  }
  if (/fill=\{fill\}/.test(content)) {
    violations.push({
      rel: 'src/components/mock-ui/MockIcon.tsx',
      line: 1,
      snippet: 'fill={fill} überschreibt Default mit undefined → Browser-Fill schwarz',
    })
  }
  const svgs = path.join(srcDir, 'lib/mock-icon-svgs.ts')
  if (!fs.existsSync(svgs)) {
    violations.push({
      rel: 'src/lib/mock-icon-svgs.ts',
      line: 1,
      snippet: 'mock-icon-svgs.ts fehlt',
    })
  } else {
    const svgContent = fs.readFileSync(svgs, 'utf8')
    for (const need of ['inbox', 'briefcase', 'receipt', 'clipboard-list', 'history', 'files', 'messages']) {
      if (!svgContent.includes(`'${need}':`)) {
        violations.push({
          rel: 'src/lib/mock-icon-svgs.ts',
          line: 1,
          snippet: `fehlendes Tabler-SVG: ${need}`,
        })
      }
    }
  }
  // Komponenten-CSS liegt nur in mock-design-system.css (siehe docs/DESIGN-CSS.md)
  const css = fs.readFileSync(path.join(srcDir, 'styles/mock-design-system.css'), 'utf8')
  const iconBlock = css.includes('.mock-icon svg') && css.includes('fill: none')
  if (!iconBlock) {
    violations.push({
      rel: 'src/styles/mock-design-system.css',
      line: 1,
      snippet: '.mock-icon svg braucht fill: none als Absicherung',
    })
  }
  return violations
}

const mockViolations = []
const lucideViolations = []
const fillViolations = []

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  if (rel.endsWith('.css') || rel.endsWith('.ts')) continue
  const content = fs.readFileSync(file, 'utf8')
  if (rel.endsWith('MockIcon.tsx')) continue
  mockViolations.push(...findMockIconCtxViolations(content, rel))
  if (LUCIDE_GUARD_FILES.some((g) => rel.endsWith(g))) {
    lucideViolations.push(...findLucideViolations(content, rel))
  }
  fillViolations.push(...findFillViolations(content, rel))
}

const rootViolations = checkMockIconRoot()

let failed = false

function report(title, list) {
  if (!list.length) return
  failed = true
  console.error(title)
  for (const v of list) console.error(`  ${v.rel}:${v.line}  ${v.snippet}`)
}

report('MockIcon ohne ctx:', mockViolations)
report('Lucide-JSX ohne icon-ctx-* (Shell/Detail):', lucideViolations)
report('Icon fill≠none (außer Mock-Filled-Allowlist):', fillViolations)
report('MockIcon/CSS Stroke-Root:', rootViolations)

if (failed) {
  const n =
    mockViolations.length + lucideViolations.length + fillViolations.length + rootViolations.length
  console.error(`\nIcon-Check fehlgeschlagen (${n} Funde).`)
  process.exit(1)
}

console.log('OK: Icon-Kontext + Stroke/fill-Guard (MockIcon fill=none)')
