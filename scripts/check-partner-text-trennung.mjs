/**
 * Guard: Partnertext und Kunden-LV (`leistung_name`) dürfen nicht in derselben
 * Funktion geschrieben werden (FIX 7 Punkt 9 / 12).
 *
 * Bricht ab, wenn in einem Funktionskörper sowohl `leistung_name` gesetzt wird
 * als auch `partner_aufgabe_id` / `partnerTitel` / `partnerBeschreibung`
 * (oder snake_case-Varianten).
 *
 * Self-Test: `node scripts/check-partner-text-trennung.mjs --self-test`
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const PARTNER_WRITE_RE =
  /\bpartner_aufgabe_id\b|\bpartnerTitel\b|\bpartnerBeschreibung\b|\bpartner_titel\b|\bpartner_beschreibung\b/
/** Schreibzugriff auf leistung_name (Objekt-Key / Zuweisung), nicht nur Lesen. */
const LEISTUNG_NAME_WRITE_RE =
  /\bleistung_name\s*:|\bleistung_name\s*=|['"]leistung_name['"]\s*:/

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

/** Grobe Funktionskörper-Extraktion (Brace-Matching ab `(function|=>)`). */
function extractFunctionBodies(source) {
  const bodies = []
  const startRe =
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g
  let m
  while ((m = startRe.exec(source))) {
    const name = m[1] || m[2] || '(anon)'
    let i = m.index
    // zur öffnenden { der Funktion (nach Parameterliste / =>)
    const after = source.slice(i)
    const braceIdx = after.search(/\{/)
    if (braceIdx < 0) continue
    const absStart = i + braceIdx
    let depth = 0
    let end = absStart
    for (; end < source.length; end++) {
      const c = source[end]
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          end++
          break
        }
      }
    }
    const body = source.slice(absStart, end)
    const line = source.slice(0, absStart).split('\n').length
    bodies.push({ name, body, line })
  }
  return bodies
}

function findViolationsInSource(source, rel = '(inline)') {
  const hits = []
  for (const fn of extractFunctionBodies(source)) {
    const hasPartner = PARTNER_WRITE_RE.test(fn.body)
    const hasLeistung = LEISTUNG_NAME_WRITE_RE.test(fn.body)
    if (hasPartner && hasLeistung) {
      hits.push({
        rel,
        line: fn.line,
        name: fn.name,
        detail: 'leistung_name und Partner-Felder in derselben Funktion',
      })
    }
  }
  return hits
}

function selfTest() {
  const bad = `
export async function badWrite(input) {
  await db.from('x').update({
    leistung_name: input.titel,
    partner_aufgabe_id: input.id,
  })
}
`
  const good = `
export async function onlyPartner(input) {
  await db.from('x').update({ partner_aufgabe_id: input.id })
}
export async function onlyLv(input) {
  await db.from('x').update({ leistung_name: input.titel })
}
`
  const badHits = findViolationsInSource(bad, 'self-test-bad')
  const goodHits = findViolationsInSource(good, 'self-test-good')
  if (badHits.length === 0) {
    console.error('FAIL --self-test: erwartete Verletzung nicht erkannt')
    process.exit(1)
  }
  if (goodHits.length > 0) {
    console.error('FAIL --self-test: False Positive', goodHits)
    process.exit(1)
  }
  console.log('OK check-partner-text-trennung --self-test')
}

if (process.argv.includes('--self-test')) {
  selfTest()
  process.exit(0)
}

const violations = []
for (const file of walk(srcDir)) {
  const rel = path.relative(root, file).replace(/\\/g, '/')
  const content = fs.readFileSync(file, 'utf8')
  for (const hit of findViolationsInSource(content, rel)) {
    violations.push(hit)
  }
}

if (violations.length) {
  console.error('check-partner-text-trennung: Partnertext und leistung_name vermischt:\n')
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}  ${v.name} — ${v.detail}`)
  }
  process.exit(1)
}

console.log('OK check-partner-text-trennung')
