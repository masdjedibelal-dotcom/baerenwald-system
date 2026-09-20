/**
 * P5-19: Hex in .ts/.tsx → C.* aus @/lib/tokens/colors (Pfad /tokens/ ist audit-exempt).
 * Usage: node scripts/codemod-p5-19-hex-to-tokens.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SRC = join(ROOT, 'src')
const TOKENS = join(SRC, 'lib/tokens/colors.ts')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

function normalizeHex(raw) {
  let h = raw.replace(/^#/, '').toLowerCase()
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  return `#${h}`
}

function loadMap() {
  const src = readFileSync(TOKENS, 'utf8')
  const map = new Map()
  const re2 = /(\w+)\s*:\s*'#([0-9a-fA-F]{3,8})'\s*,?/g
  let m
  while ((m = re2.exec(src))) {
    map.set(normalizeHex('#' + m[2]), m[1])
  }
  return map
}

const IMPORT_RE = /import\s*\{[^}]*\bC\b[^}]*\}\s*from\s*['"]@\/lib\/tokens\/colors['"]/
const IMPORT_LINE = "import { C } from '@/lib/tokens/colors'\n"

function regexLikely(src, slashIdx) {
  let j = slashIdx - 1
  while (j >= 0 && /[ \t]/.test(src[j])) j--
  if (j < 0) return true
  const c = src[j]
  // Avoid https:// — colon after identifier is not a regex context
  if (c === ':') {
    let k = j - 1
    while (k >= 0 && /[A-Za-z0-9_]/.test(src[k])) k--
    const word = src.slice(k + 1, j)
    if (word === 'https' || word === 'http' || word === 'ftp') return false
  }
  return /[({[=,;!&|?+*%^~<>\n]/.test(c) || /(?:^|[^$\w])(?:return|throw|case|typeof|delete|void|in|of)\s*$/.test(
    src.slice(Math.max(0, j - 12), j + 1)
  )
}

function findImportInsertIndex(src) {
  const lines = src.split('\n')
  let lastImport = -1
  let inBlockComment = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false
      continue
    }
    if (line.trim().startsWith('/*')) {
      if (!line.includes('*/')) inBlockComment = true
      continue
    }
    if (/^import\b/.test(line.trim())) {
      lastImport = i
      continue
    }
    if (lastImport >= 0 && line.trim() === '') continue
    if (lastImport >= 0) break
  }
  if (lastImport < 0) return 0
  let end = lastImport
  while (end < lines.length && !/;/.test(lines[end])) end++
  return lines.slice(0, end + 1).join('\n').length + 1
}

function skipRegex(src, i) {
  // i at /
  i++
  while (i < src.length) {
    if (src[i] === '\\') {
      i += 2
      continue
    }
    if (src[i] === '[') {
      i++
      while (i < src.length && src[i] !== ']') {
        if (src[i] === '\\') i += 2
        else i++
      }
      i++
      continue
    }
    if (src[i] === '/') {
      i++
      while (i < src.length && /[a-z]/i.test(src[i])) i++
      return i
    }
    if (src[i] === '\n') return i
    i++
  }
  return i
}

