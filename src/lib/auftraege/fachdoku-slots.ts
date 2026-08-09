/**
 * Fachdoku-Slots — Spiegel der Portal-Logik fürs CRM.
 */

export type FachdokuSlotCode =
  | 'elektro_messprotokoll'
  | 'gas_dichtheit'
  | 'wasser_dichtheit_spuelen'
  | 'heizung_inbetriebnahme'
  | 'estrich_cm'
  | 'geruest_pruefung'

export type FachdokuSlotDef = {
  code: FachdokuSlotCode
  label: string
}

export const FACHDOKU_SLOT_DEFS: Record<FachdokuSlotCode, FachdokuSlotDef> = {
  elektro_messprotokoll: {
    code: 'elektro_messprotokoll',
    label: 'Mess-/Prüfprotokoll Elektro (VDE)',
  },
  gas_dichtheit: {
    code: 'gas_dichtheit',
    label: 'Dichtheits-/Inbetriebnahmeprotokoll Gas (TRGI)',
  },
  wasser_dichtheit_spuelen: {
    code: 'wasser_dichtheit_spuelen',
    label: 'Druck-/Dichtheit & Spülprotokoll Trinkwasser',
  },
  heizung_inbetriebnahme: {
    code: 'heizung_inbetriebnahme',
    label: 'Inbetriebnahme-/Sicherheitsprotokoll Heizung',
  },
  estrich_cm: {
    code: 'estrich_cm',
    label: 'CM-Feuchtemessung Estrich',
  },
  geruest_pruefung: {
    code: 'geruest_pruefung',
    label: 'Gerüst Prüf-/Freigabeprotokoll',
  },
}

const GEWERK_HINTS: Array<{ match: RegExp; codes: FachdokuSlotCode[] }> = [
  { match: /\b(elektro|elektrik|strom|e\-check|vde)\b/i, codes: ['elektro_messprotokoll'] },
  { match: /\b(gas|trgi)\b/i, codes: ['gas_dichtheit'] },
  {
    match: /\b(wasser|sanit[aä]r|trinkwasser|bad(?!\s*m[oö]bel)|abfluss)\b/i,
    codes: ['wasser_dichtheit_spuelen'],
  },
  {
    match: /\b(heizung|heizungsbau|w[aä]rmepumpe|brennwert)\b/i,
    codes: ['heizung_inbetriebnahme'],
  },
  { match: /\b(estrich)\b/i, codes: ['estrich_cm'] },
  { match: /\b(ger[uü]st)\b/i, codes: ['geruest_pruefung'] },
]

export function fachdokuCodesFromGewerke(
  gewerkNames: Array<string | null | undefined>
): FachdokuSlotCode[] {
  const out = new Set<FachdokuSlotCode>()
  for (const g of gewerkNames) {
    const raw = (g ?? '').trim()
    if (!raw) continue
    for (const hint of GEWERK_HINTS) {
      if (hint.match.test(raw)) {
        for (const c of hint.codes) out.add(c)
      }
    }
  }
  return Array.from(out)
}

export type FachdokuSlotRow = {
  id: string
  auftrag_id: string
  slot_code: string
  label: string
  status: string
  datei_url: string | null
  datei_name: string | null
  uploaded_by_role: string | null
  erledigt_am: string | null
  signed_url?: string | null
}

export function fachdokuOffenCount(slots: Array<Pick<FachdokuSlotRow, 'status'>>): number {
  return slots.filter((s) => String(s.status).toLowerCase() === 'offen').length
}

export function fachdokuChipLabel(slots: Array<Pick<FachdokuSlotRow, 'status'>>): string | null {
  if (!slots.length) return null
  const offen = fachdokuOffenCount(slots)
  const total = slots.length
  if (offen === 0) return `Fachdoku ${total}/${total}`
  return `Fachdoku ${total - offen}/${total} offen`
}
