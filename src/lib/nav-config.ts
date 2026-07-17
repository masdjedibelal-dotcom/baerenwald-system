import type { LucideIcon } from 'lucide-react'
import { Building2, Settings, Users, Wrench } from 'lucide-react'
import { resolveMockIcon } from '@/lib/mock-icons'

export type NavItemDef = {
  href: string
  icon: LucideIcon
  /** Mock-Icon-Name (Dokumentation / spätere n=-Migration). */
  iconName: string
  label: string
  exact?: boolean
  /** Zusätzliche Pfade, die diesen Eintrag aktiv markieren (z. B. Phasen-Routen unter Vorgänge). */
  activeAlso?: string[]
}

export type NavGroupDef = {
  id: string
  label: string
  items: NavItemDef[]
}

function nav(
  href: string,
  iconName: string,
  label: string,
  exact?: boolean,
  activeAlso?: string[]
): NavItemDef {
  return {
    href,
    iconName,
    icon: resolveMockIcon(iconName),
    label,
    exact,
    activeAlso,
  }
}

/**
 * Sidebar = Mock-Positivliste NAV:
 * Arbeit: Dashboard, Vorgänge · Stammdaten: Kunden, Handwerker, Partner · Planung: Kalender
 * Phasen-Listen (/anfragen …) bleiben erreichbar über Dashboard/Vorgänge, nicht als Sidebar-Einträge.
 */
export const SIDEBAR_NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'arbeit',
    label: 'Arbeit',
    items: [
      nav('/', 'layout-dashboard', 'Dashboard', true),
      nav('/vorgaenge', 'folders', 'Vorgänge', false, [
        '/anfragen',
        '/angebote',
        '/auftraege',
        '/rechnungen',
      ]),
    ],
  },
  {
    id: 'stammdaten',
    label: 'Stammdaten',
    items: [
      nav('/kunden', 'users', 'Kunden'),
      nav('/handwerker', 'tool', 'Handwerker'),
      nav('/partner', 'building', 'Partner'),
    ],
  },
  {
    id: 'planung',
    label: 'Planung',
    items: [nav('/kalender', 'calendar', 'Kalender')],
  },
]

/** @deprecated Legacy-Flat-Listen — aus SIDEBAR_NAV_GROUPS abgeleitet */
export const SIDEBAR_PRIMARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS[0].items

/** @deprecated Legacy-Flat-Listen — aus SIDEBAR_NAV_GROUPS abgeleitet */
export const SIDEBAR_SECONDARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS.slice(1).flatMap((g) => g.items)

/** Mobile BottomNav = Mock MOBILE_PRIMARY: Dashboard, Vorgänge, Kalender (+ FAB + Mehr). */
export const BOTTOM_NAV_ITEMS: NavItemDef[] = [
  nav('/', 'layout-dashboard', 'Dashboard', true),
  nav('/vorgaenge', 'folders', 'Vorgänge', false, [
    '/anfragen',
    '/angebote',
    '/auftraege',
    '/rechnungen',
  ]),
  nav('/kalender', 'calendar', 'Kalender'),
]

/** Mobile Mehr-Screen (Kachel-Grid) — Mock MEHR_ITEMS. */
export const MEHR_TILE_NAV: Array<{
  href: string
  icon: LucideIcon
  label: string
  desc: string
}> = [
  { href: '/kunden', icon: Users, label: 'Kunden', desc: 'Kundenstamm' },
  { href: '/handwerker', icon: Wrench, label: 'Handwerker', desc: 'Partnerbetriebe' },
  { href: '/partner', icon: Building2, label: 'Partner', desc: 'Netzwerk' },
  { href: '/einstellungen', icon: Settings, label: 'Einstellungen', desc: 'Firma & Team' },
]

export type RouteCta = { label: string; href: string }

export type RouteMetaDef = {
  title: string
  cta?: RouteCta
}

/** TopBar-Titel und CTAs pro Listen-Route. */
export const ROUTE_META: Record<string, RouteMetaDef> = {
  '/': { title: 'Dashboard' },
  '/vorgaenge': { title: 'Vorgänge' },
  '/anfragen': { title: 'Anfragen', cta: { label: 'Neue Anfrage', href: '/anfragen/neu' } },
  '/auftraege': { title: 'Aufträge' },
  '/rechnungen': { title: 'Rechnungen', cta: { label: 'Neue Rechnung', href: '/rechnungen/neu' } },
  '/handwerker': { title: 'Handwerker' },
  '/kunden': { title: 'Kunden' },
  '/partner': { title: 'Partner' },
  '/kalender': { title: 'Kalender' },
  '/angebote': { title: 'Angebote' },
  '/einstellungen': { title: 'Einstellungen' },
  '/mehr': { title: 'Mehr' },
  '/ki-analytics': { title: 'KI Hub' },
}

export const SECTION_LABELS: Record<string, string> = {
  vorgaenge: 'Vorgänge',
  anfragen: 'Anfragen',
  auftraege: 'Aufträge',
  rechnungen: 'Rechnungen',
  handwerker: 'Handwerker',
  kunden: 'Kunden',
  partner: 'Partner',
  kalender: 'Kalender',
  angebote: 'Angebote',
  einstellungen: 'Einstellungen',
  mehr: 'Mehr',
  'ki-analytics': 'KI Hub',
}

export const SUB_LABELS: Record<string, Record<string, string>> = {
  einstellungen: {
    profil: 'Profil',
    firma: 'Firma & Branding',
    benutzer: 'Team',
    preise: 'Preislisten',
    formulare: 'Formulare',
    email: 'Benachrichtigungen',
    kommunikation: 'Textbausteine',
    integration: 'Integrationen',
    compliance: 'Compliance',
    datenschutz: 'Datenschutz & DSGVO',
    felder: 'Custom Fields',
    gewerke: 'Gewerke',
    preisliste: 'Preisliste',
    vorlagen: 'Angebot-Vorlagen',
  },
}

/** Hilfsfunktion: aktiver Nav-Eintrag inkl. Phasen-Routen. */
export function navItemIsActive(item: NavItemDef, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true
  return (item.activeAlso ?? []).some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}
