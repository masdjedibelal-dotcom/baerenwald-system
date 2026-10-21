#!/usr/bin/env node
/**
 * TEO-Arbeitsplatz: CRM-Bausteine (mock-ui) + CRM-Styles ins Portal kopieren.
 * Ziel: <portal>/src/teo/arbeitsplatz/kit — dort nicht von Hand ändern.
 * Usage: node scripts/sync-crm-kit.mjs [--check]
 */
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const CRM_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORTAL_ROOT = process.env.PORTAL_ROOT || path.join(CRM_ROOT, '..', 'baerenwald')
const ZIEL = path.join(PORTAL_ROOT, 'src/teo/arbeitsplatz/kit')
const KOPF = '// SYNCED FROM CRM (scripts/sync-crm-kit.mjs) — do not edit\n'
const checkOnly = process.argv.includes('--check')

const KOMPONENTEN = [
  'MockIcon',
  'MockPrimitives',
  'MockCard',
  'MockEmpty',
  'MockForm',
  'MockTabs',
  'MockSegment',
  'MockPopover',
  'MockCheckbox',
  'MockTable',
  'MockProp',
  'MockListBar',
]
const LIBS = ['icon-context', 'mock-icon-svgs', 'mock-icons']

function umschreiben(src) {
  let s = src
  for (const lib of LIBS) s = s.replaceAll(`@/lib/${lib}'`, `@/teo/arbeitsplatz/kit/lib/${lib}'`)
  s = s.replaceAll("@/components/mock-ui/", '@/teo/arbeitsplatz/kit/')
  s = s.replaceAll("@/components/mock-ui'", "@/teo/arbeitsplatz/kit'")
  return s
}

/** Tokens aus globals.css: Inhalt von `@layer base { … }` ohne Tailwind-Hülle. */
function tokens() {
  const css = fs.readFileSync(path.join(CRM_ROOT, 'src/app/globals.css'), 'utf8')
  const start = css.indexOf('@layer base {')
  if (start < 0) throw new Error('@layer base nicht gefunden')
  let tiefe = 0
  let i = css.indexOf('{', start)
  const innen = i + 1
  for (; i < css.length; i++) {
    if (css[i] === '{') tiefe++
    else if (css[i] === '}' && --tiefe === 0) break
  }
  return '/* SYNCED FROM CRM globals.css (@layer base) — do not edit */\n' + css.slice(innen, i) + '\n'
}

/** CSS mit der Tailwind-Konfiguration des CRM übersetzen (löst @apply und CRM-Farben auf). */
function tailwind(eingabe, content) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-kit-'))
  const ein = eingabe ?? path.join(tmp, 'in.css')
  if (!eingabe) fs.writeFileSync(ein, '@tailwind utilities;\n')
  const aus = path.join(tmp, 'out.css')
  const args = ['tailwindcss', '-c', path.join(CRM_ROOT, 'tailwind.config.ts'), '-i', ein, '-o', aus]
  if (content) args.push('--content', content.join(','))
  execFileSync('npx', args, { cwd: CRM_ROOT, stdio: 'pipe' })
  const css = fs.readFileSync(aus, 'utf8')
  fs.rmSync(tmp, { recursive: true, force: true })
  return css
}

function dateien() {
  const out = []
  for (const k of KOMPONENTEN) {
    out.push([`${k}.tsx`, KOPF + umschreiben(fs.readFileSync(path.join(CRM_ROOT, `src/components/mock-ui/${k}.tsx`), 'utf8'))])
  }
  for (const l of LIBS) {
    out.push([`lib/${l}.ts`, KOPF + umschreiben(fs.readFileSync(path.join(CRM_ROOT, `src/lib/${l}.ts`), 'utf8'))])
  }
  // Barrel nur mit den kopierten Bausteinen
  const index = fs
    .readFileSync(path.join(CRM_ROOT, 'src/components/mock-ui/index.ts'), 'utf8')
    .split(/\n(?=export )/)
    .filter((b) => {
      const m = b.match(/from '\.\/(\w+)'/)
      return m && KOMPONENTEN.includes(m[1])
    })
    .join('\n')
  out.push(['index.ts', KOPF + index.trim() + '\n'])
  out.push(['crm.css', '/* SYNCED FROM CRM mock-design-system.css (mit CRM-Tailwind kompiliert) — do not edit */\n' + tailwind(path.join(CRM_ROOT, 'src/styles/mock-design-system.css'))])
  // CRM-Hilfsklassen, die die Bausteine selbst nutzen (z. B. text-fs-caption) — mit CRM-Theme erzeugt
  out.push(['utilities.css', '/* SYNCED FROM CRM (Tailwind-Utilities der Kit-Bausteine) — do not edit */\n' + tailwind(null, KOMPONENTEN.map((k) => path.join(CRM_ROOT, `src/components/mock-ui/${k}.tsx`)))])
  out.push(['tokens.css', tokens()])
  return out
}

let drift = 0
for (const [rel, inhalt] of dateien()) {
  const ziel = path.join(ZIEL, rel)
  const alt = fs.existsSync(ziel) ? fs.readFileSync(ziel, 'utf8') : null
  if (alt === inhalt) continue
  drift++
  if (checkOnly) {
    console.log(`DRIFT ${rel}`)
    continue
  }
  fs.mkdirSync(path.dirname(ziel), { recursive: true })
  fs.writeFileSync(ziel, inhalt)
  console.log(`OK   ${rel}`)
}
console.log(checkOnly ? (drift ? `${drift} Datei(en) weichen ab` : 'Kit aktuell') : `Fertig: ${drift} geschrieben`)
if (checkOnly && drift) process.exit(1)
