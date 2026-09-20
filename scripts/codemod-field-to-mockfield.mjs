#!/usr/bin/env node
/**
 * E3 / P5-5: ui/Input|Textarea|Select → MockField + controls
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const SKIP = new Set([
  'src/components/ui/Input.tsx',
  'src/components/ui/Textarea.tsx',
  'src/components/ui/Select.tsx',
])

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.tsx$/.test(ent.name)) acc.push(p)
  }
  return acc
}

/** @returns {Map<string, ts.JsxAttribute>} */
function attrMap(el) {
  const m = new Map()
  for (const a of el.attributes.properties) {
    if (ts.isJsxAttribute(a) && ts.isIdentifier(a.name)) m.set(a.name.text, a)
  }
  return m
}

function attrExpr(attr, sf) {
  if (!attr) return null
  if (!attr.initializer) return { kind: 'bool', text: 'true' }
  if (ts.isStringLiteral(attr.initializer)) {
    return { kind: 'str', text: attr.initializer.text }
  }
  if (ts.isJsxExpression(attr.initializer)) {
    if (!attr.initializer.expression) return { kind: 'bool', text: 'true' }
    return { kind: 'expr', text: attr.initializer.expression.getText(sf) }
  }
  return { kind: 'expr', text: attr.initializer.getText(sf) }
}

function emitAttr(name, info) {
  if (!info) return ''
  if (info.kind === 'bool') return ` ${name}`
  if (info.kind === 'str') return ` ${name}=${JSON.stringify(info.text)}`
  return ` ${name}={${info.text}}`
}

function emitMockField(attrs, sf, inner) {
  const label = attrExpr(attrs.get('label'), sf)
  const hint = attrExpr(attrs.get('hint'), sf)
  const error = attrExpr(attrs.get('error'), sf)
  const required = attrs.get('required')
  if (!label && !hint && !error && !required) return inner

  let out = '<MockField'
  if (label) out += emitAttr('label', label)
  if (required) {
    const r = attrExpr(required, sf)
    if (r.kind === 'bool') out += ' required'
    else out += emitAttr('required', r)
  }
  if (hint) out += emitAttr('hint', hint)
  if (error) out += emitAttr('error', error)
  out += `>${inner}</MockField>`
  return out
}

