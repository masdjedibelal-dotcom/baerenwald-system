'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Plus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { ROUTE_META, SECTION_LABELS, SUB_LABELS } from '@/lib/nav-config'
import { BrandLogo } from '@/components/brand/BrandLogo'

interface TopBarProps {
  user: User
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

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const { title, parents, cta } = pathToBreadcrumbs(pathname)

  const parentHref = parents[parents.length - 1]?.href ?? null

  return (
    <>
      <header
        className="z-header flex h-12 flex-shrink-0 items-center gap-2 border-b border-bw-border bg-bw-card px-3 md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {parentHref ? (
          <Link
            href={parentHref}
            aria-label="Zurück"
            className="flex h-9 w-9 items-center justify-center rounded-md text-bw-text-mid transition-colors hover:bg-bw-hover"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            href="/"
            aria-label="Bärenwald CRM"
            className="flex shrink-0 items-center"
          >
            <BrandLogo variant="green" height={28} priority />
          </Link>
        )}

        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-bw-text">
          {title}
        </div>

        {cta ? (
          <button
            type="button"
            onClick={() => router.push(cta.href)}
            aria-label={cta.label}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bw-primary text-white shadow-sm transition-opacity hover:opacity-90 active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
        ) : (
          <Link
            href="/einstellungen/profil"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bw-primary text-xs font-semibold text-white transition-opacity hover:opacity-90"
            title={user.email ? `${user.email} — Profil` : 'Profil'}
            aria-label="Profil öffnen"
          >
            {user.email?.[0]?.toUpperCase() ?? 'B'}
          </Link>
        )}
      </header>

      <header className="hidden h-11 flex-shrink-0 items-center gap-3 border-b border-bw-border bg-bw-card px-5 md:flex">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-semibold tracking-tight">
          {parents.map((p) =>
            p.href ? (
              <Link
                key={p.label}
                href={p.href}
                className="font-medium text-bw-text-muted hover:text-bw-text"
              >
                {p.label}
                <span className="mx-2 text-bw-text-subtle">›</span>
              </Link>
            ) : (
              <span key={p.label} className="font-medium text-bw-text-muted">
                {p.label}
                <span className="mx-2 text-bw-text-subtle">›</span>
              </span>
            )
          )}
          <span id="breadcrumb-portal" className="contents" />
          <span className="truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/ki-analytics"
            aria-label="KI Hub"
            title="KI Hub"
            className="flex h-8 w-8 items-center justify-center rounded-md text-bw-text-muted transition-colors hover:bg-bw-hover hover:text-bw-text"
          >
            <Bell className="h-4 w-4" />
          </Link>

          {cta ? (
            <button type="button" onClick={() => router.push(cta.href)} className="btn-primary btn-sm">
              <Plus className="h-3.5 w-3.5" />
              {cta.label}
            </button>
          ) : null}

          <Link
            href="/einstellungen/profil"
            className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bw-primary text-xs font-semibold text-white transition-opacity hover:opacity-90"
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
