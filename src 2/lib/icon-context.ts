/**
 * Icon-Farb-Kontexte — binden Mock-Icons an --icon-*-Tokens in globals.css.
 * Jede MockIcon-Instanz braucht ctx (Build-Check).
 */
export const ICON_CONTEXTS = [
  /** Allgemein / Toolbar / Suche — --icon-default (--text-3) */
  'default',
  /** Detail-Shell-Nav — --icon-nav (--text-2); aktiv: --icon-nav-active */
  'nav',
  /** Detail-Tab-Leiste — wie nav; aktiv: --icon-active */
  'tab',
  /** Sidebar + BottomNav — --icon-sidebar; erbt in .sidebar-icon / .bottomnav-item */
  'sidebar',
  /** Listen-Zeilen / Quick-Actions — --icon-row */
  'row',
  /** In .btn — erbt Button-Textfarbe (primary=weiß, secondary=--text) */
  'btn',
  /** Empty-State — --icon-muted (--text-4) */
  'empty',
  /** Karten-Titel / Betonung — --icon-emphasis (--text-2) */
  'emphasis',
] as const

export type IconContext = (typeof ICON_CONTEXTS)[number]

export function iconCtxClass(ctx: IconContext): string {
  return `icon-ctx-${ctx}`
}

/** Token-Referenz für Doku / Audit */
export const ICON_CONTEXT_TOKENS: Record<IconContext, string> = {
  default: '--icon-default → --text-3 (#6a746f)',
  nav: '--icon-nav → --text-2 (#404a45); active → --icon-nav-active',
  tab: '--icon-nav; active → --icon-active (--green)',
  sidebar: '--icon-sidebar; in Nav → inherit (weiß/gedämpft)',
  row: '--icon-row → --text-3; hover → --icon-row-hover',
  btn: 'inherit (Button-Kontext)',
  empty: '--icon-muted → --text-4',
  emphasis: '--icon-emphasis → --text-2',
}
