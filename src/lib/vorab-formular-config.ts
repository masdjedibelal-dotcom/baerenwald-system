/** Konfiguration Lead-Funnel (Situation, Bereiche, Fachdetails) — analog Website-Funnel */

export type SituationValue =
  | 'erneuern'
  | 'kaputt'
  | 'notfall'
  | 'neubauen'
  | 'betreuung'
  | 'gewerbe'

export type BereichOption = {
  value: string
  label: string
  situation: SituationValue[]
}

export type FachdetailBlock = {
  frage: string
  optionen: { value: string; label: string }[]
}

export type GroesseBlock = {
  label: string
  einheit: string
  typ: 'number'
  hinweis?: string
}

export const SITUATIONEN: { value: SituationValue; label: string }[] = [
  { value: 'erneuern', label: 'Zuhause erneuern' },
  { value: 'kaputt', label: 'Reparatur / Defekt' },
  { value: 'notfall', label: 'Notfall' },
  { value: 'neubauen', label: 'Neu bauen / Ausbau' },
  { value: 'betreuung', label: 'Betreuung' },
  { value: 'gewerbe', label: 'Gewerbe / Gastro' },
]

export const BEREICHE: BereichOption[] = [
  { value: 'bad', label: 'Bad', situation: ['erneuern'] },
  {
    value: 'heizung',
    label: 'Heizung',
    situation: ['erneuern', 'kaputt', 'notfall'],
  },
  {
    value: 'elektrik',
    label: 'Elektrik',
    situation: ['erneuern', 'kaputt', 'notfall'],
  },
  { value: 'waende', label: 'Wände / Anstrich', situation: ['erneuern'] },
  { value: 'boden', label: 'Boden', situation: ['erneuern'] },
  { value: 'fenster', label: 'Fenster / Türen', situation: ['erneuern', 'kaputt'] },
  { value: 'dach', label: 'Dach', situation: ['erneuern', 'kaputt'] },
  { value: 'fassade', label: 'Fassade', situation: ['erneuern'] },
  {
    value: 'trockenbau',
    label: 'Trockenbau / Umbau',
    situation: ['erneuern', 'neubauen'],
  },
  {
    value: 'sanitaer',
    label: 'Sanitär / Wasser',
    situation: ['kaputt', 'notfall'],
  },
  { value: 'schimmel', label: 'Schimmel / Feuchtigkeit', situation: ['kaputt'] },
  { value: 'garten', label: 'Garten', situation: ['betreuung'] },
  { value: 'reinigung', label: 'Reinigung', situation: ['betreuung'] },
  { value: 'hausmeister', label: 'Hausmeister', situation: ['betreuung'] },
  { value: 'winterdienst', label: 'Winterdienst', situation: ['betreuung'] },
  { value: 'gewerbe', label: 'Gewerbe / Gastro', situation: ['gewerbe'] },
]

export const FACHDETAILS_CONFIG: Record<string, FachdetailBlock> = {
  bad: {
    frage: 'Was soll am Bad gemacht werden?',
    optionen: [
      { value: 'fliesen', label: 'Nur Fliesen erneuern' },
      { value: 'objekte', label: 'Sanitärobjekte tauschen' },
      { value: 'wanne_dusche', label: 'Wanne zu Dusche' },
      { value: 'komplett', label: 'Komplett neu' },
    ],
  },
  bad_ausstattung: {
    frage: 'Welchen Standard?',
    optionen: [
      { value: 'standard', label: 'Standard' },
      { value: 'komfort', label: 'Komfort' },
      { value: 'gehoben', label: 'Gehoben' },
    ],
  },
  heizung: {
    frage: 'Was soll passieren?',
    optionen: [
      { value: 'wartung', label: 'Wartung / Inspektion' },
      { value: 'heizkoerper', label: 'Heizkörper tauschen' },
      { value: 'gas', label: 'Neue Gas-Therme' },
      { value: 'oel', label: 'Ölheizung' },
      { value: 'waermepumpe', label: 'Wärmepumpe' },
      { value: 'fernwaerme', label: 'Fernwärme' },
    ],
  },
  elektrik: {
    frage: 'Was soll erneuert werden?',
    optionen: [
      { value: 'sicherungskasten', label: 'Sicherungskasten modernisieren' },
      { value: 'leitungen', label: 'Neue Leitungen / Steckdosen' },
      { value: 'echeck', label: 'E-Check' },
    ],
  },
  elektro_kaputt: {
    frage: 'Was ist das Problem?',
    optionen: [
      { value: 'sicherung', label: 'Sicherung fliegt raus' },
      { value: 'strom_weg', label: 'Strom weg' },
      { value: 'steckdose', label: 'Steckdose defekt' },
      { value: 'fehlersuche', label: 'Fehlersuche' },
    ],
  },
  waende: {
    frage: 'Was soll gestrichen werden?',
    optionen: [
      { value: 'waende', label: 'Nur Wände' },
      { value: 'waende_decke', label: 'Wände + Decke' },
      { value: 'komplett', label: 'Alles komplett' },
      { value: 'tapezieren', label: 'Tapezieren' },
      { value: 'fassade', label: 'Fassade außen' },
    ],
  },
  boden: {
    frage: 'Was soll verlegt werden?',
    optionen: [
      { value: 'laminat', label: 'Laminat' },
      { value: 'parkett', label: 'Parkett neu' },
      { value: 'parkett_schleifen', label: 'Parkett abschleifen' },
      { value: 'vinyl', label: 'Vinyl / Designboden' },
      { value: 'fliesen', label: 'Fliesen' },
      { value: 'teppich', label: 'Teppich' },
    ],
  },
  fenster: {
    frage: 'Was soll erneuert werden?',
    optionen: [
      { value: 'standard', label: 'Standard 2-fach' },
      { value: 'premium', label: 'Premium 3-fach' },
      { value: 'haustuere', label: 'Haustür' },
      { value: 'innentueren', label: 'Innentüren' },
    ],
  },
  dach: {
    frage: 'Was ist das Vorhaben?',
    optionen: [
      { value: 'ziegel_wenige', label: 'Wenige Ziegel defekt' },
      { value: 'ziegel_bereich', label: 'Größerer Bereich' },
      { value: 'daemmung', label: 'Dachdämmung' },
      { value: 'komplett', label: 'Komplett neu' },
      { value: 'dachfenster', label: 'Dachfenster' },
      { value: 'regenrinne', label: 'Regenrinne' },
    ],
  },
  fassade: {
    frage: 'Was soll gemacht werden?',
    optionen: [
      { value: 'anstrich', label: 'Fassade streichen' },
      { value: 'klinker', label: 'Klinker / Backstein' },
    ],
  },
  sanitaer: {
    frage: 'Wo sitzt das Problem?',
    optionen: [
      { value: 'verstopfung', label: 'Verstopfung' },
      { value: 'leck', label: 'Leck / Rohrbruch' },
      { value: 'wc', label: 'WC Reparatur' },
      { value: 'armatur', label: 'Armatur defekt' },
    ],
  },
  garten: {
    frage: 'Was soll gemacht werden?',
    optionen: [
      { value: 'pflege', label: 'Regelmäßige Pflege' },
      { value: 'gestaltung', label: 'Neugestaltung' },
      { value: 'baumarbeiten', label: 'Baumarbeiten' },
      { value: 'hecke', label: 'Heckenschnitt' },
    ],
  },
}

