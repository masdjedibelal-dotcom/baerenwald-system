/**
 * P5-4/P5-5: Zählt rohe button/input/select/textarea außerhalb der Allowlist.
 * Checkbox/Radio/Hidden/File bleiben erlaubt (keine MockField-Controls).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ALLOWLIST_FILE = path.join(ROOT, 'scripts/raw-element-allowlist.txt')

export function loadRawElementAllowlist() {
  const lines = fs
    .readFileSync(ALLOWLIST_FILE, 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)
  return lines
}

export function isAllowlisted(relPath, allowlist = loadRawElementAllowlist()) {
  const rel = relPath.replace(/\\/g, '/')
  return allowlist.some((a) => rel === a || rel.endsWith('/' + a) || rel.includes(a))
}

function walkTsx(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (['node_modules', '.next', 'archiv'].includes(ent.name)) continue
      walkTsx(p, acc)
    } else if (/\.tsx$/.test(ent.name)) acc.push(p)
  }
  return acc
}

/** Input-Typen, die bewusst roh bleiben (Checkbox-Zeilen / File / Hidden). */
const SKIP_INPUT_TYPE =
  /\btype\s*=\s*(?:\{)?['"](?:checkbox|radio|hidden|file)['"]/

/**
 * @returns {{ button: number, input: number, select: number, textarea: number, hits: Array<{file:string,kind:string,line:number}> }}
 */
export function countRawElementsOutsideAllowlist(srcDir = path.join(ROOT, 'src')) {
  const allowlist = loadRawElementAllowlist()
  const hits = []
  let button = 0
  let input = 0
  let select = 0
  let textarea = 0

  for (const file of walkTsx(srcDir)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    if (isAllowlisted(rel, allowlist)) continue
    const text = fs.readFileSync(file, 'utf8')
    const lines = text.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (/<button\b/.test(line)) {
        button++
        hits.push({ file: rel, kind: 'button', line: i + 1 })
      }
      if (/<select\b/.test(line)) {
        select++
        hits.push({ file: rel, kind: 'select', line: i + 1 })
      }
      if (/<textarea\b/.test(line)) {
        textarea++
        hits.push({ file: rel, kind: 'textarea', line: i + 1 })
      }
      if (/<input\b/.test(line)) {
        // Mehrzeilige Tags: Type oft auf derselben oder nächsten Zeile
        const window = lines.slice(i, Math.min(lines.length, i + 10)).join(' ')
        if (SKIP_INPUT_TYPE.test(window)) continue
        // Verstecktes File-Input ohne type in den ersten Zeilen (selten)
        if (/\b(?:sr-only|hidden)\b/.test(window) && /accept=/.test(window)) continue
        input++
        hits.push({ file: rel, kind: 'input', line: i + 1 })
      }
    }
  }

  return { button, input, select, textarea, hits }
}
