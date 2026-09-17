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

export function kundenAvatarClass(typ: string): string {
  const t = (typ || 'privat').toLowerCase()
  if (t === 'gewerbe') return 'bg-bw-mid text-white'
  if (t === 'hausverwaltung' || t === 'verwaltung') return 'bg-bw-mid text-white'
  if (t === 'sonstiges') return 'bg-bw-mid text-white'
  return 'bg-emerald-600 text-white'
}

export function kundenInitialen(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase()
  return (p[0]?.[0] ?? '?').toUpperCase()
}