export const GROESSEN_CONFIG: Record<string, GroesseBlock> = {
  bad: { label: 'Badfläche', einheit: 'm²', typ: 'number' },
  heizung: { label: 'Wohnfläche gesamt', einheit: 'm²', typ: 'number' },
  waende: {
    label: 'Wandfläche',
    einheit: 'm²',
    typ: 'number',
    hinweis: 'Wandfläche ≈ Raumfläche × 2.5',
  },
  boden: { label: 'Bodenfläche', einheit: 'm²', typ: 'number' },
  fenster: { label: 'Anzahl Fenster / Türen', einheit: 'Stück', typ: 'number' },
  dach: { label: 'Dachfläche', einheit: 'm²', typ: 'number' },
  fassade: { label: 'Fassadenfläche', einheit: 'm²', typ: 'number' },
  trockenbau: { label: 'Wandfläche', einheit: 'm²', typ: 'number' },
  garten: { label: 'Gartenfläche', einheit: 'm²', typ: 'number' },
  winterdienst: { label: 'Gehweg', einheit: 'lfd. m', typ: 'number' },
  reinigung: { label: 'Fläche', einheit: 'm²', typ: 'number' },
}

export const KUNDENTYP_OPTIONS = [
  { value: 'eigentuemer', label: 'Eigentümer' },
  { value: 'mieter', label: 'Mieter' },
  { value: 'verwaltung', label: 'Hausverwaltung' },
  { value: 'gewerbe', label: 'Gewerbe' },
]

/** CRM-/Website-Altkeys → SituationValue */
const SITUATION_LEGACY: Record<string, SituationValue> = {
  zuhause_erneuern: 'erneuern',
  reparatur: 'kaputt',
  defekt: 'kaputt',
  neu_bauen: 'neubauen',
  notfall: 'notfall',
  betreuung: 'betreuung',
  gewerbe: 'gewerbe',
}

export function normalizeSituation(raw: string | null | undefined): SituationValue | '' {
  if (!raw) return ''
  if (SITUATIONEN.some((s) => s.value === raw)) return raw as SituationValue
  return SITUATION_LEGACY[raw] ?? ''
}

export function bereicheFuerSituation(situation: SituationValue | ''): BereichOption[] {
  if (!situation) return []
  return BEREICHE.filter((b) => b.situation.includes(situation))
}

/** Welche Fachdetail-Blöcke (Keys in FACHDETAILS_CONFIG) für Bereich + Situation */
export function fachdetailKeysForBereich(
  bereich: string,
  situation: SituationValue | ''
): string[] {
  if (!situation) return []
  if (bereich === 'gewerbe') return []
  if (bereich === 'bad') return ['bad', 'bad_ausstattung']
  if (bereich === 'elektrik') {
    return situation === 'kaputt' || situation === 'notfall' ? ['elektro_kaputt'] : ['elektrik']
  }
  if (FACHDETAILS_CONFIG[bereich]) return [bereich]
  return []
}

export function hatGroesseFeld(bereich: string): boolean {
  return Boolean(GROESSEN_CONFIG[bereich])
}

/** Anzeige-Label: m²-Felder einheitlich „Fläche (Bad)“, Sonderfälle (Stück, lfd. m) aus Config. */
export function groessePropLabel(bereich: string): string {
  const g = GROESSEN_CONFIG[bereich]
  const bereichLabel = bereichMeta(bereich)?.label ?? bereich
  if (!g) return bereichLabel
  if (g.einheit === 'm²') return `Fläche (${bereichLabel})`
  return g.label
}

export function situationLabel(value: string): string {
  return SITUATIONEN.find((s) => s.value === value)?.label ?? value
}

export function bereichMeta(value: string): BereichOption | undefined {
  return BEREICHE.find((b) => b.value === value)
}
