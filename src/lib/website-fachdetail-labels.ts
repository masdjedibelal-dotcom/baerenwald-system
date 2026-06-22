/** Labels für Website-Funnel `fachdetailAnswers` (Fragen & Antwort-IDs). */

export const WEBSITE_FACHDETAIL_QUESTION_LABELS: Record<string, string> = {
  sanitaer_problem: 'Was ist das Problem?',
  sanitaer_lage: 'Was ist das Problem?',
  sanitaer_leck_zugang: 'Zugänglichkeit des Schadens',
  sanitaer_folge_leck_zugang: 'Zugänglichkeit des Schadens',
  sanitaer_bad_was: 'Was soll am Bad gemacht werden?',
  sanitaer_bad_objekt_liste: 'Welche Objekte?',
  elektro_kaputt: 'Was ist das Problem?',
  elektro_erneuern: 'Was soll erneuert werden?',
  elektro_folge_sicherung: 'Was passiert bei der Sicherung?',
  elektro_folge_steckdose: 'Was ist mit der Steckdose?',
  elektro_folge_leitungen: 'Welche Leitungen?',
  heizung_typ: 'Welche Heizung ist verbaut?',
  heizung_ziel: 'Was ist das Ziel?',
  heizung_heizkoerper_anzahl: 'Anzahl Heizkörper',
  heizung_kaputt_problem: 'Was ist das Problem?',
  fassade_art: 'Was soll an der Fassade gemacht werden?',
  maler_was: 'Was soll gestrichen werden?',
  maler_folge_zustand: 'Zustand der Flächen',
  boden_material: 'Aktueller Belag',
  boden_ziel: 'Gewünschter Belag',
  fenster_ausstattung: 'Fenster / Türen',
  fenster_defekt_was: 'Was ist defekt?',
  garten_was: 'Was soll im Garten gemacht werden?',
  dach_vorhaben: 'Was ist das Vorhaben?',
  baum_notfall_situation: 'Baum / Sturmschaden',
}

/** Antwort-IDs → lesbare Labels (Website-Optionen). */
export const WEBSITE_FACHDETAIL_OPTION_LABELS: Record<string, string> = {
  leitung_leck: 'Leitungswasserschaden / Rohr undicht',
  verstopfung: 'Verstopfung',
  keller: 'Am Haupthahn / im Keller',
  armatur: 'Tropfende Armatur / sichtbarer Anschluss',
  sichtbar: 'Sichtbar zugänglich',
  wand: 'Hinter der Wand / im Boden vermutet',
  fliesen: 'Nur Fliesen erneuern',
  objekte: 'Sanitärobjekte tauschen',
  sanitaer: 'Sanitärobjekte tauschen',
  wanne_dusche: 'Wanne zu Dusche',
  komplett: 'Komplett neu',
  sicherung: 'Sicherung fliegt raus',
  strom_weg: 'Strom weg',
  steckdose: 'Steckdose defekt',
  fehlersuche: 'Fehlersuche',
  wartung: 'Wartung / Inspektion',
  heizkoerper: 'Heizkörper tauschen',
  gas: 'Neue Gas-Therme',
  oel: 'Ölheizung',
  waermepumpe: 'Wärmepumpe',
  fernwaerme: 'Fernwärme',
  laminat: 'Laminat',
  parkett: 'Parkett',
  parkett_schleifen: 'Parkett abschleifen',
  vinyl: 'Vinyl / Designboden',
  teppich: 'Teppich',
  standard: 'Standard',
  premium: 'Premium',
  haustuere: 'Haustür',
  innentueren: 'Innentüren',
  anstrich: 'Fassade streichen',
  klinker: 'Klinker / Backstein',
  pflege: 'Regelmäßige Pflege',
  gestaltung: 'Neugestaltung',
  baumarbeiten: 'Baumarbeiten',
  hecke: 'Heckenschnitt',
}

export function websiteFachdetailQuestionLabel(questionId: string): string {
  return WEBSITE_FACHDETAIL_QUESTION_LABELS[questionId] ?? questionId.replace(/_/g, ' ')
}

export function websiteFachdetailOptionLabel(value: string): string {
  return WEBSITE_FACHDETAIL_OPTION_LABELS[value] ?? value.replace(/_/g, ' ')
}
