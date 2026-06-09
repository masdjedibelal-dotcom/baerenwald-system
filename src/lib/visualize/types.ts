export type KiVizStatus = 'neu' | 'rendering' | 'fertig' | 'fehler'

export type VizStilVorschlag = {
  titel: string
  kurz: string
  prompt_de: string
}

export type VizRaumAnalyse = {
  raum_typ: string
  raum_label: string
  ist_beschreibung: string
  erkannte_elemente?: string[]
  einschaetzung?: string
  stil_vorschlaege: VizStilVorschlag[]
  wunsch_entwurf: string
}

export type VizBauErklaerung = {
  titel: string
  chat_kurz: string
  zielbild_headline: string
  zusammenfassung: string
  gewerke: Array<{ name: string; beschreibung: string }>
  ablauf: string[]
  naechste_schritte: string[]
  hinweis_gu?: string
  cta_text: string
}

export type KiVizPromptHistoryEntry = {
  prompt: string
  ergebnis_url: string
  version: number
  created_at: string
  ist_bild_url?: string | null
}

export type KiVisualisierung = {
  id: string
  angebot_id: string
  ist_bilder_urls: string[]
  ziel_bild_url: string | null
  analysierter_prompt: string | null
  prompt_history: KiVizPromptHistoryEntry[]
  ausgewaehlte_urls: string[]
  ins_angebot: boolean
  status: KiVizStatus
  created_at: string
  updated_at: string
}
