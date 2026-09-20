/**
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
    const p = join(dir, name)
    if (SKIP_RE.test(p)) continue
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) acc.push(p)
  }
  return acc
}

function ensureImport(src) {
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
  const serverOnly = src.match(/^(import ['"]server-only['"]\s*\n)/)
  if (serverOnly) return serverOnly[1] + IMPORT + src.slice(serverOnly[1].length)
  const firstImport = src.search(/^import\s/m)
  if (firstImport >= 0) return src.slice(0, firstImport) + IMPORT + src.slice(firstImport)
  return IMPORT + src
}

function findAwaitExprEnd(src, awaitIdx) {
  let i = awaitIdx + 5
  while (i < src.length && /\s/.test(src[i])) i++
  let depthParen = 0
  let depthBracket = 0
  let depthBrace = 0
  let inStr = null
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
      let j = i + 1
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++
      if (src[j] === '.') continue
      if (src[j] === '/' && src[j + 1] === '/') {
        while (j < src.length && src[j] !== '\n') j++
        i = j - 1
        continue
      }
      return i
    }
  }
  return src.length
}

function extractTableHint(awaitSlice) {
  const m = awaitSlice.match(/\.from\(\s*['"]([^'"]+)['"]/)
  return m ? m[1] : 'query'
}

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
  if (filePath.endsWith('log-db-error.ts')) return { filePath, added: 0 }

  const rel = relative(ROOT, filePath).replace(/\\/g, '/')
  const short = rel
    .replace(/^src\//, '')
    .replace(/\.(ts|tsx)$/, '')
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
  // Skip pure client UI components (no server supabase usually) — still process if .from present
  const r = processFile(f)
  if (r.added > 0) {
    total += r.added
    touched.push(r)
  }
}

touched.sort((a, b) => b.added - a.added)
console.log(DRY ? 'DRY RUN' : 'APPLIED')
console.log('files', touched.length, 'calls_added', total)
touched.slice(0, 50).forEach((t) => console.log(`  +${t.added} ${t.filePath}`))
if (touched.length > 50) console.log(`  … +${touched.length - 50} weitere`)
