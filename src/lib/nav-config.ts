import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Folders,
  HardHat,
  Users,
  Building2,
  Calendar,
  Settings,
  Sparkles,
  Wrench,
} from 'lucide-react'

export type NavItemDef = {
  href: string
  icon: LucideIcon
  label: string
  exact?: boolean
}

export type NavGroupDef = {
  id: string
  label: string
  items: NavItemDef[]
}

/** Mock-NAV: Baerenwald CRM (standalone) (2).html */
export const SIDEBAR_NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'arbeit',
    label: 'Arbeit',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { href: '/vorgaenge', icon: Folders, label: 'Vorgänge' },
    ],
  },
  {
    id: 'stammdaten',
    label: 'Stammdaten',
    items: [
      { href: '/kunden', icon: Users, label: 'Kunden' },
      { href: '/handwerker', icon: Wrench, label: 'Handwerker' },
      { href: '/partner', icon: Building2, label: 'Partner' },
    ],
  },
  {
    id: 'planung',
    label: 'Planung',
    items: [{ href: '/kalender', icon: Calendar, label: 'Kalender' }],
  },
]

export const SIDEBAR_PRIMARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS[0].items
export const SIDEBAR_SECONDARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS.slice(1).flatMap((g) => g.items)

/** Mock BottomNav: Dashboard · Vorgänge · [+] · Kalender · Mehr */
export const BOTTOM_NAV_ITEMS: NavItemDef[] = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/vorgaenge', icon: Folders, label: 'Vorgänge' },
  { href: '/kalender', icon: Calendar, label: 'Kalender' },
]

/** Mock Mehr-Screen Kacheln (1:1 Mock — ohne Rechnungen) */
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

/** Legacy Mehr-Sheet (Fallback) */
export const MORE_SHEET_NAV: NavItemDef[] = MEHR_TILE_NAV.map((t) => ({
  href: t.href,
  icon: t.icon,
  label: t.label,
}))

export type RouteCta = { label: string; href: string }

export type RouteMetaDef = {
  title: string
  cta?: RouteCta
}

/** TopBar-Titel pro Route (Mock: kein CTA in TopBar — FAB/Neu-Popover). */
export const ROUTE_META: Record<string, RouteMetaDef> = {
  '/': { title: 'Dashboard' },
  '/vorgaenge': { title: 'Vorgänge' },
  '/anfragen': { title: 'Anfrage' },
  '/auftraege': { title: 'Auftrag' },
  '/rechnungen': { title: 'Rechnung' },
  '/handwerker': { title: 'Handwerker' },
  '/kunden': { title: 'Kunden' },
  '/partner': { title: 'Partner' },
  '/kalender': { title: 'Kalender' },
  '/angebote': { title: 'Angebot' },
  '/einstellungen': { title: 'Einstellungen' },
  '/mehr': { title: 'Mehr' },
  '/neu': { title: 'Neu erstellen' },
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
    sicherheit: 'Sicherheit & DSGVO',
    compliance: 'Compliance',
    datenschutz: 'Datenschutz & DSGVO',
    felder: 'Custom Fields',
    gewerke: 'Gewerke',
    preisliste: 'Preisliste',
    vorlagen: 'Angebot-Vorlagen',
  },
}
