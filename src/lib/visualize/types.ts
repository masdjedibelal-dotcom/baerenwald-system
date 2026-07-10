export type KiVizStatus = 'neu' | 'rendering' | 'fertig' | 'fehler'

export type VizStilVorschlag = {
  titel: string
  kurz: string
  prompt_de: string
}

export type VizFixElement = {
  id: string
  label: string
  preserve_default: boolean
}

export type VizModus = 'auffrischen' | 'teilsanierung' | 'stil_update'

export type VizBrief = {
  modus: VizModus
  struktur_lock: boolean
  preserve: string[]
  aenderungen: string[]
  beantwortete_fragen: string[]
  nutzer_antworten?: Record<string, string>
}

export type VizPrepareOption = {
  id: string
  label: string
  hint?: string
}

export type VizPrepareQuestion = {
  id: string
  question: string
  hint?: string
  options: VizPrepareOption[]
}

export type VizRaumAnalyse = {
  raum_typ: string
  raum_label: string
  ist_beschreibung: string
  erkannte_elemente?: string[]
  fixierte_elemente?: VizFixElement[]
  veraenderbare_flaechen?: string[]
  einschaetzung?: string
  stil_vorschlaege: VizStilVorschlag[]
  wunsch_entwurf: string
}

export type VizBauErklaerung = {
  titel: string
  chat_kurz: string
  zielbild_kicker?: string
  zielbild_headline: string
  zielbild_teaser?: string
  zusammenfassung: string
  gewerke: Array<{ name: string; beschreibung: string }>
  ablauf: string[]
  naechste_schritte: string[]
  hinweis_gu?: string
  cta_text: string
  preis_hinweis_optional?: string
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
  wunsch_text: string | null
  raum_analyse: VizRaumAnalyse | null
  inspiration_analyse: VizRaumAnalyse | null
  viz_brief: VizBrief | null
  gpt_erklaerung: VizBauErklaerung | null
  render_prompt: string | null
  prompt_history: KiVizPromptHistoryEntry[]
  ausgewaehlte_urls: string[]
  ins_angebot: boolean
  status: KiVizStatus
  created_at: string
  updated_at: string
}
