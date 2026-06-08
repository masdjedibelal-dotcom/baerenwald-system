import type { KiBereich } from '@/lib/ki/constants'

export type PreiseMargenZeile = {
  gewerk: string
  plz_region: string
  anzahl: number
  preis_min: number
  preis_max: number
  preis_median: number
  marge_prozent: number
  verlaesslich: boolean
  abgeschlossen: number
}

export type PreiseMargenErgebnis = {
  schwellwert: number
  hinweis: string
  region_label: string
  zeilen: PreiseMargenZeile[]
}

export type HandwerkerRankingZeile = {
  handwerker_id: string
  handwerker_name: string
  gewerk: string
  auftraege: number
  score: number
  bewertung: number | null
  marge_prozent: number | null
  antwort_stunden: number | null
  annahme_prozent: number | null
  warnung: boolean
  verlaesslich: boolean
}

export type GewerkeAblaufLeistung = {
  name: string
  count: number
  anteil_prozent: number
}

export type GewerkeAblaufPhase = {
  phase: string
  reihenfolge: number
  auftraege_mit_phase: number
  dauer_tage_median: number | null
}

export type GewerkeAblaufZeile = {
  gewerk: string
  auftraege: number
  positionen_gesamt: number
  typische_leistungen: GewerkeAblaufLeistung[]
  phasen_ablauf: GewerkeAblaufPhase[]
  ablauf_text: string
  dauer_gesamt_tage_median: number | null
  vk_median: number
  ek_partner_median: number
  ek_eigen_median: number
  marge_prozent: number
  fremdleistung_anteil_prozent: number
  verlaesslich: boolean
}

export type GewerkeAblaufErgebnis = {
  schwellwert: number
  hinweis: string
  zeilen: GewerkeAblaufZeile[]
}

export type ProdukteStandardpaket = {
  name: string
  leistungen: string[]
  haeufigkeit: number
  anteil_prozent: number
  vk_median: number | null
  angebot_ablauf: string
  koordination: string
  verlaesslich: boolean
}

export type ProdukteKombination = {
  leistung: string
  erscheint_in_auftraegen: number
  typisch_mit: { leistung: string; zusammen: number }[]
}

export type ProduktePaketeZeile = {
  gewerk: string
  auftraege: number
  standardpakete: ProdukteStandardpaket[]
  kombinationen: ProdukteKombination[]
  angebot_ablauf_vorschlag: string
  koordination_vorschlag: string
  festpreis_hinweis: string | null
  verlaesslich: boolean
}

export type ProduktePaketeErgebnis = {
  schwellwert: number
  hinweis: string
  zeilen: ProduktePaketeZeile[]
}

export type HandwerkerRankingErgebnis = {
  schwellwert: number
  score_warnung: number
  hinweis: string
  top_je_gewerk: { gewerk: string; handwerker: string; score: number }[]
  zeilen: HandwerkerRankingZeile[]
}

export type KiClusterAnalyseRow = {
  id: string
  bereich: KiBereich | string
  analyse_key: string
  titel: string
  ergebnis:
    | PreiseMargenErgebnis
    | HandwerkerRankingErgebnis
    | GewerkeAblaufErgebnis
    | ProduktePaketeErgebnis
    | Record<string, unknown>
  narrative: string | null
  sample_size: number
  generiert_am: string
  gueltig_bis: string | null
}
