'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { ROUTE_META, SECTION_LABELS, SUB_LABELS } from '@/lib/nav-config'
import { BrandLogo } from '@/components/brand/BrandLogo'
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

export function TopBar({ user, onSearchOpen }: TopBarProps) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const { title, parents, cta } = pathToBreadcrumbs(pathname)
  const parentHref = parents[parents.length - 1]?.href ?? null
  const isListRoot = parents.length === 0

  return (
    <>
      {/* Mobile */}
      <header
        className="topbar z-header md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {parentHref ? (
          <Link
            href={parentHref}
            aria-label="Zurück"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-2)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          <Link href="/" aria-label="Bärenwald CRM" className="flex shrink-0 items-center">
            <BrandLogo variant="green" height={28} priority />
          </Link>
        )}

        <div className="topbar-title min-w-0 flex-1 truncate">{title}</div>

        <div className="topbar-actions">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-3)]"
            aria-label="Suchen"
            onClick={() => onSearchOpen?.()}
          >
            <MockIcon n="search" size={18} />
          </button>
          {cta ? (
            <button
              type="button"
              onClick={() => router.push(cta.href)}
              aria-label={cta.label}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--green)] text-white"
            >
              <MockIcon n="plus" size={18} />
            </button>
          ) : (
            <Link
              href="/einstellungen/profil"
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-xs font-semibold text-white"
              title={user.email ? `${user.email} — Profil` : 'Profil'}
              aria-label="Profil öffnen"
            >
              {user.email?.[0]?.toUpperCase() ?? 'B'}
            </Link>
          )}
        </div>
      </header>

      {/* Desktop */}
      <header className="topbar hidden md:flex">
        <div className="topbar-title">
          {parents.map((p) =>
            p.href ? (
              <Link key={p.label} href={p.href} className="font-medium text-[var(--text-3)] hover:text-[var(--text)]">
                {p.label}
                <span className="mx-2 text-[var(--text-4)]">›</span>
              </Link>
            ) : (
              <span key={p.label} className="font-medium text-[var(--text-3)]">
                {p.label}
                <span className="mx-2 text-[var(--text-4)]">›</span>
              </span>
            )
          )}
          <span id="breadcrumb-portal" className="contents" />
          <span className="truncate">{title}</span>
        </div>

        {isListRoot ? (
          <button type="button" className="topbar-search-trigger" onClick={() => onSearchOpen?.()}>
            <MockIcon n="search" size={16} />
            <span>Suchen…</span>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        <div className="topbar-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            title="Benachrichtigungen"
            aria-label="Benachrichtigungen"
          >
            <MockIcon n="bell" size={16} />
          </button>

          {cta ? (
            <button type="button" onClick={() => router.push(cta.href)} className="btn btn-primary btn-sm">
              <MockIcon n="plus" size={14} />
              {cta.label}
            </button>
          ) : null}

          <Link
            href="/einstellungen/profil"
            className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-xs font-semibold text-white"
            title={user.email ? `${user.email} — Profil` : 'Profil'}
            aria-label="Profil öffnen"
          >
            {user.email?.[0]?.toUpperCase() ?? 'B'}
          </Link>
        </div>
      </header>
    </>
  )
}
