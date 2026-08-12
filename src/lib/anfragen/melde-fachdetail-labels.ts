/**
 * Labels für HV-Melder-Funnel (`fachdetailAnswers` mit `melde_*` Keys).
 * Spiegel der Kurz-Labels aus dem Portal-Funnel (baerenwald).
 */

const MELDE_QUESTION_LABELS: Record<string, string> = {
  melde_problem: 'Problem',
  melde_betrifft: 'Betrifft',
  melde_ort: 'Ort',
  melde_ort_tuer: 'Ort (Tür)',
  melde_ort_schluessel: 'Ort (Schlüssel)',
  melde_ort_ziegel: 'Ort (Ziegel)',
  melde_ort_fassade: 'Ort (Fassade)',
  melde_ort_graffiti: 'Ort (Graffiti)',
  melde_ort_hecke: 'Ort (Hecke)',
  melde_ort_platten: 'Ort (Platten)',
  melde_ort_laub: 'Ort (Laub)',
  melde_ort_treppe: 'Ort (Treppe)',
  melde_ort_wespen: 'Ort (Wespen)',
  melde_seit_wann: 'Seit wann',
  melde_seit_wann_akut: 'Seit wann',
  melde_laeuft_noch: 'Läuft noch',
  melde_abstellen: 'Abstellen',
  melde_gefahr: 'Gefahr',
  melde_heizung_kalt: 'Wohnung kalt',
  melde_warmwasser: 'Warmwasser',
  melde_sicherung_raus: 'Sicherung raus',
  melde_wieder_raus: 'Wieder raus',
  melde_nachbarn_strom: 'Nachbarn (Strom)',
  melde_tuer_detail: 'Tür-Detail',
  melde_geht_zu: 'Geht zu',
  melde_bei_regen: 'Bei Regen',
  melde_groesse: 'Größe',
  melde_passierbar: 'Passierbar',
  melde_staerke: 'Stärke',
  melde_wohnung_kalt: 'Wohnung kalt',
  melde_nachbarn: 'Nachbarn',
  melde_fi: 'FI-Schalter',
  melde_stromausfall: 'Stromausfall',
  melde_abschliessbar: 'Abschließbar',
}

/** Häufige Antwort-IDs → lesbare Labels (Portal-Optionen, gekürzt). */
const MELDE_OPTION_LABELS: Record<string, string> = {
  ja: 'Ja',
  nein: 'Nein',
  weiss_nicht: 'Weiß nicht',
  gerade_eben: 'Gerade eben',
  heute: 'Heute',
  mehrere_tage: 'Seit mehreren Tagen',
  mehrere_wochen: 'Seit mehreren Wochen',
  einige_tage: 'Seit einigen Tagen',
  eine_woche: 'Seit einer Woche',
  schon_laenger: 'Schon länger',
  immer_wieder: 'Immer wieder',
  unbekannt: 'Unbekannt',
  wohnung: 'Nur meine Wohnung',
  mehrere: 'Mehrere Wohnungen',
  gemeinschaft: 'Gemeinschaftsbereich',
  tiefgarage: 'Tiefgarage',
  aussen: 'Außenbereich',
  treppenhaus: 'Treppenhaus',
  kein_strom: 'Kein Strom in der Wohnung',
  steckdose: 'Steckdose funktioniert nicht',
  licht: 'Licht funktioniert nicht',
  klingel: 'Klingel / Türsprecher',
  garagentor: 'Garagentor',
  fi_sicherung: 'Sicherung / FI löst aus',
  schalter: 'Schalter defekt',
  sonstiges: 'Sonstiges',
  kueche: 'Küche',
  bad: 'Bad',
  wc: 'WC',
  keller: 'Keller',
  balkon: 'Balkon',
  garage: 'Garage',
  flur: 'Flur',
  schimmel_feucht: 'Schimmel / feuchte Stellen',
  tropft: 'Wasser tropft',
  laeuft: 'Wasser läuft',
  klein: 'Klein',
  mittel: 'Mittel',
  gross: 'Groß',
  leicht: 'Leicht',
  stark: 'Stark',
  schaden: 'Schaden',
  notfall: 'Notfall',
  strom: 'Strom',
  wasser: 'Wasser',
  heizung: 'Heizung',
  schimmel: 'Schimmel',
  fenster_tuer: 'Fenster / Tür',
  dach: 'Dach',
  garten: 'Garten / Außen',
  muell: 'Müll / Hausordnung',
}

function humanizeMeldeKey(id: string): string {
  const bare = id
    .replace(/^melde_/i, '')
    .replace(/_/g, ' ')
    .trim()
  if (!bare) return id
  return bare.charAt(0).toUpperCase() + bare.slice(1)
}

export function isMeldeFachdetailKey(key: string): boolean {
  return key.trim().toLowerCase().startsWith('melde_')
}

export function meldeQuestionDisplayLabel(questionId: string): string {
  const key = questionId.trim().toLowerCase()
  return MELDE_QUESTION_LABELS[key] ?? humanizeMeldeKey(questionId)
}

export function meldeOptionDisplayLabel(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  const key = raw.toLowerCase()
  if (MELDE_OPTION_LABELS[key]) return MELDE_OPTION_LABELS[key]
  if (raw.includes('_') || /^melde_/i.test(raw)) return humanizeMeldeKey(raw)
  return raw
}

export function meldeKategorieLabel(value: string): string {
  const key = value.trim().toLowerCase()
  if (key === 'schaden') return 'Schaden'
  if (key === 'notfall') return 'Notfall'
  if (key === 'wartung') return 'Wartung'
  return meldeOptionDisplayLabel(value)
}

export function meldeBereichLabel(value: string): string {
  return meldeOptionDisplayLabel(value)
}
