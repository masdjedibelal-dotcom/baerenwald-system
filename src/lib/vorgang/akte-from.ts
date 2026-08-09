/** Akte-Rückweg: genau 1 Ebene Ursprung — Spec §14 / Welle 4. */

export type AkteFromRef = {
  kind: 'rechnung' | 'auftrag' | 'angebot' | 'anfrage'
  id: string
}

const KIND_SET = new Set<AkteFromRef['kind']>(['rechnung', 'auftrag', 'angebot', 'anfrage'])

export function parseAkteFromParam(raw: string | null | undefined): AkteFromRef | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  const i = s.indexOf(':')
  if (i <= 0) return null
  const kind = s.slice(0, i).toLowerCase() as AkteFromRef['kind']
  const id = s.slice(i + 1).trim()
  if (!KIND_SET.has(kind) || !id || id.includes(':')) return null
  return { kind, id }
}

export function buildAkteFromParam(ref: AkteFromRef): string {
  return `${ref.kind}:${ref.id}`
}

export function hrefWithAkteFrom(pathname: string, ref: AkteFromRef, extra?: Record<string, string>): string {
  const q = new URLSearchParams(extra)
  q.set('from', buildAkteFromParam(ref))
  const qs = q.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function hrefClearingAkteFrom(pathname: string, searchParams: URLSearchParams): string {
  const q = new URLSearchParams(searchParams.toString())
  q.delete('from')
  const qs = q.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function akteFromHref(ref: AkteFromRef): string {
  switch (ref.kind) {
    case 'rechnung':
      return `/rechnungen/${ref.id}`
    case 'auftrag':
      return `/auftraege/${ref.id}`
    case 'angebot':
      return `/angebote/${ref.id}`
    case 'anfrage':
      return `/anfragen/${ref.id}`
  }
}

export function akteFromLabel(ref: AkteFromRef, display?: string | null): string {
  const name = display?.trim()
  if (name) return `Zurück zu ${name}`
  switch (ref.kind) {
    case 'rechnung':
      return 'Zurück zur Rechnung'
    case 'auftrag':
      return 'Zurück zum Auftrag'
    case 'angebot':
      return 'Zurück zum Angebot'
    case 'anfrage':
      return 'Zurück zur Anfrage'
  }
}
