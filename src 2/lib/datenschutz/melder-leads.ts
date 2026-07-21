import type { LeadKanal } from '@/lib/types'

/** Kanäle mit Mieter-/Melder-Schadenmeldungen (Org-Portal). */
export const MELDER_KANALE: LeadKanal[] = ['hv_melder_link', 'hv_einladung']

export function istMelderKanal(kanal: string | null | undefined): boolean {
  return MELDER_KANALE.includes((kanal ?? '') as LeadKanal)
}

export function fotosAusMelderFunnel(funnelDaten: unknown): string[] {
  if (!funnelDaten || typeof funnelDaten !== 'object') return []
  const fotos = (funnelDaten as { fotos?: unknown }).fotos
  if (!Array.isArray(fotos)) return []
  return fotos.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
}

export function leadHatMelderPersonenbezogeneDaten(lead: {
  melder_name?: string | null
  melder_email?: string | null
  melder_telefon?: string | null
  melder_einheit?: string | null
  kontakt_name?: string | null
  kontakt_email?: string | null
  funnel_daten?: unknown
}): boolean {
  if (lead.melder_name?.trim() && lead.melder_name.trim() !== 'Anonymisiert') return true
  if (lead.melder_email?.trim()) return true
  if (lead.melder_telefon?.trim()) return true
  if (lead.melder_einheit?.trim()) return true
  if (fotosAusMelderFunnel(lead.funnel_daten).length > 0) return true
  if (lead.kontakt_name?.trim() && lead.kontakt_name.trim() !== 'Anonymisiert') return true
  if (lead.kontakt_email?.trim()) return true
  return false
}

export function melderLeadAnzeigeTitel(lead: {
  melder_name?: string | null
  melder_einheit?: string | null
  kontakt_name?: string | null
  id: string
}): string {
  const name = lead.melder_name?.trim() || lead.kontakt_name?.trim()
  const einheit = lead.melder_einheit?.trim()
  if (name && einheit) return `${name} · ${einheit}`
  if (name) return name
  return `Melder-Lead ${lead.id.slice(0, 8).toUpperCase()}`
}

export function buildMelderAuskunftText(lead: {
  id: string
  created_at: string
  updated_at: string
  kanal: string
  status: string
  anlass?: string | null
  melder_name?: string | null
  melder_einheit?: string | null
  melder_telefon?: string | null
  melder_email?: string | null
  notizen?: string | null
  kontakt_nachricht?: string | null
  plz?: string | null
  strasse?: string | null
  hausnummer?: string | null
  funnel_daten?: unknown
  auftraggeber?: { name?: string | null; org_anzeigename?: string | null } | null
  kunden_objekte?: { titel?: string | null; plz?: string | null; ort?: string | null } | null
}): string {
  const org =
    lead.auftraggeber?.org_anzeigename?.trim() || lead.auftraggeber?.name?.trim() || '—'
  const objekt = lead.kunden_objekte?.titel?.trim() || '—'
  const fotos = fotosAusMelderFunnel(lead.funnel_daten)
  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object'
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}
  const kategorie =
    typeof fd.melde_kategorie === 'string' ? fd.melde_kategorie : '—'

  return [
    'Auskunft — Mieter-Schadenmeldung (Art. 15 DSGVO)',
    '—'.repeat(40),
    `Lead-ID: ${lead.id}`,
    `Eingang: ${lead.created_at.slice(0, 19).replace('T', ' ')}`,
    `Letzte Änderung: ${lead.updated_at.slice(0, 19).replace('T', ' ')}`,
    `Kanal: ${lead.kanal}`,
    `Status: ${lead.status}`,
    `Anlass: ${lead.anlass ?? '—'}`,
    '',
    'Auftraggeber (Hausverwaltung):',
    org,
    '',
    'Objekt:',
    objekt,
    lead.kunden_objekte?.plz || lead.kunden_objekte?.ort
      ? [lead.kunden_objekte?.plz, lead.kunden_objekte?.ort].filter(Boolean).join(' ')
      : '',
    '',
    'Melder:',
    `Name: ${lead.melder_name ?? '—'}`,
    `Einheit: ${lead.melder_einheit ?? '—'}`,
    `E-Mail: ${lead.melder_email ?? '—'}`,
    `Telefon: ${lead.melder_telefon ?? '—'}`,
    '',
    'Schaden:',
    `Kategorie: ${kategorie}`,
    `Beschreibung: ${lead.notizen?.trim() || lead.kontakt_nachricht?.trim() || '—'}`,
    `Fotos: ${fotos.length} Datei(en)`,
    '',
    'Hinweis: Verantwortlicher gegenüber dem Mieter ist in der Regel die Hausverwaltung.',
    'Bärenwald unterstützt technisch. Finale Antwort nach Abstimmung mit HV.',
  ]
    .filter(Boolean)
    .join('\n')
}
