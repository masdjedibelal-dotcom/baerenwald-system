/**
 * P4-1 Pass 2: logDbError an Builder-Ketten ohne Await-Destructure
 * (Promise.all-Einträge, Callbacks). Rückgabe unverändert (.then return r).
 *
 * Usage: node scripts/p4-1-wrap-builder-log.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DRY = process.argv.includes('--dry')
const IMPORT = `import { logDbError } from '@/lib/errors/log-db-error'\n`

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p)
  }
  return acc
}

function ensureImport(src) {
  if (/from ['"]@\/lib\/errors\/log-db-error['"]/.test(src)) return src
  const m = src.match(/^(['"]use (?:server|client)['"];?\s*\n)/)
  if (m) return m[1] + IMPORT + src.slice(m[1].length)
  const so = src.match(/^(import ['"]server-only['"]\s*\n)/)
  if (so) return so[1] + IMPORT + src.slice(so[1].length)
  const fi = src.search(/^import\s/m)
  if (fi >= 0) return src.slice(0, fi) + IMPORT + src.slice(fi)
  return IMPORT + src
}

function findChainEnd(src, fromIdx) {
  let i = fromIdx
  let depthParen = 0
  let depthBracket = 0
  let depthBrace = 0
  let inStr = null
  let started = false
  for (; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === inStr) inStr = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c
      continue
    }
    if (c === '(') {
      depthParen++
      started = true
    } else if (c === ')') depthParen--
    else if (c === '[') depthBracket++
    else if (c === ']') depthBracket--
    else if (c === '{') depthBrace++
    else if (c === '}') depthBrace--
    else if (
      started &&
      depthParen <= 0 &&
      depthBracket <= 0 &&
      depthBrace <= 0
    ) {
      if (c === ',' || c === ';' || c === ')') return i
      if (c === '\n') {
        let j = i + 1
        while (j < src.length && /[ \t]/.test(src[j])) j++
        if (src[j] === '.') continue
        return i
      }
    }
  }
  return src.length
}

function extractTable(slice) {
  const m = slice.match(/\.from\(\s*['"]([^'"]+)['"]/)
  return m ? m[1] : 'query'
}

function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8')
  if (!/\.from\s*\(/.test(src)) return { added: 0 }
  if (filePath.includes('log-db-error')) return { added: 0 }

  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  const short = rel
    .replace(/^src\//, '')
    .replace(/\.(ts|tsx)$/, '')
    .replace(/\(dashboard\)\//g, '')
    .replace(/\(auth\)\//g, '')

  let added = 0
  const ops = []

  const re =
    /((?:supabase(?:Admin)?|createClient\(\)|getSupabaseAdmin\(\)|gate\.db))\s*\n?\s*\.from\s*\(/g
  let m
  while ((m = re.exec(src))) {
    const pre = src.slice(Math.max(0, m.index - 24), m.index)
    if (/\.storage[\s\n]*$/.test(pre)) continue

    const fromDot = m.index + m[0].lastIndexOf('.from')
    const chainEnd = findChainEnd(src, fromDot)
    const chain = src.slice(m.index, chainEnd)
    if (chain.includes('.then((_r)')) continue
    if (/logDbError/.test(chain)) continue

    const before = src.slice(Math.max(0, m.index - 280), m.index)
    const after = src.slice(chainEnd, Math.min(src.length, chainEnd + 500))
    if (/\berror\b/.test(before) && /logDbError/.test(after)) continue
    if (
      /\berror\b/.test(before) &&
      /logDbError/.test(src.slice(m.index, Math.min(src.length, m.index + 2200)))
    ) {
      continue
    }

    // Nur Builder ohne direktes `const {…} = await` davor
    const beforeFlat = before.replace(/\s+/g, ' ')
    if (
      /(?:const|let)\s*\{[^}]*\}\s*=\s*await\s*$/.test(beforeFlat.slice(-100))
    ) {
      continue
    }

    const table = extractTable(chain)
    const ctx = `${short}:${table}`
    const wrapped = `${chain.trimEnd()}.then((_r) => { if (_r?.error) logDbError('${ctx}', _r.error); return _r })`
    ops.push({ start: m.index, end: chainEnd, text: wrapped })
  }

  // withCrmReadFallback: nur `=> db.from(...)` / `return db.from(...)` (keine query-Builder)
  const reDb = /(\bdb)\s*\n?\s*\.from\s*\(/g
  while ((m = reDb.exec(src))) {
    const fromDot = m.index + m[0].lastIndexOf('.from')
    const chainEnd = findChainEnd(src, fromDot)
    const chain = src.slice(m.index, chainEnd)
    if (chain.includes('.then((_r)')) continue
    if (/logDbError/.test(chain)) continue
    const before = src.slice(Math.max(0, m.index - 200), m.index)
    const beforeFlat = before.replace(/\s+/g, ' ')
    const okArrow =
      /=>\s*$/.test(beforeFlat.slice(-20)) ||
      /return\s+$/.test(beforeFlat.slice(-20)) ||
      /\(db\)\s*=>\s*$/.test(beforeFlat.slice(-30))
    if (!okArrow) continue
    // kein `let query = db.from`
    if (/(?:const|let)\s+\w+\s*=\s*$/.test(beforeFlat.slice(-40))) continue
    const table = extractTable(chain)
    const ctx = `${short}:${table}`
    const wrapped = `${chain.trimEnd()}.then((_r) => { if (_r?.error) logDbError('${ctx}', _r.error); return _r })`
    ops.push({ start: m.index, end: chainEnd, text: wrapped })
  }

  ops.sort((a, b) => b.start - a.start)
  const seen = new Set()
  for (const op of ops) {
    if (seen.has(op.start)) continue
    seen.add(op.start)
    src = src.slice(0, op.start) + op.text + src.slice(op.end)
    added++
  }

  if (added > 0) {
    src = ensureImport(src)
    if (!DRY) writeFileSync(filePath, src)
  }
  return { filePath: rel, added }
}

const files = walk(join(ROOT, 'src'))
let total = 0
const touched = []
for (const f of files) {
  const r = processFile(f)
  if (r.added > 0) {
    total += r.added
    touched.push(r)
  }
}
touched.sort((a, b) => b.added - a.added)
console.log(DRY ? 'DRY RUN' : 'APPLIED')
console.log('files', touched.length, 'calls_added', total)
touched.slice(0, 40).forEach((t) => console.log(`  +${t.added} ${t.filePath}`))
