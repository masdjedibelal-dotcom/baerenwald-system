'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ROUTE_META, SECTION_LABELS } from '@/lib/nav-config'
import { getDetailRouteMeta } from '@/lib/detail-route-meta'

interface TopBarProps {
  user: User
  onSearchOpen?: () => void
}

function pageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  const segments = pathname.split('/').filter(Boolean)
  const section = segments[0] ?? ''
  const sectionHref = `/${section}`
  const meta = ROUTE_META[sectionHref]
  if (segments.length === 1) return meta?.title ?? SECTION_LABELS[section] ?? section

  if (segments[1] === 'neu') return meta?.title ? `${meta.title} – Neu` : 'Neu erstellen'

  const tail = segments[segments.length - 1] ?? ''
  if (tail === 'bearbeiten') return 'Bearbeiten'
  return SECTION_LABELS[section] ?? meta?.title ?? section
}

function isDetailRoute(pathname: string): boolean {
  return getDetailRouteMeta(pathname).isDetail
}

export function TopBar({ user, onSearchOpen }: TopBarProps) {
  const pathname = usePathname() ?? '/'
  const title = pageTitle(pathname)
  const detailMeta = getDetailRouteMeta(pathname)
  const isDetail = detailMeta.isDetail
  const sectionLabel = detailMeta.sectionLabel ?? title

  return (
    <div className="topbar">
      <div className="topbar-title">
        {isDetail ? (
          <>
            <span>{sectionLabel}</span>
            <span style={{ color: 'var(--text-3)', fontWeight: 500, marginLeft: 8 }}>Details</span>
          </>
        ) : (
          <span>{title}</span>
        )}
      </div>

      {!isDetail ? (
        <button
          type="button"
          className="topbar-search-trigger"
          aria-label="Suchen"
          onClick={() => onSearchOpen?.()}
        >
          <MockIcon n="search" size={16} />
          <span>Suchen…</span>
        </button>
      ) : null}

      <div className="topbar-actions">
        <button type="button" className="btn ghost sm icon" title="Benachrichtigungen" aria-label="Benachrichtigungen">
          <MockIcon n="bell" size={16} />
        </button>
        {!isDetail ? (
          <Link
            href="/einstellungen/profil"
            className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-xs font-semibold text-white"
            title={user.email ? `${user.email} — Profil` : 'Profil'}
            aria-label="Profil öffnen"
          >
            {user.email?.[0]?.toUpperCase() ?? 'B'}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
