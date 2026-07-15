import type { LucideIcon } from 'lucide-react'
import { resolveMockIcon } from '@/lib/mock-icons'

export type NavItemDef = {
  href: string
  icon: LucideIcon
  /** Mock-Icon-Name (Dokumentation / spätere n=-Migration). */
  iconName: string
  label: string
  exact?: boolean
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
  exact?: boolean
): NavItemDef {
  return {
    href,
    iconName,
    icon: resolveMockIcon(iconName),
    label,
    exact,
  }
}

/**
 * Sidebar-Navigation — Icons 1:1 aus dem Mock-Vokabular
 * (Handwerker = `tool`, nicht HardHat; Rechnungen = `receipt`).
 * Getrennte Listen (Anfragen/Angebote/Aufträge) bleiben funktional;
 * Mock-Sidebar fasst sie zu „Vorgänge“ (`folders`) zusammen — Struktur = Schritt 3.
 */
export const SIDEBAR_NAV_GROUPS: NavGroupDef[] = [
  {
    id: 'arbeit',
    label: 'Arbeit',
    items: [
      nav('/', 'layout-dashboard', 'Dashboard', true),
      nav('/anfragen', 'inbox', 'Anfragen'),
      nav('/angebote', 'file-invoice', 'Angebote'),
      nav('/auftraege', 'briefcase', 'Aufträge'),
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
    id: 'finanzen',
    label: 'Finanzen',
    items: [nav('/rechnungen', 'receipt', 'Rechnungen')],
  },
  {
    id: 'planung',
    label: 'Planung',
    items: [
      nav('/kalender', 'calendar', 'Kalender'),
      nav('/ki-analytics', 'activity', 'KI Hub'),
    ],
  },
]

/** @deprecated Legacy-Flat-Listen — aus SIDEBAR_NAV_GROUPS abgeleitet */
export const SIDEBAR_PRIMARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS[0].items

/** @deprecated Legacy-Flat-Listen — aus SIDEBAR_NAV_GROUPS abgeleitet */
export const SIDEBAR_SECONDARY_NAV: NavItemDef[] = SIDEBAR_NAV_GROUPS.slice(1).flatMap((g) => g.items)

/** Mobile BottomNav (5 Slots + Mehr). */
export const BOTTOM_NAV_ITEMS: NavItemDef[] = [
  nav('/', 'layout-dashboard', 'Dashboard', true),
  nav('/anfragen', 'inbox', 'Anfragen'),
  nav('/angebote', 'file-invoice', 'Angebote'),
  nav('/auftraege', 'briefcase', 'Aufträge'),
]

/** Mobile Mehr-Sheet. */
export const MORE_SHEET_NAV: NavItemDef[] = [
  nav('/kunden', 'users', 'Kunden'),
  nav('/rechnungen', 'receipt', 'Rechnungen'),
  nav('/handwerker', 'tool', 'Handwerker'),
  nav('/partner', 'building', 'Partner'),
  nav('/kalender', 'calendar', 'Kalender'),
  nav('/ki-analytics', 'activity', 'KI Hub'),
  nav('/einstellungen', 'settings', 'Einstellungen'),
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
