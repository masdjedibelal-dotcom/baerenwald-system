import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Building2, FileText, List, Users } from 'lucide-react'

type HubTile = {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

/** Fallback-Hub — Index leitet nach Firma um; behalten für Deep-Links. */
const TILES: HubTile[] = [
  {
    href: '/einstellungen/firma',
    title: 'Firma',
    description: 'Stammdaten, Brand & Rechnung',
    icon: Building2,
  },
  {
    href: '/einstellungen/benutzer',
    title: 'Team',
    description: 'Teammitglieder einladen',
    icon: Users,
  },
  {
    href: '/einstellungen/preise',
    title: 'Preislisten',
    description: 'Gewerke und Leistungen',
    icon: List,
  },
  {
    href: '/einstellungen/formulare',
    title: 'Formulare',
    description: 'Vorlagen für Abnahme & Co.',
    icon: FileText,
  },
]

export function EinstellungenHub() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-bw-text md:text-2xl">Einstellungen</h1>
        <p className="mt-1 text-sm text-bw-text-muted">Firma, Team, Preislisten und Formulare.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {TILES.map((tile) => {
          const Icon = tile.icon
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex gap-3 rounded-xl border border-bw-border/70 bg-bw-card p-4 shadow-sm transition-colors hover:border-bw-primary/30 hover:bg-bw-hover"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bw-hover text-bw-primary group-hover:bg-bw-green-bg">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-bw-text">{tile.title}</span>
                <span className="mt-0.5 block text-xs text-bw-text-muted">{tile.description}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
