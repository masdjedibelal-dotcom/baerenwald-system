export type AuftragHandwerkerZuweisungStatus =
  | 'ausstehend'
  | 'angefragt'
  | 'warten'
  | 'akzeptiert'
  | 'abgelehnt'
  | 'zugewiesen'
  | 'ersetzt'

export const AUFTRAG_HW_STATUS_OPTIONS: { value: AuftragHandwerkerZuweisungStatus; label: string }[] = [
  { value: 'ausstehend', label: 'Ausstehend' },
  { value: 'angefragt', label: 'Angeschrieben' },
  { value: 'warten', label: 'Warten auf Antwort' },
  { value: 'akzeptiert', label: 'Angenommen' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
  { value: 'zugewiesen', label: 'Zugewiesen' },
  { value: 'ersetzt', label: 'Ersetzt' },
]

export function auftragHwStatusLabel(status: string | null | undefined): string {
  const v = (status ?? 'ausstehend').toLowerCase()
  if (v === 'bestaetigt' || v === 'angenommen') return 'Angenommen'
  if (v === 'erledigt') return 'Erledigt'
  return AUFTRAG_HW_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? status ?? 'Ausstehend'
}
