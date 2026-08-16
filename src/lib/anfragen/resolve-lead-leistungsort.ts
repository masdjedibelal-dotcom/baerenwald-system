/**
 * Leistungsort-Anzeige: Objekt-Felder zuerst, sonst Lead-/Funnel-Adresse
 * (Melde vom Objekt-Link füllt oft Lead-Adresse, während kunden_objekte leer ist).
 */

export type LeistungsortAdresse = {
  strasse: string
  hausnummer: string
  plz: string
  ort: string
}

function funnelStr(
  funnel: unknown,
  ...keys: string[]
): string {
  if (!funnel || typeof funnel !== 'object' || Array.isArray(funnel)) return ''
  const fd = funnel as Record<string, unknown>
  for (const k of keys) {
    const v = fd[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export function resolveLeadLeistungsort(lead: {
  plz?: string | null
  strasse?: string | null
  hausnummer?: string | null
  funnel_daten?: unknown
  kunden_objekte?: {
    strasse?: string | null
    hausnummer?: string | null
    plz?: string | null
    ort?: string | null
  } | null
}): LeistungsortAdresse {
  const o = lead.kunden_objekte
  return {
    strasse:
      o?.strasse?.trim() ||
      lead.strasse?.trim() ||
      funnelStr(lead.funnel_daten, 'strasse') ||
      '',
    hausnummer:
      o?.hausnummer?.trim() ||
      lead.hausnummer?.trim() ||
      funnelStr(lead.funnel_daten, 'hausnummer') ||
      '',
    plz:
      o?.plz?.trim() ||
      lead.plz?.trim() ||
      funnelStr(lead.funnel_daten, 'plz') ||
      '',
    ort:
      o?.ort?.trim() ||
      funnelStr(lead.funnel_daten, 'ort') ||
      '',
  }
}
