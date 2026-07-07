/** GPT Raumvisualisierung — Daten aus leads.funnel_daten (Website = Source of Truth). */

export type GptVizStilVorschlag = {
  titel: string
  kurz: string
  prompt_de: string
}

export type GptVizFixElement = {
  id: string
  label: string
  preserve_default: boolean
}

export type GptVizRaumAnalyse = {
  raum_typ: string
  raum_label: string
  ist_beschreibung: string
  erkannte_elemente?: string[]
  fixierte_elemente?: GptVizFixElement[]
  veraenderbare_flaechen?: string[]
  einschaetzung?: string
  stil_vorschlaege: GptVizStilVorschlag[]
  wunsch_entwurf: string
}

export type GptVizModus = 'auffrischen' | 'teilsanierung' | 'stil_update'

export type GptVizBrief = {
  modus: GptVizModus
  struktur_lock: boolean
  preserve: string[]
  aenderungen: string[]
  beantwortete_fragen: string[]
  nutzer_antworten?: Record<string, string>
}

export type GptVizRenderVersion = {
  url: string
  wunsch_text: string
  created_at: string
}

export type GptVizBauErklaerung = {
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

export type GptVizChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type GptVizFunnelQuelle = 'gpt_raumvisualisierung' | 'gpt_kombiniert' | 'gpt_beratung'

/** leads.funnel_daten wenn projekt_studio === true */
export type GptProjektStudioFunnelDaten = {
  projekt_studio: true
  gpt_session_id: string
  raum_analyse?: GptVizRaumAnalyse | null
  inspiration_analyse?: GptVizRaumAnalyse | null
  viz_brief?: GptVizBrief | null
  wunsch_text?: string | null
  render_prompt?: string | null
  ist_bilder_urls?: string[]
  ziel_bild_url?: string | null
  ergebnis_bild_url?: string | null
  zielbild_url?: string | null
  ergebnis_historie?: GptVizRenderVersion[]
  gpt_erklaerung?: GptVizBauErklaerung | null
  ki_chat_verlauf?: GptVizChatMessage[]
  render_count?: number
  funnel_quelle?: GptVizFunnelQuelle
}
