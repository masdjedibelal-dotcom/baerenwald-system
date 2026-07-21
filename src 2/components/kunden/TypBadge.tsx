'use client'

import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  privat: 'Privat',
  gewerbe: 'Gewerbe',
  hausverwaltung: 'Hausverwaltung',
  sonstiges: 'Sonstiges',
}

export function TypBadge({ typ }: { typ: string }) {
  const t = (typ || 'privat').toLowerCase()
  const label = LABELS[t] ?? typ
  const cls =
    t === 'gewerbe'
      ? 'bg-blue-100 text-blue-900'
      : t === 'hausverwaltung'
        ? 'bg-violet-100 text-violet-900'
        : t === 'sonstiges'
          ? 'bg-bw-bg text-bw-mid'
          : 'bg-emerald-100 text-emerald-900'

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>
  )
}

export function kundenAvatarClass(typ: string): string {
  const t = (typ || 'privat').toLowerCase()
  if (t === 'gewerbe') return 'bg-blue-500 text-white'
  if (t === 'hausverwaltung') return 'bg-violet-500 text-white'
  if (t === 'sonstiges') return 'bg-bw-mid text-white'
  return 'bg-emerald-500 text-white'
}

export function kundenInitialen(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
  if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase()
  return (p[0]?.[0] ?? '?').toUpperCase()
}
