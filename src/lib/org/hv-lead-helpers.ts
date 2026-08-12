/** Client-sichere HV-Lead-Hilfsfunktionen (kein Server-Code). */

function funnelMeldeNotfall(funnelDaten: unknown): boolean {
  if (!funnelDaten || typeof funnelDaten !== 'object') return false
  const fd = funnelDaten as {
    melde_kategorie?: unknown
    notfall?: unknown
    havarie?: unknown
  }
  // Melde-Funnel: Kategorie „Notfall“ ODER Dringlichkeit „Akut“ (`notfall: true`)
  if (fd.notfall === true || fd.havarie === true) return true
  return typeof fd.melde_kategorie === 'string' && fd.melde_kategorie.trim() === 'notfall'
}

export function leadIstHavarie(lead: {
  situation?: string | null
  funnel_daten?: unknown
  freigabe_bypass_grund?: string | null
}): boolean {
  if ((lead.freigabe_bypass_grund ?? '').trim() === 'akut') return true
  if ((lead.situation ?? '').trim() === 'notfall') return true
  return funnelMeldeNotfall(lead.funnel_daten)
}
