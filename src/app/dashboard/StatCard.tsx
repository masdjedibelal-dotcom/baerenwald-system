'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  zahl: number
  label: string
  icon: LucideIcon
  href: string
  farbe: 'blau' | 'orange' | 'gruen' | 'lila' | 'rot'
  /** Linker Farbbalken bei Warnung (z. B. neue Anfragen / überfällige Rechnungen). */
  warnung?: boolean
}

const FARBEN = {
  blau: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50',
    balken: 'bg-blue-500',
  },
  orange: {
    icon: 'text-orange-500',
    bg: 'bg-orange-50',
    balken: 'bg-orange-500',
  },
  gruen: {
    icon: 'text-bw-primary',
    bg: 'bg-bw-green-bg',
    balken: 'bg-bw-primary',
  },
  lila: {
    icon: 'text-purple-500',
    bg: 'bg-purple-50',
    balken: 'bg-purple-500',
  },
  rot: {
    icon: 'text-red-500',
    bg: 'bg-red-50',
    balken: 'bg-red-500',
  },
} as const

export function StatCard({ zahl, label, icon: Icon, href, farbe, warnung = false }: StatCardProps) {
  const f = FARBEN[farbe]
  const zeigBalken = warnung && zahl > 0

  return (
    <Link href={href} className="block">
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-bw-border bg-bw-card p-5',
          'cursor-pointer transition-all duration-150 hover:border-bw-primary hover:shadow-md'
        )}
      >
        {zeigBalken ? <div className={cn('absolute bottom-0 left-0 top-0 w-1', f.balken)} /> : null}

        <div className="mb-3 flex items-start justify-between">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', f.bg)}>
            <Icon className={cn('h-5 w-5', f.icon)} aria-hidden />
          </div>
          <span className="text-3xl font-semibold leading-none text-bw-text">{zahl}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-bw-text-muted">{label}</span>
          <span className="text-xs text-bw-light">→</span>
        </div>
      </div>
    </Link>
  )
}
