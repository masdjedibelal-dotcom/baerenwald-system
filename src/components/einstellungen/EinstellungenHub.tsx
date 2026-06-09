import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Building2,
  FileText,
  List,
  Plug,
  Shield,
  UserCircle,
  Users,
} from 'lucide-react'

type HubTile = {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

type HubGroup = {
  label: string
  tiles: HubTile[]
}

const GROUPS: HubGroup[] = [
  {
    label: 'Firma & Team',
    tiles: [
      {
        href: '/einstellungen/firma',
        title: 'Firma & Branding',
        description: 'Logo, Adresse, Bankdaten',
        icon: Building2,
      },
      {
        href: '/einstellungen/profil',
        title: 'Mein Profil',
        description: 'Name, Passwort, Kontakt',
        icon: UserCircle,
      },
      {
        href: '/einstellungen/benutzer',
        title: 'Team',
        description: 'CRM-Zugänge verwalten',
        icon: Users,
      },
    ],
  },
  {
    label: 'Preise & Dokumente',
    tiles: [
      {
        href: '/einstellungen/preise',
        title: 'Preislisten',
        description: 'Leistungen, Gewerke, Vorlagen',
        icon: List,
      },
      {
        href: '/einstellungen/formulare',
        title: 'Formulare',
        description: 'Handwerker- und Abnahmeformulare',
        icon: FileText,
      },
    ],
  },
  {
    label: 'Kommunikation & System',
    tiles: [
      {
        href: '/einstellungen/email',
        title: 'Kommunikation',
        description: 'E-Mail, Textbausteine',
        icon: Bell,
      },
      {
        href: '/einstellungen/integration',
        title: 'Integrationen',
        description: 'APIs und Schnittstellen',
        icon: Plug,
      },
      {
        href: '/einstellungen/datenschutz',
        title: 'Datenschutz',
        description: 'DSGVO, Compliance',
        icon: Shield,
      },
    ],
  },
]

export function EinstellungenHub() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-bw-text md:text-2xl">Einstellungen</h1>
        <p className="mt-1 text-sm text-bw-text-muted">
          Firma, Team, Preise und System — wähle einen Bereich.
        </p>
      </div>

      {GROUPS.map((group) => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-bw-text-muted">
            {group.label}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tiles.map((tile) => {
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
        </section>
      ))}
    </div>
  )
}
