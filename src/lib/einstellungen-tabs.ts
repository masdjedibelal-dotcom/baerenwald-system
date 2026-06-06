import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  Building2,
  FileText,
  List,
  Plug,
  UserCircle,
  Users,
} from 'lucide-react'

export type EinstellungenTabId =
  | 'profil'
  | 'firma'
  | 'team'
  | 'preise'
  | 'formulare'
  | 'benachrichtigungen'
  | 'integration'

export type EinstellungenTabDef = {
  id: EinstellungenTabId
  href: string
  label: string
  icon: LucideIcon
  /** Pfade, bei denen dieser Tab als aktiv gilt (inkl. Legacy-Redirects). */
  matchPrefixes: string[]
}

export const EINSTELLUNGEN_TABS: EinstellungenTabDef[] = [
  {
    id: 'profil',
    href: '/einstellungen/profil',
    label: 'Profil',
    icon: UserCircle,
    matchPrefixes: ['/einstellungen/profil'],
  },
  {
    id: 'firma',
    href: '/einstellungen/firma',
    label: 'Firma',
    icon: Building2,
    matchPrefixes: ['/einstellungen/firma'],
  },
  {
    id: 'team',
    href: '/einstellungen/benutzer',
    label: 'Team',
    icon: Users,
    matchPrefixes: ['/einstellungen/benutzer'],
  },
  {
    id: 'preise',
    href: '/einstellungen/preise',
    label: 'Preislisten',
    icon: List,
    matchPrefixes: [
      '/einstellungen/preise',
      '/einstellungen/gewerke',
      '/einstellungen/vorlagen',
      '/einstellungen/preisliste',
    ],
  },
  {
    id: 'formulare',
    href: '/einstellungen/formulare',
    label: 'Formulare',
    icon: FileText,
    matchPrefixes: ['/einstellungen/formulare'],
  },
  {
    id: 'benachrichtigungen',
    href: '/einstellungen/email',
    label: 'Kommunikation',
    icon: Bell,
    matchPrefixes: ['/einstellungen/email', '/einstellungen/kommunikation'],
  },
  {
    id: 'integration',
    href: '/einstellungen/integration',
    label: 'Integrationen',
    icon: Plug,
    matchPrefixes: [
      '/einstellungen/integration',
      '/einstellungen/compliance',
      '/einstellungen/datenschutz',
      '/einstellungen/felder',
    ],
  },
]

export function activeEinstellungenTab(pathname: string): EinstellungenTabId {
  const hit = EINSTELLUNGEN_TABS.find((t) =>
    t.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
  return hit?.id ?? 'profil'
}
