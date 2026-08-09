import type { SituationValue } from '@/lib/vorab-formular-config'
import type { LeadKanal } from '@/lib/types'

/** Kanonische CRM-Staff-Funnel Steps (siehe docs/CRM_STAFF_FUNNEL_STEP_MAPPING.md) */
export type StaffFunnelStepId =
  | 'crm_kontext'
  | 'situation'
  | 'bereiche'
  | 'umfang'
  | 'zugaenglichkeit'
  | 'zustand'
  | 'groesse'
  | 'bad_ausstattung'
  | 'fachdetails'
  | 'dringlichkeit'
  | 'kundentyp'
  | 'ort_zeitraum'
  | 'ort'
  | 'preis'
  | 'beratung'
  | 'crm_pruefen'

/** Formular = Card-Funnel wie Website; Frei = Vorhaben/Beschreibung als Text. */
export type StaffErfassungsModus = 'formular' | 'frei'

export type StaffFunnelState = {
  // crm_kontext
  kundeId: string | null
  firmaName: string
  vorname: string
  nachname: string
  email: string
  telefon: string
  kanal: LeadKanal
  interneNotiz: string
  /** Formular (Karten) vs. freie Texterfassung */
  erfassungsModus: StaffErfassungsModus
  /** Mock-Anliegen (Create-Screen) */
  anliegen: StaffAnliegenId | ''
  /** Freititel „Vorhaben“ — bei Formular aus Karten generiert */
  vorhaben: string
  // funnel
  situation: SituationValue | ''
  bereiche: string[]
  umfang: string
  zugaenglichkeit: string
  zustand: string
  groessen: Record<string, number>
  groessenEinheiten: Record<string, string>
  badAusstattung: string
  fachdetails: Record<string, string>
  dringlichkeit: string
  kundentyp: string
  zeitraum: string
  /** Budget-Freitext (optional, UI entfernt) */
  budgetHinweis: string
  plz: string
  ort: string
  strasse: string
  hausnummer: string
  /** Leistungs-/Objektadresse, wenn abweichend von Kundenadresse */
  objektPlz: string
  objektOrt: string
  objektStrasse: string
  objektHausnummer: string
  /** HV optional: Mieter (Melder) */
  mieterVorname: string
  mieterNachname: string
  /** HV: verknüpftes Gebäude aus kunden_objekte */
  kundeObjektId: string | null
  // preis
  preisModus: 'rahmen' | 'komplex' | 'manual'
  preisMin: number | null
  preisMax: number | null
  preisHinweis: string
  beratungText: string
  istBauprojekt: boolean
  freitext: string
}

/**
 * Anliegen-Karten = Website-Funnel Schritt 1 (`BW_FUNNEL_STEP1_OPTIONS`).
 * Kein „Termin/Beratung“ / „Hausverwaltung“ als Anliegen — HV = Kundentyp.
 */
export type StaffAnliegenId = 'erneuern' | 'betreuung' | 'kaputt' | 'gewerbe'

export const STAFF_ANLIEGEN: {
  id: StaffAnliegenId
  label: string
  hint: string
  icon: string
  tag?: string
  situation: SituationValue
}[] = [
  {
    id: 'erneuern',
    label: 'Umbau & Modernisierung',
    hint: 'Inkl. Innenausbau, Außenbereich, Terrasse, Keller, DG',
    icon: '01-haus-erneuern',
    situation: 'erneuern',
  },
  {
    id: 'betreuung',
    label: 'Betreuung',
    hint: 'Garten, Reinigung, Hausmeister, Winterdienst',
    icon: '03-betreuung',
    situation: 'betreuung',
  },
  {
    id: 'kaputt',
    label: 'Reparatur & Notfall',
    hint: 'Sanitär, Heizung, Elektro, Dach — am Ende wählst du, wie schnell wir kommen sollen',
    icon: '02-reparatur',
    situation: 'kaputt',
  },
  {
    id: 'gewerbe',
    label: 'Gewerbe',
    hint: 'Büro, Praxis, Laden, Gastronomie — wir planen individuell',
    icon: '04-gewerbe',
    tag: 'B2B',
    situation: 'gewerbe',
  },
]

/** Labels inkl. Legacy-Anliegen (ältere CRM-Erfassungen). */
export const STAFF_ANLIEGEN_LABELS: Record<string, string> = {
  erneuern: 'Umbau & Modernisierung',
  betreuung: 'Betreuung',
  kaputt: 'Reparatur & Notfall',
  gewerbe: 'Gewerbe',
  termin: 'Termin / Beratung',
  hausverwaltung: 'Hausverwaltung',
}

export function anliegenToSituation(anliegen: StaffAnliegenId | '' | string): SituationValue | '' {
  if (!anliegen) return ''
  const fromList = STAFF_ANLIEGEN.find((a) => a.id === anliegen)?.situation
  if (fromList) return fromList
  // Legacy
  if (anliegen === 'termin' || anliegen === 'hausverwaltung') return 'erneuern'
  if (
    anliegen === 'erneuern' ||
    anliegen === 'betreuung' ||
    anliegen === 'kaputt' ||
    anliegen === 'gewerbe' ||
    anliegen === 'neubauen' ||
    anliegen === 'notfall'
  ) {
    return anliegen
  }
  return ''
}

