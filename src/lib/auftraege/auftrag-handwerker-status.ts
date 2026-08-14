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
  { value: 'akzeptiert', label: 'Akzeptiert' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
  { value: 'zugewiesen', label: 'Zugewiesen' },
  { value: 'ersetzt', label: 'Ersetzt' },
]

export function auftragHwStatusLabel(status: string | null | undefined): string {
  const v = (status ?? 'ausstehend').toLowerCase()
  return AUFTRAG_HW_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? status ?? 'Ausstehend'
}

export function auftragHwStatusBadgeClass(status: string | null | undefined): string {
  const v = (status ?? '').toLowerCase()
  if (v === 'akzeptiert' || v === 'zugewiesen') return 'bg-emerald-100 text-emerald-900'
  if (v === 'abgelehnt') return 'bg-red-100 text-red-900'
  if (v === 'ersetzt') return 'bg-bw-hover text-bw-text-muted line-through'
  if (v === 'angefragt') return 'bg-blue-100 text-blue-900'
  if (v === 'warten') return 'bg-amber-100 text-amber-950'
  return 'bg-bw-hover text-bw-text-muted'
}
