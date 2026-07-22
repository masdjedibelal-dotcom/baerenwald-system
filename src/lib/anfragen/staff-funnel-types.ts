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
  plz: string
  ort: string
  strasse: string
  hausnummer: string
  // preis
  preisModus: 'rahmen' | 'komplex' | 'manual'
  preisMin: number | null
  preisMax: number | null
  preisHinweis: string
  beratungText: string
  istBauprojekt: boolean
  freitext: string
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

export const STAFF_SITUATIONEN: { value: SituationValue; label: string; hint: string }[] = [
  { value: 'erneuern', label: 'Umbau & Modernisierung', hint: 'Bad, Heizung, Boden…' },
  { value: 'kaputt', label: 'Reparatur & Notfall', hint: 'Defekt, Leck, Ausfall…' },
  { value: 'betreuung', label: 'Betreuung', hint: 'Garten, Reinigung, Hausmeister…' },
  { value: 'gewerbe', label: 'Gewerbe / Gastro', hint: 'B2B — Beratungspfad' },
]

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
    plz: '',
    ort: '',
    strasse: '',
    hausnummer: '',
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