function segment(src) {
  const segs = []
  let i = 0
  let codeStart = 0
  const pushCode = (end) => {
    if (end > codeStart) segs.push({ start: codeStart, end, kind: 'code' })
  }

  while (i < src.length) {
    if (src[i] === '/' && src[i + 1] === '/') {
      const e = src.indexOf('\n', i)
      i = e < 0 ? src.length : e + 1
      continue
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2)
      i = e < 0 ? src.length : e + 2
      continue
    }
    if (src[i] === '/' && src[i + 1] !== '/' && src[i + 1] !== '*' && regexLikely(src, i)) {
      i = skipRegex(src, i)
      continue
    }

    const q = src[i]
    if (q === "'" || q === '"') {
      pushCode(i)
      const start = i
      i++
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2
          continue
        }
        if (src[i] === q) {
          i++
          break
        }
        i++
      }
      segs.push({ start, end: i, kind: 'str' })
      codeStart = i
      continue
    }
    if (q === '`') {
      pushCode(i)
      const start = i
      i++
      while (i < src.length) {
        if (src[i] === '\\') {
          i += 2
          continue
        }
        if (src[i] === '`') {
          i++
          break
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          i += 2
          let depth = 1
          while (i < src.length && depth > 0) {
            if (src[i] === '/' && src[i + 1] === '/') {
              const e = src.indexOf('\n', i)
              i = e < 0 ? src.length : e + 1
              continue
            }
            if (src[i] === '/' && src[i + 1] === '*') {
              const e = src.indexOf('*/', i + 2)
              i = e < 0 ? src.length : e + 2
              continue
            }
            if (src[i] === '/' && regexLikely(src, i)) {
              i = skipRegex(src, i)
              continue
            }
            if (src[i] === "'" || src[i] === '"') {
              const qq = src[i++]
              while (i < src.length) {
                if (src[i] === '\\') {
                  i += 2
                  continue
                }
                if (src[i] === qq) {
                  i++
                  break
                }
                i++
              }
              continue
            }
            if (src[i] === '`') {
              // nested template: skip until its end (no hex rewrite inside nested structure here — nested is separate?)
              // Actually nested templates are still part of ${} expression; skip whole nested tpl
              i++
              while (i < src.length) {
                if (src[i] === '\\') {
                  i += 2
                  continue
                }
                if (src[i] === '`') {
                  i++
                  break
                }
                if (src[i] === '$' && src[i + 1] === '{') {
                  depth++
                  i += 2
                  continue
                }
                i++
              }
              continue
            }
            if (src[i] === '{') depth++
            else if (src[i] === '}') depth--
            i++
          }
          continue
        }
        i++
      }
      segs.push({ start, end: i, kind: 'tpl' })
      codeStart = i
      continue
    }
    i++
  }
  pushCode(src.length)
  return segs
}

