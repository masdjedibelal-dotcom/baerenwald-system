#!/usr/bin/env node
/**
 * Build-Check P5-4/P5-5: keine rohen button/input/select/textarea außerhalb Allowlist.
 */
import { countRawElementsOutsideAllowlist } from './lib/count-raw-elements.mjs'

const r = countRawElementsOutsideAllowlist()
const field = r.input + r.select + r.textarea

if (r.button === 0 && field === 0) {
  console.log('OK: raw elements nur in Allowlist (MockBtn/MockField/Kanon)')
  process.exit(0)
}

console.error('Rohe Elemente außerhalb Allowlist:')
for (const h of r.hits.slice(0, 40)) {
  console.error(`  ${h.file}:${h.line}  <${h.kind}>`)
}
if (r.hits.length > 40) console.error(`  … +${r.hits.length - 40} weitere`)
console.error(
  `\nbutton=${r.button} field=${field}. Nutze MockBtn / MockInput|Select|Textarea; Ausnahmen in scripts/raw-element-allowlist.txt`
)
process.exit(1)
