/**
 * P3-2: withCrmReadFallback → createClient() (nach Staging-RLS-Fix).
 * Usage: node scripts/p3-2-remove-crm-read-fallback.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const files = execSync('rg -l withCrmReadFallback src --glob "*.{ts,tsx}"', {
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .filter(Boolean)

function ensureCreateClientImport(src) {
  if (/\bcreateClient\b/.test(src) && /from ['"]@\/lib\/supabase-server['"]/.test(src)) {
    // maybe createClient already imported from elsewhere — ensure named import
    if (
      /import\s*\{[^}]*\bcreateClient\b[^}]*\}\s*from\s*['"]@\/lib\/supabase-server['"]/.test(
        src
      )
    ) {
      return src
    }
  }
  if (/import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/supabase-server['"]/.test(src)) {
    return src.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/supabase-server['"]/,
      (full, inner) => {
        if (/\bcreateClient\b/.test(inner)) return full
        const parts = inner
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
        parts.push('createClient')
        return `import { ${parts.join(', ')} } from '@/lib/supabase-server'`
      }
    )
  }
  if (/^import /m.test(src)) {
    return src.replace(
      /^import /m,
      `import { createClient } from '@/lib/supabase-server'\nimport `
    )
  }
  return `import { createClient } from '@/lib/supabase-server'\n` + src
}

function stripFallbackImport(src) {
  return src.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/kunden\/kunden-db['"]\s*\n?/g,
    (full, inner) => {
      const kept = inner
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .filter((p) => !/\bwithCrmReadFallback\b/.test(p) && !/\bwithKundenReadClient\b/.test(p))
      if (!kept.length) return ''
      return `import { ${kept.join(', ')} } from '@/lib/kunden/kunden-db'\n`
    }
  )
}

function replaceCalls(input) {
  const needle = 'withCrmReadFallback'
  let out = ''
  let i = 0
  while (true) {
    const idx = input.indexOf(needle, i)
    if (idx < 0) {
      out += input.slice(i)
      break
    }
    let start = idx
    const before = input.slice(Math.max(0, idx - 12), idx)
    const awaitMatch = before.match(/await\s*$/)
    if (awaitMatch) start = idx - awaitMatch[0].length
    out += input.slice(i, start)

    let j = idx + needle.length
    while (j < input.length && /\s/.test(input[j])) j++
    if (input[j] !== '(') {
      out += input.slice(start, idx + needle.length)
      i = idx + needle.length
      continue
    }
    let depth = 0
    let k = j
    let inStr = null
    for (; k < input.length; k++) {
      const c = input[k]
      if (inStr) {
        if (c === '\\') {
          k++
          continue
        }
        if (c === inStr) inStr = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') {
        inStr = c
        continue
      }
      if (c === '(') depth++
      else if (c === ')') {
        depth--
        if (depth === 0) {
          k++
          break
        }
      }
    }
    const call = input.slice(idx, k)
    const m = call.match(
      /^withCrmReadFallback\(\s*async\s*\(\s*(\w+)\s*\)\s*=>\s*([\s\S]*)\)$/
    )
    if (!m) {
      out += input.slice(start, k)
      i = k
      continue
    }
    const dbVar = m[1]
    let body = m[2].trim()
    let isBlock = false
    if (body.startsWith('{') && body.endsWith('}')) {
      isBlock = true
      body = body.slice(1, -1).trim()
    }
    if (isBlock) {
      out += `await (async () => {\n  const ${dbVar} = createClient()\n  ${body}\n})()`
    } else {
      out += `await (() => { const ${dbVar} = createClient(); return ${body} })()`
    }
    i = k
  }
  return out
}

let updated = 0
for (const f of files) {
  if (f.endsWith('kunden-db.ts')) continue
  const before = readFileSync(f, 'utf8')
  if (!before.includes('withCrmReadFallback')) continue
  let s = stripFallbackImport(before)
  s = ensureCreateClientImport(s)
  s = replaceCalls(s)
  // leftover mentions in comments
  s = s.replace(/withCrmReadFallback/g, 'createClient')
  s = s.replace(/withKundenReadClient/g, 'createClient')
  if (s !== before) {
    writeFileSync(f, s)
    updated++
    console.log('updated', f)
  }
}

console.log('updated_count', updated)
