import type { KiBereich } from '@/lib/ki/constants'

export type KiCountRow = { name: string; count: number }

export type KiZyklusStat = {
  anzahl: number
  median_tage: number | null
}

export type FunnelOverviewErgebnis = {
  hinweis: string
  stufen?: {
    key: string
    label: string
    count: number
    rate_von_vorher: number | null
  }[]
  zyklen?: {
    anfrage_zu_angebot: KiZyklusStat
    angebot_zu_auftrag: KiZyklusStat
    anfrage_zu_auftrag: KiZyklusStat
    anfrage_zu_abschluss: KiZyklusStat
  }
  kennzahlen: {
    leads_gesamt: number
    leads_mit_angebot: number
    leads_mit_auftrag?: number
    leads_abgeschlossen?: number
    angebote_gesamt: number
    angebote_angenommen?: number
    auftraege_gesamt: number
    auftraege_abgeschlossen: number
    conversion_anfrage_zu_angebot: number | null
    conversion_angebot_zu_auftrag: number | null
  }
}

export type KommunikationErgebnis = {
  hinweis: string
  zusammenfassung: {
    emails_gesamt: number
    timeline_gesamt: number
    leads_mit_kommunikation: number
    leads_gesamt?: number | null
    events_pro_lead_median: number | null
  }
  email_nach_typ: KiCountRow[]
  email_nach_kontext: KiCountRow[]
  email_nach_richtung: KiCountRow[]
  timeline_nach_typ: KiCountRow[]
}

export type NachfrageErgebnis = {
  hinweis: string
  plz_regionen: KiCountRow[]
  bereiche: KiCountRow[]
  situationen: KiCountRow[]
  kanaele: KiCountRow[]
  kundentypen?: KiCountRow[]
  rechner_leistungen: KiCountRow[]
  budgets: {
    anzahl: number
    median: number
    min: number
    max: number
  } | null
  anteil_mit_rechner?: number
}

export type AngebotAbgleichErgebnis = {
  hinweis: string
  funnel: {
    leads_gesamt: number
    leads_mit_angebot: number
    angebote_gesamt: number
    conversion_prozent: number | null
  }
  abweichungen: {
    gewerke_hinzugefuegt: KiCountRow[]
    gewerke_entfernt: KiCountRow[]
    leistungen_hinzugefuegt: KiCountRow[]
    leistungen_entfernt: KiCountRow[]
  }
  preis_abgleich: {
    anzahl: number
    median_delta_prozent: number | null
    ueber_budget: number
    unter_budget: number
  } | null
  verglichen: number
  mit_angebotspositionen?: number
}

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

export type AusfuehrungErgebnis = {
  hinweis: string
  quelle: string
  zusammenfassung: {
    positionen_gesamt: number
    eigen_positionen: number
    fremd_positionen: number
    eigen_anteil_prozent: number | null
    vk_gesamt: number
    marge_eigen_prozent: number | null
    marge_fremd_prozent: number | null
  } | null
  je_gewerk: {
    gewerk: string
    eigen_positionen: number
    fremd_positionen: number
    eigen_anteil_prozent: number | null
    eigen_marge_prozent: number | null
    fremd_marge_prozent: number | null
  }[]
  eigen_leistungen?: KiCountRow[]
  fremd_handwerker?: {
    handwerker: string
    leistungen: number
    vk: number
    marge_prozent: number | null
  }[]
}

export type BaustelleSnippet = {
  quelle: string
  datum: string
  gewerk: string
  titel: string
  text: string
}

export type DauerBautagebuchErgebnis = {
  hinweis: string
  projekt: {
    auftraege: number
    mit_dauer: number
    dauer_tage_median: number | null
  }
  je_gewerk: { gewerk: string; anzahl: number; dauer_tage_median: number | null }[]
  je_leistung?: {
    gewerk: string
    leistung: string
    anzahl: number
    dauer_tage_median: number | null
  }[]
  bautagebuch: {
    eintraege: number
    auftraege_mit_eintraegen: number
    haeufige_titel: KiCountRow[]
    je_gewerk: KiCountRow[]
    snippets: BaustelleSnippet[]
  }
  positions_notizen?: {
    eintraege: number
    je_gewerk: KiCountRow[]
    snippets: BaustelleSnippet[]
  }
  abnahme?: {
    protokolle: number
    auftraege_mit_abnahme: number
    checkliste_punkte: number
    checkliste_maengel: number
    maengel_eintraege: number
    haeufige_maengel: KiCountRow[]
    je_gewerk: KiCountRow[]
    snippets: BaustelleSnippet[]
  }
  kontext_snippets?: BaustelleSnippet[]
}

export type BewertungenZeile = {
  handwerker_id: string
  handwerker_name: string
  gewerk: string
  anzahl: number
  gesamt: number | null
  qualitaet: number | null
  termintreue: number | null
  sauberkeit?: number | null
  kommunikation?: number | null
  preis_leistung?: number | null
  quelle?: string
}

export type BewertungenErgebnis = {
  hinweis: string
  zeilen: BewertungenZeile[]
  kategorien_durchschnitt: {
    qualitaet: number | null
    termintreue: number | null
    sauberkeit: number | null
    kommunikation: number | null
    preis_leistung: number | null
  } | null
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
    | FunnelOverviewErgebnis
    | NachfrageErgebnis
    | KommunikationErgebnis
    | AngebotAbgleichErgebnis
    | PreiseMargenErgebnis
    | HandwerkerRankingErgebnis
    | GewerkeAblaufErgebnis
    | AusfuehrungErgebnis
    | DauerBautagebuchErgebnis
    | BewertungenErgebnis
    | ProduktePaketeErgebnis
    | Record<string, unknown>
  narrative: string | null
  sample_size: number
  generiert_am: string
  gueltig_bis: string | null
}
