import type { FormularSubtyp } from '@/lib/types'

/** Builder & Filter: Werte in DB-Spalte `formular_templates.subtyp` */
export const FORMULAR_SUBTYP_OPTIONS: { value: FormularSubtyp; label: string }[] = [
  { value: 'bautagebuch', label: 'Bautagebuch' },
  { value: 'regiebericht', label: 'Regiebericht' },
  { value: 'behinderung', label: 'Behinderung' },
  { value: 'pruefprotokoll', label: 'Prüfprotokoll' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'checkliste', label: 'Checkliste' },
  { value: 'sonstiges', label: 'Sonstiges' },
  { value: 'standard', label: 'Standard (Legacy)' },
]

export const FORMULAR_SUBTYP_LABELS: Record<string, string> = Object.fromEntries(
  FORMULAR_SUBTYP_OPTIONS.map((o) => [o.value, o.label])
)

/** Filter-Chips auf der Liste (value = logischer Filter, nicht immer 1:1 DB) */
export type FormularListenFilter =
  | 'alle'
  | 'bautagebuch'
  | 'checkliste'
  | 'pruefprotokoll'
  | 'abnahme'
  | 'sonstiges'

export function templatePasstZuListenFilter(
  subtyp: string | null | undefined,
  phase: string | null | undefined,
  filter: FormularListenFilter
): boolean {
  if (filter === 'alle') return true
  const s = (subtyp ?? '').toLowerCase()
  const ph = (phase ?? '').toLowerCase()
  switch (filter) {
    case 'bautagebuch':
      return s === 'bautagebuch' || s === 'bautagebuch_kurz'
    case 'checkliste':
      return s === 'checkliste'
    case 'pruefprotokoll':
      return s === 'pruefprotokoll'
    case 'abnahme':
      return s === 'abnahme' || (!s && ph === 'abnahme')
    case 'sonstiges':
      return s === 'sonstiges' || s === 'standard' || s === '' || !subtyp
    default:
      return true
  }
}

export function subtypKurzLabel(subtyp: string | null | undefined): string {
  if (!subtyp) return '—'
  return FORMULAR_SUBTYP_LABELS[subtyp] ?? subtyp
}
