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
  status: LeistungRowStatus
  statusLabel: string
  /** Rohdaten für Drawer-Abschnitte */
  beschreibung?: string | null
  gewerkName?: string | null
  handwerkerName?: string | null
  handwerkerId?: string | null
  zeitraumLabel?: string | null
  ekLabel?: string | null
  dokumentationEintraege?: { at?: string | null; text: string }[]
  abnahmeLabel?: string | null
}

export type LeistungMangelAnzeige = {
  id: string
  text: string
  frist: string | null
  /** offen | überfällig | behoben */
  status: 'offen' | 'ueberfaellig' | 'behoben'
  statusLabel: string
}

export type LeistungDrawerAction = {
  id: string
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  onClick: () => void
  disabled?: boolean
}