export const STAFF_FUNNEL_STEP_LABELS: Record<StaffFunnelStepId, string> = {
  crm_kontext: 'Kontext',
  situation: 'Situation',
  bereiche: 'Bereiche',
  umfang: 'Umfang',
  zugaenglichkeit: 'Zugang',
  zustand: 'Zustand',
  groesse: 'Größe',
  bad_ausstattung: 'Bad',
  fachdetails: 'Details',
  dringlichkeit: 'Dringlichkeit',
  kundentyp: 'Kundentyp',
  ort_zeitraum: 'Ort & Zeit',
  ort: 'Ort',
  preis: 'Preis',
  beratung: 'Beratung',
  crm_pruefen: 'Prüfen',
}

export const STAFF_SITUATIONEN: {
  value: SituationValue
  label: string
  hint: string
  icon: string
  tag?: string
}[] = [
  {
    value: 'erneuern',
    label: 'Umbau & Modernisierung',
    hint: 'Inkl. Innenausbau, Außenbereich, Terrasse, Keller, DG',
    icon: '01-haus-erneuern',
  },
  {
    value: 'betreuung',
    label: 'Betreuung',
    hint: 'Garten, Reinigung, Hausmeister, Winterdienst',
    icon: '03-betreuung',
  },
  {
    value: 'kaputt',
    label: 'Reparatur & Notfall',
    hint: 'Sanitär, Heizung, Elektro, Dach — am Ende wählst du, wie schnell wir kommen sollen',
    icon: '02-reparatur',
  },
  {
    value: 'gewerbe',
    label: 'Gewerbe',
    hint: 'Büro, Praxis, Laden, Gastronomie — wir planen individuell',
    icon: '04-gewerbe',
    tag: 'B2B',
  },
]

/** Website-Icon-Namen für Bereiche (`/public/icons/{name}.svg`). */
export const STAFF_BEREICH_ICONS: Record<string, string> = {
  heizung: '05-heizung',
  elektrik: '06-elektrik',
  waende: '07-streichen',
  bad: '08-bad',
  boden: '09-boden',
  trockenbau: '10-trennwand',
  fenster: '11-fenster',
  dach: '12-dach',
  fassade: '13-fassade',
  garten: '15-gartenpflege',
  winterdienst: '16-winterdienst',
  reinigung: '17-gebauedereinigung',
  hausmeister: '18-hausmeister',
  sanitaer: '08-bad',
  schimmel: '02-reparatur',
  anbau: '10-trennwand',
  baum_notfall: '14-gartengestaltung',
  gewerbe: '04-gewerbe',
}

export const UMFANG_OPTIONS = [
  { value: 'woechentlich', label: 'Wöchentlich' },
  { value: 'monatlich', label: 'Monatlich' },
  { value: 'quartal', label: 'Vierteljährlich' },
  { value: 'bedarf', label: 'Nach Bedarf' },
  { value: 'jahresvertrag', label: 'Jahresvertrag' },
]

export const ZUGAENGLICHKEIT_OPTIONS = [
  { value: 'einfach', label: 'Einfach erreichbar' },
  { value: 'geruest', label: 'Gerüst nötig' },
  { value: 'schwierig', label: 'Schwer zugänglich' },
]

export const ZUSTAND_OPTIONS = [
  { value: 'gut', label: 'Gut' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'schlecht', label: 'Schlecht / stark beansprucht' },
]

export const DRINGLICHKEIT_OPTIONS = [
  { value: 'sofort', label: 'Sofort / Notfall' },
  { value: 'diese_woche', label: 'Diese Woche' },
  { value: 'flexibel', label: 'Flexibel' },
]

export const ZEITRAUM_ERNEUERN_OPTIONS = [
  { value: 'vier_wochen', label: 'Bis 4 Wochen' },
  { value: 'zwei_monate', label: '1–2 Monate' },
  { value: 'sechs_monate', label: '3–6 Monate' },
  { value: 'flexibel', label: 'Flexibel' },
]

export function createInitialStaffFunnelState(
  partial?: Partial<StaffFunnelState>
): StaffFunnelState {
  return {
    kundeId: null,
    firmaName: '',
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    kanal: 'telefon',
    interneNotiz: '',
    erfassungsModus: 'formular',
    anliegen: '',
    vorhaben: '',
    situation: '',
    bereiche: [],
    umfang: '',
    zugaenglichkeit: '',
    zustand: '',
    groessen: {},
    groessenEinheiten: {},
    badAusstattung: '',
    fachdetails: {},
    dringlichkeit: '',
    kundentyp: '',
    zeitraum: '',
    budgetHinweis: '',
    plz: '',
    ort: '',
    strasse: '',
    hausnummer: '',
    objektPlz: '',
    objektOrt: '',
    objektStrasse: '',
    objektHausnummer: '',
    mieterVorname: '',
    mieterNachname: '',
    kundeObjektId: null,
    preisModus: 'rahmen',
    preisMin: null,
    preisMax: null,
    preisHinweis: '',
    beratungText: '',
    istBauprojekt: false,
    freitext: '',
    ...partial,
  }
}
