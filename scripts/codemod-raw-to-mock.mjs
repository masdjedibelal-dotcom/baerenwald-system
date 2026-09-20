#!/usr/bin/env node
/**
 * P5-4/P5-5 Codemod: rohe button → MockBtn; input/select/textarea → MockInput/Select/Textarea.
 * Skip: Allowlist + checkbox/radio/hidden/file.
 *
 * Usage:
 *   node scripts/codemod-raw-to-mock.mjs [subdir…]
 *   node scripts/codemod-raw-to-mock.mjs src/components/auftraege
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import {
  isAllowlisted,
  loadRawElementAllowlist,
} from './lib/count-raw-elements.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const allowlist = loadRawElementAllowlist()
const targets = process.argv.slice(2).map((a) => path.resolve(ROOT, a))
const scopeDirs = targets.length ? targets : [path.join(ROOT, 'src')]

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (['node_modules', '.next'].includes(ent.name)) continue
      walk(p, acc)
    } else if (/\.tsx$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function attrMap(el) {
  const m = new Map()
  for (const a of el.attributes.properties) {
    if (ts.isJsxAttribute(a) && a.name && ts.isIdentifier(a.name)) {
      m.set(a.name.text, a)
    }
  }
  return m
}

function attrText(attr, sf) {
  if (!attr) return null
  if (!attr.initializer) return { kind: 'bool' }
  if (ts.isStringLiteral(attr.initializer)) {
    return { kind: 'str', text: attr.initializer.text }
  }
  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
    return { kind: 'expr', text: attr.initializer.expression.getText(sf) }
  }
  return { kind: 'raw', text: attr.initializer.getText(sf) }
}

function emitAttr(name, info) {
  if (!info) return ''
  if (info.kind === 'bool') return ` ${name}`
  if (info.kind === 'str') return ` ${name}=${JSON.stringify(info.text)}`
  return ` ${name}={${info.text}}`
}

function classTokens(info) {
  if (!info) return []
  if (info.kind === 'str') return info.text.split(/\s+/).filter(Boolean)
  return null // complex
}

function stripClassTokens(info, remove) {
  if (!info || info.kind !== 'str') return info
  const left = info.text
    .split(/\s+/)
    .filter((t) => t && !remove.has(t))
    .join(' ')
  if (!left) return null
  return { kind: 'str', text: left }
}

function transformButton(el, sf) {
  const attrs = attrMap(el)
  const cls = attrText(attrs.get('className'), sf)
  const tokens = classTokens(cls)

  // Nur einfache String-Klassen zuverlässig mappen
  if (tokens == null && cls) {
    // className={cn(...)} — wenn cn('btn'...) oft; skip für manuell
    return null
  }

  const remove = new Set(['btn', 'primary', 'secondary', 'ghost', 'danger', 'sm', 'icon', 'w-full'])
  let kind = ''
  let sm = false
  let fullWidth = false
  let iconOnly = false
  if (tokens) {
    if (tokens.includes('primary')) kind = 'primary'
    else if (tokens.includes('secondary')) kind = 'secondary'
    else if (tokens.includes('ghost')) kind = 'ghost'
    else if (tokens.includes('danger')) kind = 'danger'
    sm = tokens.includes('sm')
    fullWidth = tokens.includes('w-full')
    iconOnly = tokens.includes('icon')
  }

  // Ohne .btn: trotzdem MockBtn wenn es wie Action aussieht (type=button default)
  const restClass = stripClassTokens(cls, remove)

  let open = '<MockBtn'
  if (kind) open += ` kind=${JSON.stringify(kind)}`
  if (sm) open += ' sm'
  if (fullWidth) open += ' fullWidth'
  if (iconOnly && !attrs.has('icon')) {
    // icon-only ohne icon-Prop — className icon behalten
    const withIcon = restClass
      ? { kind: 'str', text: `${restClass.text} icon`.trim() }
      : { kind: 'str', text: 'icon' }
    open += emitAttr('className', withIcon)
  } else if (restClass) {
    open += emitAttr('className', restClass)
  }

  for (const [name, attr] of attrs) {
    if (name === 'className') continue
    open += emitAttr(name, attrText(attr, sf))
  }

  if (el.attributes.properties.some((p) => ts.isJsxSpreadAttribute(p))) {
    // Spreads: zu riskant
    return null
  }

  if (el.closingElement) {
    const inner = sf.text.slice(el.openingElement.end, el.closingElement.getStart(sf))
    return `${open}>${inner}</MockBtn>`
  }
  return `${open} />`
}

function isSkippedInput(attrs, sf) {
  const t = attrText(attrs.get('type'), sf)
  if (!t) return false
  const v = t.kind === 'str' ? t.text : t.kind === 'expr' ? t.text.replace(/['"]/g, '') : ''
  return ['checkbox', 'radio', 'hidden', 'file'].includes(v)
}

function transformControl(tag, el, sf) {
  const attrs = attrMap(el)
  if (tag === 'input' && isSkippedInput(attrs, sf)) return null

  const component =
    tag === 'input' ? 'MockInput' : tag === 'select' ? 'MockSelect' : 'MockTextarea'

  // className: entferne redundantes "input"
  const cls = attrText(attrs.get('className'), sf)
  let newCls = cls
  if (cls?.kind === 'str') {
    const left = cls.text
      .split(/\s+/)
      .filter((t) => t && t !== 'input')
      .join(' ')
    newCls = left ? { kind: 'str', text: left } : null
  }

  let open = `<${component}`
  for (const [name, attr] of attrs) {
    if (name === 'className') {
      if (newCls) open += emitAttr('className', newCls)
      continue
    }
    open += emitAttr(name, attrText(attr, sf))
  }
  if (el.attributes.properties.some((p) => ts.isJsxSpreadAttribute(p))) {
    return null
  }

  if (el.closingElement) {
    const inner = sf.text.slice(el.openingElement.end, el.closingElement.getStart(sf))
    return `${open}>${inner}</${component}>`
  }
  return `${open} />`
}

function ensureImports(src, names) {
  const needed = names.filter((n) => new RegExp(`\\b${n}\\b`).test(src))
  if (!needed.length) return src

  // Prefer adding to existing mock-ui / MockForm import
  const formRe = /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/mock-ui\/MockForm['"]/
  const barrelRe = /import\s*\{([^}]*)\}\s*from\s*['"]@\/components\/mock-ui['"]/

  if (formRe.test(src)) {
    return src.replace(formRe, (_m, inner) => {
      const have = new Set(inner.split(',').map((s) => s.trim()).filter(Boolean))
      for (const n of needed) have.add(n)
      return `import { ${[...have].sort().join(', ')} } from '@/components/mock-ui/MockForm'`
    })
  }
  if (barrelRe.test(src)) {
    return src.replace(barrelRe, (_m, inner) => {
      const have = new Set(inner.split(',').map((s) => s.trim()).filter(Boolean))
      for (const n of needed) have.add(n)
      return `import { ${[...have].sort().join(', ')} } from '@/components/mock-ui'`
    })
  }

  const btnOnly = needed.filter((n) => n === 'MockBtn')
  const fieldOnes = needed.filter((n) => n !== 'MockBtn')
  let imp = ''
  if (btnOnly.length) {
    imp += `import { MockBtn } from '@/components/mock-ui'\n`
  }
  if (fieldOnes.length) {
    imp += `import { ${fieldOnes.sort().join(', ')} } from '@/components/mock-ui/MockForm'\n`
  }

  if (/^['"]use client['"];?\s*\n/m.test(src)) {
    return src.replace(/^(['"]use client['"];?\s*\n)/m, `$1${imp}`)
  }
  if (/^import /m.test(src)) {
    return src.replace(/^import /m, `${imp}import `)
  }
  return imp + src
}

function transformFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  if (isAllowlisted(rel, allowlist)) return { changed: false }

  const text = fs.readFileSync(filePath, 'utf8')
  if (!/<button\b|<input\b|<select\b|<textarea\b/.test(text)) return { changed: false }

  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  /** @type {{ start: number, end: number, text: string }[]} */
  const edits = []
  const used = new Set()

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = node.tagName.getText(sf)
      const el = ts.isJsxSelfClosingElement(node)
        ? node
        : node.parent && ts.isJsxElement(node.parent)
          ? node.parent
          : null

      if (tag === 'button' && el) {
        // skip if already inside — only transform this element
        const full = ts.isJsxSelfClosingElement(node) ? node : el
        const start = full.getStart(sf)
        const end = full.getEnd()
        // For opening-only, use full JsxElement
        const target = ts.isJsxSelfClosingElement(node)
          ? node
          : el
        const replacement = transformButton(
          ts.isJsxSelfClosingElement(target)
            ? target
            : {
                openingElement: target.openingElement,
                closingElement: target.closingElement,
                attributes: target.openingElement.attributes,
                getStart: () => target.getStart(sf),
                getEnd: () => target.getEnd(),
              },
          sf
        )
        // Fix: pass proper shape
      }
    }

    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node
      const tag = opening.tagName.getText(sf)
      if (tag === 'button') {
        // Build fake el shape for transformButton
        const fake = {
          openingElement: opening,
          closingElement: ts.isJsxElement(node) ? node.closingElement : null,
          attributes: opening.attributes,
        }
        // transformButton expects el with attributes on el - fix transformButton to use openingElement
        const rep = transformButtonFixed(fake, sf)
        if (rep) {
          edits.push({ start: node.getStart(sf), end: node.getEnd(), text: rep })
          used.add('MockBtn')
        }
      } else if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        const fake = {
          openingElement: opening,
          closingElement: ts.isJsxElement(node) ? node.closingElement : null,
          attributes: opening.attributes,
        }
        const rep = transformControlFixed(tag, fake, sf)
        if (rep) {
          edits.push({ start: node.getStart(sf), end: node.getEnd(), text: rep })
          used.add(tag === 'input' ? 'MockInput' : tag === 'select' ? 'MockSelect' : 'MockTextarea')
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  // Avoid nested double-edits: collect then apply from end
  // Skip children of replaced nodes by sorting and checking overlap

  visit(sf)

  if (!edits.length) return { changed: false }

  // Remove nested edits (keep outermost)
  edits.sort((a, b) => a.start - b.start)
  const filtered = []
  let lastEnd = -1
  for (const e of edits) {
    if (e.start < lastEnd) continue
    filtered.push(e)
    lastEnd = e.end
  }

  let out = text
  for (const e of filtered.sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end)
  }
  out = ensureImports(out, [...used])
  if (out === text) return { changed: false }
  fs.writeFileSync(filePath, out)
  return { changed: true, used: [...used], edits: filtered.length }
}

