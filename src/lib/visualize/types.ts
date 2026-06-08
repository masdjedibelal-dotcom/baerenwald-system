export type KiVizStatus = 'neu' | 'rendering' | 'fertig' | 'fehler'

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
