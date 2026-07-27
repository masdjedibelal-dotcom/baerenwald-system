import type { LucideIcon } from 'lucide-react'
import { Settings, Sparkles, Wrench } from 'lucide-react'
import { resolveMockIcon } from '@/lib/mock-icons'
import {
  CREATE_ENTRY_LABELS,
  createAnfrageHref,
  createAngebotHref,
  createRechnungHref,
} from '@/lib/crm/create-entry'

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
 * Sidebar: Arbeit (Dashboard, Vorgänge, Kunden, Partner, KI) + Planung (Kalender).
 *
 * Naming (zwei Entitäten):
 * - Partner = Tabelle `handwerker`, Route `/handwerker` (Ausführungspartner / Partnerbetriebe)
 * - Netzwerk = Tabelle `partner`, Route `/partner` (Versicherung, Makler, Lieferanten …)
 * Routen nicht mergen — unterschiedliche Datenmodelle.
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
      nav('/kunden', 'users', 'Kunden'),
      nav('/handwerker', 'tool', 'Partner'),
      nav('/ki-analytics', 'sparkles', 'KI'),
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

/**
 * Mobile BottomNav (W6-10): Dashboard · Vorgänge · Kalender · Kunden (+ FAB + Mehr).
 * Layout: 2 Tabs | FAB | 2 Tabs | Mehr — `flex:1` skaliert Labels.
 * Kunden entfällt auf dem Mehr-Screen (Doppel-Link vermeiden).
 */
export const BOTTOM_NAV_ITEMS: NavItemDef[] = [
  nav('/', 'layout-dashboard', 'Dashboard', true),
  nav('/vorgaenge', 'folders', 'Vorgänge', false, [
    '/anfragen',
    '/angebote',
    '/auftraege',
    '/rechnungen',
  ]),
  nav('/kalender', 'calendar', 'Kalender'),
  nav('/kunden', 'users', 'Kunden'),
]

/** Mobile Mehr-Screen (Kachel-Grid). */
export const MEHR_TILE_NAV: Array<{
  href: string
  icon: LucideIcon
  label: string
  desc: string
}> = [
  { href: '/handwerker', icon: Wrench, label: 'Partner', desc: 'Handwerker & Netzwerk' },
  { href: '/ki-analytics', icon: Sparkles, label: 'KI', desc: 'Empfehlungen & Funnel' },
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
  '/anfragen': {
    title: 'Anfragen',
    cta: { label: CREATE_ENTRY_LABELS.anfrage, href: createAnfrageHref() },
  },
  '/auftraege': {
    title: 'Aufträge',
    cta: { label: CREATE_ENTRY_LABELS.anfrage, href: createAnfrageHref() },
  },
  '/rechnungen': {
    title: 'Rechnungen',
    cta: { label: CREATE_ENTRY_LABELS.rechnung, href: createRechnungHref() },
  },
  '/handwerker': { title: 'Partner' },
  '/kunden': { title: 'Kunden' },
  '/partner': { title: 'Netzwerk' },
  '/kalender': { title: 'Kalender' },
  '/angebote': {
    title: 'Angebote',
    cta: { label: CREATE_ENTRY_LABELS.angebot, href: createAngebotHref() },
  },
  '/einstellungen': { title: 'Einstellungen' },
  '/mehr': { title: 'Mehr' },
  '/ki-analytics': { title: 'KI' },
}

export const SECTION_LABELS: Record<string, string> = {
  vorgaenge: 'Vorgänge',
  anfragen: 'Anfragen',
  auftraege: 'Aufträge',
  rechnungen: 'Rechnungen',
  handwerker: 'Partner',
  kunden: 'Kunden',
  partner: 'Netzwerk',
  kalender: 'Kalender',
  angebote: 'Angebote',
  einstellungen: 'Einstellungen',
  mehr: 'Mehr',
  'ki-analytics': 'KI',
}

export const SUB_LABELS: Record<string, Record<string, string>> = {
  einstellungen: {
    profil: 'Profil',
    firma: 'Firma & Branding',
    benutzer: 'Team',
    preise: 'Preislisten',
    formulare: 'Formulare',
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