function transformButtonFixed(el, sf) {
  const attrs = attrMap(el.openingElement || el)
  const cls = attrText(attrs.get('className'), sf)
  const tokens = classTokens(cls)
  if (tokens == null && cls) return null // complex className

  const remove = new Set(['btn', 'primary', 'secondary', 'ghost', 'danger', 'sm', 'icon', 'w-full'])
  let kind = ''
  let sm = false
  let fullWidth = false
  if (tokens) {
    if (tokens.includes('primary')) kind = 'primary'
    else if (tokens.includes('secondary')) kind = 'secondary'
    else if (tokens.includes('ghost')) kind = 'ghost'
    else if (tokens.includes('danger')) kind = 'danger'
    sm = tokens.includes('sm')
    fullWidth = tokens.includes('w-full')
  }
  const restClass = stripClassTokens(cls, remove)

  // Spreads skip
  const props = (el.openingElement || el).attributes.properties
  if (props.some((p) => ts.isJsxSpreadAttribute(p))) return null

  let open = '<MockBtn'
  if (kind) open += ` kind=${JSON.stringify(kind)}`
  if (sm) open += ' sm'
  if (fullWidth) open += ' fullWidth'
  if (restClass) open += emitAttr('className', restClass)

  for (const [name, attr] of attrs) {
    if (name === 'className') continue
    open += emitAttr(name, attrText(attr, sf))
  }

  if (el.closingElement) {
    const inner = sf.text.slice(
      (el.openingElement || el).end,
      el.closingElement.getStart(sf)
    )
    return `${open}>${inner}</MockBtn>`
  }
  return `${open} />`
}

