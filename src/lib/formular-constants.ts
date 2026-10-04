import type { FormularSubtyp } from '@/lib/types';

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
