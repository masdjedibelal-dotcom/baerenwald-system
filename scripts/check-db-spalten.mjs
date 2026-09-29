#!/usr/bin/env node
/**
 * Guard: Spaltennamen in Supabase-Abfrage-Strings gegen src/types/supabase.ts prüfen.
 * Keine DB-Verbindung — nur Quelltext. Im Zweifel überspringen (kein Fehlalarm).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const ALLOWLIST_PATH = path.join(__dirname, 'db-spalten-allowlist.txt')
/** Festgeschrieben: Ausnahmeliste darf nicht wachsen. */
const ALLOWLIST_MAX_LINES = 29

const FILTER_METHODS = new Set([
  'eq', 'neq', 'is', 'in', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'order',
])
const WRITE_METHODS = new Set(['insert', 'update', 'upsert'])

const skipReasons = new Map()
function skip(reason) {
  skipReasons.set(reason, (skipReasons.get(reason) || 0) + 1)
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function resolveTypesPath() {
  const local = path.join(SRC, 'types', 'supabase.ts')
  if (fs.existsSync(local)) return local
  const crmRoot = process.env.CRM_ROOT || path.join(ROOT, '..', 'baerenwald-system')
  const sibling = path.join(crmRoot, 'src', 'types', 'supabase.ts')
  if (fs.existsSync(sibling)) {
    console.warn(
      `[check-db-spalten] Keine lokalen Typen unter src/types/supabase.ts — nutze CRM-Sibling:\n  ${sibling}`
    )
    return sibling
  }
  if (process.env.NETLIFY || process.env.CI) {
    console.warn(
      '[check-db-spalten] Keine supabase.ts und kein CRM-Sibling (CI) — Guard übersprungen.'
    )
    return null
  }
  console.error(
    '[check-db-spalten] Wahrheitsquelle fehlt: src/types/supabase.ts (und kein CRM-Sibling).'
  )
  process.exit(1)
}

/** Tables + Views → Map<table, Set<column>> aus Row-Blöcken. */
function parseSchema(typesPath) {
  const text = fs.readFileSync(typesPath, 'utf8')
  const out = new Map()

  function extractSection(label) {
    const re = new RegExp(`\\b${label}\\s*:\\s*\\{`)
    const m = re.exec(text)
    if (!m) return ''
    let i = m.index + m[0].length
    let depth = 1
    const start = i
    while (i < text.length && depth > 0) {
      const c = text[i]
      if (c === '{') depth++
      else if (c === '}') depth--
      i++
    }
    return text.slice(start, i - 1)
  }

  function parseRows(sectionBody) {
    // tablename: { ... Row: { cols } ... }
    const tableRe = /\n\s{4,8}([a-zA-Z_][\w]*)\s*:\s*\{/g
    let tm
    while ((tm = tableRe.exec(sectionBody))) {
      const table = tm[1]
      if (table === 'Row' || table === 'Insert' || table === 'Update' || table === 'Relationships') {
        continue
      }
      const after = sectionBody.slice(tm.index + tm[0].length - 1) // from '{'
      // brace-match this table block
      let depth = 0
      let end = 0
      for (let i = 0; i < after.length; i++) {
        if (after[i] === '{') depth++
        else if (after[i] === '}') {
          depth--
          if (depth === 0) {
            end = i
            break
          }
        }
      }
      const block = after.slice(0, end + 1)
      const rowM = /\bRow\s*:\s*\{/.exec(block)
      if (!rowM) continue
      let ri = rowM.index + rowM[0].length
      let rd = 1
      const rs = ri
      while (ri < block.length && rd > 0) {
        if (block[ri] === '{') rd++
        else if (block[ri] === '}') rd--
        ri++
      }
      const rowBody = block.slice(rs, ri - 1)
      const cols = new Set()
      for (const cm of rowBody.matchAll(/^\s*([a-zA-Z_][\w]*)\s*:/gm)) {
        cols.add(cm[1])
      }
      if (cols.size) out.set(table, cols)
    }
  }

  parseRows(extractSection('Tables'))
  parseRows(extractSection('Views'))
  return out
}

function lineAt(src, index) {
  return src.slice(0, index).split('\n').length
}

function readStringLiteral(src, start) {
  const q = src[start]
  if (q !== "'" && q !== '"' && q !== '`') return null
  let i = start + 1
  let out = ''
  let hasInterp = false
  while (i < src.length) {
    const c = src[i]
    if (q === '`' && c === '$' && src[i + 1] === '{') {
      hasInterp = true
      // skip interpolation
      i += 2
      let d = 1
      while (i < src.length && d > 0) {
        if (src[i] === '{') d++
        else if (src[i] === '}') d--
        i++
      }
      out += '§'
      continue
    }
    if (c === '\\') {
      out += src[i + 1] ?? ''
      i += 2
      continue
    }
    if (c === q) {
      return { value: out, end: i + 1, hasInterp, quote: q }
    }
    out += c
    i++
  }
  return null
}

function skipWs(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++
  return i
}

function readIdent(src, i) {
  const m = /^[a-zA-Z_$][\w$]*/.exec(src.slice(i))
  if (!m) return null
  return { name: m[0], end: i + m[0].length }
}

/** Liest Argumentliste ab '('; liefert Inhalt + Endindex nach ')'. */
function readParenArgs(src, openIdx) {
  if (src[openIdx] !== '(') return null
  let i = openIdx + 1
  let depth = 1
  const start = i
  while (i < src.length && depth > 0) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      const s = readStringLiteral(src, i)
      if (!s) return null
      i = s.end
      continue
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++
      continue
    }
    if (c === '(' || c === '{' || c === '[') depth++
    else if (c === ')' || c === '}' || c === ']') {
      depth--
      if (depth === 0) {
        return { body: src.slice(start, i), end: i + 1 }
      }
    }
    i++
  }
  return null
}

/** Top-level keys of object literal `{ a: ..., b: ... }`. */
function objectLiteralKeys(objSrc) {
  const keys = []
  let i = 0
  // trim outer braces if present
  let body = objSrc.trim()
  if (body.startsWith('{')) body = body.slice(1)
  if (body.endsWith('}')) body = body.slice(0, -1)
  i = 0
  const s = body
  while (i < s.length) {
    i = skipWs(s, i)
    if (i >= s.length) break
    if (s[i] === ',' || s[i] === ';') {
      i++
      continue
    }
    // spread
    if (s[i] === '.' && s.slice(i, i + 3) === '...') {
      // skip spread expression
      i += 3
      i = skipWs(s, i)
      const id = readIdent(s, i)
      if (id) i = id.end
      // could be ...obj or ...{ }
      i = skipWs(s, i)
      if (s[i] === '{' || s[i] === '(' || s[i] === '[') {
        const open = s[i]
        const close = open === '{' ? '}' : open === '(' ? ')' : ']'
        let d = 1
        i++
        while (i < s.length && d > 0) {
          if (s[i] === "'" || s[i] === '"' || s[i] === '`') {
            const lit = readStringLiteral(s, i)
            if (!lit) break
            i = lit.end
            continue
          }
          if (s[i] === open) d++
          else if (s[i] === close) d--
          i++
        }
      }
      // mark as non-literal-complete
      keys.push({ spread: true })
      continue
    }
    let key = null
    if (s[i] === "'" || s[i] === '"' || s[i] === '`') {
      const lit = readStringLiteral(s, i)
      if (!lit || lit.hasInterp) {
        keys.push({ dynamic: true })
        break
      }
      key = lit.value
      i = lit.end
    } else {
      const id = readIdent(s, i)
      if (!id) {
        keys.push({ dynamic: true })
        break
      }
      key = id.name
      i = id.end
    }
    i = skipWs(s, i)
    if (s[i] !== ':') {
      // shorthand or method — treat as key if ident
      if (key) keys.push({ key })
      // skip until comma at depth 0
    } else {
      i++ // :
      keys.push({ key })
    }
    // skip value (inkl. TS-Generics und as-Assertions)
    i = skipWs(s, i)
    let depth = 0
    let angle = 0
    while (i < s.length) {
      const c = s[i]
      if (c === "'" || c === '"' || c === '`') {
        const lit = readStringLiteral(s, i)
        if (!lit) return keys
        i = lit.end
        continue
      }
      if (c === '(' || c === '{' || c === '[') depth++
      else if (c === ')' || c === '}' || c === ']') {
        if (depth === 0 && angle === 0) break
        if (depth > 0) depth--
      } else if (c === '<') angle++
      else if (c === '>' && angle > 0) angle--
      else if (c === ',' && depth === 0 && angle === 0) {
        i++
        break
      }
      i++
    }
  }
  return keys
}

function splitTopLevel(selectStr) {
  const parts = []
  let cur = ''
  let depth = 0
  for (let i = 0; i < selectStr.length; i++) {
    const c = selectStr[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    if (c === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function suggestColumn(unknown, cols) {
  if (!cols || !cols.size) return null
  const u = unknown.toLowerCase()
  // Häufige Verwechslung Verkaufskürzel vs. Festpreis-Spalte
  if (u.endsWith('_vk')) {
    const fix = unknown.slice(0, -3) + '_fix'
    if (cols.has(fix)) return fix
  }
  if (u.endsWith('_preis')) {
    const fix = unknown.slice(0, -6) + '_fix'
    if (cols.has(fix)) return fix
  }
  let best = null
  let bestD = Infinity
  for (const c of cols) {
    const d = levenshtein(u, c.toLowerCase())
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  if (best && bestD > 0 && bestD <= 3) return best
  for (const c of cols) {
    if (c.includes(unknown) || unknown.includes(c)) return c
  }
  return bestD <= 4 ? best : null
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 4) return 99
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

/**
 * Prüft Select-Felder gegen schema[table].
 * @returns {{ ok: boolean, skipped?: string, violations: Array }}
 */
function checkSelectFields(fieldsStr, table, schema, file, line, violations) {
  const parts = splitTopLevel(fieldsStr)
  for (const raw of parts) {
    const field = raw.trim()
    if (!field) continue
    if (field === '*') {
      skip('select_star')
      continue
    }

    // nested: name(...), name!hint(...), alias:name(...), alias:name!hint(...)
    // Vier verschachtelte Formen laut Auftrag:
    // 1) tabelle(fields)
    // 2) tabelle:fk(fields)  — table LEFT of :
    // 3) tabelle!fk(fields)
    // 4) tabelle!inner(fields)
    const nestSimple = /^([a-zA-Z_][\w]*)\s*\(([\s\S]*)\)\s*$/.exec(field)
    const nestAlias = /^([a-zA-Z_][\w]*)\s*:\s*([a-zA-Z_][\w]*)\s*\(([\s\S]*)\)\s*$/.exec(field)
    const nestBang = /^([a-zA-Z_][\w]*)\s*!\s*([a-zA-Z_][\w]*)\s*\(([\s\S]*)\)\s*$/.exec(field)

    if (nestAlias) {
      const target = nestAlias[1] // table left of :
      const inner = nestAlias[3]
      if (!schema.has(target)) {
        skip('relation_unresolved')
        continue
      }
      checkSelectFields(inner, target, schema, file, line, violations)
      continue
    }
    if (nestBang) {
      const target = nestBang[1]
      const inner = nestBang[3]
      if (!schema.has(target)) {
        skip('relation_unresolved')
        continue
      }
      checkSelectFields(inner, target, schema, file, line, violations)
      continue
    }
    if (nestSimple) {
      const target = nestSimple[1]
      const inner = nestSimple[2]
      // Could be a column with cast? Auftrag: no :: casts. But `count` aggregates?
      if (!schema.has(target)) {
        // maybe it's not a relation — could be unknown. If parent has this as column? Unlikely with ().
        skip('relation_unresolved')
        continue
      }
      checkSelectFields(inner, target, schema, file, line, violations)
      continue
    }

    // alias:column (no paren)
    const aliasCol = /^([a-zA-Z_][\w]*)\s*:\s*([a-zA-Z_][\w]*)$/.exec(field)
    if (aliasCol) {
      assertColumn(aliasCol[2], table, schema, file, line, violations)
      continue
    }

    // plain column (allow whitespace)
    const plain = /^[a-zA-Z_][\w]*$/.exec(field)
    if (plain) {
      assertColumn(plain[0], table, schema, file, line, violations)
      continue
    }

    skip('select_field_unparsed')
  }
}

function assertColumn(col, table, schema, file, line, violations, allow) {
  const cols = schema.get(table)
  if (!cols) {
    skip('table_unknown')
    return
  }
  if (cols.has(col)) return
  const key = `${file}:${line}:${table}:${col}`
  if (allow && allow.has(key)) return
  const hint = suggestColumn(col, cols)
  violations.push({ file, line, table, column: col, hint })
}

/** Same-file string constants: name → { value, line }. */
function collectStringConsts(src) {
  const map = new Map()
  const re =
    /\b(?:export\s+)?(?:const|let)\s+([A-Z_][A-Z0-9_]*)\s*=\s*(['"`])/g
  let m
  while ((m = re.exec(src))) {
    const name = m[1]
    const lit = readStringLiteral(src, m.index + m[0].length - 1)
    if (!lit || lit.hasInterp) continue
    map.set(name, { value: lit.value, line: lineAt(src, m.index) })
  }
  return map
}

function loadAllowlist() {
  const allow = new Set()
  let lineCount = 0
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return { allow, lineCount: 0 }
  }
  const raw = fs.readFileSync(ALLOWLIST_PATH, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    lineCount++
    // format: relpath:line:table:column  # reason
    const main = trimmed.split('#')[0].trim()
    allow.add(main)
  }
  return { allow, lineCount }
}

/**
 * Ab `.from(` die Aufrufkette lesen.
 * Unterstützt nur `.from('literal')`.
 */
function parseFromChain(src, fromDotIdx) {
  // fromDotIdx points to '.' before from
  let i = fromDotIdx + 1 // 'f'
  const id = readIdent(src, i)
  if (!id || id.name !== 'from') return null
  i = skipWs(src, id.end)
  const args = readParenArgs(src, i)
  if (!args) return null
  const argBody = args.body.trim()
  if (!(argBody.startsWith("'") || argBody.startsWith('"') || argBody.startsWith('`'))) {
    return { dynamic: true, end: args.end }
  }
  const lit = readStringLiteral(argBody, 0)
  if (!lit || lit.hasInterp || lit.end !== argBody.length) {
    return { dynamic: true, end: args.end }
  }
  const table = lit.value
  i = args.end
  const calls = []
  // collect .method( while chain continues
  for (;;) {
    const j = skipWs(src, i)
    if (src[j] !== '.') break
    const mid = readIdent(src, j + 1)
    if (!mid) break
    const afterName = skipWs(src, mid.end)
    if (src[afterName] !== '(') break
    const par = readParenArgs(src, afterName)
    if (!par) break
    calls.push({
      method: mid.name,
      argsBody: par.body,
      index: j,
      line: lineAt(src, j),
    })
    i = par.end
  }
  return { table, calls, end: i, dynamic: false }
}


/** Erstes Argument einer Argumentliste (bis Komma auf Tiefe 0). */
function readFirstArg(argsBody) {
  const ab = argsBody
  let depth = 0
  for (let i = 0; i < ab.length; i++) {
    const c = ab[i]
    if (c === "'" || c === '"' || c === '`') {
      const lit = readStringLiteral(ab, i)
      if (!lit) return null
      i = lit.end - 1
      continue
    }
    if (c === '(' || c === '{' || c === '[') depth++
    else if (c === ')' || c === '}' || c === ']') depth--
    else if (c === ',' && depth === 0) return ab.slice(0, i).trim()
  }
  return ab.trim() || null
}

/** Objekt-Literal(e) aus insert/update/upsert-Erstargument. */
function extractWritePayloads(firstArg) {
  const t = firstArg.trim()
  if (t.startsWith('{') && t.endsWith('}')) return [t]
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1)
    const payloads = []
    let d = 0
    let start = -1
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i]
      if (c === "'" || c === '"' || c === '`') {
        const lit = readStringLiteral(inner, i)
        if (!lit) return null
        i = lit.end - 1
        continue
      }
      if (c === '{') {
        if (d === 0) start = i
        d++
      } else if (c === '}') {
        d--
        if (d === 0 && start >= 0) {
          payloads.push(inner.slice(start, i + 1))
          start = -1
        }
      }
    }
    return payloads.length ? payloads : null
  }
  return null
}

function processFile(filePath, schema, allow, stats, violations) {
  const src = fs.readFileSync(filePath, 'utf8')
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  const consts = collectStringConsts(src)

  const fromRe = /\.from\s*\(/g
  let fm
  const seenRanges = []
  while ((fm = fromRe.exec(src))) {
    const dotIdx = fm.index
    // avoid double if somehow
    const chain = parseFromChain(src, dotIdx)
    if (!chain) {
      skip('from_unparsed')
      continue
    }
    if (chain.dynamic) {
      skip('from_dynamic')
      continue
    }
    const table = chain.table
    if (!schema.has(table)) {
      // RPC-ähnliche / storage? — zählen, nicht alarmieren (könnte Schema-Drift sein)
      skip('from_table_not_in_schema')
      continue
    }

    let checkedSomething = false

    for (const call of chain.calls) {
      if (call.method === 'select') {
        const ab = call.argsBody.trim()
        let selectStr = null
        let selectLine = call.line
        if (ab.startsWith("'") || ab.startsWith('"') || ab.startsWith('`')) {
          const lit = readStringLiteral(ab, 0)
          if (!lit) {
            skip('select_unparsed')
            continue
          }
          if (lit.hasInterp) {
            skip('select_composed')
            continue
          }
          // only pure string as first arg — allow optional second options after comma
          const after = ab.slice(lit.end).trim()
          if (after && !after.startsWith(',')) {
            skip('select_unparsed')
            continue
          }
          selectStr = lit.value
        } else {
          // const ref: SELECT_FOO or SELECT_FOO as first token
          const id = readIdent(ab, 0)
          if (!id) {
            skip('select_non_literal')
            continue
          }
          const rest = ab.slice(id.end).trim()
          if (rest && !rest.startsWith(',')) {
            skip('select_non_literal')
            continue
          }
          const c = consts.get(id.name)
          if (!c) {
            skip('select_const_unresolved')
            continue
          }
          selectStr = c.value
          selectLine = c.line
        }
        checkedSomething = true
        stats.checked++
        checkSelectFields(selectStr, table, schema, rel, selectLine, violations)
      } else if (WRITE_METHODS.has(call.method)) {
        const ab = call.argsBody.trim()
        const firstArg = readFirstArg(ab)
        if (!firstArg) {
          skip('write_non_literal')
          continue
        }
        const payloads = extractWritePayloads(firstArg)
        if (!payloads) {
          skip('write_non_literal')
          continue
        }
        let anySpread = false
        const allKeys = []
        for (const pl of payloads) {
          const keys = objectLiteralKeys(pl)
          for (const k of keys) {
            if (k.spread || k.dynamic) anySpread = true
            else if (k.key) allKeys.push(k.key)
          }
        }
        if (anySpread && !allKeys.length) {
          skip('write_spread_only')
          continue
        }
        if (anySpread) skip('write_partial_spread')
        if (!allKeys.length) {
          skip('write_no_keys')
          continue
        }
        checkedSomething = true
        stats.checked++
        for (const key of allKeys) {
          assertColumn(key, table, schema, rel, call.line, violations)
        }
      } else if (FILTER_METHODS.has(call.method)) {
        const ab = call.argsBody.trim()
        if (!(ab.startsWith("'") || ab.startsWith('"') || ab.startsWith('`'))) {
          skip('filter_non_literal')
          continue
        }
        const lit = readStringLiteral(ab, 0)
        if (!lit || lit.hasInterp) {
          skip('filter_non_literal')
          continue
        }
        // PostgREST-Pfad: .eq('angebote.lead_id', …)
        if (lit.value.includes('.')) {
          skip('filter_embedded_path')
          continue
        }
        checkedSomething = true
        stats.checked++
        assertColumn(lit.value, table, schema, rel, call.line, violations)
      }
    }

    if (!checkedSomething) {
      skip('chain_no_checkable_call')
    }
  }
}

function main() {
  const typesPath = resolveTypesPath()
  if (!typesPath) {
    console.log('[check-db-spalten] OK (übersprungen)')
    process.exit(0)
  }

  const schema = parseSchema(typesPath)
  console.log(
    `[check-db-spalten] Schema: ${schema.size} Tabellen/Views aus ${path.relative(ROOT, typesPath) || typesPath}`
  )

  const { allow, lineCount } = loadAllowlist()
  if (lineCount > ALLOWLIST_MAX_LINES) {
    console.error(
      `[check-db-spalten] Allowlist hat ${lineCount} Einträge, Höchstwert ist ${ALLOWLIST_MAX_LINES}. Liste darf nicht wachsen.`
    )
    process.exit(1)
  }

  const files = walk(SRC)
  const stats = { checked: 0 }
  const violations = []
  // filter allow into assertColumn via closure — patch assert to use allow
  const filtered = []
  for (const f of files) {
    processFile(f, schema, allow, stats, violations)
  }
  for (const v of violations) {
    const key = `${v.file}:${v.line}:${v.table}:${v.column}`
    if (allow.has(key)) continue
    filtered.push(v)
  }

  // dedupe
  const seen = new Set()
  const unique = []
  for (const v of filtered) {
    const k = `${v.file}:${v.line}:${v.table}:${v.column}`
    if (seen.has(k)) continue
    seen.add(k)
    unique.push(v)
  }

  const skippedTotal = [...skipReasons.values()].reduce((a, b) => a + b, 0)
  console.log(`[check-db-spalten] geprüft: ${stats.checked}`)
  console.log(`[check-db-spalten] übersprungen: ${skippedTotal}`)
  if (skipReasons.size) {
    const grouped = [...skipReasons.entries()].sort((a, b) => b[1] - a[1])
    for (const [reason, n] of grouped) {
      console.log(`  - ${reason}: ${n}`)
    }
  }
  console.log(`[check-db-spalten] Verstöße: ${unique.length}`)
  console.log(`[check-db-spalten] Allowlist-Zeilen: ${lineCount} (max ${ALLOWLIST_MAX_LINES})`)

  if (unique.length) {
    console.error('\n[check-db-spalten] Unbekannte Spalten:')
    for (const v of unique) {
      const hint = v.hint ? ` — meintest du \`${v.hint}\`?` : ''
      console.error(
        `  ${v.file}:${v.line}  Tabelle \`${v.table}\`  Spalte \`${v.column}\`${hint}`
      )
    }
    process.exit(1)
  }

  console.log('[check-db-spalten] OK')
  process.exit(0)
}

main()
