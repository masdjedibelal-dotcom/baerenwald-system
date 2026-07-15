'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { SIDEBAR_NAV_GROUPS } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

const SIDEBAR_EXPANDED_KEY = 'bw-sidebar-expanded'

function profileLabel(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const name = typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  if (name) return name
  const email = user.email?.split('@')[0] ?? ''
  if (email) return email.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return 'Profil'
}

function profileInitials(user: User): string {
  const label = profileLabel(user)
  const parts = label.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  return label.slice(0, 2).toUpperCase()
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  user,
}: {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  user?: User
}) {
  const pathname = usePathname() ?? '/'
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
      if (saved !== null) {
        const exp = saved === 'true'
        setExpanded(exp)
        onCollapsedChange?.(!exp)
      } else if (window.innerWidth <= 760) {
        setExpanded(false)
        onCollapsedChange?.(true)
      }
    } catch {
      /* ignore */
    }
  }, [onCollapsedChange])

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed)
  }, [collapsed])

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next))
      } catch {
        /* ignore */
      }
      onCollapsedChange?.(!next)
      return next
    })
  }

  return (
    <nav className="sidebar" aria-label="Hauptnavigation">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="sidebar-logo" title="Bärenwald CRM">
            B
          </div>
          <span className="sidebar-brandname">Bärenwald</span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          title={expanded ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
          aria-label="Sidebar umschalten"
          onClick={toggleExpanded}
        >
          <MockIcon n={expanded ? 'chevron-left' : 'chevron-right'} size={18} />
        </button>
      </div>

      <div className="sidebar-nav">
        {SIDEBAR_NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="sidebar-section">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-label={item.label}
                aria-label={item.label}
                className={cn('sidebar-icon', isActive(item.href, item.exact) && 'active')}
              >
                <MockIcon
                  n={
                    item.label === 'Dashboard'
                      ? 'layout-dashboard'
                      : item.label === 'Vorgänge'
                        ? 'folders'
                        : item.label === 'Kunden'
                          ? 'users'
                          : item.label === 'Handwerker'
                            ? 'tool'
                            : item.label === 'Partner'
                              ? 'building'
                              : 'calendar'
                  }
                  size={18}
                />
                <span className="sidebar-label">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-spacer" />

      <Link
        href="/einstellungen"
        data-label="Einstellungen"
        aria-label="Einstellungen"
        className={cn('sidebar-icon', isActive('/einstellungen') && 'active')}
      >
        <MockIcon n="settings" size={18} />
        <span className="sidebar-label">Einstellungen</span>
      </Link>

      {user ? (
        <Link
          href="/einstellungen/profil"
          data-label={profileLabel(user)}
          aria-label="Profil"
          className="sidebar-icon"
        >
          <div
            style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'var(--green)',
              color: 'white',
              display: 'grid',
              placeItems: 'center',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {profileInitials(user)}
          </div>
          <span className="sidebar-label">{profileLabel(user)}</span>
        </Link>
      ) : null}
    </nav>
  )
}
