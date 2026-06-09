import type { KiClusterAnalyseRow } from '@/lib/ki/types'

export type KiHubQuelleStatus = 'ok' | 'unavailable' | 'partial'

export type KiHubQuelleResult<T> = {
  status: KiHubQuelleStatus
  data?: T
  error?: string
}

export type KiHubLeadSnapshot = {
  id: string
  kontakt_name: string | null
  status: string
  plz: string | null
  bereiche: unknown
  created_at: string
  stunden_offen: number
}

export type KiHubAngebotSnapshot = {
  id: string
  angebotsnr: string | null
  status_einfach: string | null
  leistungsumfang: string | null
  gesendet_am: string | null
  created_at: string
}

export type MarketingMetricSnapshot = {
  quelle: string
  metrik: string
  wert: Record<string, unknown>
  created_at: string
}

export type KiHubLoadPayload = {
  supabase: {
    cluster: KiClusterAnalyseRow[]
    leads_offen: KiHubLeadSnapshot[]
    leads_30d_count: number
    angebote_offen: KiHubAngebotSnapshot[]
    angebote_30d_count: number
    auftraege_aktiv_count: number
    handwerker_aktiv_count: number
    empfehlungen_heute: KiEmpfehlungRow[]
    system_events_24h: SystemEventRow[]
  }
  marketing: {
    posthog: KiHubQuelleResult<Record<string, unknown>>
    google: KiHubQuelleResult<Record<string, unknown>>
    resend: KiHubQuelleResult<Record<string, unknown>>
    metrics_history: MarketingMetricSnapshot[]
  }
  technik: {
    netlify: KiHubQuelleResult<Record<string, unknown>>
  }
  umgesetzt_7d: Pick<KiEmpfehlungRow, 'titel' | 'bereich' | 'umgesetzt_at'>[]
  timestamp: string
}

export type KiEmpfehlungPrioritaet = 'kritisch' | 'hoch' | 'mittel' | 'info'

export type KiEmpfehlungBereich =
  | 'marketing'
  | 'markt'
  | 'anfragen'
  | 'auftraege'
  | 'handwerker'
  | 'technik'
  | 'strategie'
  | 'angebote'

export type KiEmpfehlungContent = {
  typ?: string
  text?: string
  bild_url?: string | null
  bild_prompt?: string | null
  hashtags?: string[] | null
  betreff?: string | null
}

export type KiEmpfehlungRow = {
  id: string
  bereich: string
  prioritaet: string
  titel: string
  beschreibung: string | null
  daten_basis: unknown
  content: KiEmpfehlungContent | null
  aktion_typ: string | null
  aktion_payload: Record<string, unknown> | null
  gesehen: boolean
  umgesetzt: boolean
  umgesetzt_at: string | null
  analyse_lauf: string
  created_at: string
}

export type SystemEventRow = {
  id: string
  quelle: string
  event_typ: string
  severity: string
  details: unknown
  resolved: boolean
  created_at: string
}

export type KiHubAnalyzeResult = {
  kritisch: KiEmpfehlungInsert[]
  heute_tun: KiEmpfehlungInsert[]
  beobachten: KiEmpfehlungInsert[]
  gelernt: KiEmpfehlungInsert[]
  markt_trends: KiEmpfehlungInsert[]
  marketing_content: KiEmpfehlungInsert[]
  analyse_lauf: string
}

export type KiEmpfehlungInsert = {
  bereich: KiEmpfehlungBereich
  prioritaet: KiEmpfehlungPrioritaet
  titel: string
  beschreibung?: string
  daten_basis?: Record<string, unknown>
  content?: KiEmpfehlungContent | null
  aktion_typ?: string
  aktion_payload?: Record<string, unknown>
}

export type KiHubPulseCard = {
  id: string
  label: string
  status: 'ok' | 'warn' | 'critical' | 'neutral'
  kpis: { label: string; value: string }[]
  hint: string | null
}

export type KiHubEmpfehlungenGrouped = {
  kritisch: KiEmpfehlungRow[]
  heute: KiEmpfehlungRow[]
  markt: KiEmpfehlungRow[]
  marketing: KiEmpfehlungRow[]
  beobachten: KiEmpfehlungRow[]
  gelernt: KiEmpfehlungRow[]
}
