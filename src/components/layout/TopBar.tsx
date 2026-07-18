'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { ROUTE_META, SECTION_LABELS, SUB_LABELS } from '@/lib/nav-config'
import { MockIcon } from '@/components/mock-ui/MockIcon'

interface TopBarProps {
  user: User
  onSearchOpen?: () => void
}

type Crumb = { label: string; href?: string }

const NEW_SUB = 'neu'

function pathToBreadcrumbs(pathname: string): {
  title: string
  parents: Crumb[]
  cta?: (typeof ROUTE_META)[string]['cta']
} {
  if (pathname === '/') return { title: 'Dashboard', parents: [] }
  const segments = pathname.split('/').filter(Boolean)
  const section = segments[0]
  const sectionHref = `/${section}`
  const meta = ROUTE_META[sectionHref]
  const sectionLabel = SECTION_LABELS[section] ?? section

  if (segments.length === 1) {
    return { title: meta?.title ?? sectionLabel, parents: [], cta: meta?.cta }
  }

  if (segments[1] === NEW_SUB) {
    return {
      title: meta?.cta?.label ?? `${sectionLabel} – Neu`,
      parents: [{ label: sectionLabel, href: sectionHref }],
      cta: undefined,
    }
  }

  const subTitle = SUB_LABELS[section]?.[segments[1] ?? '']
  if (subTitle && segments.length === 2) {
    return { title: subTitle, parents: [{ label: sectionLabel, href: sectionHref }] }
  }

  const tail = segments[segments.length - 1] ?? ''
  const tailLabel =
    tail === 'bearbeiten'
      ? 'Bearbeiten'
      : tail === 'finanzen'
        ? 'Finanzen'
        : tail === 'abnahme'
          ? 'Abnahme'
          : tail === 'abschluss'
            ? 'Abschluss'
            : tail === 'angebote'
              ? 'Angebote'
              : tail === 'rechnungen-auswahl'
                ? 'Rechnungen'
                : tail === 'vorschau'
                  ? 'Vorschau'
                  : ''

  return {
    title: tailLabel || sectionLabel,
    parents: [{ label: sectionLabel, href: sectionHref }],
  }
}

/**
 * Eine einzige Kopfzeile (Mock).
 * Früher: Mobile- + Desktop-`<header className="topbar">` parallel —
 * unlayered `.topbar { display:flex }` in mock-design-system.css hat Tailwind
 * `hidden` / `md:hidden` überschrieben → doppelte Suche/Glocke.
 */
export function TopBar({ user: _user, onSearchOpen }: TopBarProps) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const { title, parents, cta } = pathToBreadcrumbs(pathname)
  const parentHref = parents[parents.length - 1]?.href ?? null
  const isListRoot = parents.length === 0

  return (
    <header className="topbar">
      {parentHref ? (
        <Link
          href={parentHref}
          aria-label="Zurück"
          className="topbar-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      ) : null}

      <div className="topbar-title">
        {parents.map((p) =>
          p.href ? (
            <Link key={p.label} href={p.href} className="topbar-crumb-link">
              {p.label}
              <span className="topbar-crumb-sep">›</span>
            </Link>
          ) : (
            <span key={p.label} className="topbar-crumb-link">
              {p.label}
              <span className="topbar-crumb-sep">›</span>
            </span>
          )
        )}
        <span className="truncate">{title}</span>
      </div>

      {isListRoot ? (
        <button type="button" className="topbar-search-trigger" onClick={() => onSearchOpen?.()}>
          <MockIcon ctx="default" n="search" size={16} />
          <span>Suchen…</span>
        </button>
      ) : (
        <div className="topbar-spacer" />
      )}

      <div className="topbar-actions">
        {cta ? (
          <button type="button" onClick={() => router.push(cta.href)} className="btn primary sm topbar-cta">
            <MockIcon ctx="btn" n="plus" size={14} />
            <span className="topbar-cta-label">{cta.label}</span>
          </button>
        ) : null}
      </div>
    </header>
  )
}
