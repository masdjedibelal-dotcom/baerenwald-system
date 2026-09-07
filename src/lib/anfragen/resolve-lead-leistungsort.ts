/**
 * Leistungsort-Anzeige: Objekt zuerst (Join + Funnel `objekt_*`),
 * dann Lead-Adresse (Portal-Melde schreibt dort den Ausführungsort),
 * zuletzt Funnel-Kontaktadresse.
 */

export type LeistungsortAdresse = {
  strasse: string
  hausnummer: string
  plz: string
  ort: string
}

function funnelStr(funnel: unknown, ...keys: string[]): string {
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
  const fd = lead.funnel_daten
  return {
    strasse:
      o?.strasse?.trim() ||
      funnelStr(fd, 'objekt_strasse') ||
      lead.strasse?.trim() ||
      funnelStr(fd, 'strasse', 'straße', 'street') ||
      '',
    hausnummer:
      o?.hausnummer?.trim() ||
      funnelStr(fd, 'objekt_hausnummer') ||
      lead.hausnummer?.trim() ||
      funnelStr(fd, 'hausnummer', 'houseNumber') ||
      '',
    plz:
      o?.plz?.trim() ||
      funnelStr(fd, 'objekt_plz') ||
      lead.plz?.trim() ||
      funnelStr(fd, 'plz') ||
      '',
    ort:
      o?.ort?.trim() ||
      funnelStr(fd, 'objekt_ort') ||
      funnelStr(fd, 'ort', 'city', 'stadt') ||
      '',
  }
}
