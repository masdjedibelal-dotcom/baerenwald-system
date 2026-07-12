/** PostgREST-OR-Filter für email_log-Listen (Kommunikation-Tab). */

type EmailLogQuery = {
  eq: (col: string, val: string) => unknown
  or: (expr: string) => unknown
}

export function applyEmailLogOrFilter(q: EmailLogQuery, parts: string[]): unknown {
  const unique = Array.from(new Set(parts.filter(Boolean)))
  if (unique.length === 0) {
    return q.eq('id', '00000000-0000-0000-0000-000000000000')
  }
  if (unique.length === 1) {
    const single = unique[0]!
    const eqMatch = single.match(/^([a-z_]+)\.eq\.([0-9a-f-]{36})$/i)
    if (eqMatch) return q.eq(eqMatch[1]!, eqMatch[2]!)
    return q.or(single)
  }
  return q.or(unique.join(','))
}

export function emailLogInFilter(column: string, ids: string[]): string | null {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return null
  if (unique.length === 1) return `${column}.eq.${unique[0]}`
  return `${column}.in.(${unique.join(',')})`
}

export function emailLogEqFilter(column: string, id: string | null | undefined): string | null {
  const v = id?.trim()
  return v ? `${column}.eq.${v}` : null
}
