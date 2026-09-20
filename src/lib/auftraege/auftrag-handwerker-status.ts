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

export function auftragHwStatusBadgeClass(status: string | null | undefined): string {
  const v = (status ?? '').toLowerCase()
  if (
    v === 'akzeptiert' ||
    v === 'angenommen' ||
    v === 'zugewiesen' ||
    v === 'bestaetigt' ||
    v === 'erledigt'
  ) {
    return 'bg-status-order-bg text-status-order-text'
  }
  if (v === 'abgelehnt') return 'bg-status-cancel-bg text-status-cancel-text'
  if (v === 'ersetzt') return 'bg-bw-hover text-bw-text-muted line-through'
  if (v === 'angefragt') return 'bg-status-new-bg text-status-new-text'
  if (v === 'warten') return 'bg-status-contact-bg text-status-contact-text'
  return 'bg-bw-hover text-bw-text-muted'
}
