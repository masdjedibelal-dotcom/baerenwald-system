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
  /** Mock-Icon-Name für DetailShell-Nav. */
  mockIcon: string
  /** Pfade, bei denen dieser Tab als aktiv gilt (inkl. Legacy-Redirects). */
  matchPrefixes: string[]
}

export const EINSTELLUNGEN_TABS: EinstellungenTabDef[] = [
  {
    id: 'profil',
    href: '/einstellungen/profil',
    label: 'Profil',
    icon: UserCircle,
    mockIcon: 'user',
    matchPrefixes: ['/einstellungen/profil'],
  },
  {
    id: 'firma',
    href: '/einstellungen/firma',
    label: 'Firma',
    icon: Building2,
    mockIcon: 'building',
    matchPrefixes: ['/einstellungen/firma'],
  },
  {
    id: 'team',
    href: '/einstellungen/benutzer',
    label: 'Team',
    icon: Users,
    mockIcon: 'users',
    matchPrefixes: ['/einstellungen/benutzer'],
  },
  {
    id: 'preise',
    href: '/einstellungen/preise',
    label: 'Preislisten',
    icon: List,
    mockIcon: 'list',
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
    mockIcon: 'file-text',
    matchPrefixes: ['/einstellungen/formulare'],
  },
  {
    id: 'benachrichtigungen',
    href: '/einstellungen/email',
    label: 'Kommunikation',
    icon: Bell,
    mockIcon: 'bell',
    matchPrefixes: ['/einstellungen/email', '/einstellungen/kommunikation'],
  },
  {
    id: 'integration',
    href: '/einstellungen/integration',
    label: 'Integrationen',
    icon: Plug,
    mockIcon: 'plug',
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
