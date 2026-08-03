/** Client-sichere HV-Lead-Hilfsfunktionen (kein Server-Code). */

export function leadIstHavarie(lead: {
  situation?: string | null
  funnel_daten?: unknown
  freigabe_bypass_grund?: string | null
}): boolean {
  if ((lead.freigabe_bypass_grund ?? '').trim() === 'akut') return true
  if (lead.situation === 'notfall') return true
  const fd = lead.funnel_daten as { melde_kategorie?: string; havarie?: boolean } | null
  if (fd?.havarie === true) return true
  return fd?.melde_kategorie === 'notfall'
}
