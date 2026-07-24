import type { LucideIcon } from 'lucide-react'
import { Building2, Settings, Sparkles, Users, Wrench } from 'lucide-react'
import { resolveMockIcon } from '@/lib/mock-icons'
import {
  CREATE_ENTRY_LABELS,
  createAnfrageHref,
  createAngebotHref,
  createPartnerHref,
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
 * Sidebar: Arbeit (Dashboard, Vorgänge, Kunden, Partner, KI Intelligence) + Planung (Kalender).
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
      nav('/ki-analytics', 'sparkles', 'KI Intelligence'),
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

/** Mobile Mehr-Screen (Kachel-Grid). */
export const MEHR_TILE_NAV: Array<{
  href: string
  icon: LucideIcon
  label: string
  desc: string
}> = [
  { href: '/kunden', icon: Users, label: 'Kunden', desc: 'Kundenstamm' },
  { href: '/handwerker', icon: Wrench, label: 'Partner', desc: 'Partnerbetriebe' },
  { href: '/partner', icon: Building2, label: 'Netzwerk', desc: 'Lieferanten & Kontakte' },
  { href: '/ki-analytics', icon: Sparkles, label: 'KI Intelligence', desc: 'Empfehlungen & Funnel' },
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
  '/vorgaenge': {
    title: 'Vorgänge',
    cta: { label: CREATE_ENTRY_LABELS.anfrage, href: createAnfrageHref() },
  },
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
  '/handwerker': {
    title: 'Partner',
    cta: { label: CREATE_ENTRY_LABELS.partner, href: createPartnerHref() },
  },
  '/kunden': { title: 'Kunden' },
  '/partner': { title: 'Netzwerk' },
  '/kalender': { title: 'Kalender' },
  '/angebote': {
    title: 'Angebote',
    cta: { label: CREATE_ENTRY_LABELS.angebot, href: createAngebotHref() },
  },
  '/einstellungen': { title: 'Einstellungen' },
  '/mehr': { title: 'Mehr' },
  '/ki-analytics': { title: 'KI Intelligence' },
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
  'ki-analytics': 'KI Intelligence',
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
