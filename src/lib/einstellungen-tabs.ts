import type { LucideIcon } from 'lucide-react'
import { Building2, FileText, List, Users } from 'lucide-react'

export type EinstellungenTabId = 'firma' | 'team' | 'preise' | 'formulare'

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

/** Einstellungen-Nav: Firma · Team · Preislisten · Formulare */
export const EINSTELLUNGEN_TABS: EinstellungenTabDef[] = [
  {
    id: 'firma',
    href: '/einstellungen/firma',
    label: 'Firma',
    icon: Building2,
    mockIcon: 'building',
    matchPrefixes: ['/einstellungen/firma', '/einstellungen/profil'],
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
    mockIcon: 'forms',
    matchPrefixes: ['/einstellungen/formulare'],
  },
]

export function activeEinstellungenTab(pathname: string): EinstellungenTabId {
  const hit = EINSTELLUNGEN_TABS.find((t) =>
    t.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
  return hit?.id ?? 'firma'
}
