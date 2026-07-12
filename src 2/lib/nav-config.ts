import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Wrench,
  Receipt,
  HardHat,
  Users,
  Building2,
  Calendar,
  Settings,
  Sparkles,
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

/** Gruppierte Sidebar-Navigation (Desktop). */
export const SIDEBAR_NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'arbeit',
    label: 'Arbeit',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { href: '/anfragen', icon: Inbox, label: 'Anfragen' },
      { href: '/angebote', icon: FileText, label: 'Angebote' },
      { href: '/auftraege', icon: Wrench, label: 'Aufträge' },
    ],
  },
  {
    id: 'stammdaten',
    label: 'Stammdaten',
    items: [
      { href: '/kunden', icon: Users, label: 'Kunden' },
      { href: '/handwerker', icon: HardHat, label: 'Handwerker' },
      { href: '/partner', icon: Building2, label: 'Partner' },
    ],
  },
  {
    id: 'finanzen',
    label: 'Finanzen',
    items: [{ href: '/rechnungen', icon: Receipt, label: 'Rechnungen' }],
  },
  {
    id: 'planung',
    label: 'Planung',
    items: [
      { href: '/kalender', icon: Calendar, label: 'Kalender' },
      { href: '/ki-analytics', icon: Sparkles, label: 'KI Hub' },
    ],
  },
]

/** @deprecated Legacy-Flat-Listen — aus SIDEBAR_NAV_GROUPS abgeleitet */
export const SIDEBAR_PRIMARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS[0].items

/** @deprecated Legacy-Flat-Listen — aus SIDEBAR_NAV_GROUPS abgeleitet */
export const SIDEBAR_SECONDARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS.slice(1).flatMap((g) => g.items)

/** Mobile BottomNav (5 Slots + Mehr). */
export const BOTTOM_NAV_ITEMS: NavItemDef[] = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/anfragen', icon: Inbox, label: 'Anfragen' },
  { href: '/angebote', icon: FileText, label: 'Angebote' },
  { href: '/auftraege', icon: Wrench, label: 'Aufträge' },
]

/** Mobile Mehr-Sheet. */
export const MORE_SHEET_NAV: NavItemDef[] = [
  { href: '/kunden', icon: Users, label: 'Kunden' },
  { href: '/rechnungen', icon: Receipt, label: 'Rechnungen' },
  { href: '/handwerker', icon: HardHat, label: 'Handwerker' },
  { href: '/partner', icon: Building2, label: 'Partner' },
  { href: '/kalender', icon: Calendar, label: 'Kalender' },
  { href: '/ki-analytics', icon: Sparkles, label: 'KI Hub' },
  { href: '/einstellungen', icon: Settings, label: 'Einstellungen' },
]

export type RouteCta = { label: string; href: string }

export type RouteMetaDef = {
  title: string
  cta?: RouteCta
}

/** TopBar-Titel und CTAs pro Listen-Route. */
export const ROUTE_META: Record<string, RouteMetaDef> = {
  '/': { title: 'Dashboard' },
  '/anfragen': { title: 'Anfragen', cta: { label: 'Neue Anfrage', href: '/anfragen/neu' } },
  '/auftraege': { title: 'Aufträge' },
  '/rechnungen': { title: 'Rechnungen', cta: { label: 'Neue Rechnung', href: '/rechnungen/neu' } },
  '/handwerker': { title: 'Handwerker', cta: { label: 'Neuer Handwerker', href: '/handwerker?neu=1' } },
  '/kunden': { title: 'Kunden', cta: { label: 'Neuer Kunde', href: '/kunden?neu=1' } },
  '/partner': { title: 'Partner', cta: { label: 'Neuer Partner', href: '/partner?neu=1' } },
  '/kalender': { title: 'Kalender' },
  '/angebote': { title: 'Angebote' },
  '/einstellungen': { title: 'Einstellungen' },
  '/ki-analytics': { title: 'KI Hub' },
}

export const SECTION_LABELS: Record<string, string> = {
  anfragen: 'Anfragen',
  auftraege: 'Aufträge',
  rechnungen: 'Rechnungen',
  handwerker: 'Handwerker',
  kunden: 'Kunden',
  partner: 'Partner',
  kalender: 'Kalender',
  angebote: 'Angebote',
  einstellungen: 'Einstellungen',
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
