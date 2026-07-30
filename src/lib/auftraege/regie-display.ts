/** Spec §10 / Phase 9 — Regie-Anzeige (CRM-intern „Regie“, Badge „nach Aufwand“). */

export function istRegiePosition(p: {
  typ?: string | null
  verguetung?: string | null
  regieSchein?: boolean | null
}): boolean {
  if (p.regieSchein === true) return true
  return (
    String(p.typ ?? '').toLowerCase() === 'regie' ||
    String(p.verguetung ?? '').toLowerCase() === 'aufwand'
  )
}

/** Angebot/PosBoard: Regie-Flag aus Persistenz oder Heuristik. */
export function istAngebotRegiePosition(p: {
  verguetung?: string | null
  notiz_extern?: string | null
  regieSchein?: boolean | null
}): boolean {
  if (p.regieSchein === true) return true
  if (String(p.verguetung ?? '').toLowerCase() === 'aufwand') return true
  const n = p.notiz_extern?.trim() || ''
  return /regieschein/i.test(n) || /nach aufwand/i.test(n)
}

/** z. B. „geschätzt 4 h × 69 €/h“ */
export function formatRegieSchaetzung(opts: {
  geschaetztStd?: number | null
  stundensatz?: number | null
}): string | null {
  const std = Number(opts.geschaetztStd)
  const satz = Number(opts.stundensatz)
  if (!Number.isFinite(std) || std <= 0 || !Number.isFinite(satz) || satz <= 0) return null
  const stdLabel = Number.isInteger(std) ? String(std) : std.toFixed(1).replace('.', ',')
  const satzLabel = Number.isInteger(satz) ? String(satz) : satz.toFixed(2).replace('.', ',')
  return `geschätzt ${stdLabel} h × ${satzLabel} €/h`
}

/** Minuten → „3:05“ */
export function formatStundenColon(minuten: number): string {
  const m = Math.max(0, Math.round(minuten))
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h}:${String(min).padStart(2, '0')}`
}

/** Dezimalstunden → „4:00“ */
export function formatStundenDecimalAsColon(std: number): string {
  if (!Number.isFinite(std) || std < 0) return '0:00'
  return formatStundenColon(Math.round(std * 60))
}

/** Subline „geschätzt 4:00 / erfasst 3:05“ */
export function formatRegieSollIst(opts: {
  geschaetztStd?: number | null
  erfasstMinuten?: number | null
}): string | null {
  const gesch = Number(opts.geschaetztStd)
  const erfasst = Number(opts.erfasstMinuten)
  const hasGesch = Number.isFinite(gesch) && gesch > 0
  const hasErfasst = Number.isFinite(erfasst) && erfasst > 0
  if (!hasGesch && !hasErfasst) return null
  const g = hasGesch ? formatStundenDecimalAsColon(gesch) : '—'
  const e = hasErfasst ? formatStundenColon(erfasst) : '—'
  return `geschätzt ${g} / erfasst ${e}`
}

export const REGIE_BADGE_LABEL = 'nach Aufwand'
