/**
 * Brace-aware: `.update({ … status|status_einfach: … })` nur innerhalb des Update-Objekts.
 * Shared by audit-status + check-status-writes (P2-5).
 */
export function findDirectStatusUpdates(src) {
  const hits = []
  const startRe = /\.update\(\s*\{/g
  let m
  while ((m = startRe.exec(src))) {
    const openIdx = m.index + m[0].length - 1 // '{'
    let depth = 0
    let i = openIdx
    let inStr = null
    let escaped = false
    for (; i < src.length; i++) {
      const ch = src[i]
      if (inStr) {
        if (escaped) {
          escaped = false
          continue
        }
        if (ch === '\\') {
          escaped = true
          continue
        }
        if (ch === inStr) inStr = null
        continue
      }
      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = ch
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          i++
          break
        }
      }
    }
    const obj = src.slice(openIdx, i)
    // Nur Objekt-Keys (nicht Werte wie `foo: status`): nach `{` oder `,`
    if (/(?:^|[{,])\s*(?:status|status_einfach)(?:\s*:|\s*[,}])/m.test(obj)) {
      const line = src.slice(0, m.index).split('\n').length
      hits.push({ index: m.index, line, obj: obj.slice(0, 120) })
    }
    startRe.lastIndex = Math.max(m.index + 1, i)
  }
  return hits
}