function rewriteQuotedHex(text, hexToKey, report) {
  return text.replace(/(['"])#([0-9a-fA-F]{3,8})\1/g, (full, _q, h) => {
    const key = hexToKey.get(normalizeHex('#' + h))
    if (!key) {
      report(0, ['#' + h])
      return full
    }
    report(1, [])
    return `C.${key}`
  })
}

/** Rewrite hex in any source fragment (handles nested templates via segment). */
function rewriteFragment(text, hexToKey, report) {
  if (!/#[0-9a-fA-F]{3,8}\b/.test(text)) return text
  const segs = segment(text)
  let out = ''
  for (const seg of segs) {
    const chunk = text.slice(seg.start, seg.end)
    if (seg.kind === 'code') {
      out += rewriteQuotedHex(chunk, hexToKey, report)
      continue
    }
    if (seg.kind === 'str') {
      const inner = chunk.slice(1, -1)
      const only = /^#([0-9a-fA-F]{3,8})$/.exec(inner)
      if (only) {
        const key = hexToKey.get(normalizeHex(inner))
        if (key) {
          out += `C.${key}`
          report(1, [])
        } else {
          report(0, [inner])
          out += chunk
        }
        continue
      }
      if (/#[0-9a-fA-F]{3,8}\b/.test(inner)) {
        let rebuilt = ''
        let j = 0
        let used = false
        while (j < inner.length) {
          const hm = /^#([0-9a-fA-F]{3,8})\b/.exec(inner.slice(j))
          if (hm) {
            const key = hexToKey.get(normalizeHex(hm[0]))
            if (key) {
              rebuilt += `\${C.${key}}`
              j += hm[0].length
              report(1, [])
              used = true
              continue
            }
            report(0, [hm[0]])
          }
          const ch = inner[j]
          if (ch === '`' || ch === '\\' || (ch === '$' && inner[j + 1] === '{')) rebuilt += '\\' + ch
          else rebuilt += ch
          j++
        }
        out += used ? '`' + rebuilt + '`' : chunk
        continue
      }
      out += chunk
      continue
    }
    // tpl
    let i = 0
    out += chunk[i++]
    while (i < chunk.length) {
      if (chunk[i] === '\\') {
        out += chunk[i] + (chunk[i + 1] || '')
        i += 2
        continue
      }
      if (chunk[i] === '`') {
        out += '`'
        i++
        break
      }
      if (chunk[i] === '$' && chunk[i + 1] === '{') {
        const abs = seg.start + i
        let k = abs + 2
        let depth = 1
        while (k < text.length && depth > 0) {
          if (text[k] === '/' && text[k + 1] === '/') {
            const e = text.indexOf('\n', k)
            k = e < 0 ? text.length : e + 1
            continue
          }
          if (text[k] === '/' && text[k + 1] === '*') {
            const e = text.indexOf('*/', k + 2)
            k = e < 0 ? text.length : e + 2
            continue
          }
          if (text[k] === '/' && regexLikely(text, k)) {
            k = skipRegex(text, k)
            continue
          }
          if (text[k] === "'" || text[k] === '"') {
            const qq = text[k++]
            while (k < text.length) {
              if (text[k] === '\\') {
                k += 2
                continue
              }
              if (text[k] === qq) {
                k++
                break
              }
              k++
            }
            continue
          }
          if (text[k] === '`') {
            k++
            while (k < text.length) {
              if (text[k] === '\\') {
                k += 2
                continue
              }
              if (text[k] === '`') {
                k++
                break
              }
              if (text[k] === '$' && text[k + 1] === '{') {
                depth++
                k += 2
                continue
              }
              k++
            }
            continue
          }
          if (text[k] === '{') depth++
          else if (text[k] === '}') depth--
          k++
        }
        // ${ ... } — rewrite body recursively (nested templates)
        const body = text.slice(abs + 2, k - 1)
        out += '${' + rewriteFragment(body, hexToKey, report) + '}'
        i = k - seg.start
        continue
      }
      const hm = /^#([0-9a-fA-F]{3,8})\b/.exec(chunk.slice(i))
      if (hm) {
        const key = hexToKey.get(normalizeHex(hm[0]))
        if (key) {
          out += `\${C.${key}}`
          i += hm[0].length
          report(1, [])
          continue
        }
        report(0, [hm[0]])
      }
      out += chunk[i]
      i++
    }
  }
  return out
}

function processFile(file, hexToKey) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (rel.includes('/tokens/')) return { changed: false, count: 0, unknown: [] }

  const original = readFileSync(file, 'utf8')
  let replacements = 0
  const unknown = []
  const report = (n, u) => {
    replacements += n
    unknown.push(...u)
  }

  let src = rewriteFragment(original, hexToKey, report)

  if (replacements > 0 && !IMPORT_RE.test(src)) {
    const idx = findImportInsertIndex(src)
    src = src.slice(0, idx) + IMPORT_LINE + src.slice(idx)
  }

  if (src !== original && !DRY) writeFileSync(file, src)
  return { changed: src !== original, count: replacements, unknown }
}

const hexToKey = loadMap()
console.log(`[p5-19-hex] ${hexToKey.size} token hex keys`)

let files = 0
let total = 0
const unknownAll = new Map()
for (const f of walk(SRC)) {
  const r = processFile(f, hexToKey)
  if (r.count) {
    files++
    total += r.count
    console.log(`${DRY ? 'DRY ' : ''}${r.count}\t${relative(ROOT, f)}`)
  }
  for (const u of r.unknown || []) {
    unknownAll.set(u, (unknownAll.get(u) || 0) + 1)
  }
}
console.log(`[p5-19-hex] ${DRY ? 'would replace' : 'replaced'} ${total} in ${files} files`)
if (unknownAll.size) {
  console.log('[p5-19-hex] unknown hex:')
  for (const [k, v] of [...unknownAll.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}\t${k}`)
  }
}