function transformControlFixed(tag, el, sf) {
  const opening = el.openingElement || el
  const attrs = attrMap(opening)
  if (tag === 'input' && isSkippedInput(attrs, sf)) return null
  if (opening.attributes.properties.some((p) => ts.isJsxSpreadAttribute(p))) return null

  const component =
    tag === 'input' ? 'MockInput' : tag === 'select' ? 'MockSelect' : 'MockTextarea'
  const cls = attrText(attrs.get('className'), sf)
  let newCls = cls
  if (cls?.kind === 'str') {
    const left = cls.text
      .split(/\s+/)
      .filter((t) => t && t !== 'input')
      .join(' ')
    newCls = left ? { kind: 'str', text: left } : null
  } else if (cls?.kind === 'expr') {
    // keep expression; Mock* adds input via cn
    newCls = cls
  }

  let open = `<${component}`
  for (const [name, attr] of attrs) {
    if (name === 'className') {
      if (newCls) open += emitAttr('className', newCls)
      continue
    }
    open += emitAttr(name, attrText(attr, sf))
  }

  if (el.closingElement) {
    const inner = sf.text.slice(opening.end, el.closingElement.getStart(sf))
    return `${open}>${inner}</${component}>`
  }
  return `${open} />`
}

let files = 0
let edits = 0
for (const dir of scopeDirs) {
  for (const file of walk(dir)) {
    const r = transformFile(file)
    if (r.changed) {
      files++
      edits += r.edits || 0
      console.log('updated', path.relative(ROOT, file), r.used?.join(','))
    }
  }
}
console.log(JSON.stringify({ files, edits }, null, 2))
