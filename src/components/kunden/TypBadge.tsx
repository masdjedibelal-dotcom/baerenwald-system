'use client'

import { MetaTag } from '@/components/mock-ui/MetaTag'
const LABELS: Record<string, string> = {
  privat: 'Privat',
  eigentuemer: 'Privat',
  gewerbe: 'Gewerbe',
  hausverwaltung: 'Hausverwaltung',
  sonstiges: 'Sonstiges',
}

export function TypBadge({ typ }: { typ: string }) {
  const t = (typ || 'privat').toLowerCase()
  const label = LABELS[t] ?? (t === 'verwaltung' ? 'Hausverwaltung' : typ)
  return <MetaTag>{label}</MetaTag>
}
