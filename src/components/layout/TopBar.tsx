'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { ArrowLeft, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { BrandAvatar } from '@/components/brand/BrandAvatar'
import { TopBarSearch } from '@/components/layout/TopBarSearch'
import { CrmNotificationsBell } from '@/components/notifications/CrmNotificationsBell'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { ROUTE_META, SECTION_LABELS, SUB_LABELS } from '@/lib/nav-config'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockPopover } from '@/components/mock-ui/MockPopover'
import { cn } from '@/lib/utils'

interface TopBarProps {
  user: User
}

type Crumb = { label: string; href?: string }

const NEW_SUB = 'neu'
const PROFIL_HREF = '/einstellungen/profil'

function userDisplay(user: User): { name: string; email: string } {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
  const raw =
    meta?.full_name?.trim() ||
    meta?.name?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Beran Bärenwald'
  return {
    name: raw,
    email: user.email?.trim() || '',
  }
}

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
    // Einstellungen: Tab-Nav ersetzt Zurück zum Hub (mobil kein topbar-back)
    if (section === 'einstellungen') {
      return { title: subTitle, parents: [], cta: meta?.cta }
    }
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

  // Detail-Chrome: kein TopBar-Titel/Zurück — Hero hat MockDetailBackLink
  const isUuidLike = /^[0-9a-f-]{8,}$/i.test(segments[1] ?? '')
  const isEntityDetail =
    ['anfragen', 'angebote', 'auftraege', 'rechnungen', 'kunden', 'handwerker'].includes(section) &&
    segments.length >= 2 &&
    isUuidLike

  if (isEntityDetail) {
    return { title: '', parents: [], cta: undefined }
  }

  // Einstellungen-Unterseiten (z. B. Vorlagen bearbeiten): Tab-Shell, kein Hub-Zurück
  if (section === 'einstellungen' && segments.length >= 2) {
    return {
      title: tailLabel || subTitle || sectionLabel,
      parents: [],
      cta: undefined,
    }
  }

  return {
    title: tailLabel || sectionLabel,
    parents: [{ label: sectionLabel, href: sectionHref }],
  }
}

/**
 * Eine einzige Kopfzeile (Mock).
 * Mobil: Titel links · Suche-Icon · Assistent · Profil (kein zweiter Titelstreifen).
 */
export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const { title, parents, cta } = pathToBreadcrumbs(pathname)
  const parentHref = parents[parents.length - 1]?.href ?? null
  const { name, email } = userDisplay(user)
  const { open: assistentOpen, toggle: toggleAssistent } = useAssistent()
  const [menuOpen, setMenuOpen] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  async function handleLogout() {
    if (!window.confirm('Wirklich abmelden?')) return
    setLogoutLoading(true)
    setMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut({ scope: "local" })
    router.replace('/login')
    router.refresh()
    setLogoutLoading(false)
  }

  function goProfil() {
    setMenuOpen(false)
    router.push(PROFIL_HREF)
  }

  return (
      <div className="topbar-stack">
        <header className="topbar">
          {/* Desktop: Titel/Breadcrumbs. Mobil: Titel links, Icons rechts. */}
          <div className={cn('topbar-title', !title && !parents.length && 'topbar-title--empty')}>
            {parentHref ? (
              <Link href={parentHref} aria-label="Zurück" className="topbar-back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : null}
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
            {title ? <span className="topbar-title-text truncate">{title}</span> : null}
          </div>

          <TopBarSearch />

          <div className="topbar-actions">
            {cta ? (
              <button type="button" onClick={() => router.push(cta.href)} className="btn primary sm topbar-cta">
                <MockIcon ctx="btn" n="plus" size={14} />
                <span className="topbar-cta-label">{cta.label}</span>
              </button>
            ) : null}

            <button
              type="button"
              className={cn('btn sm btn-assistent', assistentOpen && 'is-open')}
              aria-label="Assistent öffnen"
              aria-pressed={assistentOpen}
              onClick={() => toggleAssistent()}
            >
              <MockIcon ctx="btn" n="sparkles" size={14} />
              <span className="topbar-cta-label">Assistent</span>
            </button>

            <CrmNotificationsBell />

            <button
              ref={avatarRef}
              type="button"
              className={cn('topbar-avatar', menuOpen && 'is-open')}
              aria-label="Profilmenü"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <BrandAvatar size={28} aria-hidden />
            </button>

            <MockPopover
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={avatarRef}
              align="right"
              width={260}
            >
              <div className="topbar-user-pop__head">
                <BrandAvatar size={40} aria-hidden />
                <div className="topbar-user-pop__meta">
                  <div className="topbar-user-pop__name">{name}</div>
                  {email ? <div className="topbar-user-pop__email">{email}</div> : null}
                </div>
              </div>
              <div className="pop-sep" />
              <button type="button" className="pop-item" onClick={goProfil}>
                <MockIcon ctx="btn" n="user" size={16} />
                <span>Profil</span>
              </button>
              <button type="button" className="pop-item" onClick={goProfil}>
                <MockIcon ctx="btn" n="settings" size={16} />
                <span>Einstellungen</span>
              </button>
              <div className="pop-sep" />
              <button
                type="button"
                className="pop-item danger"
                disabled={logoutLoading}
                onClick={() => {
                  void handleLogout()
                }}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>{logoutLoading ? 'Abmelden…' : 'Abmelden'}</span>
              </button>
            </MockPopover>
          </div>
        </header>
      </div>
  )
}
