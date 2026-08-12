/** Gemeinsame Zeile für LeistungenTab (alle vier Phasen). */
export type LeistungPhase = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

export type LeistungRowStatus =
  | 'offen'
  | 'in_arbeit'
  | 'erledigt'
  | 'geplant'
  | 'entwurf'
  | 'gestellt'
  | string

export type LeistungRow = {
  id: string
  bezeichnung: string
  subline?: string | null
  mengeLabel: string
  preisLabel: string
  preisValue: number
  /** Stückpreis für Drawer „Einzelpreis“ (falls abweichend von Zeilensumme) */
  einzelpreisLabel?: string | null
  status: LeistungRowStatus
  statusLabel: string
  /** Rohdaten für Drawer-Abschnitte */
  beschreibung?: string | null
  gewerkName?: string | null
  handwerkerName?: string | null
  handwerkerId?: string | null
  /** Anfrage-Status beim Partner (z. B. Angefragt) */
  anfrageStatusLabel?: string | null
  /** Ampel für Mobile-Card: offen | warten | zugewiesen */
  handwerkerStatusTone?: 'offen' | 'warten' | 'zugewiesen' | null
  zeitraumLabel?: string | null
  ekLabel?: string | null
  dokumentationEintraege?: { at?: string | null; text: string }[]
  abnahmeLabel?: string | null
  /** Handwerker-Nachtrag / Regie: Freigabe-Status */
  anerkennungStatus?: 'nicht_noetig' | 'in_pruefung' | 'anerkannt' | 'abgelehnt' | string | null
  /** True wenn CRM Bestätigen/Ablehnen im Sheet zeigen soll */
  brauchtFreigabe?: boolean
  /** Begründungstext aus Partner-Nachtrag (ohne System-Hinweis) */
  nachtragBegruendung?: string | null
  /** Schätzpreis / Zeit für Freigabe-Sheet */
  nachtragPreisLabel?: string | null
  nachtragZeitLabel?: string | null
  /** True wenn offener Mangel zu dieser Leistung/Gewerk */
  hatMangel?: boolean
  /** True wenn Regie / nach Aufwand */
  istRegie?: boolean
  /** Handwerker-Updates aus position_eintraege (Regie/BT) */
  handwerkerUpdates?: {
    at?: string | null
    text: string
    zeitLabel?: string | null
    fotoCount?: number
  }[]
  /** Erfasste Regie-Zeit (Soll/Ist-Label) */
  regieSollIstLabel?: string | null
}

export type LeistungMangelAnzeige = {
  id: string
  text: string
  frist: string | null
  /** offen | überfällig | behoben */
  status: 'offen' | 'ueberfaellig' | 'behoben'
  statusLabel: string
  gewerk?: string | null
}

export type LeistungDrawerAction = {
  id: string
  label: string
  /** Header-Icon (MockIcon), z. B. „user“ für Zuweisung */
  icon?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  onClick: () => void
  disabled?: boolean
}
