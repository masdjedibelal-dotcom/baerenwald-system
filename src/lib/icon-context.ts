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
