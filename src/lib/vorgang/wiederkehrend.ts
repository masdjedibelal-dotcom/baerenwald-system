/** Wiederkehrende Vorgänge / Bestand (Winterdienst, Hausmeister, Wartung). */

export const WIEDERKEHR_TURNUS_VALUES = [
  'woechentlich',
  'monatlich',
  'quartal',
  'saisonal',
  'auf_abruf',
  'individuell',
] as const

export type WiederkehrTurnus = (typeof WIEDERKEHR_TURNUS_VALUES)[number]

export const WIEDERKEHR_TURNUS_LABELS: Record<WiederkehrTurnus, string> = {
  woechentlich: 'Wöchentlich',
  monatlich: 'Monatlich',
  quartal: 'Quartal',
  saisonal: 'Saisonal (Okt–März)',
  auf_abruf: 'Auf Abruf',
  individuell: 'Individuell',
}

export type VorgangWiederkehr = {
  ist_wiederkehrend: boolean
  wiederkehr_turnus: WiederkehrTurnus | null
}

export function defaultVorgangWiederkehr(): VorgangWiederkehr {
  return { ist_wiederkehrend: false, wiederkehr_turnus: null }
}

export function parseWiederkehrTurnus(raw: unknown): WiederkehrTurnus | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim() as WiederkehrTurnus
  return (WIEDERKEHR_TURNUS_VALUES as readonly string[]).includes(t) ? t : null
}

export function wiederkehrTurnusLabel(
  turnus: string | null | undefined
): string | null {
  if (!turnus?.trim()) return null
  const parsed = parseWiederkehrTurnus(turnus)
  if (parsed) return WIEDERKEHR_TURNUS_LABELS[parsed]
  return turnus.trim()
}

/** Pill-Text für Listen: „Monatlich“ oder „Wiederkehrend“. */
export function bestandPillLabel(opts: {
  ist_wiederkehrend?: boolean | null
  wiederkehr_turnus?: string | null
}): string | null {
  if (!opts.ist_wiederkehrend) return null
  return wiederkehrTurnusLabel(opts.wiederkehr_turnus) || 'Wiederkehrend'
}

export function normalizeVorgangWiederkehr(input: {
  ist_wiederkehrend?: boolean | null
  wiederkehr_turnus?: string | null
}): VorgangWiederkehr {
  const ist = input.ist_wiederkehrend === true
  return {
    ist_wiederkehrend: ist,
    wiederkehr_turnus: ist ? parseWiederkehrTurnus(input.wiederkehr_turnus) : null,
  }
}

/** Flags für Vorgangszeile: Entity der aktuellen Phase, sonst Lead/Auftrag-Fallback. */
export function resolveListeWiederkehr(opts: {
  phase: 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'
  entityId: string
  lead?: { ist_wiederkehrend?: boolean | null; wiederkehr_turnus?: string | null } | null
  angebote?: Array<{
    id: string
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
  }>
  auftraege?: Array<{
    id: string
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
  }>
  rechnungen?: Array<{
    id: string
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
  }>
}): VorgangWiederkehr {
  const from = (row?: {
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
  } | null) =>
    normalizeVorgangWiederkehr({
      ist_wiederkehrend: row?.ist_wiederkehrend,
      wiederkehr_turnus: row?.wiederkehr_turnus,
    })

  if (opts.phase === 'anfrage') return from(opts.lead)
  if (opts.phase === 'angebot') {
    const a = opts.angebote?.find((x) => x.id === opts.entityId)
    const w = from(a)
    if (w.ist_wiederkehrend) return w
    return from(opts.lead)
  }
  if (opts.phase === 'auftrag') {
    const a = opts.auftraege?.find((x) => x.id === opts.entityId)
    const w = from(a)
    if (w.ist_wiederkehrend) return w
    return from(opts.lead)
  }
  const r = opts.rechnungen?.find((x) => x.id === opts.entityId)
  const w = from(r)
  if (w.ist_wiederkehrend) return w
  const auf = opts.auftraege?.find((x) => x.ist_wiederkehrend === true)
  if (auf) return from(auf)
  return from(opts.lead)
}
