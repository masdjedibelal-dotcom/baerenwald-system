type PositionHw = {
  handwerker_id?: string | null
  handwerker_status?: string | null
}

const HW_ANTWORT_AUSSTEHEND = new Set(['angefragt', 'warten'])

/** Position wartet auf Handwerker-Antwort oder Zuweisung. */
export function positionBrauchtHandwerkerAktion(pos: PositionHw): boolean {
  const st = (pos.handwerker_status ?? '').trim().toLowerCase()
  if (HW_ANTWORT_AUSSTEHEND.has(st)) return true
  if (!pos.handwerker_id?.trim() && (!st || st === 'ausstehend')) return true
  return false
}

export function auftragBrauchtHandwerkerAktion(positionen: PositionHw[]): boolean {
  return positionen.some(positionBrauchtHandwerkerAktion)
}
