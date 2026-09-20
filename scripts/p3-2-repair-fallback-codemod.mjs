import { readFileSync, writeFileSync } from 'fs'

function fixCreateClientGeneric(src) {
  const needle = 'createClient<'
  let out = ''
  let i = 0
  while (true) {
    const idx = src.indexOf(needle, i)
    if (idx < 0) {
      out += src.slice(i)
      break
    }
    out += src.slice(i, idx)
    let k = idx + 'createClient'.length
    if (src[k] !== '<') {
      out += 'createClient'
      i = idx + 'createClient'.length
      continue
    }
    let depth = 0
    for (; k < src.length; k++) {
      if (src[k] === '<') depth++
      else if (src[k] === '>') {
        depth--
        if (depth === 0) {
          k++
          break
        }
      }
    }
    let p = k
    while (p < src.length && /\s/.test(src[p])) p++
    if (src[p] !== '(') {
      out += 'createClient'
      i = k
      continue
    }
    const afterParen = src.slice(p + 1)
    const m = afterParen.match(/^\s*async\s*\(\s*(\w+)\s*\)\s*=>\s*/)
    if (!m) {
      out += 'createClient'
      i = k
      continue
    }
    const dbVar = m[1]
    const bodyStart = p + 1 + m[0].length
    let d = 0
    let end = p
    let inStr = null
    for (; end < src.length; end++) {
      const c = src[end]
      if (inStr) {
        if (c === '\\') {
          end++
          continue
        }
        if (c === inStr) inStr = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') {
        inStr = c
        continue
      }
      if (c === '(') d++
      else if (c === ')') {
        d--
        if (d === 0) {
          end++
          break
        }
      }
    }
    let body = src.slice(bodyStart, end - 1).trim()
    let isBlock = false
    if (body.startsWith('{') && body.endsWith('}')) {
      isBlock = true
      body = body.slice(1, -1).trim()
    }
    out = out.replace(/await\s*$/, '')
    if (isBlock) {
      out += `await (async () => {\n  const ${dbVar} = createClient()\n  ${body}\n})()`
    } else {
      out += `await (() => { const ${dbVar} = createClient(); return ${body} })()`
    }
    i = end
  }
  return out
}

function fixSafeRowsAwait(src) {
  return src.replace(/safeRows\(\(\)\s*=>\s*\n(\s*)await\s+/g, 'safeRows(async () =>\n$1')
}

const files = [
  'src/app/(dashboard)/page.tsx',
  'src/app/(dashboard)/rechnungen/actions.ts',
  'src/lib/vorgang/load-vorgaenge-liste.ts',
  'src/app/actions/objektakte-actions.ts',
]

for (const f of files) {
  let s = readFileSync(f, 'utf8')
  const before = s
  if (f.includes('page.tsx')) s = fixSafeRowsAwait(s)
  if (f.includes('objektakte')) {
    s = s.replace(
      /const \{ createClient \} = await import\('@\/lib\/kunden\/kunden-db'\)/,
      "const { createClient } = await import('@/lib/supabase-server')"
    )
  }
  s = fixCreateClientGeneric(s)
  if (s !== before) {
    writeFileSync(f, s)
    console.log('fixed', f)
  } else console.log('nochange', f)
}
