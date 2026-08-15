import type { LucideIcon } from 'lucide-react'
import { Bell, Building2, List, Users } from 'lucide-react'

export type EinstellungenTabId = 'firma' | 'team' | 'preise' | 'benachrichtigungen'

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

/** Einstellungen-Nav: Firma · Team · Preislisten · Benachrichtigungen */
export const EINSTELLUNGEN_TABS: EinstellungenTabDef[] = [
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
    id: 'benachrichtigungen',
    href: '/einstellungen/benachrichtigungen',
    label: 'Benachrichtigungen',
    icon: Bell,
    mockIcon: 'bell',
    matchPrefixes: ['/einstellungen/benachrichtigungen'],
  },
]

export function activeEinstellungenTab(pathname: string): EinstellungenTabId {
  const hit = EINSTELLUNGEN_TABS.find((t) =>
    t.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
  return hit?.id ?? 'firma'
}
