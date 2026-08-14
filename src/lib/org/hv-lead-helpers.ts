/** Client-sichere HV-Lead-Hilfsfunktionen (kein Server-Code). */

function funnelMeldeDirektauftrag(funnelDaten: unknown): boolean {
  if (!funnelDaten || typeof funnelDaten !== 'object') return false
  const fd = funnelDaten as {
    melde_kategorie?: unknown
    notfall?: unknown
    havarie?: unknown
    direktauftrag?: unknown
  }
  if (fd.direktauftrag === true || fd.notfall === true || fd.havarie === true) {
    return true
  }
  // Legacy Auto-Notfall-Kategorie
  return typeof fd.melde_kategorie === 'string' && fd.melde_kategorie.trim() === 'notfall'
}

/** Sofortmaßnahme / Direktauftrag-Pfad (ehem. Havarie/Akut). */
export function leadIstHavarie(lead: {
  situation?: string | null
  funnel_daten?: unknown
  freigabe_bypass_grund?: string | null
}): boolean {
  if ((lead.freigabe_bypass_grund ?? '').trim() === 'akut') return true
  if (funnelMeldeDirektauftrag(lead.funnel_daten)) return true
  // Legacy
  return (lead.situation ?? '').trim() === 'notfall'
}

export const leadIstDirektauftrag = leadIstHavarie