function stringType(attrs, sf) {
  const t = attrExpr(attrs.get('type'), sf)
  if (!t) return null
  if (t.kind === 'str') return t.text
  if (t.kind === 'expr' && /^['"]/.test(t.text)) return t.text.slice(1, -1)
  return null
}

function mergeClass(base, classAttr, sf) {
  const c = attrExpr(classAttr, sf)
  if (!c) return { kind: 'str', text: base }
  if (c.kind === 'str') {
    const extra = c.text.trim()
    return { kind: 'str', text: extra ? `${base} ${extra}` : base }
  }
  return { kind: 'expr', text: `\`${base} \${${c.text} ?? ''}\`.trim()` }
}

function adaptRichOnChange(info) {
  if (!info) return null
  if (info.kind !== 'expr') return info
  const text = info.text.trim()
  // (e) => expr-with-e.target.value
  const arrow = text.match(/^\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*([\s\S]+)$/)
  if (arrow) {
    const [, param, bodyRaw] = arrow
    let body = bodyRaw.trim()
    if (body.startsWith('{') && body.endsWith('}')) {
      // block body — wrap with synthetic
      return {
        kind: 'expr',
        text: `(__v) => { const ${param} = { target: { value: __v }, currentTarget: { value: __v } }; ${body.slice(1, -1)} }`,
      }
    }
    const replaced = body
      .replace(new RegExp(`\\b${param}\\.target\\.value\\b`, 'g'), '__v')
      .replace(new RegExp(`\\b${param}\\.currentTarget\\.value\\b`, 'g'), '__v')
    if (replaced !== body) return { kind: 'expr', text: `(__v) => ${replaced}` }
  }
  return {
    kind: 'expr',
    text: `(__v) => { (${text})({ target: { value: __v }, currentTarget: { value: __v } }) }`,
  }
}

function transformInput(el, sf) {
  const attrs = attrMap(el)
  const typeVal = stringType(attrs, sf)
  const skip = new Set(['label', 'hint', 'error', 'className'])
  if (typeVal === 'date' || typeVal === 'time') skip.add('type')

  let tag = 'input'
  if (typeVal === 'date') tag = 'DateInput'
  else if (typeVal === 'time') tag = 'TimeInput'

  let bits = `<${tag}`
  if (tag === 'input' && typeVal) bits += ` type=${JSON.stringify(typeVal)}`
  for (const [name, attr] of attrs) {
    if (skip.has(name)) continue
    if (name === 'type' && tag !== 'input') continue
    bits += emitAttr(name, attrExpr(attr, sf))
  }
  const err = attrs.has('error')
  if (tag === 'input') {
    bits += emitAttr('className', mergeClass(err ? 'input input-error' : 'input', attrs.get('className'), sf))
  } else if (err || attrs.has('className')) {
    bits += emitAttr(
      'className',
      mergeClass(err ? 'input-error' : '', attrs.get('className'), sf)
    )
  }
  bits += ' />'
  return { text: emitMockField(attrs, sf, bits), needs: { mockField: true, date: tag === 'DateInput', time: tag === 'TimeInput' } }
}

function transformTextarea(el, sf) {
  const attrs = attrMap(el)
  const plain = attrs.has('plain')
  const long = attrs.has('long')
  const skip = new Set(['label', 'hint', 'error', 'plain', 'long', 'className'])

  if (plain) {
    let bits = '<textarea'
    for (const [name, attr] of attrs) {
      if (skip.has(name)) continue
      bits += emitAttr(name, attrExpr(attr, sf))
    }
    if (long && !attrs.has('rows')) bits += ' rows={14}'
    const base = [
      'input resize-y py-2',
      long ? 'ta--long' : 'min-h-[120px]',
      attrs.has('error') ? 'input-error' : '',
    ]
      .filter(Boolean)
      .join(' ')
    bits += emitAttr('className', mergeClass(base, attrs.get('className'), sf))
    bits += ' />'
    return {
      text: emitMockField(attrs, sf, bits),
      needs: { mockField: true },
    }
  }

  // RichTextEditor
  let bits = '<RichTextEditor'
  const id = attrExpr(attrs.get('id') || attrs.get('name'), sf)
  if (id) bits += emitAttr('id', id)
  const value = attrExpr(attrs.get('value'), sf)
  if (value) {
    if (value.kind === 'str') bits += ` value=${JSON.stringify(value.text)}`
    else bits += ` value={typeof (${value.text}) === 'string' ? (${value.text}) : ''}`
  } else bits += ' value=""'
  const onChange = adaptRichOnChange(attrExpr(attrs.get('onChange'), sf))
  if (onChange) bits += emitAttr('onChange', onChange)
  const disabled = attrExpr(attrs.get('disabled'), sf)
  if (disabled) bits += emitAttr('disabled', disabled)
  const placeholder = attrExpr(attrs.get('placeholder'), sf)
  if (placeholder) bits += emitAttr('placeholder', placeholder)

  const rows = attrExpr(attrs.get('rows'), sf)
  const minBase = long ? 192 : 120
  if (rows?.kind === 'expr' && /^\d+$/.test(rows.text)) {
    bits += ` minHeight={${Math.max(Number(rows.text) * 24, minBase)}}`
  } else if (rows?.kind === 'expr') {
    bits += ` minHeight={Math.max((${rows.text}) * 24, ${minBase})}`
  } else {
    bits += ` minHeight={${minBase}}`
  }

  const clsBase = [long ? 'ta--long' : '', attrs.has('error') ? 'border-danger' : '']
    .filter(Boolean)
    .join(' ')
  if (clsBase || attrs.has('className')) {
    bits += emitAttr('className', mergeClass(clsBase || '', attrs.get('className'), sf))
  }
  const label = attrExpr(attrs.get('label'), sf)
  if (label) bits += emitAttr('aria-label', label)
  else if (placeholder) bits += emitAttr('aria-label', placeholder)
  bits += ' />'

  return {
    text: emitMockField(attrs, sf, bits),
    needs: { mockField: true, rich: true },
  }
}

function transformSelect(el, sf) {
  const attrs = attrMap(el)
  const options = attrExpr(attrs.get('options'), sf)
  if (!options || options.kind !== 'expr') return null

  const skip = new Set(['label', 'hint', 'error', 'options', 'placeholder', 'className'])
  const label = attrExpr(attrs.get('label'), sf)
  const hint = attrExpr(attrs.get('hint'), sf)
  const error = attrExpr(attrs.get('error'), sf)
  const placeholder = attrExpr(attrs.get('placeholder'), sf) || {
    kind: 'str',
    text: 'Auswählen…',
  }
  const id = attrExpr(attrs.get('id') || attrs.get('name'), sf)
  const value = attrExpr(attrs.get('value'), sf)
  const onChange = attrExpr(attrs.get('onChange'), sf)
  const name = attrExpr(attrs.get('name'), sf)

  let combo = '<Combobox'
  if (label) combo += emitAttr('label', label)
  if (hint) combo += emitAttr('hint', hint)
  if (error) combo += emitAttr('error', error)
  if (id) combo += emitAttr('id', id)
  for (const [n, a] of attrs) {
    if (skip.has(n) || n === 'value' || n === 'onChange' || n === 'id') continue
    combo += emitAttr(n, attrExpr(a, sf))
  }
  combo += ` options={${options.text}}`
  if (value) {
    combo += ` value={${value.text} == null ? '' : String(${value.text})}`
  } else combo += ' value=""'
  combo += emitAttr('placeholder', placeholder)
  if (onChange) {
    const nameExpr = name ? (name.kind === 'str' ? JSON.stringify(name.text) : name.text) : "''"
    combo += ` onChange={(next) => {
      const handler = ${onChange.text};
      if (!handler) return;
      handler({
        target: { value: next, name: ${nameExpr} ?? '' },
        currentTarget: { value: next, name: ${nameExpr} ?? '' },
      });
    }}`
  }
  const cls = attrExpr(attrs.get('className'), sf)
  if (cls) combo += emitAttr('className', cls)
  combo += ' />'

  let sel = '<select'
  for (const [n, a] of attrs) {
    if (skip.has(n) || n === 'id') continue
    sel += emitAttr(n, attrExpr(a, sf))
  }
  if (id) sel += emitAttr('id', id)
  sel += emitAttr(
    'className',
    mergeClass(attrs.has('error') ? 'input input-error' : 'input', attrs.get('className'), sf)
  )
  sel += `>{${options.text}.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select>`

  const wrapped = emitMockField(attrs, sf, sel)
  return {
    text: `{(${options.text}).length > COMBOBOX_OPTION_THRESHOLD ? (${combo}) : (${wrapped})}`,
    needs: { mockField: true, combo: true },
  }
}

function stripImport(source, mod) {
  const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.replace(
    new RegExp(`\\n?import\\s*\\{[^}]*\\}\\s*from\\s*['"]${esc}['"];?\\s*`, 'g'),
    '\n'
  )
}

function addNamedImport(source, names, mod) {
  const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${esc}['"]`)
  const m = source.match(re)
  if (m) {
    const have = new Set(
      m[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    for (const n of names) have.add(n)
    return source.replace(re, `import { ${[...have].join(', ')} } from '${mod}'`)
  }
  const line = `import { ${names.join(', ')} } from '${mod}'\n`
  const m2 = source.match(/^import\s.+$/m)
  if (!m2) return line + source
  const idx = source.indexOf(m2[0]) + m2[0].length
  return source.slice(0, idx) + '\n' + line.trimEnd() + source.slice(idx)
}

function transformFile(filePath, content) {
  const rel = path.relative(root, filePath)
  if (SKIP.has(rel)) return null
  if (
    !content.includes('@/components/ui/Input') &&
    !content.includes('@/components/ui/Textarea') &&
    !content.includes('@/components/ui/Select')
  ) {
    return null
  }

  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  /** @type {{ start: number, end: number, text: string }[]} */
  const edits = []
  const needs = { mockField: false, date: false, time: false, rich: false, combo: false }

  function visit(node) {
    let tagName = null
    let replaceNode = null
    let attrsEl = null

    if (ts.isJsxSelfClosingElement(node)) {
      tagName = node.tagName.getText(sf)
      if (tagName === 'Input' || tagName === 'Textarea' || tagName === 'Select') {
        replaceNode = node
        attrsEl = node
      }
    } else if (ts.isJsxElement(node)) {
      tagName = node.openingElement.tagName.getText(sf)
      if (tagName === 'Input' || tagName === 'Textarea' || tagName === 'Select') {
        replaceNode = node
        attrsEl = node.openingElement
      }
    }

    if (replaceNode && attrsEl) {
      let result = null
      if (tagName === 'Input') result = transformInput(attrsEl, sf)
      else if (tagName === 'Textarea') result = transformTextarea(attrsEl, sf)
      else if (tagName === 'Select') result = transformSelect(attrsEl, sf)

      if (result) {
        edits.push({
          start: replaceNode.getStart(sf),
          end: replaceNode.getEnd(),
          text: result.text,
        })
        if (result.needs.mockField) needs.mockField = true
        if (result.needs.date) needs.date = true
        if (result.needs.time) needs.time = true
        if (result.needs.rich) needs.rich = true
        if (result.needs.combo) needs.combo = true
      }
      return
    }
    ts.forEachChild(node, visit)
  }

  visit(sf)
  if (!edits.length) return null

  edits.sort((a, b) => b.start - a.start)
  let out = content
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)

  out = stripImport(out, '@/components/ui/Input')
  out = stripImport(out, '@/components/ui/Textarea')
  out = stripImport(out, '@/components/ui/Select')

  if (needs.mockField) out = addNamedImport(out, ['MockField'], '@/components/mock-ui/MockForm')
  if (needs.date) out = addNamedImport(out, ['DateInput'], '@/components/ui/DateInput')
  if (needs.time) out = addNamedImport(out, ['TimeInput'], '@/components/ui/TimeInput')
  if (needs.rich) out = addNamedImport(out, ['RichTextEditor'], '@/components/ui/RichTextEditor')
  if (needs.combo) {
    out = addNamedImport(out, ['Combobox', 'COMBOBOX_OPTION_THRESHOLD'], '@/components/ui/Combobox')
  }

  out = out.replace(/\n{3,}/g, '\n\n')
  return out
}

let changed = 0
let failed = 0
for (const file of walk(srcDir)) {
  const rel = path.relative(root, file)
  const raw = fs.readFileSync(file, 'utf8')
  try {
    const next = transformFile(file, raw)
    if (next == null) continue
    fs.writeFileSync(file, next)
    changed++
    console.log('updated', rel)
  } catch (err) {
    failed++
    console.error('FAIL', rel, err?.message || err)
  }
}
console.log(`\nCodemod fertig: ${changed} Datei(en), ${failed} Fehler`)
