'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'

type HubTile = {
  href: string
  title: string
  description: string
  icon: string
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
        icon: 'building',
      },
      {
        href: '/einstellungen/profil',
        title: 'Mein Profil',
        description: 'Name, Passwort, Kontakt',
        icon: 'users',
      },
      {
        href: '/einstellungen/benutzer',
        title: 'Team',
        description: 'CRM-Zugänge verwalten',
        icon: 'users',
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
        icon: 'list',
      },
      {
        href: '/einstellungen/formulare',
        title: 'Formulare',
        description: 'Handwerker- und Abnahmeformulare',
        icon: 'forms',
      },
    ],
  },
  {
    label: 'Kommunikation & System',
    tiles: [
      {
        href: '/einstellungen/email',
        title: 'Benachrichtigungen',
        description: 'E-Mail, Textbausteine',
        icon: 'bell',
      },
      {
        href: '/einstellungen/sicherheit',
        title: 'Sicherheit & DSGVO',
        description: 'Datenschutz und Compliance',
        icon: 'shield-check',
      },
    ],
  },
]

export function EinstellungenHub() {
  return (
    <div>
      <div className="section-h" style={{ marginBottom: 16 }}>
        Einstellungen
      </div>
      {GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: 24 }}>
          <div className="form-section-h">{group.label}</div>
          <div className="mehr-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {group.tiles.map((tile) => (
              <Link key={tile.href} href={tile.href} className="mehr-tile">
                <div className="mehr-tile-icon">
                  <MockIcon n={tile.icon} size={24} />
                </div>
                <div className="mehr-tile-label">{tile.title}</div>
                <div className="mehr-tile-desc">{tile.description}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
