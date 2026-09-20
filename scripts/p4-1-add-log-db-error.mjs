/**
<<<<<<< Updated upstream
 * P4-1: logDbError nach Supabase-Aufrufen ohne Fehler-Auswertung.
 * Rückgabewerte / Control-Flow unverändert (nur Logging).
 *
 * Usage: node scripts/p4-1-add-log-db-error.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DRY = process.argv.includes('--dry')
const IMPORT = `import { logDbError } from '@/lib/errors/log-db-error'\n`

const SKIP_RE = /(node_modules|\.next|migrations|generated|database\.types|log-db-error)/

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
=======
 * P4-1: fügt logDbError nach stillen Supabase-Destructures ein.
 * Ändert keine Return-Werte / Control-Flow außer Logging.
 *
 * Usage: node scripts/p4-1-add-log-db-error.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = new URL('..', import.meta.url).pathname
const DRY = process.argv.includes('--dry')
const IMPORT = `import { logDbError } from '@/lib/errors/log-db-error'\n`

const TARGET_DIRS = [
  'src/lib',
  'src/app/actions',
  'src/app/(dashboard)',
]

const SKIP_RE = /(node_modules|\.next|migrations|generated|database\.types)/

function walk(dir, acc = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return acc
  }
  for (const name of entries) {
>>>>>>> Stashed changes
    const p = join(dir, name)
    if (SKIP_RE.test(p)) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) acc.push(p)
  }
  return acc
}

function ensureImport(src) {
<<<<<<< Updated upstream
  if (/from ['"]@\/lib\/errors\/log-db-error['"]/.test(src)) return src
  const trimmed = src.trimStart()
  if (/^['"]use server['"]/.test(trimmed)) {
    const m = src.match(/^(['"]use server['"];?\s*\n)/)
    if (m) return m[1] + IMPORT + src.slice(m[1].length)
  }
  if (/^['"]use client['"]/.test(trimmed)) {
    const m = src.match(/^(['"]use client['"];?\s*\n)/)
    if (m) return m[1] + IMPORT + src.slice(m[1].length)
  }
=======
  if (/logDbError/.test(src) && /from ['"]@\/lib\/errors\/log-db-error['"]/.test(src)) {
    return src
  }
  if (/^['"]use server['"]/.test(src.trimStart())) {
    const m = src.match(/^(['"]use server['"];?\s*\n)/)
    if (m) return m[1] + IMPORT + src.slice(m[1].length)
  }
  if (/^['"]use client['"]/.test(src.trimStart())) {
    const m = src.match(/^(['"]use client['"];?\s*\n)/)
    if (m) return m[1] + IMPORT + src.slice(m[1].length)
  }
  // nach 'server-only' oder erstem import-block
>>>>>>> Stashed changes
  const serverOnly = src.match(/^(import ['"]server-only['"]\s*\n)/)
  if (serverOnly) return serverOnly[1] + IMPORT + src.slice(serverOnly[1].length)
  const firstImport = src.search(/^import\s/m)
  if (firstImport >= 0) return src.slice(0, firstImport) + IMPORT + src.slice(firstImport)
  return IMPORT + src
}

function findAwaitExprEnd(src, awaitIdx) {
<<<<<<< Updated upstream
  let i = awaitIdx + 5
  while (i < src.length && /\s/.test(src[i])) i++
=======
  // awaitIdx zeigt auf 'await'
  let i = awaitIdx + 5
  while (i < src.length && /\s/.test(src[i])) i++
  // Expression bis Statement-Ende: ; oder Newline vor gleichem Indent-Keyword
>>>>>>> Stashed changes
  let depthParen = 0
  let depthBracket = 0
  let depthBrace = 0
  let inStr = null
<<<<<<< Updated upstream
=======
  let inTemplate = 0
>>>>>>> Stashed changes
  let inLineComment = false
  let inBlockComment = false
  for (; i < src.length; i++) {
    const c = src[i]
    const n = src[i + 1]
    if (inLineComment) {
      if (c === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (c === '*' && n === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (inStr) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === inStr) inStr = null
      continue
    }
<<<<<<< Updated upstream
=======
    if (c === '`' && inTemplate) {
      // simplified: track ${ }
      continue
    }
>>>>>>> Stashed changes
    if (c === '/' && n === '/') {
      inLineComment = true
      i++
      continue
    }
    if (c === '/' && n === '*') {
      inBlockComment = true
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = c
      continue
    }
    if (c === '(') depthParen++
    else if (c === ')') depthParen--
    else if (c === '[') depthBracket++
    else if (c === ']') depthBracket--
    else if (c === '{') depthBrace++
    else if (c === '}') {
      depthBrace--
      if (depthBrace < 0 && depthParen <= 0 && depthBracket <= 0) return i
<<<<<<< Updated upstream
    } else if (
      c === ';' &&
      depthParen <= 0 &&
      depthBracket <= 0 &&
      depthBrace <= 0
    ) {
      return i + 1
    } else if (
      c === '\n' &&
      depthParen <= 0 &&
      depthBracket <= 0 &&
      depthBrace <= 0
    ) {
=======
    } else if (c === ';' && depthParen <= 0 && depthBracket <= 0 && depthBrace <= 0) {
      return i + 1
    } else if (c === '\n' && depthParen <= 0 && depthBracket <= 0 && depthBrace <= 0) {
      // Peek next non-empty line: if starts with . continue (chain)
>>>>>>> Stashed changes
      let j = i + 1
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++
      if (src[j] === '.') continue
      if (src[j] === '/' && src[j + 1] === '/') {
<<<<<<< Updated upstream
=======
        // skip comment lines
>>>>>>> Stashed changes
        while (j < src.length && src[j] !== '\n') j++
        i = j - 1
        continue
      }
<<<<<<< Updated upstream
=======
      // End of statement
>>>>>>> Stashed changes
      return i
    }
  }
  return src.length
}

function extractTableHint(awaitSlice) {
  const m = awaitSlice.match(/\.from\(\s*['"]([^'"]+)['"]/)
  return m ? m[1] : 'query'
}

<<<<<<< Updated upstream
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function indentAt(src, idx) {
  let i = idx
  while (i > 0 && src[i - 1] !== '\n') i--
  const lineStart = i
  let j = lineStart
  while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++
  return src.slice(lineStart, j) || '  '
}

const CLIENT =
  '(?:supabase(?:Admin)?|db|admin|gate\\.db|gate\\.supabase!?|createClient\\(\\)|getSupabaseAdmin\\(\\))'

function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8')
  if (!/\.from\s*\(/.test(src)) return { filePath, added: 0 }
=======
function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8')
  if (!/(supabase|supabaseAdmin|\.from\s*\()/.test(src)) return { filePath, added: 0 }
>>>>>>> Stashed changes
  if (filePath.endsWith('log-db-error.ts')) return { filePath, added: 0 }

  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  const short = rel
    .replace(/^src\//, '')
    .replace(/\.(ts|tsx)$/, '')
<<<<<<< Updated upstream
    .replace(/\(dashboard\)\//g, '')
    .replace(/\(auth\)\//g, '')

  let added = 0
  const ops = []

  // A: const/let { … } = await client…from…
  const reDestructure = new RegExp(
    `(?:const|let)\\s*\\{([^}]*)\\}\\s*=\\s*await\\s+${CLIENT}`,
    'g'
  )
  let m
  while ((m = reDestructure.exec(src))) {
    const awaitStart = m.index + m[0].indexOf('await')
    const end = findAwaitExprEnd(src, awaitStart)
    const slice = src.slice(awaitStart, end)
    if (!/\.from\s*\(/.test(slice)) continue
    const after = src.slice(end, end + 320)
    if (/logDbError\s*\(/.test(after)) continue

    const braces = m[1]
    const table = extractTableHint(slice)
    const ctx = `${short}:${table}`
    const ind = indentAt(src, m.index)

    if (/\berror\b/.test(braces)) {
      const errName =
        (braces.match(/\berror(?:\s*:\s*(\w+))?/) || [])[1] || 'error'
      ops.push({
        kind: 'log-only',
        end,
        text: `\n${ind}if (${errName}) logDbError('${ctx}', ${errName})`,
      })
    } else {
      ops.push({
        kind: 'add-error',
        matchStart: m.index,
        end,
        braces,
        ctx,
        ind,
      })
    }
  }

  // B: fire-and-forget await client.from(...).update/insert/delete/upsert
  const reFire = new RegExp(
    `await\\s+(${CLIENT})\\s*\\.from\\s*\\(`,
    'g'
  )
  while ((m = reFire.exec(src))) {
    const awaitStart = m.index
    // skip if assigned: `= await` immediately before
    const before = src.slice(Math.max(0, m.index - 60), m.index)
    if (/[=,]\s*$/.test(before.trimEnd()) || /\{\s*$/.test(before.trimEnd())) {
      // might be Promise.all element or assignment — skip assignment
      if (/=\s*$/.test(before.replace(/\s+$/, ''))) continue
    }
    if (/(?:const|let|var)\s+[\w{[][^=]*=\s*$/.test(before.replace(/\s+/g, ' '))) {
      continue
    }
    // skip destructure (handled in A)
    if (/\}\s*=\s*$/.test(before.replace(/\s+/g, ' '))) continue

    const end = findAwaitExprEnd(src, awaitStart)
    const slice = src.slice(awaitStart, end)
    if (!/\.(update|insert|delete|upsert)\s*\(/.test(slice)) continue
    const after = src.slice(end, end + 280)
    if (/logDbError\s*\(/.test(after)) continue
    // already captures result?
    if (/^\s*(?:const|let)\s/.test(src.slice(Math.max(0, awaitStart - 40), awaitStart))) {
      continue
    }

    const table = extractTableHint(slice)
    const ctx = `${short}:${table}`
    const ind = indentAt(src, awaitStart)
    // Replace `await client.from...` with const { error } = await ...; if (error) log...
    const awaitExpr = src.slice(awaitStart, end).replace(/^await\s+/, '')
    const replacement =
      `const { error: __dbErr } = await ${awaitExpr}\n` +
      `${ind}if (__dbErr) logDbError('${ctx}', __dbErr)`
    ops.push({
      kind: 'wrap-fire',
      matchStart: awaitStart,
      end,
      text: replacement,
    })
  }

  // Dedupe by end
  ops.sort((a, b) => (b.end ?? 0) - (a.end ?? 0))
  const seen = new Set()
  const uniq = []
  for (const op of ops) {
    const key = `${op.kind}:${op.end}`
    if (seen.has(key)) continue
    seen.add(key)
    uniq.push(op)
  }

  for (const op of uniq) {
    if (op.kind === 'log-only') {
      src = src.slice(0, op.end) + op.text + src.slice(op.end)
      added++
      continue
    }
    if (op.kind === 'wrap-fire') {
      src = src.slice(0, op.matchStart) + op.text + src.slice(op.end)
      added++
      continue
    }
    if (op.kind === 'add-error') {
      const bracesContent = op.braces.trim()
      const newBraces = bracesContent.endsWith(',')
        ? `${bracesContent} error`
        : `${bracesContent}, error`
      const region = src.slice(op.matchStart, op.end)
      let replaced = region.replace(`{${op.braces}}`, `{${newBraces}}`)
      if (replaced === region) {
        replaced = region.replace(
          new RegExp(`\\{\\s*${escapeRe(op.braces.trim())}\\s*\\}`),
          `{ ${newBraces} }`
        )
      }
      if (replaced === region) continue
      const logLine = `\n${op.ind}if (error) logDbError('${op.ctx}', error)`
      src = src.slice(0, op.matchStart) + replaced + logLine + src.slice(op.end)
      added++
    }
=======
    .replace(/\(dashboard\)\//, '')
    .replace(/\(auth\)\//, '')

  let added = 0
  const insertions = [] // { index, text } — insert AFTER index (exclusive end of await)

  // Pattern A: const { … } = await client — without error in braces, client looks like supabase
  const reA =
    /const\s*\{\s*([^}]+)\s*\}\s*=\s*await\s+((?:supabase(?:Admin)?|db|admin|gate\.db|gate\.supabase!?|createClient\(\)|getSupabaseAdmin\(\)|withCrmReadFallback)[\s\S]*?)/g

  // Simpler: find const { ... } = await X where X starts with known client
  const re =
    /const\s*\{([^}]+)\}\s*=\s*await\s+(supabase(?:Admin)?|db\b|admin\b|gate\.db|gate\.supabase!?|createClient\(\)|getSupabaseAdmin\(\))/g

  let m
  const matches = []
  while ((m = re.exec(src))) {
    const braces = m[1]
    if (/\berror\b/.test(braces)) {
      // Already has error — check if logDbError follows within ~300 chars after await expr
      const awaitStart = m.index + m[0].indexOf('await')
      const end = findAwaitExprEnd(src, awaitStart)
      const after = src.slice(end, end + 280)
      if (/logDbError\s*\(/.test(after)) continue
      // Only add if error is used soon OR unused — always add log before existing handling
      const errName = (braces.match(/\berror(?:\s*:\s*(\w+))?/) || [])[1] || 'error'
      const table = extractTableHint(src.slice(awaitStart, end))
      const ctx = `${short}:${table}`
      const logLine = `\n  if (${errName}) logDbError('${ctx}', ${errName})`
      insertions.push({ index: end, text: logLine, kind: 'with-error' })
      continue
    }

    // No error in destructure — add it + log
    const awaitStart = m.index + m[0].indexOf('await')
    const end = findAwaitExprEnd(src, awaitStart)
    const after = src.slice(end, end + 200)
    if (/logDbError\s*\(/.test(after)) continue

    const table = extractTableHint(src.slice(awaitStart, end))
    const ctx = `${short}:${table}`
    matches.push({
      bracesStart: m.index + m[0].indexOf('{') + 1,
      braces: braces,
      fullMatch: m[0],
      matchStart: m.index,
      awaitStart,
      end,
      ctx,
    })
  }

  // Apply from end to start so indices stay valid
  const allOps = [
    ...matches.map((x) => ({ ...x, kind: 'add-error' })),
    ...insertions,
  ].sort((a, b) => (b.end ?? b.index) - (a.end ?? a.index))

  // Deduplicate by end index
  const seen = new Set()
  const ops = []
  for (const op of allOps) {
    const key = op.end ?? op.index
    if (seen.has(key)) continue
    seen.add(key)
    ops.push(op)
  }

  for (const op of ops) {
    if (op.kind === 'with-error') {
      src = src.slice(0, op.index) + op.text + src.slice(op.index)
      added++
      continue
    }
    // add-error: patch braces + insert log
    const bracesContent = op.braces.trim()
    // Avoid naming conflict if `error` already in outer scope — still use error (shadowing ok in const)
    const newBraces = bracesContent.endsWith(',')
      ? `${bracesContent} error`
      : `${bracesContent}, error`
    // Replace first `{braces}` in this match region
    const region = src.slice(op.matchStart, op.end)
    const replacedRegion = region.replace(`{${op.braces}}`, `{${newBraces}}`)
    if (replacedRegion === region) {
      // try trimmed braces match
      const alt = region.replace(
        new RegExp(`\\{\\s*${escapeRe(op.braces.trim())}\\s*\\}`),
        `{ ${newBraces} }`
      )
      if (alt === region) continue
      const logLine = `\n  if (error) logDbError('${op.ctx}', error)`
      src = src.slice(0, op.matchStart) + alt + logLine + src.slice(op.end)
      added++
      continue
    }
    const logLine = `\n  if (error) logDbError('${op.ctx}', error)`
    src = src.slice(0, op.matchStart) + replacedRegion + logLine + src.slice(op.end)
    added++
>>>>>>> Stashed changes
  }

  if (added > 0) {
    src = ensureImport(src)
    if (!DRY) writeFileSync(filePath, src)
  }
  return { filePath: rel, added }
}

<<<<<<< Updated upstream
const files = walk(join(ROOT, 'src'))
let total = 0
const touched = []
for (const f of files) {
  // Skip pure client UI components (no server supabase usually) — still process if .from present
=======
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const files = TARGET_DIRS.flatMap((d) => walk(join(ROOT, d)))
let total = 0
const touched = []
for (const f of files) {
  // Prefer high-traffic: actions + lib; skip pages/tsx UI except actions
  if (f.includes('/components/')) continue
  if (/\.tsx$/.test(f) && !/actions/.test(f)) continue
>>>>>>> Stashed changes
  const r = processFile(f)
  if (r.added > 0) {
    total += r.added
    touched.push(r)
  }
}

touched.sort((a, b) => b.added - a.added)
console.log(DRY ? 'DRY RUN' : 'APPLIED')
console.log('files', touched.length, 'calls_added', total)
<<<<<<< Updated upstream
touched.slice(0, 50).forEach((t) => console.log(`  +${t.added} ${t.filePath}`))
if (touched.length > 50) console.log(`  … +${touched.length - 50} weitere`)
=======
touched.slice(0, 40).forEach((t) => console.log(`  +${t.added} ${t.filePath}`))
>>>>>>> Stashed changes
